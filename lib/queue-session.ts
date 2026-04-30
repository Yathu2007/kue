import { queueStudentDisplayName } from "@/lib/queue-display";
import { prisma } from "@/lib/prisma";

/** Active rows for the live queue: in-progress first, then waiting (FIFO) with ranks only for waiting. */
export type QueueApiRow = {
  id: string;
  rank: number | null;
  displayName: string;
  studentId: string;
  status: "WAITING" | "IN_PROGRESS" | "RESOLVED" | "SKIPPED" | "NO_SHOW";
};

export async function getQueueRowsForSession(sessionId: string): Promise<QueueApiRow[]> {
  const [inProgress, waiting] = await Promise.all([
    prisma.queueEntry.findMany({
      where: { sessionId, status: "IN_PROGRESS" },
      orderBy: [{ startedAt: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        studentId: true,
        status: true,
        student: { select: { name: true } },
      },
    }),
    prisma.queueEntry.findMany({
      where: { sessionId, status: "WAITING" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        studentId: true,
        status: true,
        student: { select: { name: true } },
      },
    }),
  ]);

  const rows: QueueApiRow[] = [];

  for (const e of inProgress) {
    rows.push({
      id: e.id,
      rank: null,
      displayName: queueStudentDisplayName(e.student.name),
      studentId: e.studentId,
      status: e.status,
    });
  }

  for (let i = 0; i < waiting.length; i++) {
    const e = waiting[i];
    rows.push({
      id: e.id,
      rank: i + 1,
      displayName: queueStudentDisplayName(e.student.name),
      studentId: e.studentId,
      status: e.status,
    });
  }

  return rows;
}
