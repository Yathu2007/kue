import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { OfficeHourQueuePanel } from "@/components/courses/OfficeHourQueuePanel";
import { queueStudentDisplayName } from "@/lib/queue-display";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string; sessionId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id, sessionId } = await params;
  const session = await prisma.officeHourSession.findFirst({
    where: { id: sessionId, courseId: id },
    include: {
      course: { select: { code: true } },
    },
  });
  if (!session) return { title: "Queue · Kue" };
  return {
    title: `${session.course.code} · Queue · Kue`,
    description: "Office hour queue",
  };
}

function formatName(name: string | null, email: string) {
  return name?.trim() || email;
}

export default async function OfficeHourQueuePlaceholderPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id: courseId, sessionId } = await params;

  const membership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId,
      },
    },
    select: { role: true },
  });

  if (
    !membership ||
    (membership.role !== "STUDENT" &&
      membership.role !== "TA" &&
      membership.role !== "INSTRUCTOR")
  ) {
    redirect("/dashboard");
  }

  const session = await prisma.officeHourSession.findFirst({
    where: { id: sessionId, courseId },
    include: {
      course: { select: { code: true, name: true, semester: true } },
      instructor: { select: { name: true, email: true } },
    },
  });

  if (!session) {
    redirect(`/courses/${courseId}/sessions`);
  }

  const waitingEntries = await prisma.queueEntry.findMany({
    where: { sessionId, status: "WAITING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      studentId: true,
      student: { select: { name: true } },
    },
  });

  const initialQueueRows = waitingEntries.map((e, index) => ({
    id: e.id,
    rank: index + 1,
    displayName: queueStudentDisplayName(e.student.name),
    studentId: e.studentId,
  }));

  const range = `${session.startTime.toLocaleString()} – ${session.endTime.toLocaleString()}`;

  return (
    <main className="min-h-screen bg-[#04030D] px-6 py-10 text-[#ededed] sm:px-10">
      <div className="subtle-bg-pattern pointer-events-none fixed inset-0 opacity-25" />
      <div className="relative z-10 mx-auto max-w-2xl space-y-6">
        <Link
          href={`/courses/${courseId}/sessions`}
          className="inline-flex items-center gap-2 text-sm text-white/70 transition hover:text-white"
        >
          <span aria-hidden>←</span>
          Back to office hour sessions
        </Link>

        <article className="rounded-xl border border-white/10 bg-[#0c0b14]/80 p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-[#94BFFF]/90">
            {session.course.code}
          </p>
          <h1 className="mt-2 text-xl font-semibold text-white">Queue</h1>
          <p className="mt-2 text-sm text-white/65">
            With {formatName(session.instructor.name, session.instructor.email)}
          </p>
          <p className="mt-1 text-sm text-white/55">{range}</p>
          {session.location ? (
            <p className="mt-2 text-sm text-white/55">{session.location}</p>
          ) : null}

          <OfficeHourQueuePanel
            courseId={courseId}
            sessionId={sessionId}
            userId={user.id}
            role={membership.role}
            initialEntries={initialQueueRows}
          />
        </article>
      </div>
    </main>
  );
}
