const SELECTORS = [
  "#content",                                        // Greenhouse
  ".job__description",
  "[data-testid='job-description']",
  "[data-automation-id='job-posting-details']",      // Workday
  ".posting-description",                            // Lever
  "[class*='job-description']",
  "[class*='jobDescription']",
  "[class*='job_description']",
  "article",
  "main",
];

export function extractJobDescription(): string {
  for (const sel of SELECTORS) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
    if (text.length > 200) return text.slice(0, 3000);
  }
  return "";
}
