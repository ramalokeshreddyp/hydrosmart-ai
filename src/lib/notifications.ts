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
  { title: "🌊 Drink up!", body: "Don't forget to stay hydrated today." },
  { title: "💧 Sip check!", body: "Have you had water recently? Now's a good time." },
  { title: "⏰ Water o'clock!", body: "Keep that streak going — grab some water!" },
];

function getRandomMessage() {
  return waterMessages[Math.floor(Math.random() * waterMessages.length)];
}

let reminderTimer: ReturnType<typeof setInterval> | null = null;

export function startReminders(intervalMinutes: number) {
  stopReminders();
  if (!isNotificationSupported() || Notification.permission !== "granted") return;

  const intervalMs = intervalMinutes * 60 * 1000;

  reminderTimer = setInterval(() => {
    if (document.hidden && isNotificationsEnabled()) {
      const msg = getRandomMessage();
      const notification = new Notification(msg.title, {
        body: msg.body,
        icon: "/favicon.ico",
        tag: "hydration-reminder",
      } as NotificationOptions);
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }
  }, intervalMs);
}

export function stopReminders() {
  if (reminderTimer) {
    clearInterval(reminderTimer);
    reminderTimer = null;
  }
}

export function sendTestNotification() {
  if (!isNotificationSupported() || Notification.permission !== "granted") return;
  const msg = getRandomMessage();
  new Notification(msg.title, {
    body: msg.body,
    icon: "/favicon.ico",
    tag: "hydration-test",
  });
}
