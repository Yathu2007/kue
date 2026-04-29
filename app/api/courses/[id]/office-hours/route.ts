import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getAuthedUserId() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function requireInstructor(courseId: string, userId: string) {
  const membership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId,
        courseId,
      },
    },
    select: { role: true },
  });

  return membership?.role === "INSTRUCTOR";
}

export async function POST(request: Request, { params }: RouteContext) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const allowed = await requireInstructor(id, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    assigneeId?: string;
    startTime?: string;
    endTime?: string;
    location?: string | null;
    title?: string | null;
    recurrence?: unknown;
  };

  if (body.recurrence) {
    return NextResponse.json(
      { error: "Recurring office hours are not supported yet." },
      { status: 400 },
    );
  }

  if (!body.assigneeId || !body.startTime || !body.endTime) {
    return NextResponse.json(
      { error: "Assignee, start time, and end time are required." },
      { status: 400 },
    );
  }

  const start = parseDate(body.startTime);
  const end = parseDate(body.endTime);
  if (!start || !end) {
    return NextResponse.json({ error: "Invalid date value." }, { status: 400 });
  }

  if (end <= start) {
    return NextResponse.json(
      { error: "End time must be after start time." },
      { status: 400 },
    );
  }

  const assigneeMembership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId: body.assigneeId,
        courseId: id,
      },
    },
    include: {
      user: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  if (
    !assigneeMembership ||
    (assigneeMembership.role !== "INSTRUCTOR" && assigneeMembership.role !== "TA")
  ) {
    return NextResponse.json(
      { error: "Assignee must be a TA or instructor in this course." },
      { status: 400 },
    );
  }

  const session = await prisma.officeHourSession.create({
    data: {
      courseId: id,
      instructorId: assigneeMembership.userId,
      title: body.title?.trim() || null,
      startTime: start,
      endTime: end,
      location: body.location?.trim() || null,
    },
    include: {
      instructor: {
        select: { id: true, email: true, name: true },
      },
    },
  });

  return NextResponse.json({
    message: "Office hour session created.",
    session: {
      id: session.id,
      title: session.title,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      location: session.location,
      assignee: session.instructor,
    },
  });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const allowed = await requireInstructor(id, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sessions = await prisma.officeHourSession.findMany({
    where: { courseId: id },
    include: {
      instructor: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(
    sessions.map((session) => ({
      id: session.id,
      title: session.title,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime.toISOString(),
      location: session.location,
      assignee: session.instructor,
    })),
  );
}

export async function DELETE(request: Request, { params }: RouteContext) {
  const userId = await getAuthedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const allowed = await requireInstructor(id, userId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { sessionId?: string };
  if (!body.sessionId) {
    return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
  }

  const existing = await prisma.officeHourSession.findUnique({
    where: { id: body.sessionId },
    select: { id: true, courseId: true },
  });

  if (!existing || existing.courseId !== id) {
    return NextResponse.json({ error: "Office hour session not found." }, { status: 404 });
  }

  await prisma.officeHourSession.delete({ where: { id: existing.id } });
  return NextResponse.json({ deleted: true });
}
