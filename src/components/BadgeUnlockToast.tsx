import { motion, AnimatePresence } from "framer-motion";
import type { Badge } from "@/lib/gamification";
import { useEffect, useState } from "react";

interface BadgeUnlockToastProps {
  badge: Badge | null;
  onDismiss: () => void;
}

export function BadgeUnlockToast({ badge, onDismiss }: BadgeUnlockToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (badge) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 400);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [badge, onDismiss]);

  return (
    <AnimatePresence>
      {visible && badge && (
        <motion.div
          initial={{ opacity: 0, y: -60, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -40, scale: 0.9 }}
          className="fixed top-4 sm:top-6 left-3 right-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50"
        >
          <div className="glass-strong rounded-2xl px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 shadow-2xl border-primary/20 animate-pulse-glow max-w-sm mx-auto sm:mx-0">
            <motion.span
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="text-3xl sm:text-4xl flex-shrink-0"
            >
              {badge.emoji}
            </motion.span>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-primary font-semibold uppercase tracking-wider">Badge Unlocked!</p>
              <p className="font-heading font-bold text-foreground text-sm sm:text-base truncate">{badge.name}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{badge.description}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
