import { describe, it, expect } from "vitest";
import { computeStats, getNewlyUnlockedBadges, getAllBadges } from "../lib/gamification";
import { getLocalDateString } from "../lib/utils";
import type { IntakeLog } from "../lib/hydration";

describe("gamification.ts - Core Functions", () => {
  const goalMl = 2000;

  it("should calculate correct stats for an empty log list", () => {
    const stats = computeStats([], goalMl);
    expect(stats.todayMl).toBe(0);
    expect(stats.todayGlasses).toBe(0);
    expect(stats.totalLiters).toBe(0);
    expect(stats.totalDaysTracked).toBe(0);
    expect(stats.currentStreak).toBe(0);
    expect(stats.longestStreak).toBe(0);
    expect(stats.goalsHitCount).toBe(0);
  });

  it("should aggregate today's logs correctly", () => {
    const todayStr = getLocalDateString();
    
    // Create logs that are clearly today local time
    const logs: IntakeLog[] = [
      { id: "1", amount: 250, timestamp: new Date().toISOString() },
      { id: "2", amount: 500, timestamp: new Date().toISOString() },
    ];

    const stats = computeStats(logs, goalMl);
    expect(stats.todayMl).toBe(750);
    expect(stats.todayGlasses).toBe(3); // 750 / 250 = 3
    expect(stats.totalLiters).toBe(0.75);
    expect(stats.totalDaysTracked).toBe(1);
  });

  it("should calculate streaks correctly", () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Create logs for three consecutive days meeting the goal
    const logs: IntakeLog[] = [
      { id: "1", amount: goalMl, timestamp: twoDaysAgo.toISOString() },
      { id: "2", amount: goalMl + 500, timestamp: yesterday.toISOString() },
      { id: "3", amount: goalMl, timestamp: today.toISOString() },
    ];

    const stats = computeStats(logs, goalMl);
    expect(stats.currentStreak).toBe(3);
    expect(stats.longestStreak).toBe(3);
    expect(stats.goalsHitCount).toBe(3);
  });

  it("should maintain streak if today is not logged yet but yesterday met the goal", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Logs for two days ago and yesterday meet the goal, but no logs today
    const logs: IntakeLog[] = [
      { id: "1", amount: goalMl, timestamp: twoDaysAgo.toISOString() },
      { id: "2", amount: goalMl, timestamp: yesterday.toISOString() },
    ];

    const stats = computeStats(logs, goalMl);
    expect(stats.currentStreak).toBe(2);
    expect(stats.longestStreak).toBe(2);
  });

  it("should break streak if a day is missed", () => {
    const today = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Met goal three days ago, two days ago, missed yesterday, met today
    const logs: IntakeLog[] = [
      { id: "1", amount: goalMl, timestamp: threeDaysAgo.toISOString() },
      { id: "2", amount: goalMl, timestamp: twoDaysAgo.toISOString() },
      // yesterday: no logs
      { id: "3", amount: goalMl, timestamp: today.toISOString() },
    ];

    const stats = computeStats(logs, goalMl);
    expect(stats.currentStreak).toBe(1); // just today
    expect(stats.longestStreak).toBe(2); // three days ago to two days ago
    expect(stats.goalsHitCount).toBe(3);
  });

  it("should unlock streak-3, first-glass, half-day, and goal-hit badges when conditions met", () => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Create logs for a 3-day streak meeting the goal
    const logs: IntakeLog[] = [
      { id: "1", amount: goalMl, timestamp: twoDaysAgo.toISOString() },
      { id: "2", amount: goalMl, timestamp: yesterday.toISOString() },
      { id: "3", amount: goalMl, timestamp: today.toISOString() },
    ];

    const stats = computeStats(logs, goalMl);

    // Check individual badge condition logic
    const badges = getAllBadges();
    const firstSip = badges.find(b => b.id === "first-glass");
    const halfDay = badges.find(b => b.id === "half-day");
    const goalCrusher = badges.find(b => b.id === "goal-hit");
    const consistent = badges.find(b => b.id === "streak-3");

    expect(firstSip?.condition(stats)).toBe(true);
    expect(halfDay?.condition(stats)).toBe(true);
    expect(goalCrusher?.condition(stats)).toBe(true);
    expect(consistent?.condition(stats)).toBe(true);
  });

  it("should detect newly unlocked badges by diffing statistics", () => {
    const prevStats = {
      currentStreak: 2,
      longestStreak: 2,
      totalDaysTracked: 2,
      totalLiters: 4.0,
      goalsHitCount: 2,
      todayGlasses: 0,
      todayMl: 0,
      goalMl: 2000,
    };

    const currentStats = {
      currentStreak: 3,
      longestStreak: 3,
      totalDaysTracked: 3,
      totalLiters: 6.0,
      goalsHitCount: 3,
      todayGlasses: 8,
      todayMl: 2000,
      goalMl: 2000,
    };

    // The 'streak-3' (Consistent) badge should be newly unlocked now
    const newlyUnlocked = getNewlyUnlockedBadges(prevStats, currentStats);
    expect(newlyUnlocked.some(b => b.id === "streak-3")).toBe(true);
  });
});
