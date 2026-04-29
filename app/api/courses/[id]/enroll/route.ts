import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: {
    id: string;
  };
};

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

  const body = (await request.json()) as { email?: string; role?: string };
  const rawEmail = body.email ?? "";
  const email = normalizeEmail(rawEmail);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }

  // DEBUG: UofT enrollment email restriction — uncomment for production.
  // if (
  //   !email.endsWith("@mail.utoronto.ca") &&
  //   !email.endsWith("@utoronto.ca")
  // ) {
  //   return NextResponse.json(
  //     { error: "Use your @utoronto.ca or @mail.utoronto.ca email." },
  //     { status: 400 },
  //   );
  // }

  const role = body.role === "TA" ? "TA" : "STUDENT";

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
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (existingMembership) {
    return NextResponse.json({
      created: false,
      message: "User is already enrolled in this course.",
      membership: {
        id: existingMembership.id,
        role: existingMembership.role,
        user: existingMembership.user,
      },
    });
  }

  const membership = await prisma.courseMembership.create({
    data: {
      userId: targetUser.id,
      courseId: id,
      role,
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return NextResponse.json({
    created: true,
    message: "Enrollment created.",
    membership: {
      id: membership.id,
      role: membership.role,
      user: membership.user,
    },
  });
}
