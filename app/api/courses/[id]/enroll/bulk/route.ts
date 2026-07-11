import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const VALID_ROLES = ["STUDENT", "TA", "INSTRUCTOR"] as const;
type CourseRole = (typeof VALID_ROLES)[number];

function deriveNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  if (!local) return null;

  const parts = local.split(".").filter(Boolean);
  if (parts.length === 0) return null;

  const titleCased = parts.map(
    (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
  );
  return titleCased.join(" ");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type ImportRow = { email?: string; role?: string };

type RowResult = {
  email: string;
  status: "created" | "exists" | "error";
  error?: string;
  membership?: {
    id: string;
    role: CourseRole;
    user: { id: string; email: string; name: string | null };
  };
};

export async function POST(request: Request, { params }: RouteContext) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const callerMembership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: id,
      },
    },
    select: { role: true },
  });

  if (!callerMembership || callerMembership.role !== "INSTRUCTOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { rows?: ImportRow[] };
  const rows = Array.isArray(body.rows) ? body.rows : [];

  if (!rows.length) {
    return NextResponse.json({ error: "No rows to import." }, { status: 400 });
  }

  const results: RowResult[] = [];

  for (const row of rows) {
    const email = normalizeEmail(row.email ?? "");
    const rawRole = (row.role ?? "").trim().toUpperCase();

    if (!isValidEmail(email)) {
      results.push({
        email: row.email ?? "",
        status: "error",
        error: "Invalid email address.",
      });
      continue;
    }

    if (!VALID_ROLES.includes(rawRole as CourseRole)) {
      results.push({ email, status: "error", error: `Invalid role "${row.role ?? ""}".` });
      continue;
    }
    const role = rawRole as CourseRole;

    let targetUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true },
    });

    if (!targetUser) {
      targetUser = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          name: deriveNameFromEmail(email),
        },
        select: { id: true, email: true, name: true },
      });
    }

    const existingMembership = await prisma.courseMembership.findUnique({
      where: {
        userId_courseId: {
          userId: targetUser.id,
          courseId: id,
        },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    if (existingMembership) {
      results.push({
        email,
        status: "exists",
        membership: {
          id: existingMembership.id,
          role: existingMembership.role as CourseRole,
          user: existingMembership.user,
        },
      });
      continue;
    }

    const membership = await prisma.courseMembership.create({
      data: { userId: targetUser.id, courseId: id, role },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    results.push({
      email,
      status: "created",
      membership: {
        id: membership.id,
        role: membership.role as CourseRole,
        user: membership.user,
      },
    });
  }

  return NextResponse.json({ results });
}
