"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function UserMenu({ displayName }: { displayName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white/85"
        aria-label="User"
        title={displayName}
      >
        {initialsFromName(displayName)}
      </div>
      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/75 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </div>
  );
}

