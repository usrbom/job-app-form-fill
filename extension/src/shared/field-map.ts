import type { ProfileData } from "./types";

// Maps normalized label strings to dot-path into ProfileData.
// Array indices use numeric segments: "education.0.institution"
const FIELD_MAP: Record<string, string> = {
  // ── Name ────────────────────────────────────────────────────
  "first name": "personal.firstName",
  "firstname": "personal.firstName",
  "given name": "personal.firstName",
  "last name": "personal.lastName",
  "lastname": "personal.lastName",
  "surname": "personal.lastName",
  "family name": "personal.lastName",
  "full name": "personal.fullName",
  "fullname": "personal.fullName",
  "name": "personal.fullName",
  "your name": "personal.fullName",
  "legal name": "personal.fullName",

  // ── Contact ─────────────────────────────────────────────────
  "email": "personal.email",
  "email address": "personal.email",
  "e-mail": "personal.email",
  "e-mail address": "personal.email",
  "phone": "personal.phone",
  "phone number": "personal.phone",
  "mobile": "personal.phone",
  "mobile number": "personal.phone",
  "mobile phone": "personal.phone",
  "cell": "personal.phone",
  "cell phone": "personal.phone",
  "telephone": "personal.phone",

  // ── Location ─────────────────────────────────────────────────
  "city": "personal.location.city",
  "state": "personal.location.state",
  "state / province": "personal.location.state",
  "province": "personal.location.state",
  "country": "personal.location.country",
  "zip": "personal.location.zipCode",
  "zip code": "personal.location.zipCode",
  "postal code": "personal.location.zipCode",
  "postcode": "personal.location.zipCode",

  // ── URLs ─────────────────────────────────────────────────────
  "linkedin": "personal.linkedinUrl",
  "linkedin url": "personal.linkedinUrl",
  "linkedin profile": "personal.linkedinUrl",
  "linkedin profile url": "personal.linkedinUrl",
  "github": "personal.githubUrl",
  "github url": "personal.githubUrl",
  "github profile": "personal.githubUrl",
  "portfolio": "personal.portfolioUrl",
  "portfolio url": "personal.portfolioUrl",
  "personal website": "personal.portfolioUrl",
  "website": "personal.portfolioUrl",
  "website url": "personal.portfolioUrl",
  "url": "personal.portfolioUrl",
  "your website": "personal.portfolioUrl",

  // ── Education (most recent = index 0) ────────────────────────
  "school": "education.0.institution",
  "university": "education.0.institution",
  "college": "education.0.institution",
  "institution": "education.0.institution",
  "school name": "education.0.institution",
  "university name": "education.0.institution",
  "degree": "education.0.degree",
  "degree type": "education.0.degree",
  "major": "education.0.field",
  "field of study": "education.0.field",
  "area of study": "education.0.field",
  "gpa": "education.0.gpa",
  "grade point average": "education.0.gpa",
  "graduation date": "education.0.endDate",
  "graduation year": "education.0.endDate",
  "expected graduation": "education.0.endDate",

  // ── Current role (most recent experience = index 0) ──────────
  "current employer": "experience.0.company",
  "employer": "experience.0.company",
  "company": "experience.0.company",
  "company name": "experience.0.company",
  "current company": "experience.0.company",
  "organization": "experience.0.company",
  "job title": "experience.0.title",
  "current title": "experience.0.title",
  "title": "experience.0.title",
  "position": "experience.0.title",
  "current position": "experience.0.title",
  "role": "experience.0.title",
};

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[*:()\[\]]/g, "") // strip required markers and brackets
    .replace(/\s+/g, " ")
    .trim();
}

// Space-efficient O(m·n) Levenshtein distance
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const curr =
        a[i - 1] === b[j - 1]
          ? row[j - 1]
          : 1 + Math.min(prev, row[j], row[j - 1]);
      row[j - 1] = prev;
      prev = curr;
    }
    row[b.length] = prev;
  }

  return row[b.length];
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const result = path.split(".").reduce((curr: unknown, key) => {
    if (curr == null) return undefined;
    const idx = Number(key);
    if (!isNaN(idx)) return (curr as unknown[])[idx];
    return (curr as Record<string, unknown>)[key];
  }, obj);

  if (result == null || result === "") return undefined;
  return String(result);
}

export interface FieldResolution {
  value: string;
  source: "from your profile";
}

export function resolveField(
  rawLabel: string,
  profile: ProfileData
): FieldResolution | null {
  const label = normalizeLabel(rawLabel);

  // 1. Exact match
  const exactPath = FIELD_MAP[label];
  if (exactPath) {
    const value = getNestedValue(profile, exactPath);
    if (value) return { value, source: "from your profile" };
  }

  // 2. Fuzzy match — Levenshtein distance ≤ 2
  let bestPath: string | null = null;
  let bestDist = 3;

  for (const [key, path] of Object.entries(FIELD_MAP)) {
    // Only compare similarly-lengthed labels (perf guard)
    if (Math.abs(key.length - label.length) > 4) continue;
    const dist = levenshtein(label, key);
    if (dist < bestDist) {
      bestDist = dist;
      bestPath = path;
    }
  }

  if (bestPath && bestDist <= 2) {
    const value = getNestedValue(profile, bestPath);
    if (value) return { value, source: "from your profile" };
  }

  return null;
}
