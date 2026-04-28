import { NextResponse } from "next/server";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/prisma/generated/prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma =
  globalThis.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? request.headers.get("x-user-id");

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized", hint: "Provide userId in query or x-user-id." },
      { status: 401 },
    );
  }

  const memberships = await prisma.courseMembership.findMany({
    where: { userId },
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