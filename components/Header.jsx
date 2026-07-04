import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

const AUTH_ENABLED = process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-ember-400 to-ember-600 text-slate-950">
            🔥
          </span>
          <span>
            Resume<span className="text-ember-400">Roaster</span>
          </span>
        </Link>

        <div className="flex items-center gap-3 text-sm">
          <a
            href="https://github.com/khyathikiran-p"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden text-slate-400 transition hover:text-ember-400 sm:inline"
          >
            GitHub
          </a>

          {AUTH_ENABLED &&
            (session ? (
              <div className="flex items-center gap-3">
                {session.user?.image && (
                  <img src={session.user.image} alt="" className="h-8 w-8 rounded-full border border-slate-700" />
                )}
                <button onClick={() => signOut()} className="rounded-lg border border-slate-700 px-3 py-1.5 transition hover:border-ember-400 hover:text-ember-400">
                  Sign out
                </button>
              </div>
            ) : (
              <button onClick={() => signIn()} className="rounded-lg border border-slate-700 px-3 py-1.5 transition hover:border-ember-400 hover:text-ember-400">
                Sign in
              </button>
            ))}
        </div>
      </nav>
    </header>
  );
}
