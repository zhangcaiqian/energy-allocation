"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSeedling, faSpinner } from "@fortawesome/free-solid-svg-icons";
import {
  faFaceSmile,
  faFaceMeh,
  faFaceFrown,
  faFaceTired,
} from "@fortawesome/free-regular-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";

const energyOptions: {
  level: string;
  icon: IconDefinition;
  label: string;
  description: string;
  iconColor: string;
  color: string;
  activeColor: string;
}[] = [
  {
    level: "HIGH",
    icon: faFaceSmile,
    label: "精力充沛",
    description: "状态很好，随时可以全力投入",
    iconColor: "text-[#5cb85c]",
    color: "border-[#5cb85c] bg-[#5cb85c]/5 hover:bg-[#5cb85c]/10",
    activeColor:
      "border-[#5cb85c] bg-[#5cb85c]/20 ring-2 ring-[#5cb85c]/30",
  },
  {
    level: "MEDIUM",
    icon: faFaceMeh,
    label: "状态尚可",
    description: "还行，能正常运转",
    iconColor: "text-[#f0ad4e]",
    color: "border-[#f0ad4e] bg-[#f0ad4e]/5 hover:bg-[#f0ad4e]/10",
    activeColor:
      "border-[#f0ad4e] bg-[#f0ad4e]/20 ring-2 ring-[#f0ad4e]/30",
  },
  {
    level: "LOW",
    icon: faFaceFrown,
    label: "有点疲惫",
    description: "精力在下降，需要注意了",
    iconColor: "text-[#e8943a]",
    color: "border-[#e8943a] bg-[#e8943a]/5 hover:bg-[#e8943a]/10",
    activeColor:
      "border-[#e8943a] bg-[#e8943a]/20 ring-2 ring-[#e8943a]/30",
  },
  {
    level: "EXHAUSTED",
    icon: faFaceTired,
    label: "快没电了",
    description: "很累了，该停下来休息了",
    iconColor: "text-[#d9534f]",
    color: "border-[#d9534f] bg-[#d9534f]/5 hover:bg-[#d9534f]/10",
    activeColor:
      "border-[#d9534f] bg-[#d9534f]/20 ring-2 ring-[#d9534f]/30",
  },
];

export default function CheckInPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [done, setDone] = useState(false);
  const responseRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    async function fetchQuestion() {
      try {
        const res = await fetch("/api/checkin");
        if (res.ok) {
          const data = await res.json();
          setQuestion(data.question?.text || "你现在精力怎么样？");
        }
      } catch {
        setQuestion("你现在精力怎么样？");
      }
    }
    fetchQuestion();
  }, []);

  const handleSelect = async (level: string) => {
    if (submitting) return;
    setSelectedLevel(level);
    setSubmitting(true);
    setStreaming(true);
    setAiResponse("");

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          question,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      // Read the stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done: readerDone, value } = await reader.read();
        if (readerDone) break;

        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setAiResponse(accumulated);
      }

      setDone(true);
    } catch (error) {
      console.error("Check-in failed:", error);
      setAiResponse("抱歉，知秋暂时无法回应，请稍后再试。");
      setDone(true);
    } finally {
      setSubmitting(false);
      setStreaming(false);
    }
  };

  const selectedOption = energyOptions.find((o) => o.level === selectedLevel);

  // After submission - show AI response (streaming or done)
  if ((streaming || done) && (aiResponse || submitting)) {
    return (
      <div className="px-4 pt-12 min-h-screen flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
          <FontAwesomeIcon
            icon={selectedOption?.icon || faFaceSmile}
            className={`text-5xl ${selectedOption?.iconColor || "text-[#6b9b7a]"}`}
          />
          <div>
            <p className="text-lg font-semibold text-[#2d2d2d] mb-1">
              {done ? "记录成功" : "正在记录..."}
            </p>
            <p className="text-sm text-[#7a7a7a]">
              {selectedOption?.label}
            </p>
          </div>

          {/* AI Response - streaming */}
          <div className="bg-[#f8f7f4] rounded-2xl px-5 py-4 max-w-sm w-full">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon
                icon={faSeedling}
                className="text-xl text-[#6b9b7a] mt-0.5 flex-shrink-0"
              />
              <div className="text-left min-w-0">
                <p className="text-xs text-[#b5b0a8] mb-1">知秋说</p>
                <p
                  ref={responseRef}
                  className="text-sm text-[#2d2d2d] leading-relaxed"
                >
                  {aiResponse || (
                    <span className="text-[#b5b0a8] animate-pulse">
                      知秋正在思考...
                    </span>
                  )}
                  {streaming && aiResponse && (
                    <span className="inline-block w-0.5 h-4 bg-[#6b9b7a] ml-0.5 animate-pulse align-middle" />
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-6">
          <Button
            onClick={() => router.push("/")}
            size="lg"
            className="w-full"
            disabled={streaming}
          >
            {streaming ? (
              <span className="flex items-center gap-2">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                知秋正在回应...
              </span>
            ) : (
              <>
                <FontAwesomeIcon icon={faSeedling} className="mr-2" />
                回到花园
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-12 min-h-screen flex flex-col">
      {/* Question */}
      <div className="mb-8">
        <p className="text-xs text-[#b5b0a8] mb-2">精力 Check-in</p>
        <h1 className="text-xl font-bold text-[#2d2d2d] leading-relaxed">
          {question || (
            <span className="animate-pulse text-[#b5b0a8]">
              正在准备问题...
            </span>
          )}
        </h1>
      </div>

      {/* Energy Options — tap to submit directly */}
      <div className="flex-1 space-y-3">
        {energyOptions.map((option) => (
          <button
            key={option.level}
            onClick={() => handleSelect(option.level)}
            disabled={submitting}
            className={cn(
              "w-full flex items-center gap-4 px-5 py-4 rounded-2xl border-2 transition-all duration-200 text-left",
              submitting && "opacity-50 pointer-events-none",
              selectedLevel === option.level
                ? option.activeColor
                : option.color
            )}
          >
            <FontAwesomeIcon
              icon={option.icon}
              className={`text-2xl ${option.iconColor}`}
            />
            <div>
              <p className="text-sm font-semibold text-[#2d2d2d]">
                {option.label}
              </p>
              <p className="text-xs text-[#7a7a7a] mt-0.5">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
