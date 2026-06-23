import { createClient } from "@supabase/supabase-js";
import type { UserProfile, IntakeLog, ReminderLog } from "./hydration";
import { getLocalDateString } from "./utils";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Database helper layer with fallback to local storage
export const db = {
  // Profiles
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .single();
        if (error) {
          if (error.code !== "PGRST116") { // PGRST116 is code for no rows found
            console.error("Supabase profile fetch error:", error);
          }
          return getLocalProfile();
        }
        return {
          name: data.name,
          weight: Number(data.weight),
          age: data.age,
          gender: data.gender || "other",
          city: data.city,
          wakeTime: data.wake_time,
          sleepTime: data.sleep_time,
          workStart: data.work_start || "09:00",
          workEnd: data.work_end || "17:00",
          customInterval: data.custom_interval,
          weatherRemindersEnabled: data.weather_reminders_enabled,
          channels: data.channels,
          email: data.email || "",
          phone: data.phone || "",
          manualGoal: data.manual_goal,
        };
      } catch (err) {
        console.warn("Supabase profile error, falling back to local storage:", err);
        return getLocalProfile();
      }
    }
    return getLocalProfile();
  },

  async saveProfile(userId: string, profile: UserProfile): Promise<void> {
    saveLocalProfile(profile);
    if (supabase) {
      try {
        const { error } = await supabase.from("profiles").upsert({
          id: userId,
          name: profile.name,
          weight: profile.weight,
          age: profile.age,
          gender: profile.gender,
          city: profile.city,
          wake_time: profile.wakeTime,
          sleep_time: profile.sleepTime,
          work_start: profile.workStart,
          work_end: profile.workEnd,
          custom_interval: profile.customInterval,
          weather_reminders_enabled: profile.weatherRemindersEnabled,
          channels: profile.channels,
          email: profile.email,
          phone: profile.phone,
          manual_goal: profile.manualGoal,
        });
        if (error) console.error("Supabase profile save error:", error);
      } catch (err) {
        console.warn("Supabase profile save error, local updated:", err);
      }
    }
  },

  // Intake Logs
  async getAllLogs(userId: string): Promise<IntakeLog[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("intake_logs")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: true });
        if (error) {
          console.error("Supabase logs fetch error:", error);
          return getLocalLogs();
        }
        const mapped = data.map((l: { id: string; amount: number; timestamp: string }) => ({
          id: l.id,
          amount: l.amount,
          timestamp: l.timestamp,
        }));
        // Synchronize local storage to keep offline stats warm
        localStorage.setItem("hydration_logs", JSON.stringify(mapped));
        return mapped;
      } catch (err) {
        console.warn("Supabase logs error, falling back to local storage:", err);
        return getLocalLogs();
      }
    }
    return getLocalLogs();
  },

  async getTodayLogs(userId: string): Promise<IntakeLog[]> {
    const all = await this.getAllLogs(userId);
    const today = getLocalDateString();
    return all.filter(l => getLocalDateString(new Date(l.timestamp)) === today);
  },

  async addIntakeLog(userId: string, amount: number): Promise<IntakeLog> {
    const localLog = addLocalIntakeLog(amount);
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("intake_logs")
          .insert({
            user_id: userId,
            amount,
            timestamp: localLog.timestamp, // sync timestamp
          })
          .select()
          .single();
        if (error) {
          console.error("Supabase log add error:", error);
        } else {
          // Replace local log with db log to match ids
          const localLogs = getLocalLogs();
          const updatedLogs = localLogs.map(l => l.id === localLog.id ? { id: data.id, amount: data.amount, timestamp: data.timestamp } : l);
          localStorage.setItem("hydration_logs", JSON.stringify(updatedLogs));
          return { id: data.id, amount: data.amount, timestamp: data.timestamp };
        }
      } catch (err) {
        console.warn("Supabase log add error, stored locally:", err);
      }
    }
    return localLog;
  },

  // Reminder Logs
  async getReminderLogs(userId: string): Promise<ReminderLog[]> {
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("reminder_logs")
          .select("*")
          .eq("user_id", userId)
          .order("timestamp", { ascending: true });
        if (error) {
          console.error("Supabase reminders fetch error:", error);
          return getLocalReminderLogs();
        }
        const mapped = data.map((l: {
          id: string;
          timestamp: string;
          temp: number;
          city: string;
          interval_minutes: number;
          channels: ("in-app" | "email" | "whatsapp")[];
          action: "logged" | "snoozed" | "dismissed" | "pending";
          amount_logged: number | null;
          reminder_type?: "custom" | "weather";
          title?: string;
          message?: string;
        }) => ({
          id: l.id,
          timestamp: l.timestamp,
          temp: Number(l.temp),
          city: l.city,
          intervalMinutes: l.interval_minutes,
          channels: l.channels,
          action: l.action,
          amountLogged: l.amount_logged ?? undefined,
          reminderType: l.reminder_type || "custom",
          title: l.title,
          message: l.message,
        }));
        localStorage.setItem("hydration_reminder_logs", JSON.stringify(mapped));
        return mapped;
      } catch (err) {
        console.warn("Supabase reminders fetch error, using local storage:", err);
        return getLocalReminderLogs();
      }
    }
    return getLocalReminderLogs();
  },

  async saveReminderLog(userId: string, log: ReminderLog): Promise<void> {
    saveLocalReminderLog(log);
    if (supabase) {
      try {
        const { error } = await supabase.from("reminder_logs").upsert({
          id: log.id,
          user_id: userId,
          timestamp: log.timestamp,
          temp: log.temp,
          city: log.city,
          interval_minutes: log.intervalMinutes,
          channels: log.channels,
          action: log.action,
          amount_logged: log.amountLogged,
          reminder_type: log.reminderType,
        });
        if (error) console.error("Supabase reminder save error:", error);
      } catch (err) {
        console.warn("Supabase reminder save error, local updated:", err);
      }
    }
  }
};

// Local storage fallback handlers (the exact original implementation logic)
function getLocalProfile(): UserProfile | null {
  const p = localStorage.getItem("hydration_profile");
  return p ? JSON.parse(p) : null;
}

function saveLocalProfile(profile: UserProfile) {
  localStorage.setItem("hydration_profile", JSON.stringify(profile));
}

function getLocalLogs(): IntakeLog[] {
  return JSON.parse(localStorage.getItem("hydration_logs") || "[]");
}

function addLocalIntakeLog(amount: number): IntakeLog {
  const log: IntakeLog = {
    id: crypto.randomUUID(),
    amount,
    timestamp: new Date().toISOString(),
  };
  const all = getLocalLogs();
  all.push(log);
  localStorage.setItem("hydration_logs", JSON.stringify(all));
  return log;
}

function getLocalReminderLogs(): ReminderLog[] {
  return JSON.parse(localStorage.getItem("hydration_reminder_logs") || "[]");
}

function saveLocalReminderLog(log: ReminderLog) {
  const all = getLocalReminderLogs();
  const idx = all.findIndex(l => l.id === log.id);
  if (idx >= 0) all[idx] = log;
  else all.push(log);
  localStorage.setItem("hydration_reminder_logs", JSON.stringify(all));
}
