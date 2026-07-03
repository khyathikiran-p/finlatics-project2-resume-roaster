// Claude integration — the actual "roasting" brain.
// Uses the official Anthropic SDK (@anthropic-ai/sdk).
import Anthropic from "@anthropic-ai/sdk";

// The SDK reads ANTHROPIC_API_KEY from the environment automatically.
const client = new Anthropic();

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

const CATEGORIES = [
  "Impact & Achievements",
  "Clarity & Writing",
  "Formatting & Structure",
  "Skills & Keywords",
  "Experience & Relevance",
];

const SYSTEM_PROMPT = `You are "The Roaster" — a witty but genuinely helpful career coach who reviews resumes.
Your job: roast the resume with sharp, funny, PG-13 humor, then give real, actionable advice.

Rules:
- Be funny and a little savage, but never cruel, and NEVER comment on protected attributes
  (name, gender, ethnicity, age, religion, disability, nationality, photos).
- Base every joke on something actually in the resume text (vague bullet points, buzzwords,
  clichés like "team player", missing metrics, walls of text, typos, etc.).
- After the roast, be constructive: the improvements must be specific and usable.

Score each of these five categories from 0-100:
${CATEGORIES.map((c) => `- ${c}`).join("\n")}

Return ONLY a raw JSON object (no markdown, no code fences, no prose before or after) with EXACTLY this shape:
{
  "overallScore": <integer 0-100>,
  "verdict": "<one savage-but-fair one-liner verdict>",
  "roast": "<2-4 sentences of witty roasting grounded in the resume>",
  "categories": [
    { "name": "<one of the five categories>", "score": <integer 0-100>, "feedback": "<one punchy sentence>" }
  ],
  "strengths": ["<2-4 genuine strengths>"],
  "improvements": ["<3-5 specific, actionable fixes>"]
}
Include all five categories, in the order listed above.`;

function clampScore(n, fallback = 50) {
  const v = Math.round(Number(n));
  if (Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(100, v));
}

function toArray(x) {
  if (Array.isArray(x)) return x.filter((s) => typeof s === "string" && s.trim());
  return [];
}

// Guarantee the shape the UI expects, even if the model is a little sloppy.
function normalize(parsed) {
  const cats = Array.isArray(parsed?.categories)
    ? parsed.categories
        .filter((c) => c && c.name)
        .map((c) => ({
          name: String(c.name),
          score: clampScore(c.score),
          feedback: String(c.feedback || "").trim(),
        }))
    : [];

  return {
    overallScore: clampScore(parsed?.overallScore),
    verdict: String(parsed?.verdict || "This resume has… potential.").trim(),
    roast: String(parsed?.roast || "").trim(),
    categories: cats.length ? cats : CATEGORIES.map((name) => ({ name, score: 50, feedback: "" })),
    strengths: toArray(parsed?.strengths),
    improvements: toArray(parsed?.improvements),
  };
}

function extractJson(text) {
  let raw = (text || "").trim();
  // strip accidental code fences
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(raw);
  } catch (_) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse the AI response as JSON.");
  }
}

export async function roastResume(resumeText) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Roast this resume and return ONLY the JSON described.\n\nRESUME TEXT:\n"""\n${resumeText}\n"""`,
      },
    ],
  });

  if (message.stop_reason === "refusal") {
    throw new Error("The model declined to roast this document.");
  }

  const textBlock = message.content.find((b) => b.type === "text");
  const parsed = extractJson(textBlock ? textBlock.text : "");
  return normalize(parsed);
}
