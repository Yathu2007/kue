"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function isAllowedUofTEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith("@mail.utoronto.ca") || normalized.endsWith("@utoronto.ca")
  );
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!isAllowedUofTEmail(email)) {
      setStatus("error");
      setMessage("Use your @utoronto.ca or @mail.utoronto.ca email.");
      return;
    }

    setStatus("sending");
    const redirectTo = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Check your inbox for the sign-in link.");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#04030D] px-6">
      <div className="subtle-bg-pattern pointer-events-none absolute inset-0" />

      <section className="relative z-10 w-full max-w-xl rounded-2xl border border-white/10 bg-[#0c0b14]/90 p-8 shadow-[0_0_0_1px_rgba(78,160,255,0.06)]">
        <h1 className="font-[family-name:var(--font-kalam)] text-4xl font-medium text-white">
          Join Kue
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Sign in with your UofT email. We'll send you a magic link.
        </p>

        <form onSubmit={onSubmit} className="mt-6">
          <label className="block text-sm font-medium text-white/80">
            UofT email
          </label>
          <div className="mt-2 flex items-center overflow-hidden rounded-xl border border-[#4ea0ff]/40 bg-[#dadada]">
            <input
              type="email"
              autoComplete="email"
              placeholder="john.doe@mail.utoronto.ca"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 flex-1 bg-transparent px-4 text-base text-[#5f5f5f] placeholder:text-[#8f8f8f] outline-none"
              aria-label="UofT email"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="m-1 flex h-10 items-center justify-center rounded-lg bg-[#94BFFF] px-4 text-sm font-semibold text-white shadow-[0_4px_10px_rgba(148,191,255,0.45)] transition-all duration-150 ease-out hover:bg-[#a5c9ff] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {status === "sending" ? "Sending…" : "Send link"}
            </button>
          </div>

          {message ? (
            <p
              className={`mt-3 text-sm ${
                status === "error" ? "text-red-200" : "text-white/70"
              }`}
            >
              {message}
            </p>
          ) : null}
        </form>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 text-sm font-medium text-white/60 underline underline-offset-4 hover:text-white/80"
        >
          Back to home
        </button>
      </section>
    </main>
  );
}

