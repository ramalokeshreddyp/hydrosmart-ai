import { toast } from "sonner";
import { saveReminderLog, type ReminderLog, type UserProfile, type WeatherData } from "./hydration";

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

export function getRandomMessage(reminderType: "custom" | "weather", temp?: number): { title: string; body: string } {
  if (reminderType === "weather" && temp !== undefined) {
    if (temp >= 40) {
      return {
        title: "🚨 Extreme Heat Alert!",
        body: `It is currently ${temp}°C. Extreme heat requires immediate hydration! Drink water now.`,
      };
    }
    if (temp >= 30) {
      return {
        title: "🔥 High Temp Alert!",
        body: `It is currently ${temp}°C outside. Adaptive reminder triggered. Keep your body cool and hydrated.`,
      };
    }
    if (temp >= 20) {
      return {
        title: "☀️ Moderate Temp Alert!",
        body: `It is currently ${temp}°C. Stay ahead of your hydration.`,
      };
    }
  }
  return waterMessages[Math.floor(Math.random() * waterMessages.length)];
}

let reminderTimer: ReturnType<typeof setInterval> | null = null;

function isTimeInActiveHours(timeStr: string, wakeStr: string, sleepStr: string): boolean {
  const [hour, min] = timeStr.split(":").map(Number);
  const [wHour, wMin] = wakeStr.split(":").map(Number);
  const [sHour, sMin] = sleepStr.split(":").map(Number);

  const currentMins = hour * 60 + min;
  const wakeMins = wHour * 60 + wMin;
  const sleepMins = sHour * 60 + sMin;

  if (sleepMins >= wakeMins) {
    return currentMins >= wakeMins && currentMins <= sleepMins;
  } else {
    // Overnight sleep schedule: e.g. wake up at 08:00, sleep at 02:00 (next day)
    return currentMins >= wakeMins || currentMins <= sleepMins;
  }
}

export function startReminderScheduler(
  profile: UserProfile,
  weather: WeatherData | null,
  onReminderTriggered: (log: ReminderLog) => void
) {
  stopReminderScheduler();
  if (!isNotificationsEnabled()) return;

  // Run the scheduler check every 1 minute
  const CHECK_INTERVAL = 60 * 1000;

  reminderTimer = setInterval(() => {
    const now = new Date();
    const curTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    // 1. Check if inside active wake-up and sleep hours
    if (!isTimeInActiveHours(curTimeStr, profile.wakeTime, profile.sleepTime)) {
      console.log("HydroSmart: Outside active wake-up and sleep hours. Reminders skipped.");
      return;
    }

    // 2. Check if inside work hours (preferably restrict to work hours if configured)
    if (profile.workStart && profile.workEnd) {
      if (!isTimeInActiveHours(curTimeStr, profile.workStart, profile.workEnd)) {
        console.log("HydroSmart: Outside active work hours. Reminders skipped.");
        return;
      }
    }

    // 3. Fetch last reminder timestamps from local storage to calculate diffs
    const logsRaw = localStorage.getItem("hydration_reminder_logs");
    const logs: ReminderLog[] = logsRaw ? JSON.parse(logsRaw) : [];
    
    // Default to current time if no logs exist yet to prevent immediate startup spam
    let lastCustomTime = now.getTime();
    let lastWeatherTime = now.getTime();
    
    let hasCustomLogs = false;
    let hasWeatherLogs = false;
    
    if (logs.length > 0) {
      const sorted = [...logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      const customLogs = sorted.filter(l => l.reminderType === "custom" || !l.reminderType);
      if (customLogs.length > 0) {
        lastCustomTime = new Date(customLogs[0].timestamp).getTime();
        hasCustomLogs = true;
      }
      
      const weatherLogs = sorted.filter(l => l.reminderType === "weather");
      if (weatherLogs.length > 0) {
        lastWeatherTime = new Date(weatherLogs[0].timestamp).getTime();
        hasWeatherLogs = true;
      }
    }

    // Calculate elapsed minutes since last reminder
    const diffMinutesCustom = (now.getTime() - lastCustomTime) / (60 * 1000);
    const diffMinutesWeather = (now.getTime() - lastWeatherTime) / (60 * 1000);

    let shouldTrigger = false;
    let triggerType: "custom" | "weather" = "custom";
    let triggerReason = "";

    // 4. Regular Custom Interval Check (Mandatory base reminder)
    if (diffMinutesCustom >= profile.customInterval) {
      shouldTrigger = true;
      triggerType = "custom";
      triggerReason = `regular custom interval (${profile.customInterval}m)`;
    } 
    // 5. Adaptive Weather Extra Reminders Check (Supplemental alerts)
    else if (profile.weatherRemindersEnabled && weather) {
      const temp = weather.temp;
      let weatherInterval = 180; // default below 20°C: 3 hours
      let weatherReason = "Below 20°C (3h)";

      if (temp > 40) {
        weatherInterval = 30; // Temperature > 40°C: 30 minutes
        weatherReason = "Above 40°C (30m)";
      } else if (temp >= 30 && temp <= 40) {
        weatherInterval = 60; // Temperature 30°C – 40°C: 1 hour
        weatherReason = "30°C – 40°C (1h)";
      } else if (temp >= 20 && temp < 30) {
        weatherInterval = 120; // Temperature 20°C – 30°C: 2 hours
        weatherReason = "20°C – 30°C (2h)";
      }

      if (diffMinutesWeather >= weatherInterval) {
        shouldTrigger = true;
        triggerType = "weather";
        triggerReason = `weather alert for ${weatherReason}`;
      }
    }

    if (shouldTrigger) {
      console.log(`HydroSmart: Triggering ${triggerType} reminder due to ${triggerReason}. DiffCustom: ${Math.round(diffMinutesCustom)}m, DiffWeather: ${Math.round(diffMinutesWeather)}m`);
      triggerReminder(profile, weather, triggerType, onReminderTriggered);
    }
  }, CHECK_INTERVAL);
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
  reminderType: "custom" | "weather",
  onReminderTriggered?: (log: ReminderLog) => void
): ReminderLog {
  const msg = getRandomMessage(reminderType, weather?.temp);

  const log: ReminderLog = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    temp: weather?.temp ?? 22,
    city: weather?.city ?? profile.city,
    intervalMinutes: profile.customInterval,
    channels: profile.channels,
    action: "pending",
    reminderType,
    title: msg.title,
    message: msg.body,
  };

  // Sync to local storage immediately so subsequent scheduler checks know about it
  const allLogsRaw = localStorage.getItem("hydration_reminder_logs");
  const allLogs: ReminderLog[] = allLogsRaw ? JSON.parse(allLogsRaw) : [];
  allLogs.push(log);
  localStorage.setItem("hydration_reminder_logs", JSON.stringify(allLogs));

  // Send Browser Notification if 'in-app' channel is enabled and permission is granted
  if (profile.channels.includes("in-app")) {
    if (isNotificationSupported() && Notification.permission === "granted" && document.hidden) {
      try {
        new Notification(msg.title, {
          body: msg.body,
          icon: "/logo.svg",
          tag: "hydration-reminder",
        });
      } catch (e) {
        console.warn("Failed to dispatch browser Notification API:", e);
      }
    }
    // Also dispatch in-app toast notification for real-time visibility
    toast.info(msg.title, {
      description: msg.body,
      duration: 5000,
    });
  }

  // Real or simulated Email reminder
  if (profile.channels.includes("email")) {
    const resendKey = localStorage.getItem("hydration_resend_api_key") || import.meta.env.VITE_RESEND_API_KEY;
    if (resendKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendKey}`
        },
        body: JSON.stringify({
          from: "HydroSmart <onboarding@resend.dev>",
          to: profile.email,
          subject: msg.title,
          html: `
            <div style="font-family: system-ui, sans-serif; padding: 24px; background-color: #0b1329; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; max-width: 500px; margin: auto;">
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="font-size: 40px;">💧</span>
                <h1 style="color: #38bdf8; margin: 8px 0 0 0; font-size: 24px; font-weight: 800;">HydroSmart</h1>
                <p style="color: #94a3b8; font-size: 12px; margin: 4px 0 0 0;">Your Intelligent Hydration Companion</p>
              </div>
              <div style="background-color: #1e293b; padding: 20px; border-radius: 12px; border: 1px solid #334155;">
                <h2 style="color: #38bdf8; font-size: 18px; margin-top: 0;">${msg.title}</h2>
                <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6; margin-bottom: 0;">${msg.body}</p>
              </div>
              <div style="text-align: center; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px;">
                <p style="font-size: 11px; color: #64748b; margin: 0;">This reminder was triggered dynamically based on your scheduler settings.</p>
              </div>
            </div>
          `
        })
      })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          console.error("Resend API delivery error:", errText);
          toast.error("Email Delivery Failed", { description: errText });
        } else {
          console.log("Resend API: Email sent successfully.");
          toast.success("📬 Email Delivered to Inbox", { description: `Sent to ${profile.email}` });
        }
      })
      .catch((err) => {
        console.error("Resend API fetch error:", err);
        toast.error("Email Delivery Error", { description: err.message });
      });
    } else {
      toast.message("📬 Simulated Email Reminder Sent", {
        description: `Sent to ${profile.email}: "${msg.title}" (To send real emails, add a Resend API Key in Settings)`,
        duration: 6000,
      });
    }
  }

  // Real or simulated WhatsApp reminder
  if (profile.channels.includes("whatsapp") && profile.phone) {
    const waToken = localStorage.getItem("hydration_whatsapp_token") || import.meta.env.VITE_WHATSAPP_TOKEN;
    const waPhoneId = localStorage.getItem("hydration_whatsapp_phone_number_id") || import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID;
    if (waToken && waPhoneId) {
      const cleanPhone = profile.phone.replace(/\D/g, "");
      const formattedPhone = cleanPhone.startsWith("91") && cleanPhone.length === 12 ? cleanPhone : `91${cleanPhone}`;
      
      fetch(`https://graph.facebook.com/v17.0/${waPhoneId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${waToken}`
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            body: `💧 HydroSmart Reminder: *${msg.title}*\n${msg.body}`
          }
        })
      })
      .then(async (res) => {
        if (!res.ok) {
          const errText = await res.text();
          console.error("WhatsApp Cloud API error:", errText);
          toast.error("WhatsApp Delivery Failed", { description: errText });
        } else {
          console.log("WhatsApp Cloud API: Message sent successfully.");
          toast.success("💬 WhatsApp Alert Delivered", { description: `Sent to +91 ${profile.phone}` });
        }
      })
      .catch((err) => {
        console.error("WhatsApp Cloud API fetch error:", err);
        toast.error("WhatsApp Delivery Error", { description: err.message });
      });
    } else {
      toast.message("💬 Simulated WhatsApp Reminder Sent", {
        description: `Sent to +91 ${profile.phone}: "${msg.title}" (To send real messages, add WhatsApp credentials in Settings)`,
        duration: 6000,
      });
    }
  }

  if (onReminderTriggered) {
    onReminderTriggered(log);
  }

  return log;
}
