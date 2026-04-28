import Link from "next/link";

export type CourseCardRole = "student" | "ta" | "professor";

export type CourseCardProps = {
  code: string;
  title: string;
  role: CourseCardRole;
  term?: string;
  href?: string;
  className?: string;
};

const roleLabel: Record<CourseCardRole, string> = {
  student: "Student",
  ta: "TA",
  professor: "Instructor",
};

const roleBadgeClass: Record<CourseCardRole, string> = {
  student: "border-[#4ea0ff]/35 bg-[#4ea0ff]/10 text-[#b8d9ff]",
  ta: "border-[#94BFFF]/40 bg-[#94BFFF]/15 text-[#dceaff]",
  professor: "border-amber-400/35 bg-amber-400/10 text-amber-100",
};

export function CourseCard({
  code,
  title,
  role,
  term,
  href,
  className = "",
}: CourseCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-sm font-medium tracking-wide text-[#94BFFF]">
          {code}
        </p>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass[role]}`}
        >
          {roleLabel[role]}
        </span>
      </div>
      <h3 className="mt-3 text-lg font-semibold leading-snug text-white">
        {title}
      </h3>
      {term ? <p className="mt-2 text-sm text-white/55">{term}</p> : null}
    </>
  );

  const shellClass = `group block rounded-xl border border-[#4ea0ff]/25 bg-[#0c0b14]/90 p-5 shadow-[0_0_0_1px_rgba(78,160,255,0.06)] transition-all duration-200 ease-out hover:border-[#4ea0ff]/55 hover:bg-[#12111c] hover:shadow-[0_0_24px_rgba(78,160,255,0.18)] focus-visible:border-[#94BFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#94BFFF]/40 ${className}`;

  if (href) {
    return (
      <Link href={href} className={shellClass}>
        {inner}
      </Link>
    );
  }

  return <article className={shellClass}>{inner}</article>;
}
