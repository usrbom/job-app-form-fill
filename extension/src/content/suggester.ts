import type { ProfileData } from "../shared/types";
import { detectFields } from "./detector";
import { classifyField } from "./classifier";
import { resolveField } from "../shared/field-map";
import { Tooltip } from "./ui/tooltip";

let cachedProfile: ProfileData | null = null;
let activeTooltip: Tooltip | null = null;

function loadProfile(): Promise<ProfileData | null> {
  if (cachedProfile) return Promise.resolve(cachedProfile);

  return new Promise((resolve) => {
    chrome.storage.local.get("ff_profile", (result) => {
      cachedProfile = (result.ff_profile as ProfileData) ?? null;
      resolve(cachedProfile);
    });
  });
}

// Invalidate cache when profile is updated from the popup
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.ff_profile) {
    cachedProfile = changes.ff_profile.newValue ?? null;
  }
});

function dismissActive(): void {
  activeTooltip?.remove();
  activeTooltip = null;
}

// Use native value setter so React/Angular controlled inputs re-render
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

function attachListeners(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  label: string
): void {
  // Suppress browser autofill dropdown so it doesn't overlap our tooltip
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

    // complex fields → handled in Milestone 5 (service worker → Edge Function)
  });

  // Delay dismiss so mousedown on tooltip buttons fires before blur
  element.addEventListener("blur", () => {
    setTimeout(dismissActive, 150);
  });
}

export function initSuggester(): void {
  const fields = detectFields();
  for (const { element, label } of fields) {
    attachListeners(element, label);
  }
  console.log(`[FormFill AI] Watching ${fields.length} field(s) on ${window.location.hostname}`);
}
