import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  CourseCard,
  type CourseCardProps,
} from "@/components/courses/CourseCard";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard · Kue",
  description: "Your courses and office hours",
};

const demoCourses: CourseCardProps[] = [
  {
    code: "CSC108",
    title: "Introduction to Computer Programming",
    role: "student",
    term: "Winter 2026",
    href: "#",
  },
  {
    code: "MAT137",
    title: "Calculus with Proofs",
    role: "ta",
    term: "Winter 2026",
    href: "#",
  },
  {
    code: "ECE361",
    title: "Computer Networks I",
    role: "professor",
    term: "Winter 2026",
    href: "#",
  },
];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "there";

  return (
    <main className="min-h-screen bg-[#04030D] px-6 py-10 text-[#ededed] sm:px-10">
      <div className="subtle-bg-pattern pointer-events-none fixed inset-0 opacity-25" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-10 border-b border-white/10 pb-8">
          <p className="text-sm font-medium uppercase tracking-widest text-[#94BFFF]/90">
            Dashboard
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-kalam)] text-4xl font-medium text-white sm:text-5xl">
            Hi, {displayName}
          </h1>
          <p className="mt-2 max-w-xl text-base text-white/60">
            Courses you belong to as a student, TA, or instructor appear here.
          </p>
        </header>

        <section aria-labelledby="courses-heading">
          <h2
            id="courses-heading"
            className="mb-4 text-lg font-semibold text-white"
          >
            Your courses
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {demoCourses.map((course) => (
              <li key={course.code}>
                <CourseCard {...course} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
