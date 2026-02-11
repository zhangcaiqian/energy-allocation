"use client";

import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSeedling,
  faUser,
  faEnvelope,
  faClock,
  faPlus,
  faTrash,
  faRightFromBracket,
  faCheck,
  faLeaf,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reserveRatio, setReserveRatio] = useState(30);
  const [checkInTimes, setCheckInTimes] = useState("09:00,12:30,18:00,22:00");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setName(data.user.name || "");
          setEmail(data.user.email || "");
          setReserveRatio(Math.round(data.user.energyReserveRatio * 100));
          setCheckInTimes(data.user.checkInTimes || "09:00,12:30,18:00,22:00");
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          energyReserveRatio: reserveRatio / 100,
          checkInTimes,
        }),
      });

      if (res.ok) {
        setMessage("saved");
        setTimeout(() => setMessage(""), 2000);
      } else {
        const data = await res.json();
        setMessage(data.error || "保存失败");
      }
    } catch {
      setMessage("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const timeSlots = checkInTimes.split(",").map((t) => t.trim());

  const updateTimeSlot = (index: number, value: string) => {
    const newSlots = [...timeSlots];
    newSlots[index] = value;
    setCheckInTimes(newSlots.join(","));
  };

  const addTimeSlot = () => {
    setCheckInTimes(checkInTimes + ",12:00");
  };

  const removeTimeSlot = (index: number) => {
    if (timeSlots.length <= 1) return;
    const newSlots = timeSlots.filter((_, i) => i !== index);
    setCheckInTimes(newSlots.join(","));
  };

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <div>
        <h1 className="text-xl font-bold text-[#2d2d2d]">设置</h1>
        <p className="text-sm text-[#7a7a7a]">调整你的留白配置</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <FontAwesomeIcon icon={faUser} className="mr-2 text-[#6b9b7a]" />
            个人信息
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs text-[#7a7a7a] mb-1 block">名字</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="你的名字"
            />
          </div>
          <div>
            <label className="text-xs text-[#7a7a7a] mb-1 block">
              <FontAwesomeIcon icon={faEnvelope} className="mr-1" />
              邮箱
            </label>
            <Input value={email} disabled className="bg-[#faf9f6]" />
          </div>
        </CardContent>
      </Card>

      {/* Energy Reserve Ratio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <FontAwesomeIcon icon={faLeaf} className="mr-2 text-[#6b9b7a]" />
            精力保留比例
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-[#7a7a7a]">
            建议始终保留一部分精力用于恢复，就像投资中永远不满仓。
          </p>

          <div className="flex items-center gap-4">
            <input
              type="range"
              min={20}
              max={50}
              step={5}
              value={reserveRatio}
              onChange={(e) => setReserveRatio(parseInt(e.target.value))}
              className="flex-1 accent-[#6b9b7a]"
            />
            <span className="text-xl font-bold text-[#6b9b7a] min-w-[3rem] text-right">
              {reserveRatio}%
            </span>
          </div>

          <div className="flex justify-between text-xs text-[#b5b0a8]">
            <span>20% 激进</span>
            <span>35% 推荐</span>
            <span>50% 保守</span>
          </div>
        </CardContent>
      </Card>

      {/* Check-in Times */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <FontAwesomeIcon icon={faClock} className="mr-2 text-[#6b9b7a]" />
            Check-in 时间
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-[#7a7a7a]">
            设置你希望记录精力的时间点。
          </p>

          <div className="space-y-2">
            {timeSlots.map((time, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => updateTimeSlot(index, e.target.value)}
                  className="flex-1"
                />
                {timeSlots.length > 1 && (
                  <button
                    onClick={() => removeTimeSlot(index)}
                    className="text-[#d9534f] text-sm px-2 py-1.5 hover:bg-[#d9534f]/10 rounded-lg transition-colors"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {timeSlots.length < 6 && (
            <Button
              variant="outline"
              size="sm"
              onClick={addTimeSlot}
              className="w-full"
            >
              <FontAwesomeIcon icon={faPlus} className="mr-1.5" />
              添加时间点
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Save */}
      <Button onClick={handleSave} size="lg" className="w-full" disabled={saving}>
        {saving ? (
          <span className="flex items-center gap-2">
            <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
            保存中...
          </span>
        ) : (
          "保存设置"
        )}
      </Button>

      {message && (
        <p
          className={`text-sm text-center ${
            message === "saved" ? "text-[#6b9b7a]" : "text-[#d9534f]"
          }`}
        >
          {message === "saved" ? (
            <span>
              <FontAwesomeIcon icon={faCheck} className="mr-1" />
              设置已保存
            </span>
          ) : (
            message
          )}
        </p>
      )}

      {/* About & Logout */}
      <Card className="bg-[#f8f7f4]">
        <CardContent className="p-4 space-y-3">
          <div className="text-center">
            <FontAwesomeIcon icon={faSeedling} className="text-xl text-[#6b9b7a]" />
            <p className="text-sm font-medium text-[#2d2d2d] mt-1">留白 v1.0</p>
            <p className="text-xs text-[#b5b0a8] mt-1">
              你今天留白了吗？
            </p>
          </div>

          <Button
            variant="ghost"
            className="w-full text-[#d9534f] hover:text-[#d9534f] hover:bg-[#d9534f]/5"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="mr-2" />
            退出登录
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
