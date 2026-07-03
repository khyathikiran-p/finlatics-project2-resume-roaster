import Head from "next/head";
import Header from "../components/Header";
import UploadDropzone from "../components/UploadDropzone";

const STEPS = [
  { icon: "📤", title: "Upload", text: "Drop in your resume as a PDF. It never leaves the request — we just read the text." },
  { icon: "🔥", title: "Get roasted", text: "Claude reviews it with sharp, funny, PG-13 honesty across five categories." },
  { icon: "📈", title: "Level up", text: "Walk away with a score and a short list of specific, actionable fixes." },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Resume Roaster — get roasted by AI, then fix your resume</title>
      </Head>
      <Header />

      <main className="mx-auto max-w-5xl px-6">
        {/* Hero */}
        <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-4 py-1.5 text-sm text-slate-300">
              <span className="text-ember-400">●</span> Powered by Claude
            </span>
            <h1 className="mt-6 font-display text-4xl font-bold leading-tight md:text-6xl">
              Your resume, <span className="gradient-text">roasted</span> — then rescued.
            </h1>
            <p className="mt-5 max-w-md text-lg leading-8 text-slate-300">
              Upload a PDF and get a brutally honest (but genuinely useful) AI review in about a minute.
              Scores, a roast, and the exact fixes that make it better.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#upload" className="btn-primary">Roast my resume 🔥</a>
              <a href="#how" className="btn-ghost">How it works</a>
            </div>
          </div>

          <div className="animate-float">
            <div className="card p-6">
              <p className="text-xs uppercase tracking-widest text-slate-500">Sample verdict</p>
              <p className="mt-3 font-display text-xl font-semibold text-ember-400">
                "Six 'passionate team players' and not a single number in sight."
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                {[
                  ["Impact", 42],
                  ["Clarity", 71],
                  ["Format", 63],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-slate-800/70 py-4">
                    <div className="font-display text-2xl font-bold">{v}</div>
                    <div className="text-xs text-slate-400">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Upload */}
        <section id="upload" className="scroll-mt-24 py-6">
          <h2 className="mb-6 text-center font-display text-2xl font-bold">Drop it in. Let's see what you've got.</h2>
          <UploadDropzone />
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-24 py-20">
          <h2 className="text-center font-display text-3xl font-bold">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.title} className="card p-6">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-slate-800 text-2xl">{s.icon}</div>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/60 py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-slate-500">
          Built by Khyathi Kiran Pediredla · Finlatics ANDP Project-2 · Next.js + Claude
        </div>
      </footer>
    </>
  );
}
