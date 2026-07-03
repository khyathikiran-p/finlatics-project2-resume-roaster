# 🔥 Resume Roaster — AI Resume Roaster

Upload your resume as a PDF and get a **brutally honest (but genuinely useful)** AI review — a score, a roast, and the exact fixes that make it better.

Built for the **Finlatics ANDP — Project 2 (AI Resume Roaster)**.

🔗 **Live:** _add your Vercel URL here_
💻 **Repo:** https://github.com/khyathikiran-p/finlatics-project2-resume-roaster

---

## What it does

1. **Upload** a resume PDF (drag & drop).
2. The server extracts the text with **pdf-parse**.
3. **Claude** (`@anthropic-ai/sdk`) reviews it and returns a structured roast: an overall score, a one-line verdict, a witty roast, five category scores, strengths, and specific improvements.
4. Results render on a shareable feedback page (and are saved to Postgres if a database is configured).

## Tech stack

- **Next.js 14** (Pages Router) + **React 18**
- **@anthropic-ai/sdk** — Claude (`claude-opus-4-8` by default)
- **pdf-parse** — PDF → text extraction
- **NextAuth.js** — optional Google sign-in (guest mode by default)
- **Prisma + Supabase (Postgres)** — optional roast history & auth storage
- **Tailwind CSS** — styling
- **Vercel** — deployment

> The app is built to **work with only `ANTHROPIC_API_KEY` set**. Database persistence and Google login switch on automatically when their env vars are present — no code changes needed.

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
