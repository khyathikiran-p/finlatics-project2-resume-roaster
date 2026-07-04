import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Header from "../../components/Header";
import ScoreCircle from "../../components/ScoreCircle";
import FeedbackCard from "../../components/FeedbackCard";

// If a database is configured, load the roast server-side by id.
// Otherwise the page falls back to the sessionStorage copy the uploader saved.
export async function getServerSideProps(ctx) {
  const { id } = ctx.params;
  try {
    const { default: prisma, dbEnabled } = await import("../../lib/db");
    if (dbEnabled && prisma) {
      const row = await prisma.roast.findUnique({ where: { id } });
      if (row) {
        return {
          props: {
            id,
            result: row.roastJson,
            fileName: null,
          },
        };
      }
    }
  } catch (e) {
    // fall through to client-side sessionStorage
  }
  return { props: { id, result: null, fileName: null } };
}

export default function FeedbackPage({ id, result: serverResult, fileName: serverFileName }) {
  const [result, setResult] = useState(serverResult);
  const [fileName, setFileName] = useState(serverFileName);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (result) return;
    try {
      const cached = sessionStorage.getItem(`roast:${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setResult(parsed.result);
        setFileName(parsed.fileName || null);
        return;
      }
    } catch (_) {}
    setNotFound(true);
  }, [id, result]);

  if (notFound) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-bold">This roast has cooled off 🥶</h1>
          <p className="mt-3 text-slate-400">
            We couldn't find this result. Roasts without a database are only kept for your current session.
          </p>
          <Link href="/#upload" className="btn-primary mt-8">Roast a resume</Link>
        </main>
      </>
    );
  }

  if (!result) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-2xl px-6 py-24 text-center text-slate-400">Loading your roast…</main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Your roast — {result.overall_score}/100</title>
      </Head>
      <Header />

      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Verdict + score */}
        <section className="card grid items-center gap-8 p-8 md:grid-cols-[auto_1fr]">
          <div className="mx-auto">
            <ScoreCircle score={result.overall_score} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">The verdict</p>
            <h1 className="mt-2 font-display text-2xl font-bold text-ember-400 md:text-3xl">
              {result.verdict}
            </h1>
            {result.roast_comment && (
              <p className="mt-4 leading-relaxed text-slate-300">{result.roast_comment}</p>
            )}
            {fileName && <p className="mt-4 text-sm text-slate-500">📄 {fileName}</p>}
          </div>
        </section>

        {/* Section breakdown */}
        <section className="mt-10">
          <h2 className="mb-5 font-display text-xl font-bold">The breakdown</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {result.section_feedback.map((c) => (
              <FeedbackCard key={c.section} name={c.section} score={c.score} feedback={c.comment} />
            ))}
          </div>
        </section>

        {/* Strengths + improvements */}
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-green-400">✅ What's working</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {result.strengths.length ? (
                result.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-green-400">•</span>
                    <span>{s}</span>
                  </li>
                ))
              ) : (
                <li className="text-slate-500">Nothing jumped out. Let's fix that.</li>
              )}
            </ul>
          </div>

          <div className="card p-6">
            <h3 className="font-display text-lg font-semibold text-ember-400">🔧 Fix these next</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {result.improvements.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-ember-400">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link href="/#upload" className="btn-primary">Roast another 🔥</Link>
          <Link href="/" className="btn-ghost">Back home</Link>
        </div>
      </main>
    </>
  );
}
