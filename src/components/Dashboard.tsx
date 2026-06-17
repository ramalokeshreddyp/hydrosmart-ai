import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Settings, RefreshCw, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileSetup } from "@/components/ProfileSetup";
import { WaterProgress } from "@/components/WaterProgress";
import { WeatherCard } from "@/components/WeatherCard";
import { QuickAdd } from "@/components/QuickAdd";
import { WeeklyChart } from "@/components/WeeklyChart";
import { ReminderControl } from "@/components/ReminderControl";
import { GamificationPanel } from "@/components/GamificationPanel";
import { BadgeUnlockToast } from "@/components/BadgeUnlockToast";
import { SleepTracker } from "@/components/SleepTracker";
import { ActivityTracker } from "@/components/ActivityTracker";
import {
  getProfile,
  getTodayLogs,
  calculateDailyGoal,
  getReminderInterval,
  getHydrationTip,
  getTodaySleepLog,
  getTodayActivities,
  type UserProfile,
  type WeatherData,
  type IntakeLog,
  type SleepLog,
  type ActivityLog,
} from "@/lib/hydration";
import { fetchWeather } from "@/lib/weather";
import { computeStats, getNewlyUnlockedBadges, type HydrationStats, type Badge } from "@/lib/gamification";

export default function Dashboard() {
  const [profile, setProfile] = useState<UserProfile | null>(getProfile());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [todayTotal, setTodayTotal] = useState(0);
  const [tip, setTip] = useState("");
  const [stats, setStats] = useState<HydrationStats | null>(null);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [todaySleep, setTodaySleep] = useState<SleepLog | null>(null);
  const [todayActivities, setTodayActivities] = useState<ActivityLog[]>([]);
  const prevStatsRef = useRef<HydrationStats | null>(null);

  const refreshTracking = useCallback(() => {
    setTodaySleep(getTodaySleepLog());
    setTodayActivities(getTodayActivities());
  }, []);

  const goal = profile
    ? calculateDailyGoal(profile, weather ?? undefined, todaySleep, todayActivities)
    : 2500;

  const refreshToday = useCallback((goalMl: number) => {
    const logs = getTodayLogs();
    setTodayTotal(logs.reduce((s, l) => s + l.amount, 0));

    const allLogs = JSON.parse(localStorage.getItem("hydration_logs") || "[]") as IntakeLog[];
    const newStats = computeStats(allLogs, goalMl);

    const newlyUnlocked = getNewlyUnlockedBadges(prevStatsRef.current, newStats);
    if (newlyUnlocked.length > 0) {
      setNewBadge(newlyUnlocked[0]);
    }

    prevStatsRef.current = newStats;
    setStats(newStats);
  }, []);

  const loadWeather = useCallback(async (city: string) => {
    setLoading(true);
    try {
      const w = await fetchWeather(city);
      setWeather(w);
      setTip(getHydrationTip(w));
    } catch {
      setTip("Could not fetch weather. Using base recommendation.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profile) {
      refreshTracking();
      loadWeather(profile.city);
    }
  }, [profile, loadWeather, refreshTracking]);

  useEffect(() => {
    if (profile) {
      refreshToday(goal);
    }
  }, [profile, goal, refreshToday]);

  const handleTrackingUpdate = () => {
    refreshTracking();
  };

  if (!profile) {
    return <ProfileSetup onComplete={(p) => setProfile(p)} />;
  }

  const reminderMin = getReminderInterval(profile, goal);

  return (
    <div className="min-h-screen pb-8 sm:pb-12">
      <BadgeUnlockToast badge={newBadge} onDismiss={() => setNewBadge(null)} />

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
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full touch-target"
            onClick={() => loadWeather(profile.city)}
            disabled={loading}
            aria-label="Refresh weather"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full touch-target"
            onClick={() => {
              localStorage.removeItem("hydration_profile");
              setProfile(null);
            }}
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </motion.header>

      {/* Content */}
      <div className="px-3 sm:px-4 max-w-lg mx-auto space-y-3 sm:space-y-4">
        <WaterProgress current={todayTotal} goal={goal} />

        {weather && <WeatherCard weather={weather} reminderMin={reminderMin} />}

        <QuickAdd onAdd={() => refreshToday(goal)} />

        <SleepTracker onUpdate={handleTrackingUpdate} />

        <ActivityTracker onUpdate={handleTrackingUpdate} />

        <ReminderControl intervalMinutes={reminderMin} />

        {stats && <GamificationPanel stats={stats} />}

        <WeeklyChart goal={goal} />
      </div>
    </div>
  );
}
