export interface DetectedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  label: string;
}

const SKIP_TYPES = new Set(["hidden", "submit", "button", "reset", "image", "file"]);

export function detectFields(): DetectedField[] {
  const candidates = document.querySelectorAll<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >("input, textarea, select");

  const fields: DetectedField[] = [];

  for (const el of candidates) {
    if (el instanceof HTMLInputElement && SKIP_TYPES.has(el.type)) continue;
    if (!isVisible(el)) continue;

    const label = extractLabel(el);
    if (label) fields.push({ element: el, label });
  }

  return fields;
}

function isVisible(el: Element): boolean {
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

export function extractLabel(
  el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): string {
  // 1. <label for="id"> — most reliable, used by Workday, Greenhouse
  if (el.id) {
    const label = document.querySelector<HTMLLabelElement>(
      `label[for="${CSS.escape(el.id)}"]`
    );
    const text = label?.textContent?.trim();
    if (text) return text;
  }

  // 2. aria-label — LinkedIn Easy Apply
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  // 3. aria-labelledby → referenced element's text
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const text = labelledBy
      .split(" ")
      .map((id) => document.getElementById(id)?.textContent?.trim())
      .filter(Boolean)
      .join(" ");
    if (text) return text;
  }

  // 4. placeholder — Lever, Ashby
  const placeholder = el.getAttribute("placeholder")?.trim();
  if (placeholder) return placeholder;

  // 5. Walk up 3 DOM levels — find nearest visible sibling text node
  let node: Element | null = el.parentElement;
  for (let depth = 0; depth < 3 && node; depth++, node = node.parentElement) {
    for (const child of node.childNodes) {
      if (child === el) continue;
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text && text.length > 1 && text.length < 120) return text;
      }
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        !(child as Element).contains(el)
      ) {
        const text = (child as Element).textContent?.trim();
        if (text && text.length > 1 && text.length < 120) return text;
      }
    }
  }

  return "";
}
