import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { energyCheckIns } from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { streamCheckInResponse } from "@/lib/llm";
import { getRecentDailySummaries, upsertDailySummary } from "@/lib/energy";
import { selectQuestion, getCurrentPeriod } from "@/lib/questions";
import { getUserToday, getUserDateTime } from "@/lib/utils";

// GET - get today's check-ins and a question
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const today = await getUserToday(); // User timezone (from cookie)

  // Get today's check-ins
  const todayCheckIns = await db
    .select()
    .from(energyCheckIns)
    .where(
      and(
        eq(energyCheckIns.userId, userId),
        gte(energyCheckIns.checkInAt, `${today}T00:00:00`),
        lte(energyCheckIns.checkInAt, `${today}T23:59:59`)
      )
    )
    .orderBy(desc(energyCheckIns.checkInAt))
    .all();

  // Select a question
  const period = await getCurrentPeriod();
  const recentIds = todayCheckIns
    .slice(0, 3)
    .map((c) => c.question)
    .filter(Boolean);

  const question = selectQuestion(period, recentIds);

  return NextResponse.json({
    todayCheckIns,
    question,
    period,
  });
}

// POST - submit a check-in with streaming AI response
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const userId = session.user.id;
  const { level, question, note } = await request.json();

  if (!level || !question) {
    return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
  }

  const checkInAt = await getUserDateTime(); // User timezone (from cookie)
  const today = await getUserToday();

  // Get context for LLM
  const todayCheckIns = await db
    .select()
    .from(energyCheckIns)
    .where(
      and(
        eq(energyCheckIns.userId, userId),
        gte(energyCheckIns.checkInAt, `${today}T00:00:00`),
        lte(energyCheckIns.checkInAt, `${today}T23:59:59`)
      )
    )
    .orderBy(desc(energyCheckIns.checkInAt))
    .all();

  const recentSummaries = await getRecentDailySummaries(userId, 3);

  // Prepare check-in record (save after streaming finishes)
  const checkInId = uuidv4();

  // Create a streaming response that also saves to DB when done
  const llmStream = streamCheckInResponse(
    level,
    question,
    todayCheckIns.map((c) => ({
      level: c.level,
      checkInAt: c.checkInAt,
    })),
    recentSummaries.map((s) => ({
      date: s.date,
      avgScore: s.avgScore,
      minScore: s.minScore,
    }))
  );

  // Wrap the LLM stream to collect the full text and save to DB after completion
  const encoder = new TextEncoder();
  let fullResponse = "";

  const wrappedStream = new ReadableStream({
    async start(controller) {
      const reader = llmStream.getReader();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode the chunk to collect full text
          const text = new TextDecoder().decode(value);
          fullResponse += text;

          // Forward to client
          controller.enqueue(value);
        }

        // Stream finished — save check-in to DB with full response
        try {
          await db.insert(energyCheckIns).values({
            id: checkInId,
            userId,
            level,
            question,
            note: note || null,
            aiResponse: fullResponse,
            checkInAt,
          });
          await upsertDailySummary(userId, today);
          console.log(`[CheckIn] ✓ 记录已保存 id=${checkInId}, level=${level}`);
        } catch (dbError) {
          console.error("[CheckIn] ✗ 保存失败:", dbError);
        }

        // Send a final marker so the client knows we're done
        controller.enqueue(encoder.encode(""));
        controller.close();
      } catch (error) {
        console.error("[CheckIn] Stream error:", error);
        controller.close();
      }
    },
  });

  return new Response(wrappedStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
