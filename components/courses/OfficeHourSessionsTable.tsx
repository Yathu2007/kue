import Link from "next/link";

export type OfficeHourSessionRow = {
  id: string;
  assigneeDisplayName: string;
  assigneeRoleLabel: string;
  dateLabel: string;
  startLabel: string;
  endLabel: string;
  locationDisplay: string;
  waitingCount: number;
  isActive: boolean;
};

type Props = {
  courseId: string;
  rows: OfficeHourSessionRow[];
  /** Staff can open a closed session's queue to manage it; students cannot. */
  viewerIsStaff?: boolean;
};

function SessionStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        isActive
          ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100/95"
          : "border-white/20 bg-white/10 text-white/50"
      }`}
    >
      {isActive ? "Active" : "Closed"}
    </span>
  );
}

export function OfficeHourSessionsTable({ courseId, rows, viewerIsStaff = false }: Props) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0c0b14]/80 p-8 text-center text-white/55">
        No office hour sessions are scheduled yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0c0b14]/80">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/5 text-white/80">
          <tr>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">Inst/TA name</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">Role</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">Date</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">OH start</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">OH end</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">OH location</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">Status</th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold text-rose-400">
              No. of students in queue
            </th>
            <th className="whitespace-nowrap px-3 py-3 font-semibold">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="row-enter border-t border-white/10 text-white/75 transition-colors duration-200 hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3">{row.assigneeDisplayName}</td>
              <td className="px-3 py-3">{row.assigneeRoleLabel}</td>
              <td className="px-3 py-3">{row.dateLabel}</td>
              <td className="px-3 py-3">{row.startLabel}</td>
              <td className="px-3 py-3">{row.endLabel}</td>
              <td className="max-w-[200px] truncate px-3 py-3" title={row.locationDisplay}>
                {row.locationDisplay}
              </td>
              <td className="px-3 py-3">
                <SessionStatusBadge isActive={row.isActive} />
              </td>
              <td className="px-3 py-3 tabular-nums text-rose-300/90">{row.waitingCount}</td>
              <td className="px-3 py-3">
                {row.isActive || viewerIsStaff ? (
                  <Link
                    href={`/courses/${courseId}/sessions/${row.id}`}
                    className="group inline-flex items-center gap-1 rounded-lg border border-[#4ea0ff]/40 bg-[#4ea0ff]/10 px-3 py-1.5 text-xs font-semibold text-[#b8d9ff] transition-all duration-200 hover:border-[#4ea0ff]/60 hover:bg-[#4ea0ff]/20 hover:shadow-[0_4px_14px_rgba(78,160,255,0.2)] active:scale-[0.97]"
                  >
                    Open queue
                    <span
                      aria-hidden
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </Link>
                ) : (
                  <span
                    className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/35"
                    title="Office hours are not in session right now."
                  >
                    Open queue
                    <span aria-hidden>→</span>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
