import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
});

const LLM_MODEL = process.env.DASHSCOPE_MODEL || "qwen-plus";

const COACH_SYSTEM_PROMPT = `你是一个温暖的精力教练，名叫「知秋」，是「留白」App 的 AI 伙伴。

你的风格：
- 温暖、简短、不说教、像朋友一样关心对方
- 回复控制在 150 字以内
- 如果用户精力充沛，给予肯定和鼓励
- 如果用户精力低，表达理解和关怀，给一个具体小建议
- 不要用感叹号轰炸，不要说"加油"
- 可以偶尔用一个 emoji，但不要过多
- 用"你"而非"您"
- 偶尔用自然界的植物、动物的比喻，目的是让用户知道适时休息才是自然界的法则

核心理念：留白 = 有意识地保留精力空间用于恢复，不透支。`;

const levelLabels: Record<string, string> = {
  HIGH: "精力充沛 🟢",
  MEDIUM: "状态尚可 🟡",
  LOW: "有点疲惫 🟠",
  EXHAUSTED: "快没电了 🔴",
};

function buildCheckInContext(
  level: string,
  question: string,
  todayCheckIns: { level: string; checkInAt: string }[],
  recentSummaries: { date: string; avgScore: number; minScore: number }[]
): string {
  return `## 当前 check-in
- 问题：${question}
- 用户选择：${levelLabels[level] || level}

## 今天的记录
${
  todayCheckIns.length > 0
    ? todayCheckIns
        .map(
          (c) =>
            `- ${c.checkInAt.split("T")[1]?.slice(0, 5)}: ${levelLabels[c.level] || c.level}`
        )
        .join("\n")
    : "今天的第一次记录"
}

## 近几天趋势
${
  recentSummaries.length > 0
    ? recentSummaries
        .slice(0, 3)
        .map(
          (s) =>
            `- ${s.date}: 均值 ${s.avgScore.toFixed(2)}, 最低 ${s.minScore.toFixed(2)}`
        )
        .join("\n")
    : "暂无历史数据（新用户）"
}

请基于以上信息给出温暖简短的回应。`;
}

// ============================================================
// 流式生成 Check-in 回应 (返回 ReadableStream)
// ============================================================
export function streamCheckInResponse(
  level: string,
  question: string,
  todayCheckIns: { level: string; checkInAt: string }[],
  recentSummaries: { date: string; avgScore: number; minScore: number }[]
): ReadableStream<Uint8Array> {
  const context = buildCheckInContext(level, question, todayCheckIns, recentSummaries);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      const requestId = Math.random().toString(36).slice(2, 8);

      console.log(`[LLM][${requestId}] ▶ 模型调用开始`);
      console.log(`[LLM][${requestId}]   模型: ${LLM_MODEL}`);
      console.log(`[LLM][${requestId}]   精力等级: ${level}`);
      console.log(`[LLM][${requestId}]   今日已记录: ${todayCheckIns.length} 次`);
      console.log(`[LLM][${requestId}]   历史摘要: ${recentSummaries.length} 天`);

      try {
        const stream = await client.chat.completions.create({
          model: LLM_MODEL,
          messages: [
            { role: "system", content: COACH_SYSTEM_PROMPT },
            { role: "user", content: context },
          ],
          max_tokens: 200,
          temperature: 0.8,
          stream: true,
        });

        let fullContent = "";
        let tokenCount = 0;

        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            tokenCount++;
            controller.enqueue(encoder.encode(delta));
          }
        }

        const elapsed = Date.now() - startTime;
        console.log(`[LLM][${requestId}] ✓ 模型调用完成`);
        console.log(`[LLM][${requestId}]   耗时: ${elapsed}ms`);
        console.log(`[LLM][${requestId}]   输出 chunks: ${tokenCount}`);
        console.log(`[LLM][${requestId}]   回复内容: ${fullContent}`);

        // If no content was generated, send fallback
        if (!fullContent) {
          const fallback = getFallbackResponse(level);
          console.log(`[LLM][${requestId}]   ⚠ 空回复，使用 fallback`);
          controller.enqueue(encoder.encode(fallback));
        }

        controller.close();
      } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error(`[LLM][${requestId}] ✗ 模型调用失败 (${elapsed}ms):`, error);

        // Send fallback on error
        const fallback = getFallbackResponse(level);
        controller.enqueue(encoder.encode(fallback));
        controller.close();
      }
    },
  });
}

// ============================================================
// 非流式生成（用于需要完整文本的场景，如存库）
// ============================================================
export async function generateCheckInResponse(
  level: string,
  question: string,
  todayCheckIns: { level: string; checkInAt: string }[],
  recentSummaries: { date: string; avgScore: number; minScore: number }[]
): Promise<string> {
  const context = buildCheckInContext(level, question, todayCheckIns, recentSummaries);
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 8);

  console.log(`[LLM][${requestId}] ▶ 模型调用开始 (非流式)`);
  console.log(`[LLM][${requestId}]   模型: ${LLM_MODEL}`);
  console.log(`[LLM][${requestId}]   精力等级: ${level}`);

  try {
    const response = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      max_tokens: 200,
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content || getFallbackResponse(level);
    const elapsed = Date.now() - startTime;
    const usage = response.usage;

    console.log(`[LLM][${requestId}] ✓ 模型调用完成`);
    console.log(`[LLM][${requestId}]   耗时: ${elapsed}ms`);
    console.log(
      `[LLM][${requestId}]   tokens: prompt=${usage?.prompt_tokens}, completion=${usage?.completion_tokens}, total=${usage?.total_tokens}`
    );
    console.log(`[LLM][${requestId}]   回复内容: ${content}`);

    return content;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[LLM][${requestId}] ✗ 模型调用失败 (${elapsed}ms):`, error);
    return getFallbackResponse(level);
  }
}

function getFallbackResponse(level: string): string {
  const fallbacks: Record<string, string[]> = {
    HIGH: [
      "今天状态不错呢，花园里的花也开得很好 🌸",
      "精力满满的一天，记得留一些给自己。",
      "状态很好！不过别忘了给花园留点水。",
    ],
    MEDIUM: [
      "还不错，稳稳的。记得适时休息一下。",
      "中等水位，花园还绿着。注意别透支哦。",
      "状态尚可，继续保持节奏就好。",
    ],
    LOW: [
      "辛苦了，花园里的花有点累了。找个时间歇一歇？",
      "精力有些低了，要不要放下手头的事休息一会儿？",
      "今天消耗不少呢。是时候对自己好一点了。",
    ],
    EXHAUSTED: [
      "你真的很累了。现在最重要的事是休息。花园明天还在。",
      "该停下来了。没有什么事比你自己更重要。",
      "低电量模式了。放下一切，去休息吧。明天是新的一天。",
    ],
  };

  const options = fallbacks[level] || fallbacks.MEDIUM;
  return options[Math.floor(Math.random() * options.length)];
}

export async function generateWeeklySummary(
  weeklySummaries: {
    date: string;
    avgScore: number;
    minScore: number;
    maxScore: number;
    belowReserve: number;
  }[],
  reserveRatio: number
): Promise<string> {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).slice(2, 8);

  const context = `## 本周精力数据
${weeklySummaries
  .map(
    (s) =>
      `- ${s.date}（${getDayOfWeek(s.date)}）: 均值 ${s.avgScore.toFixed(2)}, 最低 ${s.minScore.toFixed(2)}, 透支 ${s.belowReserve} 次`
  )
  .join("\n")}

## 用户设定
- 精力保留比例: ${(reserveRatio * 100).toFixed(0)}%

## 任务
请生成一份温暖的周度精力回顾，包含：
1. 对这周精力状态的总结（2-3句）
2. 发现的规律或值得注意的点（1-2句）
3. 对下周的一个小建议（1句）
控制在 150 字以内。`;

  console.log(`[LLM][${requestId}] ▶ 周报生成开始`);
  console.log(`[LLM][${requestId}]   模型: ${LLM_MODEL}`);
  console.log(`[LLM][${requestId}]   数据天数: ${weeklySummaries.length}`);

  try {
    const response = await client.chat.completions.create({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        { role: "user", content: context },
      ],
      max_tokens: 400,
      temperature: 0.7,
    });

    const content =
      response.choices[0]?.message?.content ||
      "本周精力报告生成中，请稍后再试。";
    const elapsed = Date.now() - startTime;
    const usage = response.usage;

    console.log(`[LLM][${requestId}] ✓ 周报生成完成`);
    console.log(`[LLM][${requestId}]   耗时: ${elapsed}ms`);
    console.log(
      `[LLM][${requestId}]   tokens: prompt=${usage?.prompt_tokens}, completion=${usage?.completion_tokens}, total=${usage?.total_tokens}`
    );
    console.log(`[LLM][${requestId}]   回复内容: ${content}`);

    return content;
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`[LLM][${requestId}] ✗ 周报生成失败 (${elapsed}ms):`, error);
    return "本周精力报告暂时无法生成，请稍后再试。";
  }
}

function getDayOfWeek(dateStr: string): string {
  const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return days[new Date(dateStr).getDay()];
}
