const SELECTORS = [
  // Workday
  "[data-automation-id='job-posting-details']",
  "[data-automation-id='jobPostingDescription']",
  "[data-automation-id='richText']",
  // Greenhouse
  "#content",
  ".job__description",
  "[data-testid='job-description']",
  // Lever
  ".posting-description",
  // Generic
  "[class*='job-description']",
  "[class*='jobDescription']",
  "[class*='job_description']",
  "[class*='job-detail']",
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
