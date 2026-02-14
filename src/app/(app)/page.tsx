"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSeedling,
  faPenToSquare,
  faSun,
  faMoon,
  faCloudSun,
  faCloud,
} from "@fortawesome/free-solid-svg-icons";
import {
  faFaceSmile,
  faFaceMeh,
  faFaceFrown,
  faFaceTired,
} from "@fortawesome/free-regular-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

// Lazy load 3D garden for performance
const GardenScene = dynamic(
  () => import("@/components/garden/garden-scene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] max-h-[400px] rounded-2xl bg-gradient-to-b from-[#e8f3ec] to-[#d4e8da] flex items-center justify-center">
        <p className="text-[#6b9b7a] text-sm animate-pulse">花园加载中...</p>
      </div>
    ),
  }
);

interface CheckIn {
  id: string;
  level: string;
  checkInAt: string;
  aiResponse: string | null;
}

const levelIcons: Record<string, { icon: IconDefinition; color: string }> = {
  HIGH: { icon: faFaceSmile, color: "text-[#5cb85c]" },
  MEDIUM: { icon: faFaceMeh, color: "text-[#f0ad4e]" },
  LOW: { icon: faFaceFrown, color: "text-[#e8943a]" },
  EXHAUSTED: { icon: faFaceTired, color: "text-[#d9534f]" },
};

const levelLabels: Record<string, string> = {
  HIGH: "精力充沛",
  MEDIUM: "状态尚可",
  LOW: "有点疲惫",
  EXHAUSTED: "快没电了",
};

const ENERGY_SCORES: Record<string, number> = {
  HIGH: 1.0,
  MEDIUM: 0.65,
  LOW: 0.35,
  EXHAUSTED: 0.1,
};

export default function HomePage() {
  const { data: session } = useSession();
  const [todayCheckIns, setTodayCheckIns] = useState<CheckIn[]>([]);
  const [energyLevel, setEnergyLevel] = useState<number | null>(null);
  const [reserveRatio, setReserveRatio] = useState(0.3);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [checkInRes, settingsRes] = await Promise.all([
        fetch("/api/checkin"),
        fetch("/api/settings"),
      ]);

      let newEnergy: number | null = null;
      let newRatio = 0.3;
      let newCheckIns: CheckIn[] = [];

      if (checkInRes.ok) {
        const data = await checkInRes.json();
        newCheckIns = data.todayCheckIns || [];

        if (newCheckIns.length > 0) {
          // 以最近一次记录为准，反映当下状态
          const latestLevel = newCheckIns[0].level;
          newEnergy = ENERGY_SCORES[latestLevel] ?? 0.5;
        }
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        newRatio = data.user?.energyReserveRatio || 0.3;
      }

      setTodayCheckIns(newCheckIns);
      setEnergyLevel(newEnergy);
      setReserveRatio(newRatio);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Only compute greeting on client to avoid SSR/hydration mismatch
  // (Vercel server is UTC, user is Asia/Shanghai)
  const greeting = mounted ? getGreeting() : { text: "", icon: faSun };
  const latestResponse = todayCheckIns[0]?.aiResponse;
  const hasRecords = todayCheckIns.length > 0;

  return (
    <div className="px-4 pt-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[#7a7a7a]">
            <FontAwesomeIcon icon={greeting.icon} className="mr-1.5" />
            {greeting.text}
          </p>
          <h1 className="text-xl font-bold text-[#2d2d2d]">
            {session?.user?.name || "你好"}
          </h1>
        </div>
        {hasRecords && (
          <div className="text-right">
            <p className="text-xs text-[#b5b0a8]">今日记录</p>
            <p className="text-lg font-bold text-[#6b9b7a]">
              {todayCheckIns.length} 次
            </p>
          </div>
        )}
      </div>

      {/* 3D Garden */}
      <GardenScene
        energyLevel={energyLevel ?? 0.5}
        reserveRatio={reserveRatio}
      />

      {/* Energy Summary — only show when there are records */}
      {hasRecords && energyLevel !== null ? (
        <div className="flex items-center justify-center gap-2">
          <FontAwesomeIcon
            icon={levelIcons[todayCheckIns[0].level]?.icon || faFaceMeh}
            className={`text-lg ${levelIcons[todayCheckIns[0].level]?.color || "text-[#b5b0a8]"}`}
          />
          <span className="text-sm text-[#7a7a7a]">当前精力</span>
          <span className="text-2xl font-bold text-[#2d2d2d]">
            {Math.round(energyLevel * 100)}%
          </span>
          <span className="text-xs text-[#b5b0a8]">
            保留线 {Math.round(reserveRatio * 100)}%
          </span>
        </div>
      ) : (
        !loading && (
          <div className="text-center py-2">
            <p className="text-sm text-[#b5b0a8]">
              花园在等待你的觉察
            </p>
          </div>
        )
      )}

      {/* Check-in Button */}
      <Link href="/check-in">
        <Button size="lg" className="w-full text-base">
          <FontAwesomeIcon icon={faPenToSquare} className="mr-2" />
          {hasRecords ? "再记录一次" : "开始今天的第一次觉察"}
        </Button>
      </Link>

      {/* Latest AI Response */}
      {latestResponse && (
        <Card className="bg-[#f8f7f4] border-[#e8e5e0]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon
                icon={faSeedling}
                className="text-xl text-[#6b9b7a] mt-1"
              />
              <div>
                <p className="text-xs text-[#b5b0a8] mb-1">知秋说</p>
                <p className="text-sm text-[#2d2d2d] leading-relaxed">
                  {latestResponse}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Today Timeline */}
      {hasRecords && (
        <div>
          <h2 className="text-sm font-medium text-[#7a7a7a] mb-3">
            今日记录
          </h2>
          <div className="space-y-2">
            {todayCheckIns.map((checkIn) => (
              <div
                key={checkIn.id}
                className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-[#e8e5e0]"
              >
                <FontAwesomeIcon
                  icon={levelIcons[checkIn.level]?.icon || faFaceMeh}
                  className={`text-lg ${levelIcons[checkIn.level]?.color || "text-[#b5b0a8]"}`}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#2d2d2d]">
                    {levelLabels[checkIn.level] || checkIn.level}
                  </p>
                </div>
                <span className="text-xs text-[#b5b0a8]">
                  {checkIn.checkInAt?.split("T")[1]?.slice(0, 5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !hasRecords && (
        <Card className="bg-[#f8f7f4] border-dashed border-[#d4d0c8]">
          <CardContent className="p-6 text-center">
            <FontAwesomeIcon
              icon={faSeedling}
              className="text-3xl text-[#6b9b7a] mb-2"
            />
            <p className="text-sm text-[#7a7a7a]">
              今天还没有记录，去记录一下吧
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getGreeting(): { text: string; icon: IconDefinition } {
  const hour = new Date().getHours();
  if (hour < 6) return { text: "夜深了", icon: faMoon };
  if (hour < 11) return { text: "早上好", icon: faSun };
  if (hour < 14) return { text: "中午好", icon: faCloudSun };
  if (hour < 18) return { text: "下午好", icon: faCloud };
  if (hour < 22) return { text: "晚上好", icon: faMoon };
  return { text: "夜深了", icon: faMoon };
}
