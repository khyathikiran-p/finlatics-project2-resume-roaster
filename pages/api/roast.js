// POST /api/roast
// Body: { fileBase64: string, fileName?: string }  (PDF encoded as base64)
// Flow: auth gate → rate limit → decode → pdf-parse → Claude roast → (DB) → return
//
// All secrets (ANTHROPIC_API_KEY, DATABASE_URL, NEXTAUTH_SECRET, OAuth creds)
// are read from server-side env only — this route never returns them and they
// are never bundled into client code.
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions, authConfigured } from "../../lib/auth";
import { rateLimit, clientKey } from "../../lib/rateLimit";
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

  // ── Auth gate — prevent unauthenticated abuse when OAuth is configured ──
  let session = null;
  if (authConfigured) {
    session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: "Please sign in to roast a resume." });
    }
  }

  // ── Rate limit (per user session, else per IP) ──
  const rl = rateLimit(`roast:${clientKey(req, session)}`);
  if (!rl.ok) {
    res.setHeader("Retry-After", String(rl.retryAfter));
    return res.status(429).json({ error: `Whoa, slow down 🔥 Try again in ${rl.retryAfter}s.` });
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      error: "Server has no AI provider configured. Set ANTHROPIC_API_KEY, GROQ_API_KEY, or GEMINI_API_KEY.",
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

    const result = await roastResume(text); // validated (or graceful fallback)

    // ── Persist to the Supabase `roasts` table when a DB is configured ──
    const id = crypto.randomUUID();
    let savedId = id;
    if (dbEnabled && prisma) {
      try {
        const row = await prisma.roast.create({
          data: {
            id,
            userId: session?.user?.id || null,
            resumeText: text,
            roastJson: result,
          },
        });
        savedId = row.id;
      } catch (e) {
        console.error("DB save failed (returning result without persistence):", e.message);
      }
    }

    return res.status(200).json({ id: savedId, persisted: dbEnabled, fileName: fileName || null, result });
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
