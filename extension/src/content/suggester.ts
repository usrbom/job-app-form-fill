import type { ProfileData } from "../shared/types";
import { detectFields } from "./detector";
import { classifyField } from "./classifier";
import { resolveField } from "../shared/field-map";
import { Tooltip } from "./ui/tooltip";
import { extractJobDescription } from "./jd-extractor";

let cachedProfile: ProfileData | null = null;
let activeTooltip: Tooltip | null = null;
let jobDescription = "";

function loadProfile(): Promise<ProfileData | null> {
  if (cachedProfile) return Promise.resolve(cachedProfile);

  if (!chrome?.storage?.local) return Promise.resolve(null);

  return new Promise((resolve) => {
    try {
      chrome.storage.local.get("ff_profile", (result) => {
        cachedProfile = (result.ff_profile as ProfileData) ?? null;
        resolve(cachedProfile);
      });
    } catch {
      resolve(null);
    }
  });
}

try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.ff_profile) {
      cachedProfile = changes.ff_profile.newValue ?? null;
    }
  });
} catch {
  // Silently ignore if context is invalidated
}

function dismissActive(): void {
  activeTooltip?.remove();
  activeTooltip = null;
}

function applyValue(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  const nativeSetter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (nativeSetter) {
    nativeSetter.call(el, value);
  } else {
    el.value = value;
  }

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

function requestSuggestion(
  label: string,
  noCache = false,
  userContext = ""
): Promise<{ reasoning: string; suggestion: string; source: string } | { error: string } | null> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          type: "SUGGEST_FIELD",
          label,
          pageTitle: document.title,
          jobDescription,
          maxLength: null,
          pathname: window.location.pathname,
          noCache,
          userContext,
        },
        (response: {
          ok: boolean;
          reasoning?: string;
          suggestion?: string;
          source?: string;
          error?: string;
        }) => {
          if (chrome.runtime.lastError) {
            console.error("[FormFill AI] runtime error:", chrome.runtime.lastError.message);
            resolve(null);
            return;
          }
          if (!response?.ok) {
            console.error("[FormFill AI] service worker error:", response?.error ?? "no response");
            resolve({ error: response?.error ?? "unknown" });
            return;
          }
          resolve({
            reasoning: response.reasoning ?? "",
            suggestion: response.suggestion!,
            source: response.source!,
          });
        }
      );
    } catch {
      resolve(null);
    }
  });
}

function attachListeners(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  label: string
): void {
  element.setAttribute("autocomplete", "off");

  element.addEventListener("focus", async () => {
    dismissActive();

    const cls = classifyField(label, element);
    if (cls === "skip") return;

    if (cls === "simple") {
      const profile = await loadProfile();
      if (!profile) return;

      const result = resolveField(label, profile);
      if (!result) return;

      activeTooltip = new Tooltip({
        anchor: element,
        value: result.value,
        source: result.source,
        onAccept: () => {
          applyValue(element, result.value);
          dismissActive();
        },
        onDismiss: dismissActive,
      });
    }

    if (cls === "complex") {
      activeTooltip = new Tooltip({
        anchor: element,
        value: "",
        source: "generating…",
        loading: true,
        onAccept: () => {},
        onDismiss: dismissActive,
      });

      const runSuggestion = async (tooltip: typeof activeTooltip, noCache = false, userContext = "") => {
        const result = await requestSuggestion(label, noCache, userContext);

        if (tooltip !== activeTooltip) return;

        if (!result) {
          dismissActive();
          return;
        }

        if ("error" in result) {
          const msg = result.error === "auth_expired"
            ? "Session expired — open the FormFill AI popup to sign in again."
            : "Could not generate suggestion. Try again later.";
          tooltip!.showError(msg);
          return;
        }

        tooltip!.resolve(
          result.reasoning,
          result.suggestion,
          result.source,
          () => { applyValue(element, result.suggestion); dismissActive(); },
          (ctx: string) => { tooltip!.showLoading(); runSuggestion(tooltip, true, ctx); }
        );
      };

      await runSuggestion(activeTooltip);
    }
  });

  element.addEventListener("blur", () => {
    setTimeout(() => {
      if (!activeTooltip?.isContextInputOpen) dismissActive();
    }, 150);
  });
}

// Track elements that already have listeners so we never double-attach
const attached = new WeakSet<Element>();

function attachListenersOnce(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  label: string
): void {
  if (attached.has(element)) return;
  attached.add(element);
  attachListeners(element, label);
}

function debounce(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

function scanAndAttach(): void {
  const fields = detectFields();
  for (const { element, label } of fields) {
    if (!attached.has(element)) {
      attachListenersOnce(element, label);
    }
  }
}

export function initSuggester(): void {
  jobDescription = extractJobDescription();

  scanAndAttach();

  const observer = new MutationObserver(debounce(() => {
    if (!jobDescription) {
      jobDescription = extractJobDescription();
    }
    scanAndAttach();
  }, 300));

  observer.observe(document.body, { childList: true, subtree: true });
}
