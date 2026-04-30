import { NextResponse } from "next/server";
import { getQueueRowsForSession } from "@/lib/queue-session";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

async function getAuthedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function requireStaff(courseId: string, userId: string) {
  const membership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: { role: true },
  });
  return membership?.role === "TA" || membership?.role === "INSTRUCTOR" ? membership : null;
}

async function assertSessionInCourse(courseId: string, sessionId: string) {
  const session = await prisma.officeHourSession.findFirst({
    where: { id: sessionId, courseId },
    select: { id: true },
  });
  return session !== null;
}

export async function POST(_request: Request, { params }: RouteContext) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId, sessionId } = await params;

  const staff = await requireStaff(courseId, userId);
  if (!staff) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await assertSessionInCourse(courseId, sessionId);
  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const current = await prisma.queueEntry.findFirst({
    where: { sessionId, status: "IN_PROGRESS" },
    orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });

  if (!current) {
    return NextResponse.json({ error: "No student is currently being attended." }, { status: 400 });
  }

  await prisma.queueEntry.update({
    where: { id: current.id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
    },
  });

  const entries = await getQueueRowsForSession(sessionId);
  return NextResponse.json({ entries });
}
