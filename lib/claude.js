// AI layer for the roaster.
//
// Primary provider is Anthropic Claude (@anthropic-ai/sdk) with a structured
// 4-layer prompt. Because Claude requires paid credits, this layer ALSO supports
// free providers — Groq and Google Gemini — so the app works without a paid key.
//
// Provider selection (env AI_PROVIDER, else auto by which key is present):
//   AI_PROVIDER = anthropic | groq | gemini
//   auto: GROQ_API_KEY → groq · GEMINI_API_KEY → gemini · else anthropic
//
// Every provider gets the SAME prompt and its JSON output is validated with Zod.
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

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
const userMessage = (resumeText) =>
  `Here is the resume text to review (context):\n"""\n${resumeText}\n"""\n\nRoast it and return ONLY the JSON object.`;

// ── Zod schema — validates the shape of the model's JSON output ──
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

// ── Providers — each returns the model's raw text output ─────

async function callClaude(resumeText) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-opus-4-8",
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage(resumeText) }],
  });
  if (message.stop_reason === "refusal") throw new Error("The model declined to roast this document.");
  const block = message.content.find((b) => b.type === "text");
  return block ? block.text : "";
}

async function callGroq(resumeText) {
  // Groq is OpenAI-compatible and free (console.groq.com).
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.85,
      max_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage(resumeText) },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Groq error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content || "";
}

async function callGemini(resumeText) {
  // Google Gemini free tier (aistudio.google.com).
  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userMessage(resumeText) }] }],
      generationConfig: { temperature: 0.85, responseMimeType: "application/json", maxOutputTokens: 2000 },
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Gemini error ${res.status}: ${t.slice(0, 200)}`);
  }
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "";
}

async function callProvider(provider, resumeText) {
  if (provider === "groq") return callGroq(resumeText);
  if (provider === "gemini") return callGemini(resumeText);
  return callClaude(resumeText);
}

// Ordered list of providers to try: the forced/primary one first (AI_PROVIDER),
// then every other provider that has a key configured — so a runtime failure of
// one provider automatically falls back to the next.
function providerOrder() {
  const available = [];
  if (process.env.GROQ_API_KEY) available.push("groq");
  if (process.env.GEMINI_API_KEY) available.push("gemini");
  if (process.env.ANTHROPIC_API_KEY) available.push("anthropic");
  const forced = (process.env.AI_PROVIDER || "").toLowerCase();
  if (forced) return [forced, ...available.filter((p) => p !== forced)];
  return available.length ? available : ["anthropic"];
}

export async function roastResume(resumeText) {
  const order = providerOrder();
  let networkErr;

  for (const provider of order) {
    let rawText;
    try {
      rawText = await callProvider(provider, resumeText);
    } catch (err) {
      // provider unreachable / rate-limited / bad key → try the next one
      console.error(`Provider "${provider}" failed:`, err?.message);
      networkErr = err;
      continue;
    }

    // A provider responded. JSON parsing safety: try/catch → Zod → graceful fallback.
    try {
      const parsed = extractJson(rawText);
      const valid = RoastSchema.parse(parsed);
      return tidy(valid);
    } catch (parseErr) {
      console.error(`Validation failed (provider="${provider}"), using fallback:`, parseErr?.message);
      return fallback();
    }
  }

  // No provider even responded — surface the error to the API route.
  throw networkErr || new Error("No AI provider is configured.");
}
