import { motion } from "framer-motion";
import { Thermometer, Droplets, Wind } from "lucide-react";
import type { WeatherData } from "@/lib/hydration";
import { getTemperatureLevel } from "@/lib/hydration";

interface WeatherCardProps {
  weather: WeatherData;
  reminderMin: number;
}

const tempColors = {
  cool: "text-primary",
  warm: "text-warning",
  hot: "text-hot",
  extreme: "text-destructive",
};

export function WeatherCard({ weather, reminderMin }: WeatherCardProps) {
  const level = getTemperatureLevel(weather.temp);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-strong rounded-2xl p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{weather.city}</p>
          <p className="text-base sm:text-lg font-heading font-semibold truncate">{weather.description}</p>
        </div>
        <span className="text-3xl sm:text-4xl flex-shrink-0 ml-2" role="img" aria-label={weather.description}>{weather.icon}</span>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-secondary/50 rounded-xl p-2.5 sm:p-3 text-center">
          <Thermometer className={`w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 ${tempColors[level]}`} />
          <p className={`text-lg sm:text-xl font-bold font-heading ${tempColors[level]}`}>
            {weather.temp}°C
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground capitalize">{level}</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-2.5 sm:p-3 text-center">
          <Droplets className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-primary" />
          <p className="text-lg sm:text-xl font-bold font-heading">{weather.humidity}%</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Humidity</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-2.5 sm:p-3 text-center">
          <Wind className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1 text-accent" />
          <p className="text-lg sm:text-xl font-bold font-heading">{reminderMin}m</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Interval</p>
        </div>
      </div>
    </motion.div>
  );
}
