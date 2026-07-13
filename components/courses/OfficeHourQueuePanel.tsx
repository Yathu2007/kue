"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { QueueApiRow } from "@/lib/queue-session";

/** Matches Prisma `QueueStatus`. */
export type QueueEntryStatus =
  | "WAITING"
  | "IN_PROGRESS"
  | "RESOLVED"
  | "SKIPPED"
  | "NO_SHOW";

export type QueueRow = QueueApiRow;

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
  sessionStartIso: string;
  sessionEndIso: string;
};

const POLL_MS = 4000;

/** Notify a waiting student once they reach this position or better. */
const NOTIFY_THRESHOLD = 3;

type NotifPermission = NotificationPermission | "unsupported";

/** The student's own active (waiting or in-progress) row, if any. */
function findActiveEntry(rows: QueueRow[], userId: string) {
  return rows.find(
    (e) => e.studentId === userId && (e.status === "WAITING" || e.status === "IN_PROGRESS"),
  );
}

export function OfficeHourQueuePanel({
  courseId,
  sessionId,
  userId,
  role,
  initialEntries,
  sessionStartIso,
  sessionEndIso,
}: Props) {
  const [entries, setEntries] = useState<QueueRow[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [staffLoading, setStaffLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [notifPermission, setNotifPermission] = useState<NotifPermission>("default");
  // Seed from the SSR entries so the first poll isn't treated as a "crossing".
  const initialMine = findActiveEntry(initialEntries, userId);
  const prevStatusRef = useRef<QueueEntryStatus | null>(initialMine?.status ?? null);
  const prevRankRef = useRef<number | null>(
    initialMine && initialMine.status === "WAITING" ? initialMine.rank : null,
  );

  const queueUrl = `/api/courses/${courseId}/sessions/${sessionId}/queue`;
  const attendNextUrl = `/api/courses/${courseId}/sessions/${sessionId}/queue/attend-next`;
  const resolveCurrentUrl = `/api/courses/${courseId}/sessions/${sessionId}/queue/resolve-current`;

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

  // Sync notification permission on mount (guarded for SSR / unsupported browsers).
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  const requestNotifPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      // Must be called from a user gesture; browsers ignore it otherwise.
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    } catch {
      // Older Safari uses a callback form we don't support; leave state as-is.
    }
  }, []);

  const notify = useCallback(
    (title: string, body: string) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      try {
        // A shared tag means a newer alert replaces the last one instead of stacking.
        new Notification(title, { body, tag: `kue-queue-${sessionId}` });
      } catch {
        // Some mobile browsers only allow notifications via a service worker; ignore.
      }
    },
    [sessionId],
  );

  // Fire a notification when the student crosses into the top N, or when their turn starts.
  useEffect(() => {
    if (role !== "STUDENT") return;

    const mine = findActiveEntry(entries, userId);
    const myStatus = mine?.status ?? null;
    const myRank = mine && mine.status === "WAITING" ? mine.rank : null;

    const prevStatus = prevStatusRef.current;
    const prevRank = prevRankRef.current;

    if (myStatus === "IN_PROGRESS" && prevStatus !== "IN_PROGRESS") {
      notify("It's your turn! 🎉", "The TA is ready for you — head to the front of the line.");
    } else if (
      myStatus === "WAITING" &&
      myRank != null &&
      myRank <= NOTIFY_THRESHOLD &&
      (prevRank == null || prevRank > NOTIFY_THRESHOLD)
    ) {
      notify(
        `You're #${myRank} in the queue`,
        "You're near the front — start heading to the office hours location.",
      );
    }

    prevStatusRef.current = myStatus;
    prevRankRef.current = myRank;
  }, [entries, role, userId, notify]);

  // Surface the student's live rank in the tab title, so a backgrounded tab shows it too.
  const baseTitleRef = useRef<string | null>(null);
  useEffect(() => {
    if (baseTitleRef.current == null) baseTitleRef.current = document.title;
    const base = baseTitleRef.current;

    if (role === "STUDENT") {
      const mine = entries.find((e) => e.studentId === userId && e.status === "WAITING");
      document.title = mine?.rank != null ? `(#${mine.rank}) ${base}` : base;
    }

    return () => {
      if (baseTitleRef.current != null) document.title = baseTitleRef.current;
    };
  }, [entries, role, userId]);

  const userIsWaiting = entries.some((e) => e.studentId === userId && e.status === "WAITING");
  const userIsInProgress = entries.some((e) => e.studentId === userId && e.status === "IN_PROGRESS");
  // Recomputed on every poll-driven re-render, so the button flips without a manual refresh.
  const nowMs = Date.now();
  const sessionIsOpen =
    nowMs >= Date.parse(sessionStartIso) && nowMs <= Date.parse(sessionEndIso);
  const canJoinQueue =
    role === "STUDENT" && !userIsWaiting && !userIsInProgress;
  const hasInProgress = entries.some((e) => e.status === "IN_PROGRESS");
  const hasWaiting = entries.some((e) => e.status === "WAITING");

  async function joinQueue() {
    setLoading(true);
    setError(null);
    // Ask here: this click is a user gesture, which the permission prompt requires.
    void requestNotifPermission();
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

  async function attendNextStudent() {
    setStaffLoading(true);
    setError(null);
    try {
      const res = await fetch(attendNextUrl, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { entries?: QueueRow[]; error?: string } | null;
      if (!res.ok || !data?.entries) {
        setError(data?.error ?? "Could not start with the next student");
        return;
      }
      setEntries(data.entries);
    } catch {
      setError("Could not start with the next student");
    } finally {
      setStaffLoading(false);
    }
  }

  async function resolveCurrentStudent() {
    setStaffLoading(true);
    setError(null);
    try {
      const res = await fetch(resolveCurrentUrl, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { entries?: QueueRow[]; error?: string } | null;
      if (!res.ok || !data?.entries) {
        setError(data?.error ?? "Could not mark as resolved");
        return;
      }
      setEntries(data.entries);
    } catch {
      setError("Could not mark as resolved");
    } finally {
      setStaffLoading(false);
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
                  No active students in the queue.
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr
                  key={row.id}
                  className="row-enter border-t border-white/10 font-serif transition-colors duration-200 hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2.5 tabular-nums text-white/70">
                    {row.rank != null ? row.rank : "—"}
                  </td>
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
          userIsWaiting ? (
            <>
              <button
                type="button"
                onClick={() => void leaveQueue()}
                disabled={loading}
                className="rounded-lg border border-rose-400/50 bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-rose-600 hover:shadow-[0_4px_14px_rgba(244,63,94,0.3)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Leave Queue
              </button>
              {notifPermission === "granted" ? (
                <span className="inline-flex items-center gap-1 text-xs text-white/45">
                  <span aria-hidden>🔔</span> Alerts on — we&apos;ll ping you at #{NOTIFY_THRESHOLD}
                </span>
              ) : notifPermission === "default" ? (
                <button
                  type="button"
                  onClick={() => void requestNotifPermission()}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#4ea0ff]/40 bg-[#4ea0ff]/10 px-3 py-2 text-xs font-semibold text-[#b8d9ff] transition-all duration-200 hover:border-[#4ea0ff]/60 hover:bg-[#4ea0ff]/20 active:scale-[0.97]"
                >
                  🔔 Notify me near the front
                </button>
              ) : notifPermission === "denied" ? (
                <span className="text-xs text-white/40">
                  Notifications blocked — enable them in your browser to be alerted near the front.
                </span>
              ) : null}
            </>
          ) : canJoinQueue ? (
            <>
              <button
                type="button"
                onClick={() => void joinQueue()}
                disabled={loading || !sessionIsOpen}
                className="rounded-lg border border-emerald-400/40 bg-emerald-600/90 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-emerald-600 hover:shadow-[0_4px_14px_rgba(16,185,129,0.3)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Join Queue
              </button>
              {!sessionIsOpen ? (
                <p className="text-sm text-white/55">
                  The queue is closed — office hours are not in session right now.
                </p>
              ) : null}
            </>
          ) : userIsInProgress ? (
            <p className="text-sm text-white/55">You are being helped.</p>
          ) : null
        ) : null}

        {isStaff ? (
          <>
            <button
              type="button"
              onClick={() => void attendNextStudent()}
              disabled={staffLoading || !hasWaiting || hasInProgress}
              className="rounded-lg border border-[#4ea0ff]/45 bg-[#4ea0ff]/15 px-4 py-2 text-sm font-semibold text-[#b8d9ff] transition-all duration-200 hover:border-[#4ea0ff]/65 hover:bg-[#4ea0ff]/25 hover:shadow-[0_4px_14px_rgba(78,160,255,0.25)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Attend next student
            </button>
            <button
              type="button"
              onClick={() => void resolveCurrentStudent()}
              disabled={staffLoading || !hasInProgress}
              className="rounded-lg border border-emerald-400/40 bg-emerald-600/25 px-4 py-2 text-sm font-semibold text-emerald-100/95 transition-all duration-200 hover:bg-emerald-600/40 hover:shadow-[0_4px_14px_rgba(16,185,129,0.2)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
            >
              Resolved
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
