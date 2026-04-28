import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CourseCard,
  type CourseCardProps,
} from "@/components/courses/CourseCard";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard · Kue",
  description: "Your courses and office hours",
};

type MyCoursesResponse = Array<{
  id: string;
  code: string;
  name: string;
  semester: string;
  role: "STUDENT" | "TA" | "INSTRUCTOR";
}>;

function mapRole(role: MyCoursesResponse[number]["role"]): CourseCardProps["role"] {
  if (role === "STUDENT") return "student";
  if (role === "TA") return "ta";
  return "professor";
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true },
  });

  const displayName = dbUser?.name ?? user.email?.split("@")[0] ?? "there";

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = host ? `${proto}://${host}` : "http://localhost:3000";

  const coursesRes = await fetch(`${baseUrl}/api/my-courses`, {
    cache: "no-store",
    headers: {
      cookie: h.get("cookie") ?? "",
    },
  });

  const memberships = (await coursesRes.json()) as MyCoursesResponse;
  const courses: CourseCardProps[] = memberships.map((m) => ({
    code: m.code,
    title: m.name,
    term: m.semester,
    role: mapRole(m.role),
    href: "#",
  }));

  return (
    <main className="min-h-screen bg-[#04030D] px-6 py-10 text-[#ededed] sm:px-10">
      <div className="subtle-bg-pattern pointer-events-none fixed inset-0 opacity-25" />
      <div className="relative z-10 mx-auto max-w-5xl">
        <header className="mb-10 border-b border-white/10 pb-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-sm font-medium uppercase tracking-widest text-[#94BFFF]/90">
                Dashboard
              </p>
              <h1 className="mt-2 font-[family-name:var(--font-kalam)] text-4xl font-medium text-white sm:text-5xl">
                Hi, {displayName}
              </h1>
              <p className="mt-2 max-w-xl text-base text-white/60">
                Courses you belong to as a student, TA, or instructor appear
                here.
              </p>
            </div>

            <UserMenu displayName={displayName} />
          </div>
        </header>

        <section aria-labelledby="courses-heading">
          <h2
            id="courses-heading"
            className="mb-4 text-lg font-semibold text-white"
          >
            Your courses
          </h2>
          {courses.length ? (
            <ul className="grid gap-4 sm:grid-cols-2">
              {courses.map((course) => (
                <li key={course.code}>
                  <CourseCard {...course} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#0c0b14]/60 p-6 text-white/65">
              You're not enrolled in any courses yet.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
