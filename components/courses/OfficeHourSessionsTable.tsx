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
};

type Props = {
  courseId: string;
  rows: OfficeHourSessionRow[];
};

export function OfficeHourSessionsTable({ courseId, rows }: Props) {
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
              className="border-t border-white/10 text-white/75 transition hover:bg-white/[0.03]"
            >
              <td className="px-3 py-3">{row.assigneeDisplayName}</td>
              <td className="px-3 py-3">{row.assigneeRoleLabel}</td>
              <td className="px-3 py-3">{row.dateLabel}</td>
              <td className="px-3 py-3">{row.startLabel}</td>
              <td className="px-3 py-3">{row.endLabel}</td>
              <td className="max-w-[200px] truncate px-3 py-3" title={row.locationDisplay}>
                {row.locationDisplay}
              </td>
              <td className="px-3 py-3 tabular-nums text-rose-300/90">{row.waitingCount}</td>
              <td className="px-3 py-3">
                <Link
                  href={`/courses/${courseId}/sessions/${row.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#4ea0ff]/40 bg-[#4ea0ff]/10 px-3 py-1.5 text-xs font-semibold text-[#b8d9ff] transition hover:border-[#4ea0ff]/60 hover:bg-[#4ea0ff]/20"
                >
                  Open queue
                  <span aria-hidden>→</span>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
