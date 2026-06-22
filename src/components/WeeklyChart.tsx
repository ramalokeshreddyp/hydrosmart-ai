import { useState } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from "recharts";
import { getIntakeHistory } from "@/lib/hydration";
import { CalendarDays, TrendingUp } from "lucide-react";

interface WeeklyChartProps {
  goal: number;
}

export function WeeklyChart({ goal }: WeeklyChartProps) {
  const [range, setRange] = useState<7 | 30>(7);
  const data = getIntakeHistory(range);
  const todayIndex = data.length - 1;

  const totalIntake = data.reduce((s, d) => s + d.intake, 0);
  const avgIntake = totalIntake / range;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-strong rounded-2xl p-4 sm:p-5 space-y-3 sm:space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-heading font-semibold text-foreground flex items-center gap-2 text-sm sm:text-base">
          <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Analytics History
        </h3>
        
        {/* Toggle Range */}
        <div className="flex bg-secondary/50 rounded-xl p-0.5 border border-border/30 text-[10px] sm:text-xs">
          <button
            type="button"
            onClick={() => setRange(7)}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              range === 7 ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setRange(30)}
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              range === 30 ? "bg-background text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="h-40 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap={range === 7 ? "20%" : "8%"}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: range === 7 ? 11 : 9 }}
              dy={5}
            />
            <YAxis hide domain={[0, Math.max(goal, ...data.map((d) => d.intake)) * 1.1]} />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary)/0.3)" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const val = payload[0].value as number;
                  return (
                    <div className="glass-strong rounded-xl p-2 border border-primary/20 text-xs shadow-xl">
                      <p className="font-bold text-foreground">{payload[0].payload.day}</p>
                      <p className="text-primary font-heading mt-0.5">{(val / 1000).toFixed(2)}L logged</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="intake" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={
                    index === todayIndex
                      ? "hsl(var(--primary))"
                      : entry.intake >= goal
                      ? "hsl(var(--success))"
                      : "hsl(var(--border))"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground border-t border-border/40 pt-2.5">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" /> Range: {range} Days
        </span>
        <span>
          Daily Avg: <strong className="text-primary font-heading">{(avgIntake / 1000).toFixed(2)}L</strong>
        </span>
      </div>
    </motion.div>
  );
}
