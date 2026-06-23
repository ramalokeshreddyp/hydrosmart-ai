import { getLocalDateString } from "./utils";

export interface UserProfile {
  name: string;
  weight: number; // kg
  age: number;
  gender: "male" | "female" | "other";
  city: string;
  wakeTime: string; // "07:00"
  sleepTime: string; // "23:00"
  workStart: string; // "09:00"
  workEnd: string; // "17:00"
  customInterval: number; // minutes
  weatherRemindersEnabled: boolean;
  channels: ("in-app" | "email" | "whatsapp")[];
  email: string;
  phone: string;
  manualGoal: number | null; // ml
}

export interface WeatherData {
  temp: number; // celsius
  humidity: number;
  description: string;
  icon: string;
  city: string;
  isMock?: boolean;
}

export interface IntakeLog {
  id: string;
  amount: number; // ml
  timestamp: string; // ISO
}

export interface ReminderLog {
  id: string;
  timestamp: string; // ISO
  temp: number;
  city: string;
  intervalMinutes: number;
  channels: ("in-app" | "email" | "whatsapp")[];
  action: "logged" | "snoozed" | "dismissed" | "pending";
  amountLogged?: number;
  reminderType: "custom" | "weather";
  title?: string;
  message?: string;
}

const BASE_INTAKE_ML = 2500;

export function calculateDailyGoal(
  profile: UserProfile,
  weather?: WeatherData
): number {
  if (profile.manualGoal) {
    return profile.manualGoal;
  }

  // Base: adjust baseline according to gender and weight
  let goal = BASE_INTAKE_ML;
  if (profile.gender === "male") {
    goal = Math.max(profile.weight * 40, 3000);
  } else if (profile.gender === "female") {
    goal = Math.max(profile.weight * 32, 2200);
  } else {
    goal = Math.max(profile.weight * 35, BASE_INTAKE_ML);
  }

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

  return Math.round(goal / 50) * 50;
}

export function getReminderInterval(profile: UserProfile, weather?: WeatherData): number {
  if (!profile.weatherRemindersEnabled || !weather) {
    return profile.customInterval;
  }

  const temp = weather.temp;
  if (temp < 20) return 120; // below 20°C -> 2 hours
  if (temp <= 30) return 90;  // 20°C - 30°C -> 1.5 hours
  if (temp <= 40) return 60;  // 30°C - 40°C -> 1 hour
  return 30;                 // above 40°C -> 30 minutes
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
      "It is comfortable outside. Keep a steady intake of water at your desk.",
      "Cooler weather reduces thirst, but your body still needs regular hydration.",
    ],
    warm: [
      "Warm day! Keep a water bottle nearby while working.",
      "Active hours call for regular sips. Stay refreshed!",
    ],
    hot: [
      "The temperature is rising! Drink an extra glass of water every few hours.",
      "High temperature alert — hydrate regularly to stay focused and avoid fatigue.",
    ],
    extreme: [
      "⚠️ Extreme heat! It is crucial to drink water every 15-20 minutes.",
      "🔴 Heat warning — stay indoors, keep cool, and prioritize hydration!",
    ],
  };
  const level = getTemperatureLevel(weather.temp);
  const arr = tips[level];
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getTodayLogs(): IntakeLog[] {
  const today = getLocalDateString();
  const all: IntakeLog[] = JSON.parse(localStorage.getItem("hydration_logs") || "[]");
  return all.filter(l => getLocalDateString(new Date(l.timestamp)) === today);
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

export function getIntakeHistory(daysCount: number): { day: string; intake: number; dateStr: string }[] {
  const all: IntakeLog[] = JSON.parse(localStorage.getItem("hydration_logs") || "[]");
  const history = [];
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getLocalDateString(d);
    const label = daysCount <= 7 
      ? d.toLocaleDateString("en", { weekday: "short" }) 
      : d.toLocaleDateString("en", { day: "2-digit", month: "short" });
    const intake = all
      .filter(l => getLocalDateString(new Date(l.timestamp)) === key)
      .reduce((s, l) => s + l.amount, 0);
    history.push({ day: label, intake, dateStr: key });
  }
  return history;
}

export function getWeeklyData(): { day: string; intake: number }[] {
  return getIntakeHistory(7);
}

export function getProfile(): UserProfile | null {
  const p = localStorage.getItem("hydration_profile");
  return p ? JSON.parse(p) : null;
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem("hydration_profile", JSON.stringify(profile));
}

export function getReminderLogs(): ReminderLog[] {
  return JSON.parse(localStorage.getItem("hydration_reminder_logs") || "[]");
}

export function saveReminderLog(log: ReminderLog) {
  const all = getReminderLogs();
  const idx = all.findIndex(l => l.id === log.id);
  if (idx >= 0) all[idx] = log;
  else all.push(log);
  localStorage.setItem("hydration_reminder_logs", JSON.stringify(all));
}

export function getHydrationScore(): number {
  const logs = getTodayLogs();
  const profile = getProfile();
  if (!profile) return 0;

  // 1. Goal Met Score (up to 50 pts)
  const goal = calculateDailyGoal(profile, undefined);
  const currentIntake = logs.reduce((s, l) => s + l.amount, 0);
  const goalPercentage = Math.min((currentIntake / goal) * 100, 100);
  const goalScore = (goalPercentage / 100) * 50;

  // 2. Reminder Response Rate Score (up to 30 pts)
  const reminderLogs = getReminderLogs();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayReminders = reminderLogs.filter(l => new Date(l.timestamp) >= todayStart);

  let responseScore = 30; // default full marks if no reminders fired today
  if (todayReminders.length > 0) {
    const activeResponses = todayReminders.filter(l => l.action === "logged").length;
    responseScore = (activeResponses / todayReminders.length) * 30;
  }

  // 3. Consistency Score (up to 20 pts)
  const weeklyData = getIntakeHistory(7);
  const activeDays = weeklyData.filter(d => d.intake >= goal).length;
  const consistencyScore = (activeDays / 7) * 20;

  return Math.round(goalScore + responseScore + consistencyScore);
}
