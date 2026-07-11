import { NextResponse } from "next/server";
import { getCoursesForUser } from "@/lib/my-courses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courses = await getCoursesForUser(user.id);
  return NextResponse.json(courses);
}
