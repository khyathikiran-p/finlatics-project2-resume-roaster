// POST /api/roast
// Body: { fileBase64: string, fileName?: string }  (PDF encoded as base64)
// 1) decode → 2) pdf-parse text → 3) Claude roast → 4) (optional) save to DB → return
import crypto from "crypto";
import prisma, { dbEnabled } from "../../lib/db";
import { parsePdf } from "../../lib/pdfParser";
import { roastResume } from "../../lib/claude";

export const config = {
  api: { bodyParser: { sizeLimit: "8mb" } },
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Server is missing ANTHROPIC_API_KEY. Add it in the deployment's environment variables.",
    });
  }

  try {
    const { fileBase64, fileName } = req.body || {};
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return res.status(400).json({ error: "No PDF file was provided." });
    }

    const buffer = Buffer.from(fileBase64, "base64");
    if (buffer.length > 8 * 1024 * 1024) {
      return res.status(413).json({ error: "That PDF is too large (max 8 MB)." });
    }

    let text;
    try {
      text = await parsePdf(buffer);
    } catch (e) {
      return res.status(422).json({ error: "That file doesn't look like a valid PDF." });
    }

    if (!text || text.trim().length < 40) {
      return res.status(422).json({
        error: "Couldn't extract text from this PDF. If it's a scanned image, export a text-based PDF and try again.",
      });
    }

    const result = await roastResume(text);

    // Persist if a database is configured; otherwise return an ephemeral id.
    const id = crypto.randomUUID();
    let savedId = id;
    if (dbEnabled && prisma) {
      try {
        const row = await prisma.roast.create({
          data: {
            id,
            fileName: (fileName || "resume.pdf").slice(0, 200),
            overallScore: result.overallScore,
            verdict: result.verdict,
            data: result,
          },
        });
        savedId = row.id;
      } catch (e) {
        console.error("DB save failed (returning result without persistence):", e.message);
      }
    }

    return res.status(200).json({ id: savedId, persisted: dbEnabled, result });
  } catch (err) {
    console.error("Roast error:", err);
    const status = err?.status || err?.statusCode;
    const raw = String(err?.message || "");
    if (status === 401) {
      return res.status(500).json({ error: "The ANTHROPIC_API_KEY on the server is invalid." });
    }
    if (status === 429) {
      return res.status(429).json({ error: "The roaster is a little overloaded right now — try again in a moment." });
    }
    if (/credit balance is too low|billing/i.test(raw)) {
      return res.status(502).json({
        error: "The roaster is temporarily out of fuel (AI credits). Please try again later.",
      });
    }
    return res.status(500).json({ error: err?.message || "Something went wrong while roasting your resume." });
  }
}
