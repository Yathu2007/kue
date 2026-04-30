"use client";

import { useCallback, useEffect, useState } from "react";

/** Matches Prisma `QueueStatus`. */
export type QueueEntryStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "SKIPPED"
  | "NO_SHOW";

export type QueueRow = {
  id: string;
  rank: number;
  displayName: string;
  studentId: string;
  status: QueueEntryStatus;
};

function statusBadgeClass(status: QueueEntryStatus) {
  switch (status) {
    case "WAITING":
      return "border-sky-400/35 bg-sky-500/15 text-sky-200/95";
    case "IN_PROGRESS":
      return "border-amber-400/35 bg-amber-500/15 text-amber-100/95";
    case "RESOLVED":
      return "border-emerald-400/35 bg-emerald-500/15 text-emerald-100/95";
    case "SKIPPED":
      return "border-white/20 bg-white/10 text-white/70";
    case "NO_SHOW":
      return "border-rose-400/30 bg-rose-500/15 text-rose-200/90";
    default:
      return "border-white/15 bg-white/5 text-white/60";
  }
}

function statusLabel(status: QueueEntryStatus) {
  switch (status) {
    case "WAITING":
      return "Waiting";
    case "IN_PROGRESS":
      return "In progress";
    case "RESOLVED":
      return "Resolved";
    case "SKIPPED":
      return "Skipped";
    case "NO_SHOW":
      return "No show";
    default:
      return status;
  }
}

function QueueStatusBadge({ status }: { status: QueueEntryStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium tabular-nums ${statusBadgeClass(status)}`}
    >
      {statusLabel(status)}
    </span>
  );
}

type Props = {
  courseId: string;
  sessionId: string;
  userId: string;
  role: "STUDENT" | "TA" | "INSTRUCTOR";
  initialEntries: QueueRow[];
};

const POLL_MS = 4000;

export function OfficeHourQueuePanel({ courseId, sessionId, userId, role, initialEntries }: Props) {
  const [entries, setEntries] = useState<QueueRow[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queueUrl = `/api/courses/${courseId}/sessions/${sessionId}/queue`;

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(queueUrl, { method: "GET", cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not load queue");
        return;
      }
      const data = (await res.json()) as { entries: QueueRow[] };
      setEntries(data.entries);
      setError(null);
    } catch {
      setError("Could not load queue");
    }
  }, [queueUrl]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const inQueue = entries.some((e) => e.studentId === userId && e.status === "WAITING");

  async function joinQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(queueUrl, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { entries?: QueueRow[]; error?: string } | null;
      if (!res.ok || !data?.entries) {
        setError(data?.error ?? "Could not join queue");
        return;
      }
      setEntries(data.entries);
    } catch {
      setError("Could not join queue");
    } finally {
      setLoading(false);
    }
  }

  async function leaveQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(queueUrl, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { entries?: QueueRow[]; error?: string } | null;
      if (!res.ok || !data?.entries) {
        setError(data?.error ?? "Could not leave queue");
        return;
      }
      setEntries(data.entries);
    } catch {
      setError("Could not leave queue");
    } finally {
      setLoading(false);
    }
  }

  const isStaff = role === "TA" || role === "INSTRUCTOR";

  return (
    <div className="mt-6 space-y-4">
      {error ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200/90">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-white/10">
        <table className="w-full border-collapse text-left text-sm text-white/80">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.04] text-xs font-semibold uppercase tracking-wide text-white/55">
              <th className="px-3 py-2.5 font-serif">Rank</th>
              <th className="px-3 py-2.5 font-serif">Name</th>
              <th className="px-3 py-2.5 font-serif">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-white/50 font-serif">
                  No one is waiting right now.
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-white/10 font-serif transition hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2.5 tabular-nums text-white/70">{row.rank}</td>
                  <td className="px-3 py-2.5 text-white/85">{row.displayName}</td>
                  <td className="px-3 py-2.5">
                    <QueueStatusBadge status={row.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {role === "STUDENT" ? (
          inQueue ? (
            <button
              type="button"
              onClick={() => void leaveQueue()}
              disabled={loading}
              className="rounded-lg border border-rose-400/50 bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Leave Queue
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void joinQueue()}
              disabled={loading}
              className="rounded-lg border border-emerald-400/40 bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Join Queue
            </button>
          )
        ) : null}

        {isStaff ? (
          <button
            type="button"
            onClick={() => {}}
            className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:border-white/25 hover:bg-white/10"
          >
            Pop
          </button>
        ) : null}
      </div>
    </div>
  );
}
