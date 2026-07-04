// Claude integration — the "roasting" brain.
// Uses the official Anthropic SDK (@anthropic-ai/sdk) with a structured
// 4-layer prompt, and validates the model's JSON output with Zod.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// The SDK reads ANTHROPIC_API_KEY from the environment automatically.
const client = new Anthropic();
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-8";

// The five roast criteria (also used for the graceful fallback).
const CRITERIA = [
  "Clarity & Writing",
  "Impact & Achievements",
  "Buzzwords & Clichés",
  "Formatting & Structure",
  "Skills & Relevance",
];

// ── Layer 1: ROLE DEFINITION ─────────────────────────────────
const ROLE = `You are a brutally honest resume critic — sharp, witty, and a little savage, but never cruel. You roast resumes so they end up genuinely better.`;

// ── Layer 3: INSTRUCTIONS (roast criteria) ───────────────────
const INSTRUCTIONS = `Review the resume and score each of these criteria from 0-100:
- Clarity & Writing — concise, readable, typo-free?
- Impact & Achievements — quantified results, or just a list of duties?
- Buzzwords & Clichés — call out empty phrases ("team player", "synergy", "hard worker", "detail-oriented").
- Formatting & Structure — layout, length, consistency, scannability.
- Skills & Relevance — concrete, relevant skills, or a keyword dump?

Rules:
- Base every joke on something actually present in the resume text.
- NEVER comment on protected attributes (name, gender, ethnicity, age, religion, disability, nationality, photos).
- Improvements must be specific and actionable.`;

// ── Layer 4: OUTPUT FORMAT (strict JSON schema) ──────────────
const OUTPUT_FORMAT = `Return ONLY a raw JSON object — no markdown, no code fences, no text before or after — matching EXACTLY this schema:
{
  "overall_score": <integer 0-100>,
  "verdict": "<one savage-but-fair one-line verdict>",
  "roast_comment": "<2-4 sentences of witty roasting grounded in the resume>",
  "section_feedback": [
    { "section": "<criterion name>", "score": <integer 0-100>, "comment": "<one punchy sentence>" }
  ],
  "strengths": ["<2-4 genuine strengths>"],
  "improvements": ["<3-5 specific, actionable fixes>"]
}
Include exactly one section_feedback entry for EACH of the five criteria above, in that order.`;

const SYSTEM_PROMPT = [ROLE, INSTRUCTIONS, OUTPUT_FORMAT].join("\n\n");

// ── Zod schema — validates the shape of Claude's JSON output ──
const SectionSchema = z.object({
  section: z.string(),
  score: z.coerce.number(),
  comment: z.string().default(""),
});

const RoastSchema = z.object({
  overall_score: z.coerce.number(),
  verdict: z.string().optional().default(""),
  roast_comment: z.string().default(""),
  section_feedback: z.array(SectionSchema).default([]),
  strengths: z.array(z.string()).default([]),
  improvements: z.array(z.string()).default([]),
});

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const cleanList = (a) => (Array.isArray(a) ? a.filter((s) => typeof s === "string" && s.trim()) : []);

function tidy(valid) {
  const sections =
    valid.section_feedback.length > 0
      ? valid.section_feedback.map((s) => ({
          section: String(s.section),
          score: clamp(s.score),
          comment: String(s.comment || "").trim(),
        }))
      : CRITERIA.map((section) => ({ section, score: 50, comment: "" }));

  return {
    overall_score: clamp(valid.overall_score),
    verdict: valid.verdict.trim() || "This resume has… potential.",
    roast_comment: valid.roast_comment.trim(),
    section_feedback: sections,
    strengths: cleanList(valid.strengths),
    improvements: cleanList(valid.improvements),
  };
}

// Graceful fallback returned when the model output can't be parsed/validated.
function fallback() {
  return {
    overall_score: 50,
    verdict: "The roast came back a little scrambled — here's a safe read.",
    roast_comment:
      "The AI's response couldn't be validated this time, so we're showing a neutral result. Give it another go — it usually behaves.",
    section_feedback: CRITERIA.map((section) => ({ section, score: 50, comment: "Couldn't score this section reliably." })),
    strengths: [],
    improvements: ["Try roasting again — the AI response failed validation."],
    _fallback: true,
  };
}

function extractJson(text) {
  let raw = (text || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(raw);
  } catch (_) {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No JSON object found in the AI response.");
  }
}

export async function roastResume(resumeText) {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT, // Layers 1, 3, 4
    messages: [
      {
        // Layer 2: CONTEXT — the parsed resume text.
        role: "user",
        content: `Here is the resume text to review (context):\n"""\n${resumeText}\n"""\n\nRoast it and return ONLY the JSON object.`,
      },
    ],
  });

  // A refusal is a real error (billing/parse errors are handled below/above).
  if (message.stop_reason === "refusal") {
    throw new Error("The model declined to roast this document.");
  }

  // JSON parsing safety: try/catch → Zod validation → graceful fallback.
  try {
    const textBlock = message.content.find((b) => b.type === "text");
    const parsed = extractJson(textBlock ? textBlock.text : "");
    const valid = RoastSchema.parse(parsed); // throws ZodError on mismatch
    return tidy(valid);
  } catch (err) {
    console.error("Roast validation failed, using fallback:", err?.message);
    return fallback();
  }
}
