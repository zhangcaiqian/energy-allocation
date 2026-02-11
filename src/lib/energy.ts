import { db } from "@/db";
import {
  energyCheckIns,
  dailyEnergySummaries,
  ENERGY_SCORES,
  type EnergyLevel,
} from "@/db/schema";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { format, subDays } from "date-fns";

export function getEnergyScore(level: EnergyLevel): number {
  return ENERGY_SCORES[level] ?? 0.5;
}

export function getEnergyLabel(level: EnergyLevel): string {
  const labels: Record<EnergyLevel, string> = {
    HIGH: "精力充沛",
    MEDIUM: "状态尚可",
    LOW: "有点疲惫",
    EXHAUSTED: "快没电了",
  };
  return labels[level];
}

export function getEnergyEmoji(level: EnergyLevel): string {
  const emojis: Record<EnergyLevel, string> = {
    HIGH: "🟢",
    MEDIUM: "🟡",
    LOW: "🟠",
    EXHAUSTED: "🔴",
  };
  return emojis[level];
}

export async function getTodayCheckIns(userId: string) {
  const today = format(new Date(), "yyyy-MM-dd");
  return db
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
}

export async function getRecentDailySummaries(
  userId: string,
  days: number = 7
) {
  const startDate = format(subDays(new Date(), days), "yyyy-MM-dd");
  return db
    .select()
    .from(dailyEnergySummaries)
    .where(
      and(
        eq(dailyEnergySummaries.userId, userId),
        gte(dailyEnergySummaries.date, startDate)
      )
    )
    .orderBy(desc(dailyEnergySummaries.date))
    .all();
}

export async function upsertDailySummary(userId: string, date: string) {
  const dayStart = `${date}T00:00:00`;
  const dayEnd = `${date}T23:59:59`;

  const checkIns = await db
    .select()
    .from(energyCheckIns)
    .where(
      and(
        eq(energyCheckIns.userId, userId),
        gte(energyCheckIns.checkInAt, dayStart),
        lte(energyCheckIns.checkInAt, dayEnd)
      )
    )
    .all();

  if (checkIns.length === 0) return;

  const scores = checkIns.map((c) => getEnergyScore(c.level as EnergyLevel));
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);

  // Get user reserve ratio
  const { users } = await import("@/db/schema");
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .get();
  const reserveRatio = user?.energyReserveRatio ?? 0.3;
  const belowReserve = scores.filter((s) => s < reserveRatio).length;

  // Check if summary exists
  const existing = await db
    .select()
    .from(dailyEnergySummaries)
    .where(
      and(
        eq(dailyEnergySummaries.userId, userId),
        eq(dailyEnergySummaries.date, date)
      )
    )
    .get();

  if (existing) {
    await db
      .update(dailyEnergySummaries)
      .set({
        avgScore,
        minScore,
        maxScore,
        checkInCount: checkIns.length,
        belowReserve,
      })
      .where(eq(dailyEnergySummaries.id, existing.id));
  } else {
    await db.insert(dailyEnergySummaries).values({
      id: uuidv4(),
      userId,
      date,
      avgScore,
      minScore,
      maxScore,
      checkInCount: checkIns.length,
      belowReserve,
    });
  }
}

/** Calculate the current energy level as a 0-1 value for the garden */
export function calculateCurrentEnergy(
  todayCheckIns: { level: string }[]
): number {
  if (todayCheckIns.length === 0) return 0.65; // Default to medium
  const scores = todayCheckIns.map((c) =>
    getEnergyScore(c.level as EnergyLevel)
  );
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}
