import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, BellRing, Clock, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isNotificationsEnabled,
  setNotificationsEnabled,
  startReminders,
  stopReminders,
  sendTestNotification,
} from "@/lib/notifications";

interface ReminderControlProps {
  intervalMinutes: number;
}

export function ReminderControl({ intervalMinutes }: ReminderControlProps) {
  const [enabled, setEnabled] = useState(isNotificationsEnabled());
  const [permission, setPermission] = useState(getNotificationPermission());
  const supported = isNotificationSupported();

  useEffect(() => {
    if (enabled && permission === "granted") {
      startReminders(intervalMinutes);
    } else {
      stopReminders();
    }
    return () => stopReminders();
  }, [enabled, permission, intervalMinutes]);

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
      stopReminders();
    }
  };

  if (!supported) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="glass-strong rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
          <BellRing className="w-5 h-5 text-primary" />
          Smart Reminders
        </h3>
        <Button
          variant={enabled ? "default" : "outline"}
          size="sm"
          className="rounded-xl gap-2"
          onClick={handleToggle}
        >
          {enabled ? (
            <>
              <Bell className="w-3.5 h-3.5" /> On
            </>
          ) : (
            <>
              <BellOff className="w-3.5 h-3.5" /> Off
            </>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {enabled && permission === "granted" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3 border border-primary/10">
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Every {intervalMinutes} minutes
                </p>
                <p className="text-xs text-muted-foreground">
                  Adapted to your weather & hydration goal
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-xl text-xs gap-2 text-muted-foreground"
              onClick={sendTestNotification}
            >
              <Send className="w-3 h-3" /> Send test notification
            </Button>
          </motion.div>
        )}

        {permission === "denied" && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-destructive mt-2"
          >
            Notifications blocked. Please enable them in your browser settings.
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
