import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Star, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SleepLog, getTodaySleepLog, saveSleepLog } from "@/lib/hydration";

const qualityOptions: { value: SleepLog["quality"]; label: string; emoji: string; desc: string }[] = [
  { value: "poor", label: "Poor", emoji: "😴", desc: "Restless, woke up often" },
  { value: "fair", label: "Fair", emoji: "😐", desc: "Some tossing & turning" },
  { value: "good", label: "Good", emoji: "😊", desc: "Slept well overall" },
  { value: "excellent", label: "Excellent", emoji: "🌟", desc: "Deep, refreshing sleep" },
];

interface SleepTrackerProps {
  onUpdate: () => void;
}

export function SleepTracker({ onUpdate }: SleepTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const [todayLog, setTodayLog] = useState<SleepLog | null>(getTodaySleepLog());
  const [hours, setHours] = useState(todayLog?.hours || 7);
  const [quality, setQuality] = useState<SleepLog["quality"]>(todayLog?.quality || "good");

  useEffect(() => {
    setTodayLog(getTodaySleepLog());
  }, []);

  const handleSave = () => {
    const log: SleepLog = {
      id: todayLog?.id || crypto.randomUUID(),
      date: new Date().toISOString().split("T")[0],
      hours,
      quality,
    };
    saveSleepLog(log);
    setTodayLog(log);
    onUpdate();
  };

  const qualityInfo = qualityOptions.find((q) => q.value === (todayLog?.quality || quality));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="glass-strong rounded-2xl p-5"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Moon className="w-5 h-5 text-primary" />
          Sleep Tracker
        </h3>
        <div className="flex items-center gap-2">
          {todayLog && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">
              {todayLog.hours}h · {qualityInfo?.emoji}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-4">
              {/* Hours Slider */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Hours slept last night
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={2}
                    max={12}
                    step={0.5}
                    value={hours}
                    onChange={(e) => setHours(parseFloat(e.target.value))}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-lg font-bold text-primary min-w-[3rem] text-center">
                    {hours}h
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>2h</span>
                  <span>12h</span>
                </div>
              </div>

              {/* Quality Grid */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Sleep quality
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {qualityOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setQuality(opt.value)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        quality === opt.value
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/50 hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{opt.emoji}</span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSave}
                className="w-full rounded-xl gap-2"
                size="sm"
              >
                <Star className="w-3.5 h-3.5" />
                {todayLog ? "Update Sleep Log" : "Log Sleep"}
              </Button>

              {todayLog && (
                <p className="text-xs text-muted-foreground text-center">
                  {hours < 6
                    ? "⚠️ Short sleep detected — hydration goal increased by 200ml"
                    : quality === "poor"
                    ? "💤 Poor sleep adds ~300ml to your daily goal"
                    : quality === "excellent"
                    ? "✨ Great sleep! Your body is well-rested"
                    : "Your sleep data is factored into today's goal"}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

