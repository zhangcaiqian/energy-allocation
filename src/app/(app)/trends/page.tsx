"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from "recharts";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faPenToSquare,
  faBolt,
  faTriangleExclamation,
  faCalendarDay,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

interface Summary {
  date: string;
  avgScore: number;
  minScore: number;
  maxScore: number;
  checkInCount: number;
  belowReserve: number;
}

export default function TrendsPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [days, setDays] = useState(7);
  const [reserveRatio, setReserveRatio] = useState(0.3);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [trendsRes, settingsRes] = await Promise.all([
          fetch(`/api/trends?days=${days}`),
          fetch("/api/settings"),
        ]);

        if (trendsRes.ok) {
          const data = await trendsRes.json();
          setSummaries(data.summaries || []);
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setReserveRatio(data.user?.energyReserveRatio || 0.3);
        }
      } catch (error) {
        console.error("Failed to fetch trends:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [days]);

  // Prepare chart data (reverse for chronological order)
  const chartData = [...summaries]
    .reverse()
    .map((s) => ({
      date: s.date.slice(5), // MM-DD
      fullDate: s.date,
      avg: parseFloat(s.avgScore.toFixed(2)),
      min: parseFloat(s.minScore.toFixed(2)),
      max: parseFloat(s.maxScore.toFixed(2)),
      count: s.checkInCount,
    }));

  // Stats
  const totalCheckIns = summaries.reduce((a, s) => a + s.checkInCount, 0);
  const avgEnergy =
    summaries.length > 0
      ? summaries.reduce((a, s) => a + s.avgScore, 0) / summaries.length
      : 0;
  const belowCount = summaries.reduce((a, s) => a + s.belowReserve, 0);

  // Find worst day
  const worstDay = summaries.reduce(
    (worst, s) => (s.avgScore < (worst?.avgScore || 999) ? s : worst),
    summaries[0]
  );

  return (
    <div className="px-4 pt-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[#2d2d2d]">
          <FontAwesomeIcon icon={faChartLine} className="mr-2 text-[#6b9b7a]" />
          精力趋势
        </h1>
        <p className="text-sm text-[#7a7a7a]">回顾你的精力变化</p>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        {[
          { value: 7, label: "近 7 天" },
          { value: 30, label: "近 30 天" },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setDays(option.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              days === option.value
                ? "bg-[#6b9b7a] text-white"
                : "bg-white border border-[#e8e5e0] text-[#7a7a7a] hover:bg-[#faf9f6]"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">精力曲线</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8e5e0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#7a7a7a" }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fontSize: 11, fill: "#7a7a7a" }}
                  tickLine={false}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <Tooltip
                  formatter={(value) => [
                    `${Math.round(Number(value) * 100)}%`,
                    "精力值",
                  ]}
                  labelFormatter={(label) => `日期: ${label}`}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e8e5e0",
                    fontSize: "12px",
                  }}
                />
                <ReferenceLine
                  y={reserveRatio}
                  stroke="#d9534f"
                  strokeDasharray="5 5"
                  label={{
                    value: "保留线",
                    position: "right",
                    fill: "#d9534f",
                    fontSize: 11,
                  }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="line"
                  wrapperStyle={{ fontSize: "11px", paddingBottom: "8px" }}
                />
                <Line
                  type="monotone"
                  dataKey="avg"
                  name="日均精力"
                  stroke="#6b9b7a"
                  strokeWidth={2.5}
                  dot={{ fill: "#6b9b7a", r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="min"
                  name="当日最低"
                  stroke="#e8943a"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-sm text-[#b5b0a8]">
              {loading ? (
                <span>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                  加载中...
                </span>
              ) : (
                "暂无数据，去记录一下吧"
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <FontAwesomeIcon icon={faPenToSquare} className="text-[#6b9b7a] mb-1" />
            <p className="text-2xl font-bold text-[#6b9b7a]">
              {totalCheckIns}
            </p>
            <p className="text-xs text-[#7a7a7a] mt-1">总记录次数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FontAwesomeIcon icon={faBolt} className="text-[#2d2d2d] mb-1" />
            <p className="text-2xl font-bold text-[#2d2d2d]">
              {avgEnergy > 0 ? `${Math.round(avgEnergy * 100)}%` : "--"}
            </p>
            <p className="text-xs text-[#7a7a7a] mt-1">平均精力</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FontAwesomeIcon icon={faTriangleExclamation} className="text-[#d9534f] mb-1" />
            <p className="text-2xl font-bold text-[#d9534f]">{belowCount}</p>
            <p className="text-xs text-[#7a7a7a] mt-1">透支次数</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FontAwesomeIcon icon={faCalendarDay} className="text-[#e8943a] mb-1" />
            <p className="text-2xl font-bold text-[#e8943a]">
              {worstDay ? getDayName(worstDay.date) : "--"}
            </p>
            <p className="text-xs text-[#7a7a7a] mt-1">最疲惫的一天</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getDayName(dateStr: string): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[new Date(dateStr).getDay()];
}
