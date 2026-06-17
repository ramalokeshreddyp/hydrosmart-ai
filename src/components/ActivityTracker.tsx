import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Plus, Trash2, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type ActivityLog, getTodayActivities, saveActivity, removeActivity } from "@/lib/hydration";

const activityTypes = [
  { value: "walking", label: "🚶 Walking" },
  { value: "running", label: "🏃 Running" },
  { value: "cycling", label: "🚴 Cycling" },
  { value: "gym", label: "🏋️ Gym" },
  { value: "swimming", label: "🏊 Swimming" },
  { value: "yoga", label: "🧘 Yoga" },
  { value: "sports", label: "⚽ Sports" },
  { value: "other", label: "💪 Other" },
];

const intensityOptions: { value: ActivityLog["intensity"]; label: string; color: string }[] = [
  { value: "light", label: "Light", color: "text-green-500" },
  { value: "moderate", label: "Moderate", color: "text-yellow-500" },
  { value: "vigorous", label: "Vigorous", color: "text-red-500" },
];

interface ActivityTrackerProps {
  onUpdate: () => void;
}

export function ActivityTracker({ onUpdate }: ActivityTrackerProps) {
  const [expanded, setExpanded] = useState(false);
  const [todayLogs, setTodayLogs] = useState<ActivityLog[]>(getTodayActivities());
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState("walking");
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState<ActivityLog["intensity"]>("moderate");

  useEffect(() => {
    setTodayLogs(getTodayActivities());
  }, []);

  const handleAdd = () => {
    const log: ActivityLog = {
      id: crypto.randomUUID(),
      type,
      durationMin: duration,
      intensity,
      timestamp: new Date().toISOString(),
    };
    saveActivity(log);
    setTodayLogs(getTodayActivities());
    setAdding(false);
    onUpdate();
  };

  const handleRemove = (id: string) => {
    removeActivity(id);
    setTodayLogs(getTodayActivities());
    onUpdate();
  };

  const totalMin = todayLogs.reduce((s, l) => s + l.durationMin, 0);
  const extraMl = todayLogs.reduce((s, l) => {
    const perSession = l.intensity === "vigorous" ? 600 : l.intensity === "moderate" ? 400 : 200;
    return s + Math.round(perSession * (l.durationMin / 30));
  }, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-strong rounded-2xl p-5"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Activity Tracker
        </h3>
        <div className="flex items-center gap-2">
          {todayLogs.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg">
              {totalMin}min · +{extraMl}ml
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
            <div className="mt-4 space-y-3">
              {/* Today's activities */}
              {todayLogs.length > 0 && (
                <div className="space-y-2">
                  {todayLogs.map((log) => {
                    const typeInfo = activityTypes.find((t) => t.value === log.type);
                    const intInfo = intensityOptions.find((i) => i.value === log.intensity);
                    return (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center justify-between bg-primary/5 rounded-xl p-3 border border-primary/10"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{typeInfo?.label.split(" ")[0]}</span>
                          <div>
                            <p className="text-sm font-medium">{typeInfo?.label.split(" ").slice(1).join(" ") || log.type}</p>
                            <p className="text-xs text-muted-foreground">
                              {log.durationMin}min · <span className={intInfo?.color}>{intInfo?.label}</span>
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemove(log.id)}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Add activity form */}
              <AnimatePresence>
                {adding ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {/* Activity type */}
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Activity</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {activityTypes.map((at) => (
                          <button
                            key={at.value}
                            onClick={() => setType(at.value)}
                            className={`text-xs p-2 rounded-lg border transition-all text-center ${
                              type === at.value
                                ? "border-primary bg-primary/10"
                                : "border-border/50 hover:border-primary/30"
                            }`}
                          >
                            {at.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Duration</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min={10}
                          max={180}
                          step={5}
                          value={duration}
                          onChange={(e) => setDuration(parseInt(e.target.value))}
                          className="flex-1 accent-primary"
                        />
                        <span className="text-sm font-bold text-primary min-w-[3.5rem] text-center">
                          {duration}min
                        </span>
                      </div>
                    </div>

                    {/* Intensity */}
                    <div>
                      <label className="text-xs font-medium text-foreground mb-1.5 block">Intensity</label>
                      <div className="grid grid-cols-3 gap-2">
                        {intensityOptions.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setIntensity(opt.value)}
                            className={`text-sm p-2 rounded-xl border transition-all ${
                              intensity === opt.value
                                ? "border-primary bg-primary/10 font-medium"
                                : "border-border/50 hover:border-primary/30"
                            }`}
                          >
                            <span className={opt.color}>{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAdd} className="flex-1 rounded-xl gap-2" size="sm">
                        <Flame className="w-3.5 h-3.5" /> Log Activity
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setAdding(false)}
                        className="rounded-xl"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full rounded-xl gap-2 text-xs"
                    onClick={() => setAdding(true)}
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Activity
                  </Button>
                )}
              </AnimatePresence>

              {extraMl > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  🔥 Exercise added +{extraMl}ml to your hydration goal today
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}


