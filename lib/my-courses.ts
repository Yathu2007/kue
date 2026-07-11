import { prisma } from "@/lib/prisma";

export type MyCourse = {
  id: string;
  code: string;
  name: string;
  semester: string;
  role: "STUDENT" | "TA" | "INSTRUCTOR";
};

/** Courses the user belongs to, newest membership first. Shared by /api/my-courses and the dashboard. */
export async function getCoursesForUser(userId: string): Promise<MyCourse[]> {
  const memberships = await prisma.courseMembership.findMany({
    where: { userId },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  return memberships.map((membership) => ({
    id: membership.course.id,
    code: membership.course.code,
    name: membership.course.name,
    semester: membership.course.semester,
    role: membership.role as MyCourse["role"],
  }));
}
