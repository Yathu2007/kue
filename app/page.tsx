import { Metadata } from 'next';
import { CursorSpotlight } from "@/components/cursor-spotlight";
import Link from "next/link";

export const metadata: Metadata = {
  title: 'Kue',
  description: 'UofT Office Hours Queue',
};


export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04030D] px-6">
      <div className="subtle-bg-pattern pointer-events-none absolute inset-0" />
      <CursorSpotlight />
      <section className="relative z-10 w-full max-w-3xl text-center">
        <h1 className="mb-14 font-[family-name:var(--font-kalam)] text-7xl font-medium tracking-tight text-white sm:text-8xl">
          Kue
        </h1>

        <p className="mb-6 text-2xl font-semibold text-white sm:text-3xl">
          Join the queue now
        </p>

        <div className="mx-auto w-full max-w-xl">
          <Link
            href="/login"
            className="queue-glow mx-auto flex h-14 items-center justify-center rounded-xl border border-[#4ea0ff] bg-[#94BFFF] px-6 text-xl font-semibold text-white shadow-[0_6px_18px_rgba(148,191,255,0.35)] transition-all duration-150 ease-out hover:bg-[#a5c9ff] hover:shadow-[0_10px_24px_rgba(148,191,255,0.45)] active:translate-y-[1px] active:scale-[0.99]"
          >
            Join Kue
          </Link>
          <p className="mt-4 text-sm text-white/55">
            Sign in with your @utoronto.ca email.
          </p>
        </div>
      </section>
    </main>
  );
}
