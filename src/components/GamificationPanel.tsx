import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Target, Zap } from "lucide-react";
import type { HydrationStats } from "@/lib/gamification";
import { getUnlockedBadges, getNextBadge, getAllBadges } from "@/lib/gamification";
import { useState } from "react";

const tierStyles = {
  bronze: "from-amber-600/20 to-orange-500/20 border-amber-500/30",
  silver: "from-slate-300/20 to-gray-400/20 border-slate-400/30",
  gold: "from-yellow-400/20 to-amber-300/20 border-yellow-400/30",
  diamond: "from-cyan-300/20 to-blue-400/20 border-cyan-400/30",
};

interface GamificationPanelProps {
  stats: HydrationStats;
}

export function GamificationPanel({ stats }: GamificationPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const unlocked = getUnlockedBadges(stats);
  const allBadges = getAllBadges();
  const next = getNextBadge(stats);
  const unlockedIds = new Set(unlocked.map(b => b.id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4"
    >
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-secondary/50 rounded-xl p-2.5 sm:p-3 text-center">
          <Flame className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-hot" />
          <p className="text-lg sm:text-xl font-bold font-heading">{stats.currentStreak}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Day Streak</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-2.5 sm:p-3 text-center">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-warning" />
          <p className="text-lg sm:text-xl font-bold font-heading">{unlocked.length}/{allBadges.length}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Badges</p>
        </div>
        <div className="bg-secondary/50 rounded-xl p-2.5 sm:p-3 text-center">
          <Target className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-accent" />
          <p className="text-lg sm:text-xl font-bold font-heading">{stats.goalsHitCount}</p>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Goals Hit</p>
        </div>
      </div>

      {/* Next Badge Teaser */}
      {next && (
        <div className="flex items-center gap-2.5 sm:gap-3 bg-primary/5 rounded-xl p-2.5 sm:p-3 border border-primary/10">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] sm:text-xs text-muted-foreground">Next badge</p>
            <p className="text-xs sm:text-sm font-medium truncate">{next.emoji} {next.name} — {next.description}</p>
          </div>
        </div>
      )}

      {/* Badge Grid */}
      <div>
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-primary font-medium mb-2 hover:underline touch-target inline-flex items-center"
        >
          {showAll ? "Show earned only" : "View all badges"}
        </button>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
          <AnimatePresence mode="popLayout">
            {(showAll ? allBadges : unlocked).map((badge) => {
              const isUnlocked = unlockedIds.has(badge.id);
              return (
                <motion.div
                  key={badge.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  whileHover={{ scale: 1.05 }}
                  className={`relative flex flex-col items-center p-2 rounded-xl border bg-gradient-to-br transition-all cursor-default
                    ${isUnlocked ? tierStyles[badge.tier] : "from-muted/30 to-muted/20 border-border/30 opacity-40 grayscale"}
                  `}
                  title={`${badge.name}: ${badge.description}`}
                >
                  <span className="text-xl sm:text-2xl">{badge.emoji}</span>
                  <span className="text-[8px] sm:text-[9px] text-center font-medium mt-1 leading-tight text-foreground/80">
                    {badge.name}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {unlocked.length === 0 && !showAll && (
          <p className="text-xs text-muted-foreground text-center py-3">
            Start drinking water to earn badges! 💧
          </p>
        )}
      </div>

      {/* Longest Streak */}
      {stats.longestStreak > 0 && (
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground border-t border-border/50 pt-2.5 sm:pt-3">
          <span>🏆 Longest streak: <strong className="text-foreground">{stats.longestStreak} days</strong></span>
          <span>💧 Total: <strong className="text-foreground">{stats.totalLiters.toFixed(1)}L</strong></span>
        </div>
      )}
    </motion.div>
  );
}
