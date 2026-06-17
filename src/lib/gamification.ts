import type { IntakeLog } from "./hydration";

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: (stats: HydrationStats) => boolean;
  tier: "bronze" | "silver" | "gold" | "diamond";
}

export interface HydrationStats {
  currentStreak: number;
  longestStreak: number;
  totalDaysTracked: number;
  totalLiters: number;
  goalsHitCount: number;
  todayGlasses: number;
  todayMl: number;
  goalMl: number;
}

const ALL_BADGES: Badge[] = [
  // Streak badges
  { id: "streak-3", name: "Consistent", emoji: "🔥", description: "3-day hydration streak", condition: s => s.currentStreak >= 3, tier: "bronze" },
  { id: "streak-7", name: "On Fire", emoji: "🔥", description: "7-day hydration streak", condition: s => s.currentStreak >= 7, tier: "silver" },
  { id: "streak-14", name: "Unstoppable", emoji: "⚡", description: "14-day hydration streak", condition: s => s.currentStreak >= 14, tier: "gold" },
  { id: "streak-30", name: "Legend", emoji: "👑", description: "30-day hydration streak", condition: s => s.currentStreak >= 30, tier: "diamond" },
  // Volume badges
  { id: "vol-10", name: "10 Liters", emoji: "💧", description: "Drank 10L total", condition: s => s.totalLiters >= 10, tier: "bronze" },
  { id: "vol-50", name: "50 Liters", emoji: "🌊", description: "Drank 50L total", condition: s => s.totalLiters >= 50, tier: "silver" },
  { id: "vol-100", name: "Ocean", emoji: "🏊", description: "Drank 100L total", condition: s => s.totalLiters >= 100, tier: "gold" },
  // Daily badges
  { id: "first-glass", name: "First Sip", emoji: "🥤", description: "Log your first glass", condition: s => s.todayGlasses >= 1, tier: "bronze" },
  { id: "half-day", name: "Halfway", emoji: "⭐", description: "Reach 50% of daily goal", condition: s => s.todayMl >= s.goalMl * 0.5, tier: "bronze" },
  { id: "goal-hit", name: "Goal Crusher", emoji: "🎯", description: "Hit your daily goal", condition: s => s.todayMl >= s.goalMl && s.goalMl > 0, tier: "silver" },
  { id: "overachiever", name: "Overachiever", emoji: "🏆", description: "Exceed goal by 20%", condition: s => s.todayMl >= s.goalMl * 1.2 && s.goalMl > 0, tier: "gold" },
  // Milestone badges
  { id: "days-7", name: "Week One", emoji: "📅", description: "Track for 7 days", condition: s => s.totalDaysTracked >= 7, tier: "bronze" },
  { id: "days-30", name: "Monthly", emoji: "🗓️", description: "Track for 30 days", condition: s => s.totalDaysTracked >= 30, tier: "silver" },
  { id: "goals-10", name: "10 Goals", emoji: "🏅", description: "Hit daily goal 10 times", condition: s => s.goalsHitCount >= 10, tier: "gold" },
];

const tierOrder = { bronze: 0, silver: 1, gold: 2, diamond: 3 };

export function computeStats(logs: IntakeLog[], goalMl: number): HydrationStats {
  const today = new Date().toISOString().split("T")[0];

  // Group logs by day
  const byDay = new Map<string, number>();
  for (const log of logs) {
    const day = log.timestamp.split("T")[0];
    byDay.set(day, (byDay.get(day) || 0) + log.amount);
  }

  const todayMl = byDay.get(today) || 0;
  const todayGlasses = Math.floor(todayMl / 250);
  const totalLiters = logs.reduce((s, l) => s + l.amount, 0) / 1000;
  const totalDaysTracked = byDay.size;

  // Count goal hits (approximate - use current goal for simplicity)
  let goalsHitCount = 0;
  byDay.forEach((ml) => {
    if (ml >= goalMl) goalsHitCount++;
  });

  // Calculate streak (consecutive days hitting goal, ending at today or yesterday)
  let currentStreak = 0;
  const d = new Date();
  // Check if today has any logs; if not start from yesterday
  if (!byDay.has(today)) {
    d.setDate(d.getDate() - 1);
  }
  for (let i = 0; i < 365; i++) {
    const key = d.toISOString().split("T")[0];
    const dayMl = byDay.get(key) || 0;
    if (dayMl >= goalMl) {
      currentStreak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest streak
  const sortedDays = [...byDay.entries()]
    .filter(([, ml]) => ml >= goalMl)
    .map(([day]) => day)
    .sort();
  let longestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) { tempStreak = 1; } else {
      const prev = new Date(sortedDays[i - 1]);
      const curr = new Date(sortedDays[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      tempStreak = diff === 1 ? tempStreak + 1 : 1;
    }
    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return { currentStreak, longestStreak, totalDaysTracked, totalLiters, goalsHitCount, todayGlasses, todayMl, goalMl };
}

export function getUnlockedBadges(stats: HydrationStats): Badge[] {
  return ALL_BADGES.filter(b => b.condition(stats));
}

export function getLockedBadges(stats: HydrationStats): Badge[] {
  return ALL_BADGES.filter(b => !b.condition(stats));
}

export function getNextBadge(stats: HydrationStats): Badge | null {
  const locked = ALL_BADGES
    .filter(b => !b.condition(stats))
    .sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
  return locked[0] || null;
}

export function getAllBadges(): Badge[] {
  return ALL_BADGES;
}

export function getNewlyUnlockedBadges(prevStats: HydrationStats | null, currentStats: HydrationStats): Badge[] {
  if (!prevStats) return [];
  const prevUnlocked = new Set(ALL_BADGES.filter(b => b.condition(prevStats)).map(b => b.id));
  return ALL_BADGES.filter(b => b.condition(currentStats) && !prevUnlocked.has(b.id));
}
