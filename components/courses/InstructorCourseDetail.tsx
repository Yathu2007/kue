"use client";

import { useMemo, useState } from "react";

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

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "-";
  return `${start.toLocaleString()} - ${end.toLocaleTimeString()}`;
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

  const [assigneeId, setAssigneeId] = useState(staffOptions[0]?.id ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [officeHourStatus, setOfficeHourStatus] = useState<string | null>(null);
  const [officeHourError, setOfficeHourError] = useState<string | null>(null);
  const [isSubmittingOfficeHour, setIsSubmittingOfficeHour] = useState(false);

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
    setIsSubmittingEnroll(true);

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

  async function handleOfficeHourSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOfficeHourError(null);
    setOfficeHourStatus(null);
    setIsSubmittingOfficeHour(true);

    try {
      const res = await fetch(`/api/courses/${courseId}/office-hours`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assigneeId,
          startTime,
          endTime,
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

  return (
    <main className="min-h-screen bg-[#04030D] px-6 py-10 text-[#ededed] sm:px-10">
      <div className="subtle-bg-pattern pointer-events-none fixed inset-0 opacity-25" />
      <div className="relative z-10 mx-auto max-w-6xl space-y-8">
        <header className="rounded-xl border border-white/10 bg-[#0c0b14]/80 p-6">
          <h1 className="font-mono text-2xl text-[#94BFFF]">
            {course.code} - {course.name}
          </h1>
          <p className="mt-1 text-sm text-white/70">{course.semester}</p>
          <p className="mt-4 text-sm text-white/60">
            Instructor tools for enrollment and office hour setup.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-xl border border-white/10 bg-[#0c0b14]/80 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Course Enrollment</h2>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/80">
                  <tr>
                    <th className="px-3 py-2">Name</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEnrollments.map((row) => (
                    <tr key={row.id} className="border-t border-white/10 text-white/75">
                      <td className="px-3 py-2">{row.user.name ?? "-"}</td>
                      <td className="px-3 py-2">{row.user.email}</td>
                      <td className="px-3 py-2">{row.role}</td>
                    </tr>
                  ))}
                  {!sortedEnrollments.length ? (
                    <tr>
                      <td className="px-3 py-3 text-white/50" colSpan={3}>
                        No enrollments yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleEnrollSubmit} className="mt-4 flex flex-wrap gap-2">
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@example.com"
                type="email"
                required
                className="min-w-[220px] flex-1 rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
              <select
                value={enrollmentRole}
                onChange={(event) => setEnrollmentRole(event.target.value as "STUDENT" | "TA")}
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
              >
                <option value="STUDENT">Student</option>
                <option value="TA">TA</option>
              </select>
              <button
                type="submit"
                disabled={isSubmittingEnroll}
                className="rounded-md border border-[#4ea0ff]/40 bg-[#4ea0ff]/20 px-4 py-2 text-sm font-semibold text-[#dceaff] disabled:opacity-60"
              >
                +
              </button>
            </form>
            {enrollError ? <p className="mt-2 text-sm text-red-300">{enrollError}</p> : null}
            {enrollStatus ? <p className="mt-2 text-sm text-emerald-300">{enrollStatus}</p> : null}
          </article>

          <article className="rounded-xl border border-white/10 bg-[#0c0b14]/80 p-5">
            <h2 className="mb-4 text-lg font-semibold text-white">Office Hour Sessions</h2>
            <div className="overflow-x-auto rounded-lg border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-white/80">
                  <tr>
                    <th className="px-3 py-2">Instructor/TA</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Location</th>
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
                    </tr>
                  ))}
                  {!officeHours.length ? (
                    <tr>
                      <td className="px-3 py-3 text-white/50" colSpan={4}>
                        No sessions configured yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleOfficeHourSubmit} className="mt-4 grid gap-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <select
                  value={assigneeId}
                  onChange={(event) => setAssigneeId(event.target.value)}
                  required
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
                >
                  {staffOptions.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {formatName(staff.name, staff.email)} ({staff.role})
                    </option>
                  ))}
                </select>
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  placeholder="Location"
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                  required
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
                />
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                  required
                  className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white"
                />
              </div>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional title"
                className="rounded-md border border-white/20 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-white/40"
              />
              <button
                type="submit"
                disabled={isSubmittingOfficeHour || !staffOptions.length}
                className="w-fit rounded-md border border-[#4ea0ff]/40 bg-[#4ea0ff]/20 px-4 py-2 text-sm font-semibold text-[#dceaff] disabled:opacity-60"
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
          </article>
        </section>
      </div>
    </main>
  );
}
