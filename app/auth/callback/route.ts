import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function titleCase(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function deriveNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(".").filter(Boolean);
  if (parts.length >= 2) {
    return `${titleCase(parts[0])} ${titleCase(parts[1])}`;
  }
  return titleCase(local);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const derivedName = deriveNameFromEmail(user.email);
      await prisma.user.upsert({
        where: { id: user.id },
        update: {
          email: user.email,
          name: derivedName,
        },
        create: {
          id: user.id,
          email: user.email,
          name: derivedName,
        },
      });
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}

