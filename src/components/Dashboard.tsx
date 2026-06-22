import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  RefreshCw,
  Droplets,
  Sliders,
  Mail,
  Phone,
  Clock,
  Sparkles,
  X,
  Bell,
  Check,
  TrendingUp,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSetup } from "@/components/ProfileSetup";
import { WaterProgress } from "@/components/WaterProgress";
import { WeatherCard } from "@/components/WeatherCard";
import { QuickAdd } from "@/components/QuickAdd";
import { WeeklyChart } from "@/components/WeeklyChart";
import { ReminderControl } from "@/components/ReminderControl";
import { GamificationPanel } from "@/components/GamificationPanel";
import { BadgeUnlockToast } from "@/components/BadgeUnlockToast";
import { Auth } from "@/components/Auth";
import { supabase, db } from "@/lib/supabase";
import { getLocalDateString } from "@/lib/utils";
import {
  calculateDailyGoal,
  getReminderInterval,
  getHydrationTip,
  type UserProfile,
  type WeatherData,
  type ReminderLog,
  type IntakeLog,
} from "@/lib/hydration";
import { fetchWeather, getFallbackWeather } from "@/lib/weather";
import { computeStats, getNewlyUnlockedBadges, type HydrationStats, type Badge } from "@/lib/gamification";
import { triggerReminder, startReminderScheduler, stopReminderScheduler } from "@/lib/notifications";

const weatherPresets: { name: string; temp: number; humidity: number; desc: string; icon: string }[] = [
  { name: "❄️ Cold Day", temp: 14, humidity: 75, desc: "Chilly breeze", icon: "❄️" },
  { name: "🏢 Normal Office", temp: 23, humidity: 50, desc: "Comfortable workspace", icon: "⛅" },
  { name: "🔥 Extreme Heatwave", temp: 41, humidity: 20, desc: "Blistering sunshine", icon: "☀️" },
];

export default function Dashboard() {
  const [session, setSession] = useState<{ user: { id: string; email?: string } } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [offlineMode, setOfflineMode] = useState(false);

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

  // Simulated Weather Overrides
  const [simulatedWeather, setSimulatedWeather] = useState<WeatherData | null>(null);

  // In-App Reminder Overlay
  const [activeReminder, setActiveReminder] = useState<ReminderLog | null>(null);

  const activeWeather = simulatedWeather || weather;

  const goal = profile
    ? calculateDailyGoal(profile, activeWeather ?? undefined)
    : 2500;

  const reminderInterval = profile
    ? getReminderInterval(profile, activeWeather ?? undefined)
    : 60;

  // Supabase auth listener
  useEffect(() => {
    if (!supabase) {
      setAuthChecked(true);
      setOfflineMode(true);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setOfflineMode(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Profile from DB or fallback
  useEffect(() => {
    const loadProfile = async () => {
      const userId = session?.user?.id || "offline";
      if (offlineMode || userId === "offline") {
        const local = localStorage.getItem("hydration_profile");
        setProfile(local ? JSON.parse(local) : null);
      } else {
        const p = await db.getProfile(userId);
        setProfile(p);
      }
    };
    loadProfile();
  }, [session, offlineMode]);

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

    // Calculate score
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
    } catch {
      setTip("Using offline configuration. Enter city to load weather.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Update Scheduler
  useEffect(() => {
    if (profile && isNotificationsEnabledLocal()) {
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
  }, [profile, activeWeather, session]);

  function isNotificationsEnabledLocal(): boolean {
    return localStorage.getItem("hydration_notifications_enabled") === "true";
  }

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
    triggerReminder(profile, activeWeather, (newLog) => {
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
          triggerReminder(profile, activeWeather, (snoozedLog) => {
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
    };
    setSimulatedWeather(mocked);
  };

  const handleProfileComplete = async (p: UserProfile) => {
    const userId = session?.user?.id || "offline";
    await db.saveProfile(userId, p);
    setProfile(p);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!session && !offlineMode && supabase) {
    return (
      <Auth
        onSuccess={(userId) => {
          setOfflineMode(false);
        }}
        onOffline={() => {
          setOfflineMode(true);
        }}
      />
    );
  }

  if (!profile) {
    return <ProfileSetup onComplete={handleProfileComplete} />;
  }

  // Calculate effectiveness metrics
  const totalFired = reminderLogs.length;
  const completedCount = reminderLogs.filter((l) => l.action === "logged").length;
  const snoozedCount = reminderLogs.filter((l) => l.action === "snoozed").length;
  const dismissedCount = reminderLogs.filter((l) => l.action === "dismissed").length;
  
  const responseRate = totalFired > 0 ? Math.round((completedCount / totalFired) * 100) : 100;

  // Virtual outbox logs mapping channels
  const outboxLogs: { id: string; time: string; ch: string; detail: string; status: string }[] = [];
  reminderLogs.slice(-10).reverse().forEach((log) => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    
    if (log.channels.includes("email")) {
      outboxLogs.push({
        id: `${log.id}-email`,
        time: timeStr,
        ch: "✉️ Email",
        detail: `To: ${profile.email} - "Hydration break interval at ${log.intervalMinutes}m reached in ${log.city} (${log.temp}°C)."`,
        status: "Sent",
      });
    }
    if (log.channels.includes("whatsapp")) {
      outboxLogs.push({
        id: `${log.id}-wa`,
        time: timeStr,
        ch: "💬 WhatsApp",
        detail: `To: ${profile.phone} - "Time to drink water! It is currently ${log.temp}°C."`,
        status: "Delivered",
      });
    }
  });

  return (
    <div className="min-h-screen pb-12 sm:pb-16 bg-background">
      <BadgeUnlockToast badge={newBadge} onDismiss={() => setNewBadge(null)} />

      {/* In-App Reminder Modal Overlay */}
      <AnimatePresence>
        {activeReminder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-5 sm:p-6 max-w-sm w-full space-y-4 border border-primary/20 shadow-2xl relative"
            >
              <button
                onClick={() => handleReminderAction("dismissed")}
                className="absolute top-3 right-3 text-muted-foreground hover:text-foreground touch-target"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary animate-bounce" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-foreground text-base sm:text-lg">
                    Drink Water Now!
                  </h3>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Weather alert in {activeReminder.city}
                  </p>
                </div>
              </div>

              <div className="bg-primary/5 rounded-xl p-3 border border-primary/10 text-xs sm:text-sm">
                <p className="text-foreground leading-relaxed">
                  {getRandomMessage(activeReminder.temp).body}
                </p>
                <p className="text-[10px] text-muted-foreground mt-2">
                  Recommended interval: every {activeReminder.intervalMinutes} minutes
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={() => handleReminderAction("logged", 250)}
                  className="rounded-xl h-10 text-xs sm:text-sm font-semibold"
                >
                  🥛 Log 250ml
                </Button>
                <Button
                  onClick={() => handleReminderAction("logged", 500)}
                  className="rounded-xl h-10 text-xs sm:text-sm font-semibold"
                >
                  🥤 Log 500ml
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleReminderAction("snoozed")}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                >
                  ⏰ Snooze 10s
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => handleReminderAction("dismissed")}
                  className="rounded-xl h-10 text-xs sm:text-sm"
                >
                  Dismiss
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex items-center justify-between max-w-lg mx-auto"
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Droplets className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="font-heading font-bold text-base sm:text-lg text-foreground truncate">
              Hi, {profile.name} 👋
            </h1>
            <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{tip}</p>
          </div>
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
          {!simulatedWeather && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full touch-target h-8 w-8"
              onClick={() => loadWeather(profile.city)}
              disabled={loading}
              aria-label="Refresh weather"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full touch-target h-8 w-8"
            onClick={() => {
              localStorage.removeItem("hydration_profile");
              setProfile(null);
            }}
            aria-label="Edit Profile"
            title="Edit Profile"
          >
            <Settings className="w-4 h-4" />
          </Button>
          {supabase && session && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full touch-target h-8 w-8 text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await supabase.auth.signOut();
                setProfile(null);
                setSession(null);
              }}
              aria-label="Sign Out"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          )}
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-3 sm:px-4 max-w-lg mx-auto space-y-4">
        {/* Core Hydration Goal Progress */}
        <WaterProgress current={todayTotal} goal={goal} />

        {/* Smart Preferences & Weather */}
        {activeWeather && (
          <WeatherCard weather={activeWeather} reminderMin={reminderInterval} />
        )}

        {/* Simulated Weather Presets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-strong rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <p className="font-heading font-bold text-xs sm:text-sm text-foreground flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-primary" /> Weather Presets Simulator
            </p>
            {simulatedWeather && (
              <button
                onClick={() => setSimulatedWeather(null)}
                className="text-[10px] text-primary font-semibold hover:underline"
              >
                Reset to Real Weather
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {weatherPresets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                className="h-9 px-2 text-[10px] sm:text-xs rounded-xl flex flex-col justify-center gap-0.5"
                onClick={() => applyPreset(preset)}
              >
                <span className="font-bold">{preset.name.split(" ")[1]}</span>
                <span className="text-[9px] text-muted-foreground">{preset.temp}°C</span>
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Quick Add Water */}
        <QuickAdd userId={session?.user?.id || "offline"} onAdd={() => refreshToday(goal)} />

        {/* Reminder Controller Card */}
        <ReminderControl
          intervalMinutes={reminderInterval}
          weatherEnabled={profile.weatherRemindersEnabled}
          channels={profile.channels}
          onTestTrigger={handleTestTrigger}
        />

        {/* Advanced Analytics Panel: Score & Effectiveness */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-strong rounded-2xl p-4 sm:p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" /> Hydration Analytics
            </h3>
            <span className="text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full bg-success/15 text-success border border-success/20">
              Score: {hydrationScore}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-secondary/40 rounded-xl p-3 border border-border/30 text-center flex flex-col justify-center">
              <p className="text-xl sm:text-2xl font-heading font-bold text-primary">{responseRate}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">Response Rate</p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 border border-border/30 text-center flex flex-col justify-center">
              <p className="text-xl sm:text-2xl font-heading font-bold text-foreground">{completedCount} / {totalFired}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 font-medium">Doses Met</p>
            </div>
          </div>

          {/* Breakdown summary */}
          {totalFired > 0 && (
            <div className="text-[11px] sm:text-xs text-muted-foreground space-y-1 pt-1.5 border-t border-border/30">
              <div className="flex justify-between">
                <span>⚡ Reminders Met (Water Logged):</span>
                <span className="text-foreground font-semibold">{completedCount} ({Math.round(completedCount/totalFired*100)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>⏰ Reminders Snoozed:</span>
                <span className="text-foreground font-semibold">{snoozedCount} ({Math.round(snoozedCount/totalFired*100)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>✕ Reminders Dismissed:</span>
                <span className="text-foreground font-semibold">{dismissedCount} ({Math.round(dismissedCount/totalFired*100)}%)</span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Weekly & Monthly Statistics Chart */}
        <WeeklyChart goal={goal} />

        {/* Simulated Notification Outbox */}
        {outboxLogs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3"
          >
            <h3 className="font-heading font-bold text-sm sm:text-base text-foreground flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-primary" /> Simulated Dispatch Outbox
            </h3>
            <div className="overflow-x-auto max-h-48 overflow-y-auto border border-border/40 rounded-xl">
              <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                <thead>
                  <tr className="bg-secondary/40 border-b border-border/40 text-muted-foreground font-medium">
                    <th className="p-2 w-16">Time</th>
                    <th className="p-2 w-20">Channel</th>
                    <th className="p-2">Details</th>
                    <th className="p-2 w-14">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {outboxLogs.map((log) => (
                    <tr key={log.id} className="border-b border-border/30 hover:bg-secondary/20 transition-all text-foreground/90">
                      <td className="p-2 whitespace-nowrap">{log.time}</td>
                      <td className="p-2 font-medium whitespace-nowrap">{log.ch}</td>
                      <td className="p-2 truncate max-w-[160px]" title={log.detail}>{log.detail}</td>
                      <td className="p-2">
                        <span className="inline-flex items-center gap-0.5 text-success font-semibold">
                          <Check className="w-3 h-3" /> {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Gamification Panel (Streaks & Achievements) */}
        {stats && <GamificationPanel stats={stats} />}
      </div>
    </div>
  );
}
