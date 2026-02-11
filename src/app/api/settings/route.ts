import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const user = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      energyReserveRatio: users.energyReserveRatio,
      checkInTimes: users.checkInTimes,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .get();

  if (!user) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { energyReserveRatio, checkInTimes, name } = await request.json();

  const updates: Record<string, unknown> = {};
  if (energyReserveRatio !== undefined) {
    const ratio = parseFloat(energyReserveRatio);
    if (ratio < 0.2 || ratio > 0.5) {
      return NextResponse.json(
        { error: "保留比例应在 20% - 50% 之间" },
        { status: 400 }
      );
    }
    updates.energyReserveRatio = ratio;
  }
  if (checkInTimes !== undefined) {
    updates.checkInTimes = checkInTimes;
  }
  if (name !== undefined) {
    updates.name = name;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "没有要更新的内容" }, { status: 400 });
  }

  await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id));

  return NextResponse.json({ message: "设置已更新" });
}
