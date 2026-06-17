import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts";
import { getWeeklyData } from "@/lib/hydration";
import { TrendingUp } from "lucide-react";

interface WeeklyChartProps {
  goal: number;
}

export function WeeklyChart({ goal }: WeeklyChartProps) {
  const data = getWeeklyData();
  const todayIndex = data.length - 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="glass-strong rounded-2xl p-4 sm:p-5"
    >
      <h3 className="font-heading font-semibold text-foreground mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        Weekly Overview
      </h3>

      <div className="h-40 sm:h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="20%">
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            />
            <YAxis hide domain={[0, Math.max(goal, ...data.map(d => d.intake)) * 1.1]} />
            <Bar dataKey="intake" radius={[5, 5, 0, 0]}>
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

      <div className="flex justify-between text-[10px] sm:text-xs text-muted-foreground mt-2">
        <span>Goal: {(goal / 1000).toFixed(1)}L/day</span>
        <span>
          Avg: {(data.reduce((s, d) => s + d.intake, 0) / 7 / 1000).toFixed(1)}L
        </span>
      </div>
    </motion.div>
  );
}
