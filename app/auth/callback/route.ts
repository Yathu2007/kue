import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

function titleCase(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function deriveNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  const parts = local.split(".").filter(Boolean);
  if (parts.length >= 2) {
    return `${titleCase(parts[0])} ${titleCase(parts[1])}`;
  }
  return titleCase(local);
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user?.email) {
      const normalizedEmail = user.email.trim().toLowerCase();
      const derivedName = deriveNameFromEmail(normalizedEmail);

      await prisma.$transaction(async (tx) => {
        const preEnrolled = await tx.user.findUnique({
          where: { email: normalizedEmail },
        });

        // #region agent log
        fetch("http://127.0.0.1:7292/ingest/83df7abe-461e-4679-bb9b-ba365b99b749", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Debug-Session-Id": "44d3e8",
          },
          body: JSON.stringify({
            sessionId: "44d3e8",
            hypothesisId: "H1",
            location: "auth/callback:merge-lookup",
            message: "preEnrolled vs auth user",
            data: {
              hasPreEnrolled: Boolean(preEnrolled),
              preIdTail: preEnrolled?.id?.slice(-8),
              authIdTail: user.id?.slice(-8),
              idsDiffer: Boolean(preEnrolled && preEnrolled.id !== user.id),
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion

        if (preEnrolled && preEnrolled.id !== user.id) {
          const authRowBefore = await tx.user.findUnique({
            where: { id: user.id },
            select: { id: true },
          });
          // #region agent log
          fetch("http://127.0.0.1:7292/ingest/83df7abe-461e-4679-bb9b-ba365b99b749", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "44d3e8",
            },
            body: JSON.stringify({
              sessionId: "44d3e8",
              hypothesisId: "H1",
              location: "auth/callback:before-merge-reassign",
              message: "auth user row must exist before FK updates",
              data: { authRowExists: Boolean(authRowBefore) },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion

          const mergeSlotEmail = `__merge_${preEnrolled.id}@__kue.internal`;
          await tx.user.update({
            where: { id: preEnrolled.id },
            data: { email: mergeSlotEmail },
          });
          await tx.user.upsert({
            where: { id: user.id },
            update: {
              email: normalizedEmail,
              name: derivedName,
            },
            create: {
              id: user.id,
              email: normalizedEmail,
              name: derivedName,
            },
          });
          await tx.courseMembership.updateMany({
            where: { userId: preEnrolled.id },
            data: { userId: user.id },
          });
          await tx.officeHourSession.updateMany({
            where: { instructorId: preEnrolled.id },
            data: { instructorId: user.id },
          });
          await tx.queueEntry.updateMany({
            where: { studentId: preEnrolled.id },
            data: { studentId: user.id },
          });
          await tx.account.updateMany({
            where: { userId: preEnrolled.id },
            data: { userId: user.id },
          });
          await tx.session.updateMany({
            where: { userId: preEnrolled.id },
            data: { userId: user.id },
          });
          await tx.user.delete({ where: { id: preEnrolled.id } });
          // #region agent log
          fetch("http://127.0.0.1:7292/ingest/83df7abe-461e-4679-bb9b-ba365b99b749", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "44d3e8",
            },
            body: JSON.stringify({
              sessionId: "44d3e8",
              hypothesisId: "H1",
              location: "auth/callback:merge-done",
              message: "placeholder merged into auth user",
              data: { ok: true },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        } else {
          await tx.user.upsert({
            where: { id: user.id },
            update: {
              email: normalizedEmail,
              name: derivedName,
            },
            create: {
              id: user.id,
              email: normalizedEmail,
              name: derivedName,
            },
          });
          // #region agent log
          fetch("http://127.0.0.1:7292/ingest/83df7abe-461e-4679-bb9b-ba365b99b749", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Debug-Session-Id": "44d3e8",
            },
            body: JSON.stringify({
              sessionId: "44d3e8",
              hypothesisId: "H4",
              location: "auth/callback:simple-upsert",
              message: "no merge path",
              data: { ok: true },
              timestamp: Date.now(),
            }),
          }).catch(() => {});
          // #endregion
        }
      });
    }
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}

