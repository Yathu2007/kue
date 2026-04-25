import { Metadata } from 'next';
import { CursorSpotlight } from "@/components/cursor-spotlight";

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

        <form className="mx-auto w-full max-w-xl">
          <div
            className="queue-glow flex h-14 items-center overflow-hidden rounded-xl border border-[#4ea0ff] bg-[#dadada]"
          >
            <input
              type="email"
              placeholder="john.doe@mail.utoronto.ca"
              className="h-full flex-1 bg-transparent px-4 text-xl text-[#5f5f5f] placeholder:text-[#8f8f8f] outline-none"
              aria-label="UofT email"
            />
            <button
              type="button"
              className="mr-1 flex h-12 w-14 items-center justify-center rounded-lg bg-[#94BFFF] text-white shadow-[0_4px_10px_rgba(148,191,255,0.45)] transition-all duration-150 ease-out hover:bg-[#a5c9ff] hover:shadow-[0_6px_14px_rgba(148,191,255,0.5)] active:translate-y-[1px] active:scale-[0.97] active:shadow-[0_2px_6px_rgba(148,191,255,0.4)]"
              aria-label="Join queue"
            >
              <span className="text-3xl leading-none">→</span>
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
