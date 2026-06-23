import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings as SettingsIcon,
  RefreshCw,
  Droplets,
  Sliders,
  Bell,
  Check,
  TrendingUp,
  LogOut,
  Sparkles,
  ShieldCheck,
  Activity,
  AlertTriangle,
  GlassWater,
  Calendar,
  Clock,
  MessageSquare,
  Sun,
  Moon,
  MapPin,
  Lock,
  Mail,
  User,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WaterProgress } from "@/components/WaterProgress";
import { WeatherCard } from "@/components/WeatherCard";
import { QuickAdd } from "@/components/QuickAdd";
import { WeeklyChart } from "@/components/WeeklyChart";
import { BadgeUnlockToast } from "@/components/BadgeUnlockToast";
import { Auth } from "@/components/Auth";
import { supabase, db } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/utils";
import {
  calculateDailyGoal,
  getHydrationTip,
  type UserProfile,
  type WeatherData,
  type ReminderLog,
} from "@/lib/hydration";
import { fetchWeather, fetchWeatherByCoords } from "@/lib/weather";
import { computeStats, getNewlyUnlockedBadges, type HydrationStats, type Badge } from "@/lib/gamification";
import {
  triggerReminder,
  startReminderScheduler,
  stopReminderScheduler,
  isNotificationsEnabled,
  setNotificationsEnabled,
  getNotificationPermission,
  requestNotificationPermission,
} from "@/lib/notifications";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const weatherPresets = [
  { name: "❄️ Cold Day", temp: 14, humidity: 75, desc: "Chilly breeze", icon: "❄️" },
  { name: "🏢 Normal Office", temp: 23, humidity: 50, desc: "Comfortable workspace", icon: "⛅" },
  { name: "🔥 Heatwave", temp: 41, humidity: 20, desc: "Blistering sunshine", icon: "☀️" },
];

export default function Dashboard() {
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

  // Tab View Routing ("dashboard" | "settings")
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");

  // SaaS Theme Toggle ("dark" | "light")
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [tip, setTip] = useState("");
  const [stats, setStats] = useState<HydrationStats | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [reminderLogs, setReminderLogs] = useState<ReminderLog[]>([]);
  const [hydrationScore, setHydrationScore] = useState(0);
  const prevStatsRef = useRef<HydrationStats | null>(null);

  // Settings form local state
  const [settingsForm, setSettingsForm] = useState<UserProfile | null>(null);
  const [settingsEmail, setSettingsEmail] = useState("");
  const [settingsPassword, setSettingsPassword] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Gateway API credentials
  const [resendApiKey, setResendApiKey] = useState(() => localStorage.getItem("hydration_resend_api_key") || "");
  const [whatsappToken, setWhatsappToken] = useState(() => localStorage.getItem("hydration_whatsapp_token") || "");
  const [whatsappPhoneId, setWhatsappPhoneId] = useState(() => localStorage.getItem("hydration_whatsapp_phone_number_id") || "");

  // Settings channels toggles
  const [setChInApp, setSetChInApp] = useState(true);
  const [setChEmail, setSetChEmail] = useState(true);
  const [setChWhatsApp, setSetChWhatsApp] = useState(false);

  // Simulated Weather Overrides
  const [simulatedWeather, setSimulatedWeather] = useState<WeatherData | null>(null);

  // In-App Reminder Overlay
  const [activeReminder, setActiveReminder] = useState<ReminderLog | null>(null);

  const activeWeather = simulatedWeather || weather;

  // Calculate goal & base interval
  const goal = profile && profile.manualGoal ? profile.manualGoal : (profile ? calculateDailyGoal(profile, activeWeather ?? undefined) : 2500);
  const reminderInterval = profile ? profile.customInterval : 60;

  // Theme effect
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaInstallModal, setShowPwaInstallModal] = useState(false);

  // Settings Location Mode State
  const [settingsLocationMode, setSettingsLocationMode] = useState<"auto" | "manual">("manual");
  const [detectingSettingsLocation, setDetectingSettingsLocation] = useState(false);

  const handleSettingsAutoDetect = () => {
    if (navigator.geolocation && settingsForm) {
      setDetectingSettingsLocation(true);
      setSettingsError(null);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const w = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            if (w && w.city) {
              setSettingsForm(prev => prev ? { ...prev, city: w.city } : null);
            }
          } catch (err) {
            console.error("Coords weather retrieval error:", err);
          } finally {
            setDetectingSettingsLocation(false);
          }
        },
        (err) => {
          console.warn("Geolocation permission blocked/failed:", err);
          setSettingsError("Location access denied or timed out. Please enter manually.");
          setDetectingSettingsLocation(false);
        }
      );
    }
  };

  const selectSettingsLocationMode = (mode: "auto" | "manual") => {
    setSettingsLocationMode(mode);
    if (mode === "auto") {
      handleSettingsAutoDetect();
    }
  };

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!sessionStorage.getItem("hydrosmart_install_prompt_dismissed")) {
        setShowPwaInstallModal(true);
      }
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice for PWA install: ${outcome}`);
    setDeferredPrompt(null);
    setShowPwaInstallModal(false);
  };

  // Supabase auth listener
  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      setOfflineMode(true);
      
      const local = localStorage.getItem("hydration_profile");
      if (local) {
        setProfile(JSON.parse(local));
      }
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
      if (!session) {
        const local = localStorage.getItem("hydration_profile");
        if (local) {
          setProfile(JSON.parse(local));
          setOfflineMode(true);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setOfflineMode(false);
      } else {
        const local = localStorage.getItem("hydration_profile");
        if (local) {
          setProfile(JSON.parse(local));
          setOfflineMode(true);
        } else {
          setProfile(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Profile from DB or fallback
  useEffect(() => {
    const loadProfile = async () => {
      if (!authChecked) return;
      const userId = session?.user?.id;
      if (userId && !offlineMode) {
        const p = await db.getProfile(userId);
        if (p) {
          setProfile(p);
          localStorage.setItem("hydration_profile", JSON.stringify(p));
        }
      } else {
        const local = localStorage.getItem("hydration_profile");
        setProfile(local ? JSON.parse(local) : null);
      }
    };
    loadProfile();
  }, [session, offlineMode, authChecked]);

  // Sync settings local form when profile loaded
  useEffect(() => {
    if (profile) {
      setSettingsForm({ ...profile });
      setSettingsEmail(profile.email || "");
      setSetChInApp(profile.channels.includes("in-app"));
      setSetChEmail(profile.channels.includes("email"));
      setSetChWhatsApp(profile.channels.includes("whatsapp"));
    }
  }, [profile]);

  const refreshToday = useCallback(async (goalMl: number) => {
    const userId = session?.user?.id || "offline";
    const logs = await db.getTodayLogs(userId);
    setTodayTotal(logs.reduce((s, l) => s + l.amount, 0));

    const allLogs = await db.getAllLogs(userId);
    const newStats = computeStats(allLogs, goalMl);

    const newlyUnlocked = getNewlyUnlockedBadges(prevStatsRef.current, newStats);
    if (newlyUnlocked.length > 0) {
      setNewBadge(newlyUnlocked[0]);
    }

    prevStatsRef.current = newStats;
    setStats(newStats);
    
    const rLogs = await db.getReminderLogs(userId);
    setReminderLogs(rLogs);

    // Calculate hydration score
    const currentIntake = logs.reduce((s, l) => s + l.amount, 0);
    const goalPercentage = Math.min((currentIntake / goalMl) * 100, 100);
    const goalScore = (goalPercentage / 100) * 50;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayReminders = rLogs.filter(l => new Date(l.timestamp) >= todayStart);
    let responseScore = 30;
    if (todayReminders.length > 0) {
      const activeResponses = todayReminders.filter(l => l.action === "logged").length;
      responseScore = (activeResponses / todayReminders.length) * 30;
    }

    const historyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = getLocalDateString(d);
      const intake = allLogs
        .filter(l => getLocalDateString(new Date(l.timestamp)) === key)
        .reduce((s, l) => s + l.amount, 0);
      historyData.push(intake);
    }
    const activeDays = historyData.filter(intake => intake >= goalMl).length;
    const consistencyScore = (activeDays / 7) * 20;

    setHydrationScore(Math.round(goalScore + responseScore + consistencyScore));
  }, [session]);

  const loadWeather = useCallback(async (city: string) => {
    setLoading(true);
    try {
      const w = await fetchWeather(city);
      setWeather(w);
      setTip(getHydrationTip(w));
    } catch (e) {
      setTip("Failed to fetch weather. Running adaptive checks with fallbacks.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const w = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            setWeather(w);
            setTip(getHydrationTip(w));
            if (w.city && profile) {
              const updatedProfile = { ...profile, city: w.city };
              setProfile(updatedProfile);
              await db.saveProfile(session?.user?.id || "offline", updatedProfile);
            }
          } catch (e) {
            console.error("Coords weather retrieval error:", e);
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.warn("Geolocation permission blocked/failed. Using profile city:", err);
          setLoading(false);
          if (profile?.city) {
            loadWeather(profile.city);
          }
        }
      );
    }
  };

  // Update Scheduler
  const [schedulerMuted, setSchedulerMuted] = useState(!isNotificationsEnabled());

  useEffect(() => {
    if (profile && !schedulerMuted) {
      startReminderScheduler(profile, activeWeather, (log) => {
        setActiveReminder(log);
        const userId = session?.user?.id || "offline";
        db.saveReminderLog(userId, log).then(() => {
          db.getReminderLogs(userId).then(setReminderLogs);
        });
      });
    } else {
      stopReminderScheduler();
    }
    return () => stopReminderScheduler();
  }, [profile, activeWeather, session, schedulerMuted]);

  const toggleSchedulerMute = async () => {
    const nextMute = !schedulerMuted;
    if (!nextMute && getNotificationPermission() !== "granted") {
      await requestNotificationPermission();
    }
    setSchedulerMuted(nextMute);
    setNotificationsEnabled(!nextMute);
  };

  // Load weather when profile city changes
  useEffect(() => {
    if (profile?.city && !simulatedWeather) {
      loadWeather(profile.city);
    }
  }, [profile?.city, simulatedWeather, loadWeather]);

  // Set tip when active weather changes
  useEffect(() => {
    if (activeWeather) {
      setTip(getHydrationTip(activeWeather));
    }
  }, [activeWeather]);

  // Refresh stats when profile or goal changes
  useEffect(() => {
    if (profile) {
      refreshToday(goal);
    }
  }, [profile, goal, refreshToday]);

  const handleTestTrigger = () => {
    if (!profile) return;
    const userId = session?.user?.id || "offline";
    triggerReminder(profile, activeWeather, "custom", (newLog) => {
      setActiveReminder(newLog);
      db.saveReminderLog(userId, newLog).then(() => {
        db.getReminderLogs(userId).then(setReminderLogs);
      });
    });
  };

  const handleReminderAction = async (action: "logged" | "snoozed" | "dismissed", amountMl?: number) => {
    if (!activeReminder) return;

    const updatedLog: ReminderLog = {
      ...activeReminder,
      action,
      amountLogged: amountMl,
    };

    const userId = session?.user?.id || "offline";
    await db.saveReminderLog(userId, updatedLog);

    if (action === "logged" && amountMl) {
      await db.addIntakeLog(userId, amountMl);
    }

    setActiveReminder(null);
    await refreshToday(goal);

    if (action === "snoozed") {
      setTimeout(() => {
        if (profile) {
          triggerReminder(profile, activeWeather, "custom", (snoozedLog) => {
            setActiveReminder(snoozedLog);
            db.saveReminderLog(userId, snoozedLog).then(() => {
              db.getReminderLogs(userId).then(setReminderLogs);
            });
          });
        }
      }, 10000);
    }
  };

  const applyPreset = (preset: typeof weatherPresets[0]) => {
    if (!profile) return;
    const mocked: WeatherData = {
      temp: preset.temp,
      humidity: preset.humidity,
      description: preset.desc,
      icon: preset.icon,
      city: profile.city,
      isMock: true,
    };
    setSimulatedWeather(mocked);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaved(false);
    setSettingsError(null);

    if (!settingsForm || !settingsForm.name || !settingsForm.city || !settingsForm.manualGoal) {
      setSettingsError("Name, City, and Daily Water Goal are required fields.");
      return;
    }

    if (Number(settingsForm.manualGoal) < 500) {
      setSettingsError("Daily Water Goal is mandatory and must be at least 500 ml.");
      return;
    }

    if (settingsForm.customInterval < 10) {
      setSettingsError("Custom interval must be at least 10 minutes.");
      return;
    }

    const validateIndianPhone = (num: string): boolean => {
      return /^(?:\+91|91)?[6-9]\d{9}$/.test(num.trim());
    };

    if (setChWhatsApp && !validateIndianPhone(settingsForm.phone || "")) {
      setSettingsError("Please enter a valid 10-digit Indian phone number for WhatsApp.");
      return;
    }

    setLoading(true);

    const nextChannels: ("in-app" | "email" | "whatsapp")[] = [];
    if (setChInApp) nextChannels.push("in-app");
    if (setChEmail) nextChannels.push("email");
    if (setChWhatsApp) nextChannels.push("whatsapp");

    const updatedProfile: UserProfile = {
      ...settingsForm,
      email: settingsEmail,
      channels: nextChannels,
      phone: setChWhatsApp ? settingsForm.phone : "",
      manualGoal: Number(settingsForm.manualGoal),
    };

    const userId = session?.user?.id || "offline";

    try {
      // 1. Save locally and in profiles database
      await db.saveProfile(userId, updatedProfile);
      setProfile(updatedProfile);
      localStorage.setItem("hydration_profile", JSON.stringify(updatedProfile));

      // Save integration tokens
      localStorage.setItem("hydration_resend_api_key", resendApiKey);
      localStorage.setItem("hydration_whatsapp_token", whatsappToken);
      localStorage.setItem("hydration_whatsapp_phone_number_id", whatsappPhoneId);

      // 2. If online, update email/password in Supabase Auth if provided
      if (supabase && userId !== "offline") {
        const updateData: any = {};
        if (settingsEmail !== profile.email) {
          updateData.email = settingsEmail;
        }
        if (settingsPassword) {
          updateData.password = settingsPassword;
        }
        if (Object.keys(updateData).length > 0) {
          const { error: authUpdateError } = await supabase.auth.updateUser(updateData);
          if (authUpdateError) throw authUpdateError;
        }
      } else if (userId === "offline") {
        // Offline simulated updates
        const offlineUsers = JSON.parse(localStorage.getItem("hydration_offline_users") || "[]");
        const idx = offlineUsers.findIndex((u: any) => u.email.toLowerCase() === profile.email.toLowerCase());
        if (idx >= 0) {
          offlineUsers[idx].email = settingsEmail;
          if (settingsPassword) {
            offlineUsers[idx].password = settingsPassword;
          }
          offlineUsers[idx].profile = updatedProfile;
          localStorage.setItem("hydration_offline_users", JSON.stringify(offlineUsers));
        }
      }

      setSettingsPassword("");
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      console.error("Save profile error:", err);
      setSettingsError(err.message || "Failed to update settings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem("hydration_profile");
    if (supabase && session) {
      await supabase.auth.signOut();
    }
    setProfile(null);
    setSession(null);
    setOfflineMode(false);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // If no profile, we show the Auth login/registration view
  if (!profile) {
    return (
      <Auth
        onSuccess={(userId) => {
          if (userId === "offline") {
            setOfflineMode(true);
          } else {
            setOfflineMode(false);
          }
          const local = localStorage.getItem("hydration_profile");
          if (local) {
            setProfile(JSON.parse(local));
          }
        }}
      />
    );
  }

  // Reminder analytics calculations
  const todayDateStr = getLocalDateString(new Date());

  // Active reminder helper details
  const todayRemindersCount = activeReminder
    ? reminderLogs.filter(
        (l) =>
          getLocalDateString(new Date(l.timestamp)) === todayDateStr &&
          l.id !== activeReminder.id
      ).length + 1
    : 1;

  const reminderTimeStr = activeReminder
    ? new Date(activeReminder.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  
  // Sent Today
  const sentToday = reminderLogs.filter(
    (l) => getLocalDateString(new Date(l.timestamp)) === todayDateStr
  ).length;

  // Sent This Week (7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const sentThisWeek = reminderLogs.filter(
    (l) => new Date(l.timestamp) >= oneWeekAgo
  ).length;

  // Sent This Month (30 days)
  const oneMonthAgo = new Date();
  oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
  const sentThisMonth = reminderLogs.filter(
    (l) => new Date(l.timestamp) >= oneMonthAgo
  ).length;

  // Reminder stats by day (7 days)
  const reminderStatsByDay = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = getLocalDateString(d);
    const customCount = reminderLogs.filter(
      (l) => getLocalDateString(new Date(l.timestamp)) === key && (l.reminderType === "custom" || !l.reminderType)
    ).length;
    const weatherCount = reminderLogs.filter(
      (l) => getLocalDateString(new Date(l.timestamp)) === key && l.reminderType === "weather"
    ).length;
    reminderStatsByDay.push({
      day: d.toLocaleDateString("en", { weekday: "short" }),
      "Custom Reminders": customCount,
      "Weather Alerts": weatherCount,
    });
  }

  // Reminder times distribution (hourly density)
  const hourlyCounts = Array(24).fill(0);
  reminderLogs.forEach((l) => {
    const d = new Date(l.timestamp);
    hourlyCounts[d.getHours()]++;
  });
  const reminderTimeData = hourlyCounts
    .map((count, hour) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      density: count,
    }))
    .filter((d) => d.density > 0);

  // Dispatch history feed (latest 10)
  const dispatchHistory = [...reminderLogs]
    .slice(-10)
    .reverse()
    .map((log) => {
      const date = new Date(log.timestamp);
      return {
        id: log.id,
        date: date.toLocaleDateString([], { month: "short", day: "2-digit" }),
        time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: log.reminderType === "weather" ? "Weather Reminder" : "Custom Reminder",
        temp: `${log.temp}°C`,
        channels: log.channels,
        action: log.action,
      };
    });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <BadgeUnlockToast badge={newBadge} onDismiss={() => setNewBadge(null)} />

      {/* PWA INSTALL DIALOG */}
      <AnimatePresence>
        {showPwaInstallModal && deferredPrompt && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-strong rounded-2xl p-6 max-w-sm w-full space-y-4 border border-primary/20 shadow-2xl relative text-center"
            >
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
                <Compass className="w-6 h-6 text-primary animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-heading font-bold text-foreground text-base sm:text-lg">
                  Download HydroSmart App
                </h3>
                <p className="text-xs text-muted-foreground leading-normal px-2">
                  Install our lightweight app on your home screen or desktop for instant hydration reminders, weather alerts, and faster access.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    sessionStorage.setItem("hydrosmart_install_prompt_dismissed", "true");
                    setShowPwaInstallModal(false);
                  }}
                  className="rounded-xl h-10 text-xs font-semibold"
                >
                  Maybe Later
                </Button>
                <Button
                  onClick={handleInstallClick}
                  className="rounded-xl h-10 text-xs font-bold shadow-lg shadow-primary/25"
                >
                  Download App ➔
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IN-APP INTERACTIVE ALERT DIALOG */}
      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-6 max-w-sm w-full space-y-4 border border-primary/20 shadow-2xl relative"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary animate-pulse" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground text-sm sm:text-base">
                    {activeReminder.title || "Hydration Alert!"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 mt-0.5 font-semibold">
                    <span className="text-primary">Reminder #{todayRemindersCount} of today</span>
                    <span className="opacity-40">•</span>
                    <span>Sent at {reminderTimeStr}</span>
                  </p>
                </div>
              </div>

              <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-xs sm:text-sm">
                <p className="text-foreground leading-relaxed">
                  {activeReminder.message || `It is currently ${activeReminder.temp}°C. Keep your hydration target on track!`}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2 border-t border-primary/10 pt-1.5 flex justify-between font-medium">
                  <span>Location: {activeReminder.city}</span>
                  <span>Interval: {profile.customInterval}m</span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={() => handleReminderAction("logged", 250)}
                  className="rounded-xl h-10 text-xs font-semibold"
                >
                  🥛 Log 250ml
                </Button>
                <Button
                  onClick={() => handleReminderAction("logged", 500)}
                  className="rounded-xl h-10 text-xs font-semibold"
                >
                  🥤 Log 500ml
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReminderAction("snoozed")}
                  className="rounded-xl h-10 text-xs"
                >
                  ⏰ Snooze 10s
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleReminderAction("dismissed")}
                  className="rounded-xl h-10 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* TOP HEADER NAVIGATION BAR */}
      <header className="border-b border-border/50 bg-card/75 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-base sm:text-lg text-foreground flex items-center gap-1.5 leading-none">
              HydroSmart <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-body font-bold">SaaS</span>
            </h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-xs mt-0.5">{tip}</p>
          </div>
        </div>

        {/* Tab Links (Dashboard / Settings) */}
        <nav className="flex bg-secondary/50 rounded-xl p-0.5 border border-border/30 text-xs sm:text-sm">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "dashboard"
                ? "bg-background text-primary shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-3 sm:px-4 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === "settings"
                ? "bg-background text-primary shadow-sm font-bold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Settings
          </button>
        </nav>

        {/* Weather Quick Status & Theme Control */}
        <div className="flex items-center gap-2">
          {activeWeather && (
            <button
              onClick={handleGeolocation}
              className="hidden lg:flex items-center gap-2 bg-secondary/50 rounded-xl px-3 py-1.5 border border-border/30 text-xs text-foreground/90 hover:bg-secondary transition-colors"
              title="Click to use Geolocation coordinates"
            >
              <Compass className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-primary font-heading">{activeWeather.temp}°C</span>
              <span>{activeWeather.icon}</span>
              {activeWeather.isMock ? (
                <span className="px-1 py-0.25 rounded bg-warning/15 text-warning text-[8px] font-bold">Sim</span>
              ) : (
                <span className="px-1 py-0.25 rounded bg-success/15 text-success text-[8px] font-bold">Live</span>
              )}
            </button>
          )}

          {deferredPrompt && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallClick}
              className="rounded-xl h-9 text-xs font-bold gap-1 border-primary/20 text-primary hover:bg-primary/5 hidden md:flex mr-2 animate-pulse"
              title="Download App"
            >
              <Compass className="w-3.5 h-3.5 text-primary" />
              Install App
            </Button>
          )}

          {/* Light/Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle Theme"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Logout Shortcut */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </Button>
        </div>
      </header>

      {/* VIEW TRANSITIONS PANEL */}
      <div className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {deferredPrompt && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 glass-strong border border-primary/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-background to-primary/5 shadow-md text-foreground"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
                <Compass className="w-5 h-5 text-primary animate-bounce" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-heading font-bold text-foreground text-sm sm:text-base">
                  Install HydroSmart Web App
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get instant hydration reminders directly on your desktop or phone home screen.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeferredPrompt(null)}
                className="text-xs h-9 rounded-xl px-3 hover:bg-destructive/10 hover:text-destructive"
              >
                Not Now
              </Button>
              <Button
                onClick={handleInstallClick}
                className="text-xs h-9 rounded-xl px-4 font-bold flex items-center gap-1.5 shadow-lg shadow-primary/20"
              >
                Download App ➔
              </Button>
            </div>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" ? (
            // DASHBOARD TAB VIEW
            <motion.div
              key="dashboard-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* COLUMN 1: DAILY HYDRATION TRACKER */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <GlassWater className="w-4 h-4 text-primary" /> Daily Hydration Tracker
                  </h2>

                  <div className="space-y-4">
                    <WaterProgress current={todayTotal} goal={goal} />
                    <QuickAdd userId={session?.user?.id || "offline"} onAdd={() => refreshToday(goal)} />
                  </div>
                </div>

                {/* COLUMN 2: WEATHER & SCHEDULER STATUS */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-accent" /> Weather & Reminders
                  </h2>

                  <div className="space-y-4">
                    {activeWeather && (
                      <WeatherCard weather={activeWeather} reminderMin={reminderInterval} />
                    )}

                    {/* Hydration Reminders Status Card */}
                    <div className="glass-strong rounded-2xl p-4 sm:p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/30 pb-3">
                        <div>
                          <h3 className="font-heading font-bold text-foreground text-sm flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                            Hydration Reminders
                          </h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            Status: <span className="text-emerald-500 font-semibold">Active Background Scheduler</span>
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 text-xs">
                        <div className="bg-secondary/20 rounded-xl p-3 border border-border/20 space-y-2">
                          <p className="font-semibold text-foreground">Schedule Configuration:</p>
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                            <div>
                              <span className="font-semibold text-foreground">Waking Hours:</span><br />
                              {profile.wakeTime} – {profile.sleepTime}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">Working Hours:</span><br />
                              {profile.workStart} – {profile.workEnd}
                            </div>
                          </div>
                        </div>

                        <div className="bg-secondary/20 rounded-xl p-3 border border-border/20 space-y-2">
                          <p className="font-semibold text-foreground">Custom Interval:</p>
                          <p className="text-[11px] text-muted-foreground">
                            Fires strictly every <span className="text-primary font-bold">{profile.customInterval} minutes</span>.
                          </p>
                        </div>

                        {profile.weatherRemindersEnabled && (
                          <div className="bg-secondary/20 rounded-xl p-3 border border-border/20 space-y-2">
                            <p className="font-semibold text-foreground">Adaptive Weather Rules:</p>
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              Weather alerts trigger based on outdoor temperature checks:
                            </p>
                            <ul className="list-disc pl-4 text-[10px] text-muted-foreground space-y-1">
                              <li>Above 40°C: Alerts every 30m</li>
                              <li>30°C–40°C: Alerts every 1h</li>
                              <li>20°C–30°C: Alerts every 2h</li>
                              <li>Below 20°C: Alerts every 3h</li>
                            </ul>
                          </div>
                        )}

                        <div className="space-y-1.5 pt-1">
                          <p className="font-semibold text-[11px] text-muted-foreground">Active Notification Delivery Channels:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.channels.map((ch) => (
                              <span
                                key={ch}
                                className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[9px] font-bold capitalize border border-primary/20"
                              >
                                {ch.replace("-", " ")}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* COLUMN 3: DISPATCH OUTBOX FEED */}
                <div className="space-y-6">
                  <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-warning" /> Dispatched Reminders Log
                  </h2>

                  <div className="glass-strong rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-secondary/40 rounded-xl p-2 border border-border/30 text-center flex flex-col justify-center">
                        <p className="text-xl font-heading font-bold text-primary">{sentToday}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Today</p>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2 border border-border/30 text-center flex flex-col justify-center">
                        <p className="text-xl font-heading font-bold text-foreground">{sentThisWeek}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">This Week</p>
                      </div>
                      <div className="bg-secondary/40 rounded-xl p-2 border border-border/30 text-center flex flex-col justify-center">
                        <p className="text-xl font-heading font-bold text-foreground">{sentThisMonth}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5">This Month</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-foreground mb-2.5 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" /> Delivery History Timeline
                      </h3>

                      {dispatchHistory.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6 bg-secondary/10 rounded-xl border border-border/20">
                          No reminders dispatched yet.
                        </p>
                      ) : (
                        <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                          {dispatchHistory.map((log) => (
                            <div
                              key={log.id}
                              className="bg-secondary/20 rounded-xl p-2.5 border border-border/30 text-[11px] flex flex-col space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">{log.date} at {log.time}</span>
                                <span className={`px-2 py-0.25 rounded-md text-[9px] font-bold ${
                                  log.type === "Weather Reminder"
                                    ? "bg-warning/10 text-warning border border-warning/20"
                                    : "bg-primary/10 text-primary border border-primary/20"
                                }`}>
                                  {log.type === "Weather Reminder" ? "Weather" : "Custom"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                <span>Temp: {log.temp}</span>
                                <span className="capitalize">Status: {log.action}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM SECTION: ANALYTICS GRAPHS */}
              <div className="space-y-6 pt-4 border-t border-border/40">
                <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" /> Visual Analytics & Metrics
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Goal history bar chart */}
                  <div>
                    {profile.manualGoal ? (
                      <WeeklyChart goal={goal} />
                    ) : (
                      <div className="glass-strong rounded-2xl p-5 border border-border/40 min-h-[300px] flex flex-col items-center justify-center text-center">
                        <GlassWater className="w-10 h-10 text-muted-foreground mb-3" />
                        <h3 className="font-heading font-semibold text-foreground text-sm">
                          Intake Trends Offline
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 px-4">
                          Water intake goal is disabled. Toggle a goal in settings to view intake logs.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Reminder Dispatch count area chart */}
                  <div className="glass-strong rounded-2xl p-4 sm:p-5 space-y-4">
                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-sm sm:text-base flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                        Alarms & Reminders Sent Trends
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        Custom reminders vs supplemental weather alerts (7 days)
                      </p>
                    </div>

                    <div className="h-44 sm:h-48 w-full">
                      {reminderLogs.length === 0 ? (
                        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                          No reminder logs available.
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={reminderStatsByDay}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.2)" />
                            <XAxis
                              dataKey="day"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                              width={20}
                            />
                            <Tooltip
                              content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="glass-strong rounded-xl p-2 border border-primary/20 text-xs shadow-xl space-y-0.5">
                                      <p className="font-bold text-foreground">{payload[0].payload.day}</p>
                                      {payload.map((p) => (
                                        <p key={p.name} style={{ color: p.color }}>
                                          {p.name}: {p.value} sent
                                        </p>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="Custom Reminders"
                              stroke="hsl(var(--primary))"
                              strokeWidth={2}
                              fill="hsl(var(--primary))"
                              fillOpacity={0.1}
                            />
                            <Area
                              type="monotone"
                              dataKey="Weather Alerts"
                              stroke="hsl(var(--warning))"
                              strokeWidth={2}
                              fill="hsl(var(--warning))"
                              fillOpacity={0.1}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reminder times distribution */}
                {reminderTimeData.length > 0 && (
                  <div className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3">
                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-sm">
                        Reminders Sent by Hour
                      </h3>
                      <p className="text-[10px] text-muted-foreground">
                        Breakdown of reminders generated at different hours of the day
                      </p>
                    </div>

                    <div className="h-32 sm:h-36 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reminderTimeData}>
                          <XAxis
                            dataKey="hour"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                          />
                          <YAxis hide />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="glass-strong rounded-xl p-1.5 border border-primary/20 text-[10px]">
                                    <strong>{payload[0].payload.hour}</strong>: {payload[0].value} alerts
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="density" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            // FULL-PAGE SETTINGS VIEW
            <motion.div
              key="settings-tab"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <SettingsIcon className="w-4 h-4 text-primary" /> Profile Settings & Configuration
              </h2>

              {settingsError && (
                <div className="flex gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 items-start max-w-2xl mx-auto">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{settingsError}</span>
                </div>
              )}

              {settingsSaved && (
                <div className="flex gap-2 bg-success/10 border border-success/20 text-success text-xs rounded-xl p-3 items-start max-w-2xl mx-auto">
                  <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Settings updated successfully!</span>
                </div>
              )}

              {settingsForm && (
                <form
                  onSubmit={handleSaveSettings}
                  className="glass-strong rounded-2xl p-5 sm:p-8 max-w-2xl mx-auto border border-border/60 shadow-xl space-y-6 text-sm"
                >
                  {/* Account Credentials */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <Mail className="w-4 h-4" /> 1. Account Credentials
                    </h3>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Login Email (Mandatory)</Label>
                      <Input
                        type="email"
                        value={settingsEmail}
                        onChange={(e) => setSettingsEmail(e.target.value)}
                        required
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium flex items-center justify-between">
                        Update Password <span className="text-[10px] text-muted-foreground font-normal">(Leave blank to keep current)</span>
                      </Label>
                      <Input
                        type="password"
                        placeholder="New Password (min 6 characters)"
                        value={settingsPassword}
                        onChange={(e) => setSettingsPassword(e.target.value)}
                        minLength={6}
                        className="h-10 rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Health Metrics */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <User className="w-4 h-4" /> 2. Personal Metrics
                    </h3>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Full Name</Label>
                      <Input
                        value={settingsForm.name}
                        onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                        required
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Weight (kg)</Label>
                        <Input
                          type="number"
                          value={settingsForm.weight}
                          onChange={(e) => setSettingsForm({ ...settingsForm, weight: +e.target.value })}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Age</Label>
                        <Input
                          type="number"
                          value={settingsForm.age}
                          onChange={(e) => setSettingsForm({ ...settingsForm, age: +e.target.value })}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Gender</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["male", "female", "other"] as const).map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setSettingsForm({ ...settingsForm, gender: g })}
                            className={`h-9 rounded-xl border text-xs font-semibold capitalize transition-all ${
                              settingsForm.gender === g
                                ? "border-primary bg-primary/10 text-primary font-bold"
                                : "border-border/50 hover:border-primary/20"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Active Hours & Intervals */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <Clock className="w-4 h-4" /> 3. Schedule & Intervals
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Wake Up Time</Label>
                        <Input
                          type="time"
                          value={settingsForm.wakeTime}
                          onChange={(e) => setSettingsForm({ ...settingsForm, wakeTime: e.target.value })}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Sleep Time</Label>
                        <Input
                          type="time"
                          value={settingsForm.sleepTime}
                          onChange={(e) => setSettingsForm({ ...settingsForm, sleepTime: e.target.value })}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Work Start Time</Label>
                        <Input
                          type="time"
                          value={settingsForm.workStart}
                          onChange={(e) => setSettingsForm({ ...settingsForm, workStart: e.target.value })}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Work End Time</Label>
                        <Input
                          type="time"
                          value={settingsForm.workEnd}
                          onChange={(e) => setSettingsForm({ ...settingsForm, workEnd: e.target.value })}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                       <Label className="text-xs font-medium">Location Mode</Label>
                       <div className="grid grid-cols-2 gap-2">
                         <button
                           type="button"
                           onClick={() => selectSettingsLocationMode("auto")}
                           className={`h-9 rounded-xl border text-xs font-semibold transition-all ${
                             settingsLocationMode === "auto"
                               ? "border-primary bg-primary/10 text-primary font-bold"
                               : "border-border/50 hover:border-primary/20"
                           }`}
                         >
                           Auto-Detect GPS
                         </button>
                         <button
                           type="button"
                           onClick={() => selectSettingsLocationMode("manual")}
                           className={`h-9 rounded-xl border text-xs font-semibold transition-all ${
                             settingsLocationMode === "manual"
                               ? "border-primary bg-primary/10 text-primary font-bold"
                               : "border-border/50 hover:border-primary/20"
                           }`}
                         >
                           Enter Manually
                         </button>
                       </div>
                     </div>

                     {settingsLocationMode === "auto" ? (
                       <div className="space-y-1.5 bg-primary/5 rounded-xl p-3 border border-primary/10">
                         <Label className="flex items-center gap-2 text-xs font-medium text-foreground">
                           <MapPin className="w-3.5 h-3.5 text-primary" /> Resolved Location
                         </Label>
                         <div className="flex gap-2 mt-1">
                           <Input
                             placeholder={detectingSettingsLocation ? "Detecting GPS location..." : "City name resolved from GPS"}
                             value={settingsForm.city}
                             readOnly
                             required
                             className="h-10 rounded-xl flex-1 bg-secondary/30 border-primary/20 font-semibold"
                           />
                           <Button
                             type="button"
                             variant="outline"
                             onClick={handleSettingsAutoDetect}
                             disabled={detectingSettingsLocation}
                             className="h-10 px-3 rounded-xl border-primary/20 text-primary hover:bg-primary/5 gap-1.5 text-xs shrink-0 font-semibold"
                           >
                             <Compass className={`w-3.5 h-3.5 ${detectingSettingsLocation ? "animate-spin" : ""}`} />
                             {detectingSettingsLocation ? "Detecting..." : "Detect"}
                           </Button>
                         </div>
                         <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                           Requires browser location permissions to fetch coordinates.
                         </p>
                       </div>
                     ) : (
                       <div className="space-y-1.5">
                         <Label className="text-xs font-medium flex items-center gap-1">
                           <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> City (Manual Input)
                         </Label>
                         <Input
                           placeholder="e.g. Mumbai, Dubai"
                           value={settingsForm.city}
                           onChange={(e) => setSettingsForm({ ...settingsForm, city: e.target.value })}
                           required
                           className="h-10 rounded-xl"
                         />
                       </div>
                     )}

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">Custom Reminder Interval (Minutes) *</Label>
                      <Input
                        type="number"
                        min={10}
                        max={360}
                        value={settingsForm.customInterval}
                        onChange={(e) => setSettingsForm({ ...settingsForm, customInterval: +e.target.value })}
                        required
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="flex items-start justify-between bg-secondary/20 rounded-xl p-3 border border-border/30">
                      <div>
                        <Label className="text-xs font-bold text-foreground">Supplemental Weather Reminders</Label>
                        <p className="text-[10px] text-muted-foreground">Receive extra alerts if temperatures exceed range conditions.</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsForm.weatherRemindersEnabled}
                        onChange={(e) => setSettingsForm({ ...settingsForm, weatherRemindersEnabled: e.target.checked })}
                        className="w-4 h-4 text-primary rounded"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center justify-between">
                        Daily Water Goal (ml) *
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g. 2000 or 2500"
                        value={settingsForm.manualGoal || ""}
                        onChange={(e) => setSettingsForm({ ...settingsForm, manualGoal: e.target.value ? +e.target.value : null })}
                        className="h-10 rounded-xl"
                        min={500}
                        max={10000}
                        required
                      />
                    </div>
                  </div>

                  {/* Notification Channels */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <ShieldCheck className="w-4 h-4" /> 4. Notification Preferences
                    </h3>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-secondary/20 rounded-xl p-2.5 border border-border/30">
                        <div>
                          <p className="text-xs font-bold text-foreground">In-App Browser Popups</p>
                          <p className="text-[10px] text-muted-foreground">Receive alerts in-app</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={setChInApp}
                          onChange={async (e) => {
                            const checked = e.target.checked;
                            setSetChInApp(checked);
                            if (checked && getNotificationPermission() !== "granted") {
                              await requestNotificationPermission();
                            }
                          }}
                          className="w-4 h-4 text-primary rounded"
                        />
                      </div>

                      <div className="flex items-center justify-between bg-secondary/20 rounded-xl p-2.5 border border-border/30">
                        <div>
                          <p className="text-xs font-bold text-foreground">Email Notifications</p>
                          <p className="text-[10px] text-muted-foreground">Dispatched directly to registered email</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={setChEmail}
                          onChange={(e) => setSetChEmail(e.target.checked)}
                          className="w-4 h-4 text-primary rounded"
                        />
                      </div>

                      <div className="bg-secondary/20 rounded-xl p-2.5 border border-border/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-foreground">WhatsApp Messages</p>
                            <p className="text-[10px] text-muted-foreground">Dispatched to mobile phone</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={setChWhatsApp}
                            onChange={(e) => setSetChWhatsApp(e.target.checked)}
                            className="w-4 h-4 text-primary rounded"
                          />
                        </div>

                        {setChWhatsApp && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-1.5 pt-1.5 border-t border-border/30"
                          >
                            <Label className="text-xs font-medium">WhatsApp Mobile Number (+91 Indian format)</Label>
                            <Input
                              type="tel"
                              placeholder="9876543210"
                              value={settingsForm.phone || ""}
                              onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                              required
                              className="h-9 text-xs rounded-lg"
                            />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* API Gateways */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b border-border/30 pb-1.5">
                      <Sparkles className="w-4 h-4 text-primary" /> 5. API Integration Gateways
                    </h3>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Configure your API keys below to enable real delivery of emails and WhatsApp notifications.
                    </p>

                    <div className="space-y-3 bg-secondary/15 rounded-xl p-4 border border-border/30">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Resend API Key</Label>
                        <Input
                          type="password"
                          placeholder="re_..."
                          value={resendApiKey}
                          onChange={(e) => setResendApiKey(e.target.value)}
                          className="h-10 rounded-xl bg-background"
                        />
                        <p className="text-[9px] text-muted-foreground">Used for sending transactional emails to your inbox.</p>
                      </div>

                      <div className="space-y-1.5 border-t border-border/30 pt-3">
                        <Label className="text-xs font-medium">WhatsApp Access Token</Label>
                        <Input
                          type="password"
                          placeholder="EAAC..."
                          value={whatsappToken}
                          onChange={(e) => setWhatsappToken(e.target.value)}
                          className="h-10 rounded-xl bg-background"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">WhatsApp Phone Number ID</Label>
                        <Input
                          type="text"
                          placeholder="e.g. 109876543210"
                          value={whatsappPhoneId}
                          onChange={(e) => setWhatsappPhoneId(e.target.value)}
                          className="h-10 rounded-xl bg-background"
                        />
                        <p className="text-[9px] text-muted-foreground">From Meta Developer Console for WhatsApp Cloud API.</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-border/30">
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={handleLogout}
                      className="rounded-xl flex items-center gap-1.5 h-10 px-4 text-xs font-semibold"
                    >
                      <LogOut className="w-4 h-4" /> Sign Out
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setActiveTab("dashboard")}
                        className="rounded-xl h-10 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="rounded-xl h-10 font-bold text-xs px-5"
                      >
                        {loading ? "Saving Changes..." : "Save Settings Changes"}
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
