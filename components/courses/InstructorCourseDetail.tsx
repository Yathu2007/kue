"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";

type EnrollmentRow = {
  id: string;
  role: "STUDENT" | "TA" | "INSTRUCTOR";
  user: {
    id: string;
    email: string;
    name: string | null;
  };
};

type OfficeHourRow = {
  id: string;
  title: string | null;
  startTime: string;
  endTime: string;
  location: string | null;
  assignee: {
    id: string;
    name: string | null;
    email: string;
  };
};

type StaffOption = {
  id: string;
  name: string | null;
  email: string;
  role: "TA" | "INSTRUCTOR";
};

type Props = {
  courseId: string;
  course: {
    code: string;
    name: string;
    semester: string;
  };
  initialEnrollments: EnrollmentRow[];
  initialOfficeHours: OfficeHourRow[];
  staffOptions: StaffOption[];
};

function formatName(name: string | null, email: string) {
  return name?.trim() || email;
}

function ThemedSelect({
  wrapperClassName = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }) {
  return (
    <div className={`relative ${wrapperClassName}`}>
      <select
        {...props}
        className="w-full cursor-pointer appearance-none rounded-md border border-white/20 bg-black/20 px-3 py-2 pr-9 text-sm text-white transition-all duration-200 hover:border-[#4ea0ff]/45 focus:border-[#4ea0ff]/70 focus:shadow-[0_0_14px_rgba(78,160,255,0.18)] focus:outline-none [&>option]:bg-[#0c0b14] [&>option]:text-white"
      >
        {children}
      </select>
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94BFFF]/70"
      >
        <path d="M6 8l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

const IMPORT_ROLES = ["STUDENT", "TA", "INSTRUCTOR"];

function parseEnrollmentCsv(text: string) {
  const rows: { email: string; role: string }[] = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const [emailRaw, roleRaw] = trimmed.split(",");
    const email = (emailRaw ?? "").trim();
    if (!email.includes("@")) continue; // skips a header row like "email,role"
    rows.push({ email, role: (roleRaw ?? "").trim() });
  }
  return rows;
}

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return `${start.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })} - ${end.toLocaleTimeString(undefined, { timeStyle: "short" })}`;
}

export function InstructorCourseDetail({
  courseId,
  course,
  initialEnrollments,
  initialOfficeHours,
  staffOptions,
}: Props) {
  const [enrollments, setEnrollments] = useState(initialEnrollments);
  const [officeHours, setOfficeHours] = useState(initialOfficeHours);
  const [email, setEmail] = useState("");
  const [enrollmentRole, setEnrollmentRole] = useState<"STUDENT" | "TA">(
    "STUDENT",
  );
  const [enrollStatus, setEnrollStatus] = useState<string | null>(null);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [isSubmittingEnroll, setIsSubmittingEnroll] = useState(false);
  const [deletingEnrollmentId, setDeletingEnrollmentId] = useState<string | null>(
    null,
  );
  const [deleteEnrollmentError, setDeleteEnrollmentError] = useState<
    string | null
  >(null);

  const csvInputRef = useRef<HTMLInputElement>(null);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvImportStatus, setCsvImportStatus] = useState<string | null>(null);
  const [csvImportError, setCsvImportError] = useState<string | null>(null);

  const [assigneeId, setAssigneeId] = useState(staffOptions[0]?.id ?? "");
  const [officeHourDate, setOfficeHourDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [officeHourStatus, setOfficeHourStatus] = useState<string | null>(null);
  const [officeHourError, setOfficeHourError] = useState<string | null>(null);
  const [isSubmittingOfficeHour, setIsSubmittingOfficeHour] = useState(false);
  const [deletingOfficeHourId, setDeletingOfficeHourId] = useState<string | null>(
    null,
  );
  const [deleteOfficeHourError, setDeleteOfficeHourError] = useState<
    string | null
  >(null);

  const sortedEnrollments = useMemo(
    () =>
      [...enrollments].sort((a, b) =>
        a.user.email.localeCompare(b.user.email, undefined, { sensitivity: "base" }),
      ),
    [enrollments],
  );

  async function handleEnrollSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEnrollError(null);
    setEnrollStatus(null);
    setDeleteEnrollmentError(null);
    setIsSubmittingEnroll(true);

    // DEBUG: UofT enrollment email restriction — uncomment for production.
    // {
    //   const normalized = email.trim().toLowerCase();
    //   const ok =
    //     normalized.endsWith("@mail.utoronto.ca") ||
    //     normalized.endsWith("@utoronto.ca");
    //   if (!ok) {
    //     setEnrollError("Use your @utoronto.ca or @mail.utoronto.ca email.");
    //     setIsSubmittingEnroll(false);
    //     return;
    //   }
    // }

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: enrollmentRole }),
      });

      const payload = (await res.json()) as {
        error?: string;
        message?: string;
        created?: boolean;
        membership?: EnrollmentRow;
      };

      if (!res.ok) {
        setEnrollError(payload.error ?? "Could not enroll this user.");
        return;
      }

      if (payload.membership) {
        setEnrollments((current) => {
          const existingIdx = current.findIndex((row) => row.id === payload.membership!.id);
          if (existingIdx >= 0) {
            const next = [...current];
            next[existingIdx] = payload.membership!;
            return next;
          }
          return [payload.membership!, ...current];
        });
      }

      setEnrollStatus(payload.message ?? "Enrollment saved.");
      setEmail("");
    } catch {
      setEnrollError("Network error while enrolling user.");
    } finally {
      setIsSubmittingEnroll(false);
    }
  }

  async function handleCsvImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCsvImportError(null);
    setCsvImportStatus(null);
    setIsImportingCsv(true);

    try {
      const rows = parseEnrollmentCsv(await file.text());

      if (!rows.length) {
        setCsvImportError("No valid rows found. Expected format: email,role");
        return;
      }

      const res = await fetch(`/api/courses/${courseId}/enroll/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });

      const payload = (await res.json()) as {
        error?: string;
        results?: Array<{
          email: string;
          status: "created" | "exists" | "error";
          error?: string;
          membership?: EnrollmentRow;
        }>;
      };

      if (!res.ok) {
        setCsvImportError(payload.error ?? "Could not import CSV.");
        return;
      }

      const results = payload.results ?? [];

      setEnrollments((current) => {
        let next = current;
        for (const result of results) {
          if (!result.membership) continue;
          const existingIdx = next.findIndex((row) => row.id === result.membership!.id);
          if (existingIdx >= 0) {
            next = [...next];
            next[existingIdx] = result.membership;
          } else {
            next = [result.membership, ...next];
          }
        }
        return next;
      });

      const createdCount = results.filter((r) => r.status === "created").length;
      const existsCount = results.filter((r) => r.status === "exists").length;
      const errors = results.filter((r) => r.status === "error");

      setCsvImportStatus(
        `${createdCount} enrolled, ${existsCount} already enrolled${
          errors.length ? `, ${errors.length} failed` : ""
        }.`,
      );
      if (errors.length) {
        setCsvImportError(errors.map((e) => `${e.email || "(blank)"}: ${e.error}`).join("; "));
      }
    } catch {
      setCsvImportError("Network error while importing CSV.");
    } finally {
      setIsImportingCsv(false);
    }
  }

  async function handleDeleteEnrollment(membershipId: string) {
    setDeleteEnrollmentError(null);
    setEnrollStatus(null);
    setEnrollError(null);
    setDeletingEnrollmentId(membershipId);

    try {
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipId }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; deleted?: boolean }
        | null;

      if (!res.ok) {
        setDeleteEnrollmentError(payload?.error ?? "Could not delete enrollment.");
        return;
      }

      setEnrollments((current) => current.filter((row) => row.id !== membershipId));
    } catch {
      setDeleteEnrollmentError("Network error while deleting enrollment.");
    } finally {
      setDeletingEnrollmentId(null);
    }
  }

  async function handleOfficeHourSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOfficeHourError(null);
    setOfficeHourStatus(null);
    setDeleteOfficeHourError(null);
    setIsSubmittingOfficeHour(true);

    try {
      const startDateTime = `${officeHourDate}T${startTime}`;
      const endDateTime = `${officeHourDate}T${endTime}`;
      if (
        !officeHourDate ||
        !startTime ||
        !endTime ||
        Number.isNaN(new Date(startDateTime).getTime()) ||
        Number.isNaN(new Date(endDateTime).getTime())
      ) {
        setOfficeHourError("Please choose a date, start time, and end time.");
        return;
      }
      if (new Date(endDateTime).getTime() <= new Date(startDateTime).getTime()) {
        setOfficeHourError("End time must be after start time (same day).");
        return;
      }

      const res = await fetch(`/api/courses/${courseId}/office-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId,
          startTime: startDateTime,
          endTime: endDateTime,
          location: location || null,
          title: title || null,
          recurrence: null,
        }),
      });

      const payload = (await res.json()) as {
        error?: string;
        message?: string;
        session?: OfficeHourRow;
      };

      if (!res.ok) {
        setOfficeHourError(payload.error ?? "Could not create office hour session.");
        return;
      }

      if (payload.session) {
        setOfficeHours((current) =>
          [...current, payload.session!].sort(
            (a, b) =>
              new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
          ),
        );
      }

      setOfficeHourStatus(payload.message ?? "Office hour created.");
      setOfficeHourDate("");
      setStartTime("");
      setEndTime("");
      setLocation("");
      setTitle("");
    } catch {
      setOfficeHourError("Network error while creating office hour.");
    } finally {
      setIsSubmittingOfficeHour(false);
    }
  }

  async function handleDeleteOfficeHour(sessionId: string) {
    setDeleteOfficeHourError(null);
    setOfficeHourStatus(null);
    setOfficeHourError(null);
    setDeletingOfficeHourId(sessionId);

    try {
      const res = await fetch(`/api/courses/${courseId}/office-hours`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const payload = (await res.json().catch(() => null)) as
        | { error?: string; deleted?: boolean }
        | null;

      if (!res.ok) {
        setDeleteOfficeHourError(payload?.error ?? "Could not delete office hour session.");
        return;
      }

      setOfficeHours((current) => current.filter((row) => row.id !== sessionId));
    } catch {
      setDeleteOfficeHourError("Network error while deleting office hour session.");
    } finally {
      setDeletingOfficeHourId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#04030D] px-6 py-10 text-[#ededed] sm:px-10">
      <div className="subtle-bg-pattern pointer-events-none fixed inset-0 opacity-25" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-8">
        <header className="fade-in-up rounded-xl border border-white/10 bg-[#0c0b14]/80 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
            <Link
              href={`/courses/${courseId}/sessions`}
              className="inline-flex items-center justify-center rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white/90 transition-all duration-200 hover:border-[#4ea0ff]/45 hover:bg-white/10 active:scale-[0.97]"
            >
              Student view now
            </Link>
          </div>
          <h1 className="mt-4 font-mono text-2xl text-[#94BFFF]">
            {course.code} - {course.name}
          </h1>
          <p className="mt-1 text-sm text-white/70">{course.semester}</p>
          <p className="mt-4 text-sm text-white/60">
            Instructor tools for enrollment and office hour setup.
          </p>
        </header>

        <section className="space-y-6">
          <article
            className="fade-in-up rounded-xl border border-white/10 bg-[#0c0b14]/80 p-5"
            style={{ animationDelay: "100ms" }}
          >
            <h2 className="mb-4 text-lg font-semibold text-white">
              Office Hour Sessions{" "}
              <span className="text-sm font-normal text-white/45">({officeHours.length})</span>
            </h2>
            <div className="themed-scroll max-h-80 overflow-y-auto overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#15141f] text-white/80 shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                  <tr>
                    <th className="px-3 py-2">Instructor/TA</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Location</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {officeHours.map((row) => (
                    <tr key={row.id} className="border-t border-white/10 text-white/75">
                      <td className="px-3 py-2">{formatName(row.assignee.name, row.assignee.email)}</td>
                      <td className="px-3 py-2">
                        {staffOptions.find((s) => s.id === row.assignee.id)?.role ?? "TA"}
                      </td>
                      <td className="px-3 py-2">{formatRange(row.startTime, row.endTime)}</td>
                      <td className="px-3 py-2">{row.location ?? "-"}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteOfficeHour(row.id)}
                          disabled={deletingOfficeHourId === row.id}
                          className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-200 transition-all duration-200 hover:border-red-400/50 hover:bg-red-400/20 active:scale-[0.96] disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!officeHours.length ? (
                    <tr>
                      <td className="px-3 py-3 text-white/50" colSpan={5}>
                        No sessions configured yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleOfficeHourSubmit} className="mt-4 grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <ThemedSelect
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  required
                >
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {formatName(staff.name, staff.email)} ({staff.role})
                    </option>
                  ))}
                </ThemedSelect>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Location"
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optional title"
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  type="date"
                  value={officeHourDate}
                  onChange={(event) => setOfficeHourDate(event.target.value)}
                  required
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
                />
                <input
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
                />
                <input
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmittingOfficeHour || !staffOptions.length}
                className="w-fit rounded-md border border-[#4ea0ff]/40 bg-[#4ea0ff]/20 px-4 py-2 text-sm font-semibold text-[#dceaff] transition-all duration-200 hover:border-[#4ea0ff]/60 hover:bg-[#4ea0ff]/30 hover:shadow-[0_4px_14px_rgba(78,160,255,0.2)] active:scale-[0.97] disabled:opacity-60"
              >
                +
              </button>
            </form>
            {officeHourError ? (
              <p className="mt-2 text-sm text-red-300">{officeHourError}</p>
            ) : null}
            {officeHourStatus ? (
              <p className="mt-2 text-sm text-emerald-300">{officeHourStatus}</p>
            ) : null}
            {deleteOfficeHourError ? (
              <p className="mt-2 text-sm text-red-300">{deleteOfficeHourError}</p>
            ) : null}
          </article>

          <article
            className="fade-in-up rounded-xl border border-white/10 bg-[#0c0b14]/80 p-5"
            style={{ animationDelay: "180ms" }}
          >
            <h2 className="mb-4 text-lg font-semibold text-white">
              Course Enrollment{" "}
              <span className="text-sm font-normal text-white/45">({enrollments.length})</span>
            </h2>
            <div className="themed-scroll max-h-80 overflow-y-auto overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[#15141f] text-white/80 shadow-[0_1px_0_rgba(255,255,255,0.1)]">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEnrollments.map((row) => (
                    <tr key={row.id} className="border-t border-white/10 text-white/75">
                      <td className="px-3 py-2">{row.user.name ?? "-"}</td>
                      <td className="px-3 py-2">{row.user.email}</td>
                      <td className="px-3 py-2">{row.role}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteEnrollment(row.id)}
                          disabled={deletingEnrollmentId === row.id}
                          className="rounded-md border border-red-400/30 bg-red-400/10 px-3 py-1 text-xs font-semibold text-red-200 transition-all duration-200 hover:border-red-400/50 hover:bg-red-400/20 active:scale-[0.96] disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!sortedEnrollments.length ? (
                    <tr>
                      <td className="px-3 py-3 text-white/50" colSpan={4}>
                        No enrollments yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleEnrollSubmit} className="mt-4 flex flex-wrap gap-2">
              {/* DEBUG: UofT-only enrollment on the input — merge these onto <input> when re-enabling:
                  pattern=".+@(mail\\.)?utoronto\\.ca$"
                  title="Use your @utoronto.ca or @mail.utoronto.ca email."
              */}
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@example.com"
                type="email"
                required
                className="min-w-[220px] flex-1 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
              <ThemedSelect
                value={enrollmentRole}
                onChange={(event) => setEnrollmentRole(event.target.value as "STUDENT" | "TA")}
              >
                <option value="STUDENT">Student</option>
                <option value="TA">TA</option>
              </ThemedSelect>
              <button
                type="submit"
                disabled={isSubmittingEnroll}
                className="rounded-md border border-[#4ea0ff]/40 bg-[#4ea0ff]/20 px-4 py-2 text-sm font-semibold text-[#dceaff] transition-all duration-200 hover:border-[#4ea0ff]/60 hover:bg-[#4ea0ff]/30 hover:shadow-[0_4px_14px_rgba(78,160,255,0.2)] active:scale-[0.97] disabled:opacity-60"
              >
                +
              </button>
            </form>
            {enrollError ? <p className="mt-2 text-sm text-red-300">{enrollError}</p> : null}
            {enrollStatus ? <p className="mt-2 text-sm text-emerald-300">{enrollStatus}</p> : null}
            {deleteEnrollmentError ? (
              <p className="mt-2 text-sm text-red-300">{deleteEnrollmentError}</p>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleCsvImport}
              />
              <button
                type="button"
                onClick={() => csvInputRef.current?.click()}
                disabled={isImportingCsv}
                className="rounded-md border border-[#4ea0ff]/40 bg-[#4ea0ff]/20 px-4 py-2 text-sm font-semibold text-[#dceaff] transition-all duration-200 hover:border-[#4ea0ff]/60 hover:bg-[#4ea0ff]/30 hover:shadow-[0_4px_14px_rgba(78,160,255,0.2)] active:scale-[0.97] disabled:opacity-60"
              >
                {isImportingCsv ? "Importing..." : "Import from CSV"}
              </button>
              <span className="text-xs text-white/50">
                Format: email,role — role is {IMPORT_ROLES.join("/").toLowerCase()}
              </span>
            </div>
            {csvImportError ? <p className="mt-2 text-sm text-red-300">{csvImportError}</p> : null}
            {csvImportStatus ? (
              <p className="mt-2 text-sm text-emerald-300">{csvImportStatus}</p>
            ) : null}
          </article>
        </section>
      </div>
    </main>
  );
}
