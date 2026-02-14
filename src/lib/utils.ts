import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Timezone utilities
// ============================================================

const DEFAULT_TIMEZONE = "Asia/Shanghai";
const TZ_COOKIE_NAME = "user_timezone";

/**
 * Read the user's timezone from the `user_timezone` cookie (async).
 * Next.js 15+ requires `cookies()` to be awaited.
 * Falls back to Asia/Shanghai if the cookie is not set.
 */
export async function getUserTimezone(): Promise<string> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    const tz = cookieStore.get(TZ_COOKIE_NAME)?.value;
    if (tz) return decodeURIComponent(tz);
  } catch {
    // Not in a server context (e.g. build time), fall back
  }
  return DEFAULT_TIMEZONE;
}

/**
 * Get the current Date shifted to a given IANA timezone.
 */
export function nowInTimezone(tz: string): Date {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const tzOffset = getTimezoneOffsetMs(tz);
  return new Date(utcMs + tzOffset);
}

/**
 * Format a date as "yyyy-MM-dd" in a given timezone.
 */
export function todayInTimezone(tz: string): string {
  const d = nowInTimezone(tz);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Format a date as "yyyy-MM-dd'T'HH:mm:ss" in a given timezone.
 */
export function dateTimeInTimezone(tz: string): string {
  const d = nowInTimezone(tz);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}-${mo}-${day}T${h}:${mi}:${s}`;
}

/**
 * Get the current hour (0-23) in a given timezone.
 */
export function hourInTimezone(tz: string): number {
  return nowInTimezone(tz).getHours();
}

// ---- Convenience async wrappers (read tz from cookie automatically) ----

/** Get current Date in user's timezone (async — reads cookie). */
export async function getUserNow(): Promise<Date> {
  const tz = await getUserTimezone();
  return nowInTimezone(tz);
}

/** Get "yyyy-MM-dd" in user's timezone (async — reads cookie). */
export async function getUserToday(): Promise<string> {
  const tz = await getUserTimezone();
  return todayInTimezone(tz);
}

/** Get "yyyy-MM-ddTHH:mm:ss" in user's timezone (async — reads cookie). */
export async function getUserDateTime(): Promise<string> {
  const tz = await getUserTimezone();
  return dateTimeInTimezone(tz);
}

/** Get current hour 0-23 in user's timezone (async — reads cookie). */
export async function getUserHour(): Promise<number> {
  const tz = await getUserTimezone();
  return hourInTimezone(tz);
}

/**
 * Get timezone offset in milliseconds for a given IANA timezone.
 */
function getTimezoneOffsetMs(tz: string): number {
  const now = new Date();
  const utcStr = now.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = now.toLocaleString("en-US", { timeZone: tz });
  return new Date(tzStr).getTime() - new Date(utcStr).getTime();
}
