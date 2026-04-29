import { redirect } from "next/navigation";
import { InstructorCourseDetail } from "@/components/courses/InstructorCourseDetail";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PageProps = {
  params: {
    id: string;
  };
};

export default async function CourseDetailPage({ params }: PageProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { id } = await params;

  const membership = await prisma.courseMembership.findUnique({
    where: {
      userId_courseId: {
        userId: user.id,
        courseId: id,
      },
    },
    include: {
      course: true,
    },
  });

  if (!membership || membership.role !== "INSTRUCTOR") {
    redirect("/dashboard");
  }

  const [enrollments, officeHours] = await Promise.all([
    prisma.courseMembership.findMany({
      where: { courseId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.officeHourSession.findMany({
      where: { courseId: id },
      include: {
        instructor: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const staffOptions = enrollments
    .filter((row) => row.role === "INSTRUCTOR" || row.role === "TA")
    .map((row) => ({
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      role: row.role as "INSTRUCTOR" | "TA",
    }));

  return (
    <InstructorCourseDetail
      courseId={membership.courseId}
      course={{
        code: membership.course.code,
        name: membership.course.name,
        semester: membership.course.semester,
      }}
      initialEnrollments={enrollments.map((row) => ({
        id: row.id,
        role: row.role,
        user: {
          id: row.user.id,
          email: row.user.email,
          name: row.user.name,
        },
      }))}
      initialOfficeHours={officeHours.map((row) => ({
        id: row.id,
        title: row.title,
        startTime: row.startTime.toISOString(),
        endTime: row.endTime.toISOString(),
        location: row.location,
        assignee: {
          id: row.instructor.id,
          name: row.instructor.name,
          email: row.instructor.email,
        },
      }))}
      staffOptions={staffOptions}
    />
  );
}
