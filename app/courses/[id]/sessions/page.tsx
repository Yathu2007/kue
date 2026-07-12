import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  OfficeHourSessionsTable,
  type OfficeHourSessionRow,
} from "@/components/courses/OfficeHourSessionsTable";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const course = await prisma.course.findUnique({
    where: { id },
    select: { code: true, name: true },
  });
  if (!course) return { title: "Course · Kue" };
  return {
    title: `${course.code} · Office hours · Kue`,
    description: `Office hour sessions for ${course.name}`,
  };
}

function formatAssigneeName(name: string | null, email: string) {
  return name?.trim() || email;
}

function membershipRoleToLabel(role: "INSTRUCTOR" | "TA" | "STUDENT" | undefined) {
  if (role === "INSTRUCTOR") return "instr";
  if (role === "TA") return "ta";
  return "—";
}

export default async function CourseOfficeHourSessionsPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id: courseId } = await params;

  const membership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId,
      },
    },
    include: {
      course: true,
    },
  });

  if (
    !membership ||
    (membership.role !== "STUDENT" &&
      membership.role !== "TA" &&
      membership.role !== "INSTRUCTOR")
  ) {
    redirect("/dashboard");
  }

  const sessions = await prisma.officeHourSession.findMany({
    where: { courseId },
    include: {
      instructor: {
        select: { id: true, email: true, name: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  const sessionIds = sessions.map((s) => s.id);
  const assigneeIds = [...new Set(sessions.map((s) => s.instructorId))];

  const [queueCounts, staffMemberships] = await Promise.all([
    sessionIds.length
      ? prisma.queueEntry.groupBy({
          by: ["sessionId"],
          where: {
            sessionId: { in: sessionIds },
            status: "WAITING",
          },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    assigneeIds.length
      ? prisma.courseMembership.findMany({
          where: {
            courseId,
            userId: { in: assigneeIds },
          },
          select: { userId: true, role: true },
        })
      : Promise.resolve([]),
  ]);

  const waitingBySession = new Map(
    queueCounts.map((row) => [row.sessionId, row._count._all]),
  );

  const roleByUserId = new Map(
    staffMemberships.map((m) => [m.userId, m.role as "INSTRUCTOR" | "TA" | "STUDENT"]),
  );

  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  });
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  });

  const now = new Date();

  const rows: OfficeHourSessionRow[] = sessions.map((session) => {
    const assigneeRole = roleByUserId.get(session.instructorId);
    const start = session.startTime;
    const end = session.endTime;

    return {
      id: session.id,
      assigneeDisplayName: formatAssigneeName(
        session.instructor.name,
        session.instructor.email,
      ),
      assigneeRoleLabel: membershipRoleToLabel(assigneeRole),
      dateLabel: dateFormatter.format(start),
      startLabel: timeFormatter.format(start),
      endLabel: timeFormatter.format(end),
      locationDisplay: session.location?.trim() || "—",
      waitingCount: waitingBySession.get(session.id) ?? 0,
      isActive: now >= start && now <= end,
    };
  });

  const { course } = membership;

  return (
    <main className="min-h-screen bg-[#04030D] px-6 py-10 text-[#ededed] sm:px-10">
      <div className="subtle-bg-pattern pointer-events-none fixed inset-0 opacity-25" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-8">
        <header className="fade-in-up rounded-xl border border-white/10 bg-[#0c0b14]/80 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <Link
                href="/dashboard"
                className="group inline-flex items-center gap-2 text-sm text-white/70 transition-colors duration-200 hover:text-white"
              >
                <span
                  aria-hidden
                  className="transition-transform duration-200 group-hover:-translate-x-0.5"
                >
                  ←
                </span>
                Back to dashboard
              </Link>
              <h1 className="mt-4 font-mono text-2xl text-[#94BFFF]">
                {course.code} - {course.name}
              </h1>
              <p className="mt-1 text-sm text-white/70">{course.semester}</p>
            </div>
            {membership.role === "INSTRUCTOR" ? (
              <Link
                href={`/courses/${courseId}`}
                className="shrink-0 self-start rounded-lg border border-amber-400/35 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition-all duration-200 hover:border-amber-400/55 hover:bg-amber-400/15 active:scale-[0.97]"
              >
                Instructor tools
              </Link>
            ) : null}
          </div>
          <h2 className="mt-6 text-lg font-semibold text-white">Office hour sessions</h2>
        </header>

        <div className="fade-in-up" style={{ animationDelay: "120ms" }}>
          <OfficeHourSessionsTable
            courseId={courseId}
            rows={rows}
            viewerIsStaff={membership.role !== "STUDENT"}
          />
        </div>
      </div>
    </main>
  );
}
