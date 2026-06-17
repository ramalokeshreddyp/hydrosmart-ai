import { motion } from "framer-motion";

interface WaterProgressProps {
  current: number;
  goal: number;
}

export function WaterProgress({ current, goal }: WaterProgressProps) {
  const percentage = Math.min((current / goal) * 100, 100);
  const glasses = Math.floor(current / 250);
  const isComplete = percentage >= 100;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-strong rounded-2xl p-4 sm:p-6 flex flex-col items-center"
    >
      <div className="relative w-36 h-36 sm:w-44 sm:h-44 mb-3 sm:mb-4">
        {/* Outer ring */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160" role="img" aria-label={`Hydration progress: ${Math.round(percentage)}%`}>
          <circle
            cx="80" cy="80" r="70"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="10"
          />
          <motion.circle
            cx="80" cy="80" r="70"
            fill="none"
            stroke={isComplete ? "hsl(var(--success))" : "hsl(var(--primary))"}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 70}
            initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
            animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - percentage / 100) }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={current}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl sm:text-3xl font-heading font-bold text-foreground"
          >
            {Math.round(percentage)}%
          </motion.span>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {(current / 1000).toFixed(1)}L / {(goal / 1000).toFixed(1)}L
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-muted-foreground text-xs sm:text-sm">
        <span>🥤</span>
        <span>{glasses} glasses today</span>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 sm:mt-3 px-4 py-1.5 rounded-full bg-success/10 text-success text-xs sm:text-sm font-medium"
        >
          🎉 Goal reached!
        </motion.div>
      )}
    </motion.div>
  );
}
