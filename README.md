# 🔥 Resume Roaster — AI Resume Roaster

Upload your resume as a PDF and get a **brutally honest (but genuinely useful)** AI review — a score, a roast, and the exact fixes that make it better.

Built for the **Finlatics ANDP — Project 2 (AI Resume Roaster)**.

🔗 **Live:** https://finlatics-project2-resume-roaster-enigmame.vercel.app
💻 **Repo:** https://github.com/khyathikiran-p/finlatics-project2-resume-roaster

---

## What it does

1. **Upload** a resume PDF (drag & drop).
2. The server extracts the text with **pdf-parse**.
3. **Claude** (`@anthropic-ai/sdk`) reviews it and returns a structured roast: an overall score, a one-line verdict, a witty roast, five category scores, strengths, and specific improvements.
4. Results render on a shareable feedback page (and are saved to Postgres if a database is configured).

## Tech stack

- **Next.js 14** (Pages Router) + **React 18**
- **@anthropic-ai/sdk** — Claude (`claude-opus-4-8` by default) with a structured 4-layer prompt
- **pdf-parse** — PDF → text extraction
- **Zod** — validates Claude's JSON output with a graceful fallback
- **NextAuth.js** — GitHub / Google OAuth; `/api/roast` protected with `getServerSession`
- **Prisma + Supabase (Postgres)** — `roasts` table persistence
- **Tailwind CSS** — styling · **Vercel** — deployment

> The app is built to **work with only `ANTHROPIC_API_KEY` set**. Persistence and sign-in switch on automatically when their env vars are present — no code changes needed.

## How it meets the Project-2 rubric

| Requirement | Implementation |
| --- | --- |
| PDF upload via API route | `pages/api/roast.js` uses Next.js built-in body parsing (base64 JSON, 8 MB) |
| Text extraction | `lib/pdfParser.js` → **pdf-parse** |
| 4-layer Claude prompt | `lib/claude.js`: **(1) Role** "brutally honest resume critic", **(2) Context** parsed resume text, **(3) Instructions** clarity/impact/buzzwords/formatting/skills, **(4) Output** strict JSON (`overall_score`, `roast_comment`, `section_feedback`) |
| Auth + protected route | **NextAuth** GitHub/Google provider; `getServerSession` gates `/api/roast` when a provider is configured |
| Supabase `roasts` schema | `prisma/schema.prisma` → table `roasts` (`id`, `user_id`, `resume_text`, `roast_json`, `created_at`); each result persisted after Claude responds |
| JSON parsing safety | `try/catch` → **Zod** `RoastSchema.parse()` → graceful fallback object if invalid |
| Rate limiting | `lib/rateLimit.js` — sliding-window counter keyed by user session or IP on `/api/roast` |
| Secret handling | `ANTHROPIC_API_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`, OAuth secrets read **server-side only** (API routes / `getServerSideProps`); never `NEXT_PUBLIC_`, never returned to the client |

## Getting started (local)

```bash
npm install
cp .env.example .env      # add your ANTHROPIC_API_KEY
npm run dev               # http://localhost:3000
```

### Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | ✅ | Calls Claude. Get one at [console.anthropic.com](https://console.anthropic.com/settings/keys). |
| `ANTHROPIC_MODEL` | — | Override the model (default `claude-opus-4-8`). |
| `DATABASE_URL` | — | Supabase Postgres URL. Enables saving roasts + NextAuth DB sessions. |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | — | Required only if you enable auth. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | — | Enable Google sign-in. |
| `NEXT_PUBLIC_AUTH_ENABLED` | — | `true` to show the Sign-in button. |

### Enabling the database (optional)

1. Create a project at [supabase.com](https://supabase.com) → copy the Postgres **connection string**.
2. Set `DATABASE_URL` in `.env`.
3. Push the schema:
   ```bash
   npx prisma db push
   ```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import it at [vercel.com](https://vercel.com) → **Add New Project**.
3. Add the `ANTHROPIC_API_KEY` environment variable (and any optional ones).
4. Deploy. Vercel auto-detects Next.js — no extra config needed.

## Project structure

```
├── pages/
│   ├── index.js              # landing + upload
│   ├── upload.js             # dedicated upload page
│   ├── feedback/[id].js      # roast results
│   └── api/
│       ├── roast.js          # PDF → text → Claude → (DB) → JSON
│       └── auth/[...nextauth].js
├── lib/
│   ├── claude.js             # Anthropic SDK wrapper (the roast prompt)
│   ├── pdfParser.js          # pdf-parse wrapper
│   ├── db.js                 # Prisma client (DB-optional)
│   └── auth.js               # NextAuth options
├── components/               # Header, UploadDropzone, ScoreCircle, FeedbackCard
├── prisma/schema.prisma      # Roast + NextAuth models
└── styles/globals.css        # Tailwind
```

## Notes

- Uploaded PDFs are parsed in-memory to extract text and are **not stored**.
- The roast is meant to be funny — it never comments on personal or protected attributes, only on resume content.

---

© Khyathi Kiran Pediredla · MIT License
