import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const memberships = await prisma.courseMembership.findMany({
    where: { userId: user.id },
    include: { course: true },
    orderBy: { createdAt: "desc" },
  });

  const courses = memberships.map((membership) => ({
    id: membership.course.id,
    code: membership.course.code,
    name: membership.course.name,
    semester: membership.course.semester,
    role: membership.role,
  }));

  return NextResponse.json(courses);
}