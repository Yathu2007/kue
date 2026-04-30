import { NextResponse } from "next/server";
import { queueStudentDisplayName } from "@/lib/queue-display";
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

  const entries = await prisma.queueEntry.findMany({
    where: {
      sessionId,
      status: "WAITING",
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      studentId: true,
      status: true,
      student: { select: { name: true } },
    },
  });

  const rows = entries.map((e, index) => ({
    id: e.id,
    rank: index + 1,
    displayName: queueStudentDisplayName(e.student.name),
    studentId: e.studentId,
    status: e.status,
  }));

  return NextResponse.json({ entries: rows });
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

  const existing = await prisma.queueEntry.findFirst({
    where: {
      sessionId,
      studentId: userId,
      status: "WAITING",
    },
    select: {
      id: true,
      student: { select: { name: true } },
    },
  });

  if (existing) {
    const entries = await prisma.queueEntry.findMany({
      where: { sessionId, status: "WAITING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        studentId: true,
        status: true,
        student: { select: { name: true } },
      },
    });
    const rows = entries.map((e, index) => ({
      id: e.id,
      rank: index + 1,
      displayName: queueStudentDisplayName(e.student.name),
      studentId: e.studentId,
      status: e.status,
    }));
    return NextResponse.json({ entries: rows, joined: false });
  }

  await prisma.queueEntry.create({
    data: {
      sessionId,
      studentId: userId,
      status: "WAITING",
    },
  });

  const entries = await prisma.queueEntry.findMany({
    where: { sessionId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      studentId: true,
      status: true,
      student: { select: { name: true } },
    },
  });
  const rows = entries.map((e, index) => ({
    id: e.id,
    rank: index + 1,
    displayName: queueStudentDisplayName(e.student.name),
    studentId: e.studentId,
    status: e.status,
  }));

  return NextResponse.json({ entries: rows, joined: true });
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

  const entries = await prisma.queueEntry.findMany({
    where: { sessionId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      studentId: true,
      status: true,
      student: { select: { name: true } },
    },
  });
  const rows = entries.map((e, index) => ({
    id: e.id,
    rank: index + 1,
    displayName: queueStudentDisplayName(e.student.name),
    studentId: e.studentId,
    status: e.status,
  }));

  return NextResponse.json({ entries: rows });
}
