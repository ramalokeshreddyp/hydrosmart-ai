export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "intense";

export interface UserProfile {
  name: string;
  weight: number; // kg
  age: number;
  city: string;
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:00"
  activityLevel: ActivityLevel;
}

export interface WeatherData {
  temp: number; // celsius
  humidity: number;
  description: string;
  icon: string;
  city: string;
}

export interface IntakeLog {
  id: string;
  amount: number; // ml
  timestamp: string; // ISO
}

export interface SleepLog {
  id: string;
  date: string; // YYYY-MM-DD
  hours: number;
  quality: "poor" | "fair" | "good" | "excellent";
}

export interface ActivityLog {
  id: string;
  type: string;
  durationMin: number;
  intensity: "light" | "moderate" | "vigorous";
  timestamp: string; // ISO
}

const BASE_INTAKE_ML = 2500;

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.0,
  light: 1.1,
  moderate: 1.2,
  active: 1.35,
  intense: 1.5,
};

const ACTIVITY_EXERCISE_ML: Record<string, number> = {
  light: 200,
  moderate: 400,
  vigorous: 600,
};

const SLEEP_QUALITY_ML: Record<string, number> = {
  poor: 300,
  fair: 150,
  good: 0,
  excellent: -100,
};

export function calculateDailyGoal(
  profile: UserProfile,
  weather?: WeatherData,
  todaySleep?: SleepLog | null,
  todayActivities?: ActivityLog[]
): number {
  // Base: 35ml per kg body weight
  let goal = Math.max(profile.weight * 35, BASE_INTAKE_ML);

  // Activity level from profile
  goal *= ACTIVITY_MULTIPLIER[profile.activityLevel] || 1.0;

  if (weather) {
    // Temperature factor
    if (weather.temp > 30) {
      goal += (weather.temp - 30) * 50;
    } else if (weather.temp > 25) {
      goal += (weather.temp - 25) * 25;
    }

    // Humidity factor
    if (weather.humidity < 30) {
      goal += 300;
    } else if (weather.humidity < 50) {
      goal += 150;
    }
  }

  // Sleep quality adjustment — poor sleep = more hydration needed
  if (todaySleep) {
    goal += SLEEP_QUALITY_ML[todaySleep.quality] || 0;
    // Short sleep (<6h) adds extra
    if (todaySleep.hours < 6) goal += 200;
  }

  // Exercise adjustments for today
  if (todayActivities && todayActivities.length > 0) {
    for (const act of todayActivities) {
      const perSession = ACTIVITY_EXERCISE_ML[act.intensity] || 200;
      goal += Math.round(perSession * (act.durationMin / 30));
    }
  }

  return Math.round(goal / 50) * 50;
}

export function getReminderInterval(profile: UserProfile, goalMl: number): number {
  const [wH, wM] = profile.wakeTime.split(":").map(Number);
  const [sH, sM] = profile.sleepTime.split(":").map(Number);
  const awakeMinutes = (sH * 60 + sM) - (wH * 60 + wM);
  const glasses = Math.ceil(goalMl / 250); // 250ml per glass
  return Math.floor(awakeMinutes / glasses); // minutes between reminders
}

export function getTemperatureLevel(temp: number): "cool" | "warm" | "hot" | "extreme" {
  if (temp < 20) return "cool";
  if (temp < 28) return "warm";
  if (temp < 35) return "hot";
  return "extreme";
}

export function getHydrationTip(weather?: WeatherData): string {
  if (!weather) return "Stay hydrated throughout the day! 💧";
  const tips: Record<string, string[]> = {
    cool: [
      "Cool weather — don't forget to hydrate even when it's not hot!",
      "Your body still loses water in cooler temps. Keep sipping!",
    ],
    warm: [
      "Pleasant weather — maintain steady water intake.",
      "Good weather for a walk! Bring your water bottle.",
    ],
    hot: [
      "It's hot outside! Increase your water intake significantly.",
      "High temperature alert — drink water before you feel thirsty!",
      "Consider adding electrolytes to your water today.",
    ],
    extreme: [
      "⚠️ Extreme heat! Drink water every 15-20 minutes.",
      "🔴 Dangerous heat — stay cool and hydrate constantly!",
    ],
  };
  const level = getTemperatureLevel(weather.temp);
  const arr = tips[level];
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getTodayLogs(): IntakeLog[] {
  const today = new Date().toISOString().split("T")[0];
  const all: IntakeLog[] = JSON.parse(localStorage.getItem("hydration_logs") || "[]");
  return all.filter(l => l.timestamp.startsWith(today));
}

export function addIntakeLog(amount: number): IntakeLog {
  const log: IntakeLog = {
    id: crypto.randomUUID(),
    amount,
    timestamp: new Date().toISOString(),
  };
  const all: IntakeLog[] = JSON.parse(localStorage.getItem("hydration_logs") || "[]");
  all.push(log);
  localStorage.setItem("hydration_logs", JSON.stringify(all));
  return log;
}

export function getWeeklyData(): { day: string; intake: number }[] {
  const all: IntakeLog[] = JSON.parse(localStorage.getItem("hydration_logs") || "[]");
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en", { weekday: "short" });
    const intake = all
      .filter(l => l.timestamp.startsWith(key))
      .reduce((s, l) => s + l.amount, 0);
    days.push({ day: label, intake });
  }
  return days;
}

export function getProfile(): UserProfile | null {
  const p = localStorage.getItem("hydration_profile");
  return p ? JSON.parse(p) : null;
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem("hydration_profile", JSON.stringify(profile));
}

const SLEEP_KEY = "hydration_sleep_logs";
const ACTIVITY_KEY = "hydration_activity_logs";

export function getTodaySleepLog(): SleepLog | null {
  const today = new Date().toISOString().split("T")[0];
  const all: SleepLog[] = JSON.parse(localStorage.getItem(SLEEP_KEY) || "[]");
  return all.find((l) => l.date === today) || null;
}

export function saveSleepLog(log: SleepLog) {
  const all: SleepLog[] = JSON.parse(localStorage.getItem(SLEEP_KEY) || "[]");
  const idx = all.findIndex((l) => l.date === log.date);
  if (idx >= 0) all[idx] = log;
  else all.push(log);
  localStorage.setItem(SLEEP_KEY, JSON.stringify(all));
}

export function getTodayActivities(): ActivityLog[] {
  const today = new Date().toISOString().split("T")[0];
  const all: ActivityLog[] = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
  return all.filter((l) => l.timestamp.startsWith(today));
}

export function saveActivity(log: ActivityLog) {
  const all: ActivityLog[] = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
  all.push(log);
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all));
}

export function removeActivity(id: string) {
  const all: ActivityLog[] = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(all.filter((l) => l.id !== id)));
}
