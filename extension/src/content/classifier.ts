export type FieldClass = "simple" | "complex" | "skip";

const COMPLEX_KEYWORDS = [
  "why", "describe", "tell us", "cover letter", "motivat", "explain",
  "about yourself", "background", "interest", "strength", "weakness",
  "challenge", "accomplish", "additional", "anything else", "comment",
  "message", "statement", "essay", "experience with", "how did",
  "how do", "what do", "what did",
];

export function classifyField(label: string, element: Element): FieldClass {
  if (isHoneypot(element)) return "skip";

  const normalized = label.toLowerCase();

  // Textareas are always complex (open-ended by nature)
  if (element.tagName === "TEXTAREA") return "complex";

  // Labels containing open-ended question words → complex
  if (COMPLEX_KEYWORDS.some((k) => normalized.includes(k))) return "complex";

  return "simple";
}

function isHoneypot(el: Element): boolean {
  // Bot-trap fields are positioned off-screen
  const style = window.getComputedStyle(el);
  if (style.position !== "absolute" && style.position !== "fixed") return false;
  const left = parseInt(style.left);
  const top = parseInt(style.top);
  return left < -50 || top < -50;
}
