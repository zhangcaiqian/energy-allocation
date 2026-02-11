export interface CheckInQuestion {
  id: string;
  period: "morning" | "noon" | "evening" | "night";
  text: string;
}

export const PERIODS = {
  morning: { start: "07:00", end: "10:59" },
  noon: { start: "11:00", end: "14:59" },
  evening: { start: "15:00", end: "20:59" },
  night: { start: "21:00", end: "23:59" },
} as const;

export function getCurrentPeriod(): "morning" | "noon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "noon";
  if (hour >= 15 && hour < 21) return "evening";
  return "night";
}

export const questions: CheckInQuestion[] = [
  // === 早间 (7:00 - 10:59) ===
  { id: "M01", period: "morning", text: "新的一天，感觉充好电了吗？" },
  { id: "M02", period: "morning", text: "今天醒来的第一感觉是什么——精神饱满，还是想赖床？" },
  { id: "M03", period: "morning", text: "如果今天的精力是天气，现在是晴天还是多云？" },
  { id: "M04", period: "morning", text: "从床上起来顺利吗？还是跟被窝搏斗了好久？" },
  { id: "M05", period: "morning", text: "想象一下今天的工作，你觉得自己准备好了吗？" },
  { id: "M06", period: "morning", text: "昨晚睡得怎么样？感觉恢复了多少？" },
  { id: "M07", period: "morning", text: "现在让你跑 500 米，你觉得能跑动吗？" },
  { id: "M08", period: "morning", text: "今天的你，像刚充满电的手机，还是还剩半格电？" },
  { id: "M09", period: "morning", text: "早餐吃了吗？身体有没有准备好开始一天？" },
  { id: "M10", period: "morning", text: "如果用一个词形容现在的状态，你会说什么？" },
  { id: "M11", period: "morning", text: "今天有什么期待的事吗？想到它你有劲儿吗？" },
  { id: "M12", period: "morning", text: "深呼吸一下——感觉清醒还是还有点迷糊？" },
  { id: "M13", period: "morning", text: "昨天的疲惫清零了吗？还是还有一些残留？" },
  { id: "M14", period: "morning", text: "如果现在突然要开一个重要会议，你 hold 得住吗？" },
  { id: "M15", period: "morning", text: "今天像是能量满满的周一，还是还在「开机中」？" },
  { id: "M16", period: "morning", text: "闹钟响的时候你是自然醒的，还是被硬拽起来的？" },
  { id: "M17", period: "morning", text: "脑子现在转得快吗？想一个简单数学题试试？" },
  { id: "M18", period: "morning", text: "今天的你，愿意给自己的状态打几颗星？" },
  { id: "M19", period: "morning", text: "如果花园里的花是你的精力，今早它们看起来怎么样？" },
  { id: "M20", period: "morning", text: "出门前照照镜子——眼睛有神吗？" },

  // === 午间 (11:00 - 14:59) ===
  { id: "N01", period: "noon", text: "半天过去了，精力还够用吗？" },
  { id: "N02", period: "noon", text: "上午的工作顺利吗？有没有被什么事消耗到？" },
  { id: "N03", period: "noon", text: "午饭吃了吗？吃完是精神了还是更困了？" },
  { id: "N04", period: "noon", text: "如果下午还有一场硬仗，你觉得自己能打吗？" },
  { id: "N05", period: "noon", text: "上午开了几个会？脑子还转得动吗？" },
  { id: "N06", period: "noon", text: "现在让你做一个需要高度专注的任务，你能进入状态吗？" },
  { id: "N07", period: "noon", text: "到目前为止，今天消耗了多少精力？花园还绿着吗？" },
  { id: "N08", period: "noon", text: "午休了吗？或者至少闭眼歇了一会儿？" },
  { id: "N09", period: "noon", text: "下午的日程你看了吗？想到它你什么感觉？" },
  { id: "N10", period: "noon", text: "如果有人现在约你下午茶，你想去还是只想躺着？" },
  { id: "N11", period: "noon", text: "上午有没有什么事让你特别费脑子？" },
  { id: "N12", period: "noon", text: "此刻的你，是「还能再战」还是「已经有点虚了」？" },
  { id: "N13", period: "noon", text: "午饭后犯困是正常的——但你现在困到什么程度？" },
  { id: "N14", period: "noon", text: "如果给上午的自己一个建议，你会说什么？" },
  { id: "N15", period: "noon", text: "你的肩膀和脖子现在紧不紧？身体在提醒你什么？" },
  { id: "N16", period: "noon", text: "从早上到现在，你的精力是一直在掉还是有回升过？" },
  { id: "N17", period: "noon", text: "今天到目前为止，有没有什么让你开心的小事？" },
  { id: "N18", period: "noon", text: "估算一下，你现在大概还剩多少精力？" },
  { id: "N19", period: "noon", text: "如果下午只做一件事，你还有精力做好它吗？" },
  { id: "N20", period: "noon", text: "中午的阳光不错，你感受到了吗？" },

  // === 晚间 (15:00 - 20:59) ===
  { id: "E01", period: "evening", text: "一天快结束了，你现在什么感觉？" },
  { id: "E02", period: "evening", text: "如果精力是手机电量，你现在大概剩百分之多少？" },
  { id: "E03", period: "evening", text: "下班了吗？走出公司那一刻，是轻松还是疲惫？" },
  { id: "E04", period: "evening", text: "今天值得吗？你觉得精力花在对的地方了吗？" },
  { id: "E05", period: "evening", text: "回家路上的你，还有力气做点自己想做的事吗？" },
  { id: "E06", period: "evening", text: "有人现在约你吃饭，你想去还是只想回家？" },
  { id: "E07", period: "evening", text: "今天有没有某个时刻让你觉得特别累？" },
  { id: "E08", period: "evening", text: "如果用颜色形容现在的精力，是什么颜色？" },
  { id: "E09", period: "evening", text: "身体在发出什么信号？困？饿？酸？还是还好？" },
  { id: "E10", period: "evening", text: "你觉得今天的精力配置合理吗？有没有透支？" },
  { id: "E11", period: "evening", text: "晚上还有计划吗？你有精力执行吗？" },
  { id: "E12", period: "evening", text: "工作的事能放下吗？还是脑子里还在转？" },
  { id: "E13", period: "evening", text: "今天最消耗你精力的是哪件事？" },
  { id: "E14", period: "evening", text: "如果给今天的精力管理打个分，你给几分？" },
  { id: "E15", period: "evening", text: "一天下来，花园里的花还好吗？需要浇浇水了吗？" },
  { id: "E16", period: "evening", text: "现在让你学一个新东西，你学得进去吗？" },
  { id: "E17", period: "evening", text: "今天有没有给自己留出休息的空间？" },
  { id: "E18", period: "evening", text: "晚风吹一吹，感觉好一点了吗？" },
  { id: "E19", period: "evening", text: "对比早上的状态，你现在怎么样？" },
  { id: "E20", period: "evening", text: "辛苦了一天——你觉得今晚能睡个好觉吗？" },

  // === 夜间 (21:00 - 23:59) ===
  { id: "L01", period: "night", text: "睡前来聊聊——今天过得怎么样？" },
  { id: "L02", period: "night", text: "现在的你，准备好进入休息模式了吗？" },
  { id: "L03", period: "night", text: "如果给今天的精力画一条曲线，它是什么形状的？" },
  { id: "L04", period: "night", text: "脑子安静了吗？还是有很多事在转？" },
  { id: "L05", period: "night", text: "明天有什么让你有压力的事吗？" },
  { id: "L06", period: "night", text: "你觉得今天花园浇够水了吗？" },
  { id: "L07", period: "night", text: "现在闭上眼睛 3 秒钟——你感觉到疲惫还是平静？" },
  { id: "L08", period: "night", text: "如果可以对今天的自己说一句话，你会说什么？" },
  { id: "L09", period: "night", text: "身体哪里最不舒服？还是整体都还好？" },
  { id: "L10", period: "night", text: "今天有没有做什么让自己开心的事？" },
  { id: "L11", period: "night", text: "你觉得自己今天保留了足够的精力恢复吗？" },
  { id: "L12", period: "night", text: "手机放下了吗？还是还在刷？" },
  { id: "L13", period: "night", text: "深呼吸三次——好一点了吗？" },
  { id: "L14", period: "night", text: "明天想做点什么不一样的事吗？" },
  { id: "L15", period: "night", text: "如果花园有话说，它现在会对你说什么？" },
  { id: "L16", period: "night", text: "今天的你，值得被好好休息犒劳一下。你准备好了吗？" },
  { id: "L17", period: "night", text: "数一数今天笑了几次？" },
  { id: "L18", period: "night", text: "你的精力保留线今天守住了吗？" },
  { id: "L19", period: "night", text: "夜深了，外面安静了。你的心呢？" },
  { id: "L20", period: "night", text: "最后一个问题——你觉得今天的精力，花得值吗？" },
];

export function selectQuestion(
  period: "morning" | "noon" | "evening" | "night",
  recentQuestionIds: string[] = []
): CheckInQuestion {
  const pool = questions.filter(
    (q) => q.period === period && !recentQuestionIds.includes(q.id)
  );
  if (pool.length === 0) {
    // All used, reset
    const fullPool = questions.filter((q) => q.period === period);
    return fullPool[Math.floor(Math.random() * fullPool.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
