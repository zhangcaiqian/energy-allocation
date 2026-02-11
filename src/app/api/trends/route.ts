import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRecentDailySummaries } from "@/lib/energy";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");

  const summaries = await getRecentDailySummaries(
    session.user.id,
    Math.min(days, 90) // Cap at 90 days
  );

  return NextResponse.json({ summaries });
}
