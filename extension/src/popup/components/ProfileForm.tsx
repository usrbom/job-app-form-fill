import { useState, useEffect } from "react";
import { supabase } from "../../shared/supabase";
import type { ProfileData, Skill } from "../../shared/types";

type Section = "personal" | "education" | "experience" | "projects" | "skills";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "education", label: "Education" },
  { id: "experience", label: "Exp." },
  { id: "projects", label: "Projects" },
  { id: "skills", label: "Skills" },
];

const inputBase =
  "px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:bg-gray-50 disabled:text-gray-400";
const inputCls = `w-full ${inputBase}`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-gray-400 mb-1 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

const defaultPersonal: ProfileData["personal"] = {
  firstName: "",
  lastName: "",
  fullName: "",
  email: "",
  phone: "",
  location: { city: "", state: "", country: "United States", zipCode: "" },
};

const defaultProfile: ProfileData = {
  version: 1,
  personal: defaultPersonal,
  education: [],
  experience: [],
  projects: [],
  skills: [],
};

function parseProfile(data: Record<string, unknown>): ProfileData {
  return {
    version: (data.version as number) ?? 1,
    personal: { ...defaultPersonal, ...((data.personal as Partial<ProfileData["personal"]>) ?? {}) },
    education: (data.education as ProfileData["education"]) ?? [],
    experience: (data.experience as ProfileData["experience"]) ?? [],
    projects: (data.projects as ProfileData["projects"]) ?? [],
    skills: (data.skills as ProfileData["skills"]) ?? [],
    customFields: (data.custom_fields as Record<string, string>) ?? {},
  };
}

interface ProfileFormProps {
  userId: string;
}

export default function ProfileForm({ userId }: ProfileFormProps) {
  const [activeSection, setActiveSection] = useState<Section>("personal");
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data }) => {
        if (data) {
          const parsed = parseProfile(data as Record<string, unknown>);
          setProfile(parsed);
          chrome.storage.local.set({ ff_profile: parsed });
        }
        setLoading(false);
      });
  }, [userId]);

  useEffect(() => {
    setExpandedIdx(null);
  }, [activeSection]);

  const saveProfile = async () => {
    setSaving(true);
    const personal = {
      ...profile.personal,
      fullName: `${profile.personal.firstName} ${profile.personal.lastName}`.trim(),
    };
    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      version: profile.version,
      personal,
      education: profile.education,
      experience: profile.experience,
      projects: profile.projects,
      skills: profile.skills,
      custom_fields: profile.customFields ?? {},
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    setSaveStatus(error ? "error" : "saved");
    if (!error) {
      const saved = { ...profile, personal };
      setProfile(saved);
      // Cache for content script — reads from chrome.storage.local directly
      chrome.storage.local.set({ ff_profile: saved });
    }
    setTimeout(() => setSaveStatus("idle"), 2500);
  };

  const setPersonal = (key: keyof ProfileData["personal"], value: unknown) =>
    setProfile((p) => ({ ...p, personal: { ...p.personal, [key]: value } }));

  const setLocation = (key: keyof ProfileData["personal"]["location"], value: string) =>
    setProfile((p) => ({
      ...p,
      personal: { ...p.personal, location: { ...p.personal.location, [key]: value } },
    }));

  function addItem<T>(
    section: "education" | "experience" | "projects" | "skills",
    item: T
  ) {
    const newIdx = profile[section].length;
    setProfile((p) => ({ ...p, [section]: [...(p[section] as T[]), item] }));
    setExpandedIdx(newIdx);
  }

  function updateItem<T>(
    section: "education" | "experience" | "projects" | "skills",
    idx: number,
    item: T
  ) {
    setProfile((p) => ({
      ...p,
      [section]: (p[section] as T[]).map((x, i) => (i === idx ? item : x)),
    }));
  }

  function removeItem(
    section: "education" | "experience" | "projects" | "skills",
    idx: number
  ) {
    setProfile((p) => ({
      ...p,
      [section]: (p[section] as unknown[]).filter((_, i) => i !== idx),
    }));
    setExpandedIdx(null);
  }

  // ── Section renderers ──────────────────────────────────────────────────────

  const renderPersonal = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="First name">
          <input
            className={inputCls}
            value={profile.personal.firstName}
            onChange={(e) => setPersonal("firstName", e.target.value)}
          />
        </Field>
        <Field label="Last name">
          <input
            className={inputCls}
            value={profile.personal.lastName}
            onChange={(e) => setPersonal("lastName", e.target.value)}
          />
        </Field>
      </div>
      <Field label="Email">
        <input
          className={inputCls}
          type="email"
          value={profile.personal.email}
          onChange={(e) => setPersonal("email", e.target.value)}
        />
      </Field>
      <Field label="Phone">
        <input
          className={inputCls}
          type="tel"
          value={profile.personal.phone}
          onChange={(e) => setPersonal("phone", e.target.value)}
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="City">
          <input
            className={inputCls}
            value={profile.personal.location.city}
            onChange={(e) => setLocation("city", e.target.value)}
          />
        </Field>
        <Field label="State">
          <input
            className={inputCls}
            value={profile.personal.location.state}
            onChange={(e) => setLocation("state", e.target.value)}
          />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Country">
          <input
            className={inputCls}
            value={profile.personal.location.country}
            onChange={(e) => setLocation("country", e.target.value)}
          />
        </Field>
        <Field label="Zip">
          <input
            className={inputCls}
            value={profile.personal.location.zipCode ?? ""}
            onChange={(e) => setLocation("zipCode", e.target.value)}
          />
        </Field>
      </div>
      <Field label="LinkedIn URL">
        <input
          className={inputCls}
          type="url"
          placeholder="https://linkedin.com/in/..."
          value={profile.personal.linkedinUrl ?? ""}
          onChange={(e) => setPersonal("linkedinUrl", e.target.value)}
        />
      </Field>
      <Field label="GitHub URL">
        <input
          className={inputCls}
          type="url"
          placeholder="https://github.com/..."
          value={profile.personal.githubUrl ?? ""}
          onChange={(e) => setPersonal("githubUrl", e.target.value)}
        />
      </Field>
      <Field label="Portfolio URL">
        <input
          className={inputCls}
          type="url"
          placeholder="https://..."
          value={profile.personal.portfolioUrl ?? ""}
          onChange={(e) => setPersonal("portfolioUrl", e.target.value)}
        />
      </Field>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-2">
      {profile.education.map((edu, idx) => (
        <div key={edu.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 select-none"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {edu.institution || "New school"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {[edu.degree, edu.field].filter(Boolean).join(" — ")}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); removeItem("education", idx); }}
                className="text-gray-300 hover:text-red-500 text-lg leading-none"
              >
                ×
              </button>
              <span className="text-gray-400 text-xs">{expandedIdx === idx ? "▲" : "▼"}</span>
            </div>
          </div>
          {expandedIdx === idx && (
            <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-100">
              <Field label="Institution">
                <input
                  className={inputCls}
                  value={edu.institution}
                  onChange={(e) => updateItem("education", idx, { ...edu, institution: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Degree">
                  <input
                    className={inputCls}
                    placeholder="MBA"
                    value={edu.degree}
                    onChange={(e) => updateItem("education", idx, { ...edu, degree: e.target.value })}
                  />
                </Field>
                <Field label="Field">
                  <input
                    className={inputCls}
                    placeholder="Business"
                    value={edu.field}
                    onChange={(e) => updateItem("education", idx, { ...edu, field: e.target.value })}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start">
                  <input
                    className={inputCls}
                    placeholder="2023-08"
                    value={edu.startDate}
                    onChange={(e) => updateItem("education", idx, { ...edu, startDate: e.target.value })}
                  />
                </Field>
                <Field label="End">
                  <input
                    className={inputCls}
                    placeholder="2025-05"
                    value={edu.endDate}
                    onChange={(e) => updateItem("education", idx, { ...edu, endDate: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="GPA">
                <input
                  className={inputCls}
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  placeholder="3.8"
                  value={edu.gpa ?? ""}
                  onChange={(e) =>
                    updateItem("education", idx, {
                      ...edu,
                      gpa: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                />
              </Field>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={() =>
          addItem("education", {
            id: crypto.randomUUID(),
            institution: "",
            degree: "",
            field: "",
            startDate: "",
            endDate: "",
          })
        }
        className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
      >
        + Add education
      </button>
    </div>
  );

  const renderExperience = () => (
    <div className="space-y-2">
      {profile.experience.map((exp, idx) => (
        <div key={exp.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 select-none"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {exp.title || "New role"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {exp.company}
                {exp.isCurrentRole ? " — Present" : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); removeItem("experience", idx); }}
                className="text-gray-300 hover:text-red-500 text-lg leading-none"
              >
                ×
              </button>
              <span className="text-gray-400 text-xs">{expandedIdx === idx ? "▲" : "▼"}</span>
            </div>
          </div>
          {expandedIdx === idx && (
            <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Company">
                  <input
                    className={inputCls}
                    value={exp.company}
                    onChange={(e) => updateItem("experience", idx, { ...exp, company: e.target.value })}
                  />
                </Field>
                <Field label="Title">
                  <input
                    className={inputCls}
                    value={exp.title}
                    onChange={(e) => updateItem("experience", idx, { ...exp, title: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Location">
                <input
                  className={inputCls}
                  value={exp.location}
                  onChange={(e) => updateItem("experience", idx, { ...exp, location: e.target.value })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start">
                  <input
                    className={inputCls}
                    placeholder="2022-06"
                    value={exp.startDate}
                    onChange={(e) => updateItem("experience", idx, { ...exp, startDate: e.target.value })}
                  />
                </Field>
                <Field label="End">
                  <input
                    className={inputCls}
                    placeholder="2024-08"
                    value={exp.endDate}
                    disabled={exp.isCurrentRole}
                    onChange={(e) => updateItem("experience", idx, { ...exp, endDate: e.target.value })}
                  />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exp.isCurrentRole}
                  onChange={(e) =>
                    updateItem("experience", idx, {
                      ...exp,
                      isCurrentRole: e.target.checked,
                      endDate: e.target.checked ? "present" : "",
                    })
                  }
                />
                Current role
              </label>
              <Field label="Bullets (one per line)">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={4}
                  placeholder={"Led 3-person team to ship X\nIncreased revenue by Y%"}
                  value={exp.bullets.join("\n")}
                  onChange={(e) =>
                    updateItem("experience", idx, { ...exp, bullets: e.target.value.split("\n") })
                  }
                />
              </Field>
              <Field label="Skills (comma-separated)">
                <input
                  className={inputCls}
                  placeholder="Product strategy, SQL, Figma"
                  value={exp.skills.join(", ")}
                  onChange={(e) =>
                    updateItem("experience", idx, {
                      ...exp,
                      skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </Field>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={() =>
          addItem("experience", {
            id: crypto.randomUUID(),
            company: "",
            title: "",
            location: "",
            startDate: "",
            endDate: "",
            bullets: [],
            skills: [],
            isCurrentRole: false,
          })
        }
        className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
      >
        + Add experience
      </button>
    </div>
  );

  const renderProjects = () => (
    <div className="space-y-2">
      {profile.projects.map((proj, idx) => (
        <div key={proj.id} className="border border-gray-200 rounded-lg overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 select-none"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {proj.name || "New project"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {proj.description || "No description yet"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); removeItem("projects", idx); }}
                className="text-gray-300 hover:text-red-500 text-lg leading-none"
              >
                ×
              </button>
              <span className="text-gray-400 text-xs">{expandedIdx === idx ? "▲" : "▼"}</span>
            </div>
          </div>
          {expandedIdx === idx && (
            <div className="px-3 pb-3 pt-2 space-y-2 border-t border-gray-100">
              <Field label="Name">
                <input
                  className={inputCls}
                  value={proj.name}
                  onChange={(e) => updateItem("projects", idx, { ...proj, name: e.target.value })}
                />
              </Field>
              <Field label="Description (2–3 sentences)">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={proj.description}
                  onChange={(e) =>
                    updateItem("projects", idx, { ...proj, description: e.target.value })
                  }
                />
              </Field>
              <Field label="URL">
                <input
                  className={inputCls}
                  type="url"
                  placeholder="https://..."
                  value={proj.url ?? ""}
                  onChange={(e) => updateItem("projects", idx, { ...proj, url: e.target.value })}
                />
              </Field>
              <Field label="Bullets (one per line)">
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={3}
                  value={proj.bullets.join("\n")}
                  onChange={(e) =>
                    updateItem("projects", idx, { ...proj, bullets: e.target.value.split("\n") })
                  }
                />
              </Field>
              <Field label="Skills (comma-separated)">
                <input
                  className={inputCls}
                  placeholder="React, Python, AWS"
                  value={proj.skills.join(", ")}
                  onChange={(e) =>
                    updateItem("projects", idx, {
                      ...proj,
                      skills: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                    })
                  }
                />
              </Field>
            </div>
          )}
        </div>
      ))}
      <button
        onClick={() =>
          addItem("projects", {
            id: crypto.randomUUID(),
            name: "",
            description: "",
            bullets: [],
            skills: [],
          })
        }
        className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
      >
        + Add project
      </button>
    </div>
  );

  const renderSkills = () => (
    <div className="space-y-2">
      {profile.skills.map((skill, idx) => (
        <div key={idx} className="flex items-center gap-1.5">
          <input
            className={`${inputBase} flex-1 min-w-0`}
            placeholder="e.g. Python, SQL, Leadership"
            value={skill.name}
            onChange={(e) => updateItem("skills", idx, { ...skill, name: e.target.value })}
          />
          <select
            className={`${inputBase} flex-shrink-0`}
            style={{ width: "88px" }}
            value={skill.category}
            onChange={(e) =>
              updateItem("skills", idx, { ...skill, category: e.target.value as Skill["category"] })
            }
          >
            <option value="technical">Technical</option>
            <option value="soft">Soft skill</option>
            <option value="language">Language</option>
            <option value="tool">Tool</option>
          </select>
          <button
            onClick={() => removeItem("skills", idx)}
            className="text-gray-300 hover:text-red-500 text-xl leading-none flex-shrink-0 px-0.5"
          >
            ×
          </button>
        </div>
      ))}
      {profile.skills.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          Add skills you want suggested in forms
        </p>
      )}
      <button
        onClick={() => addItem("skills", { name: "", category: "technical" as const })}
        className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
      >
        + Add skill
      </button>
    </div>
  );

  const sectionContent: Record<Section, React.ReactNode> = {
    personal: renderPersonal(),
    education: renderEducation(),
    experience: renderExperience(),
    projects: renderProjects(),
    skills: renderSkills(),
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Section tabs */}
      <div className="flex border-b border-gray-200">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeSection === s.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4">{sectionContent[activeSection]}</div>

      {/* Save */}
      <div className="p-3 border-t border-gray-100 bg-white">
        <button
          onClick={saveProfile}
          disabled={saving}
          className={`w-full py-2 text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed ${
            saveStatus === "saved"
              ? "bg-green-500 text-white"
              : saveStatus === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          }`}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving…
            </span>
          ) : saveStatus === "saved" ? (
            "✓ Saved"
          ) : saveStatus === "error" ? (
            "Save failed — retry"
          ) : (
            "Save profile"
          )}
        </button>
      </div>
    </div>
  );
}
