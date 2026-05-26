import { createClient } from "jsr:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

function getLengthGuidance(fieldLabel: string): string {
  const l = fieldLabel.toLowerCase();

  // Tier 1 — single value, no explanation
  if (/salary|compensation|pay|rate|wage/.test(l))
    return 'Answer must be 1 line only, e.g. "$120,000–$140,000/year" or "$50–60/hour". No explanation.';

  // Tier 1 — single sentence factual
  if (/when|start date|available|earliest|notice period/.test(l))
    return "Answer must be 1 sentence only.";
  if (/sponsor|visa|work auth|cpt|opt|reloc/.test(l))
    return "Answer must be 1–2 sentences only.";

  // Tier 3 — profile-fit / motivational (longest allowed)
  // Matches: "why this company", "why do you want", "what draws you",
  // "what excites you", "tell us about yourself", "your interest in",
  // "passion", "fit", "motivated", "why join", "what attracted"
  if (/why (do |did |are |this|us|our|the)|what (draws|excites|attracts|interests|drew|excited|attracted)|motivat|passion|tell us about yourself|about you$|your interest in|why join|why work|why apply|what appeal/.test(l))
    return "Answer should be 2–3 paragraphs. This is the longest answer you should ever write — cover: (1) genuine fit with the company/mission from the JD, (2) how your background specifically prepares you for this role, (3) what you hope to contribute or learn.";

  // Tier 2 — open-ended but not motivational (default)
  return "Answer should be 3–5 sentences. Do not exceed 5 sentences under any circumstance.";
}

function buildPrompt(
  fieldLabel: string,
  jobDescription: string,
  maxLength: number | null,
  profile: Record<string, unknown>,
  userContext = ""
): string {
  const personal = (profile.personal as Record<string, unknown>) ?? {};
  const experience = (profile.experience as unknown[]) ?? [];
  const education = (profile.education as unknown[]) ?? [];
  const skills = (profile.skills as unknown[]) ?? [];
  const projects = (profile.projects as unknown[]) ?? [];

  const condensed = JSON.stringify({
    personal,
    recentExperience: experience.slice(0, 2),
    recentEducation: education.slice(0, 1),
    skills: skills.slice(0, 15),
    projects: projects.slice(0, 2),
  });

  const jdBlock = jobDescription
    ? jobDescription.slice(0, 2000)
    : "Not provided";

  return `You are helping a candidate fill out a job application field honestly.

FIELD: "${fieldLabel}"${maxLength ? ` (max ${maxLength} characters)` : ""}

JOB DESCRIPTION:
${jdBlock}

CANDIDATE PROFILE:
${condensed}
${userContext ? `\nUSER FEEDBACK ON PREVIOUS SUGGESTION:\n"${userContext}"\nAdjust the answer to incorporate this feedback.\n` : ""}
Instructions:
1. Write "reasoning": max 200 words. Think through how to arrive at the best answer — not just what the profile says, but what the question actually requires. Consider:
   - What is this question really asking for, and what makes a strong answer?
   - What relevant external context matters (e.g. for salary: market rates for this role/level/location, typical ranges at this company, what a competitive candidate like this person should expect)?
   - How does the candidate's specific profile (experience, education, skills) affect the answer?
   - What trade-offs exist in how to frame the answer?
   Cite concrete profile details and any market/industry knowledge that shaped your reasoning.
2. Write "answer": the actual field content the candidate will paste into the form.
   Length rule: ${getLengthGuidance(fieldLabel)}
   Hard cap: never exceed 3 paragraphs total, regardless of the question. Most answers should be shorter.
3. Only use facts from the candidate profile. Do not invent experience or credentials.

Return ONLY valid JSON with no markdown fences, no explanation outside the JSON:
{"reasoning": "...", "answer": "..."}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const jwt = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!jwt) return new Response("Unauthorized", { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  const { fieldLabel, pageTitle: _pageTitle, jobDescription = "", maxLength = null, userContext = "" } = await req.json();

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("personal, education, experience, projects, skills")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return new Response("Profile not found", { status: 404 });
  }

  const groqApiKey = Deno.env.get("GROQ_API_KEY");
  if (!groqApiKey) return new Response("LLM not configured", { status: 500 });

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 800,
      temperature: 0.4,
      messages: [{ role: "user", content: buildPrompt(fieldLabel, jobDescription, maxLength, profile, userContext) }],
    }),
  });

  if (!groqRes.ok) {
    return new Response("LLM request failed", { status: 502 });
  }

  const groqData = await groqRes.json();
  const raw = groqData.choices?.[0]?.message?.content?.trim() ?? "";

  let reasoning = "";
  let suggestion = raw;

  try {
    // Strip markdown fences if the model ignores instructions
    const clean = raw.replace(/^```json?\n?/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(clean) as { reasoning?: string; answer?: string };
    reasoning = parsed.reasoning ?? "";
    suggestion = parsed.answer ?? raw;
  } catch {
    // Model didn't return valid JSON — use full response as the answer
  }

  return Response.json(
    { reasoning, suggestion, source: "generated by AI" },
    { headers: { "Access-Control-Allow-Origin": "*" } }
  );
});
