import { getReminderInterval, saveReminderLog, type ReminderLog, type UserProfile, type WeatherData } from "./hydration";

const NOTIFICATION_KEY = "hydration_notifications_enabled";

export function isNotificationSupported(): boolean {
  return "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function isNotificationsEnabled(): boolean {
  return localStorage.getItem(NOTIFICATION_KEY) === "true";
}

export function setNotificationsEnabled(enabled: boolean) {
  localStorage.setItem(NOTIFICATION_KEY, String(enabled));
}

const waterMessages = [
  { title: "💧 Time to hydrate!", body: "Your body needs water — take a sip now!" },
  { title: "🥤 Water break!", body: "Stay sharp and drink some water." },
  { title: "💦 Hydration reminder", body: "A glass of water keeps you going!" },
  { title: "🖥️ Work break: Drink up!", body: "Long hours at the screen? Grab some water." },
  { title: "💧 Sip check!", body: "Keep your productivity high by drinking water." },
];

export function getRandomMessage(temp?: number): { title: string; body: string } {
  if (temp !== undefined && temp >= 35) {
    return {
      title: "🔥 High Temp Alert!",
      body: `It is currently ${temp}°C outside. Stay hydrated and drink water now.`,
    };
  }
  return waterMessages[Math.floor(Math.random() * waterMessages.length)];
}

let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function startReminderScheduler(
  profile: UserProfile,
  weather: WeatherData | null,
  onReminderTriggered: (log: ReminderLog) => void
) {
  stopReminderScheduler();
  if (!isNotificationsEnabled()) return;

  const intervalMin = getReminderInterval(profile, weather ?? undefined);
  const intervalMs = intervalMin * 60 * 1000;

  reminderTimer = setInterval(() => {
    triggerReminder(profile, weather, onReminderTriggered);
  }, intervalMs);
}

export function stopReminderScheduler() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}

export function triggerReminder(
  profile: UserProfile,
  weather: WeatherData | null,
  onReminderTriggered?: (log: ReminderLog) => void
): ReminderLog {
  const intervalMin = getReminderInterval(profile, weather ?? undefined);
  const msg = getRandomMessage(weather?.temp);

  const log: ReminderLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    temp: weather?.temp ?? 22,
    city: weather?.city ?? profile.city,
    intervalMinutes: intervalMin,
    channels: profile.channels,
    action: "pending",
  };

  saveReminderLog(log);

  // Send Browser Notification if 'in-app' channel is enabled and permission is granted
  if (
    profile.channels.includes("in-app") &&
    isNotificationSupported() &&
    Notification.permission === "granted"
  ) {
    new Notification(msg.title, {
      body: msg.body,
      icon: "/logo.svg",
      tag: "hydration-reminder",
    });
  }

  if (onReminderTriggered) {
    onReminderTriggered(log);
  }

  return log;
}
