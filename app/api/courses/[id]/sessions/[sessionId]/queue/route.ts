import { NextResponse } from "next/server";
import { getQueueRowsForSession } from "@/lib/queue-session";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string; sessionId: string }>;
};

const COURSE_ROLES = ["STUDENT", "TA", "INSTRUCTOR"] as const;

async function getAuthedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function requireCourseAccess(courseId: string, userId: string) {
  const membership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: { role: true },
  });

  if (!membership || !COURSE_ROLES.includes(membership.role as (typeof COURSE_ROLES)[number])) {
    return null;
  }
  return membership;
}

async function assertSessionInCourse(courseId: string, sessionId: string) {
  const session = await prisma.officeHourSession.findFirst({
    where: { id: sessionId, courseId },
    select: { id: true },
  });
  return session !== null;
}

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId, sessionId } = await params;

  const membership = await requireCourseAccess(courseId, userId);
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await assertSessionInCourse(courseId, sessionId);
  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const entries = await getQueueRowsForSession(sessionId);
  return NextResponse.json({ entries });
}

export async function POST(_request: Request, { params }: RouteContext) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId, sessionId } = await params;

  const membership = await requireCourseAccess(courseId, userId);
  if (!membership || membership.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await assertSessionInCourse(courseId, sessionId);
  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const inProgress = await prisma.queueEntry.findFirst({
    where: { sessionId, studentId: userId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  if (inProgress) {
    return NextResponse.json({ error: "You are already being attended." }, { status: 409 });
  }

  const existing = await prisma.queueEntry.findFirst({
    where: {
      sessionId,
      studentId: userId,
      status: "WAITING",
    },
    select: { id: true },
  });

  if (!existing) {
    await prisma.queueEntry.create({
      data: {
        sessionId,
        studentId: userId,
        status: "WAITING",
      },
    });
  }

  const entries = await getQueueRowsForSession(sessionId);
  return NextResponse.json({ entries, joined: !existing });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: courseId, sessionId } = await params;

  const membership = await requireCourseAccess(courseId, userId);
  if (!membership || membership.role !== "STUDENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ok = await assertSessionInCourse(courseId, sessionId);
  if (!ok) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const result = await prisma.queueEntry.deleteMany({
    where: {
      sessionId,
      studentId: userId,
      status: "WAITING",
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not in queue" }, { status: 404 });
  }

  const entries = await getQueueRowsForSession(sessionId);
  return NextResponse.json({ entries });
}
