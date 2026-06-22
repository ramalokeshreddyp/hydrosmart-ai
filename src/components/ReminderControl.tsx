import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, BellRing, Clock, Send, ShieldCheck, CloudLightning } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
} from "@/lib/notifications";

interface ReminderControlProps {
  intervalMinutes: number;
  weatherEnabled: boolean;
  channels: ("in-app" | "email" | "whatsapp")[];
  onTestTrigger: () => void;
}

export function ReminderControl({
  intervalMinutes,
  weatherEnabled,
  channels,
  onTestTrigger,
}: ReminderControlProps) {
  const [enabled, setEnabled] = useState(isNotificationsEnabled());
  const [permission, setPermission] = useState(getNotificationPermission());
  const supported = isNotificationSupported();

  const handleToggle = async () => {
    if (!supported) return;

    if (!enabled) {
      if (permission !== "granted") {
        const granted = await requestNotificationPermission();
        setPermission(granted ? "granted" : "denied");
        if (!granted) return;
      }
      setNotificationsEnabled(true);
      setEnabled(true);
    } else {
      setNotificationsEnabled(false);
      setEnabled(false);
    }
    // Refresh page or trigger callback to restart scheduler in Dashboard
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <BellRing className="w-4 h-4 sm:w-5 sm:h-5 text-primary animate-pulse" />
          Intelligent Reminders
        </h3>
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          className="rounded-xl gap-1.5 h-8 text-xs font-semibold"
          onClick={handleToggle}
        >
          {enabled ? (
            <>
              <Bell className="w-3.5 h-3.5" /> Reminders Active
            </>
          ) : (
            <>
              <BellOff className="w-3.5 h-3.5" /> Reminders Muted
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden text-xs sm:text-sm"
          >
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary/40 rounded-xl p-3 border border-border/30 flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Interval</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{intervalMinutes} min</p>
                </div>
              </div>

              <div className="bg-secondary/40 rounded-xl p-3 border border-border/30 flex items-center gap-2.5">
                <CloudLightning className="w-4 h-4 text-accent flex-shrink-0" />
                <div>
                  <p className="font-semibold text-foreground">Weather Sync</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    {weatherEnabled ? "Active (Adaptive)" : "Inactive"}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Channels */}
            <div className="bg-secondary/20 rounded-xl p-3 border border-border/20 space-y-1.5">
              <p className="font-semibold text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Active Delivery Channels
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {channels.map((ch) => (
                  <span
                    key={ch}
                    className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold border border-primary/20 capitalize"
                  >
                    {ch.replace("-", " ")}
                  </span>
                ))}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-xl text-xs gap-1.5 h-9"
              onClick={onTestTrigger}
            >
              <Send className="w-3.5 h-3.5" /> Simulate Instant Reminder
            </Button>
          </motion.div>
        )}

        {permission === "denied" && enabled && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-[11px] sm:text-xs text-destructive mt-1"
          >
            ⚠️ Browser notification permission is blocked. Please enable it in browser settings for in-app popups.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
