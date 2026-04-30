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

  const blocking = await prisma.queueEntry.findFirst({
    where: { sessionId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (blocking) {
    return NextResponse.json(
      { error: "Resolve the current student before attending the next." },
      { status: 409 },
    );
  }

  const nextWaiting = await prisma.queueEntry.findFirst({
    where: { sessionId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  if (!nextWaiting) {
    return NextResponse.json({ error: "No students waiting in the queue." }, { status: 400 });
  }

  await prisma.queueEntry.update({
    where: { id: nextWaiting.id },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  const entries = await getQueueRowsForSession(sessionId);
  return NextResponse.json({ entries });
}
