import { useState } from "react";
import { motion } from "framer-motion";
import { Droplets, User, MapPin, Clock, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile, type UserProfile, type ActivityLevel } from "@/lib/hydration";

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
}

const activityLevels: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentary", label: "🪑 Sedentary", desc: "Desk job, little exercise" },
  { value: "light", label: "🚶 Light", desc: "Light walks" },
  { value: "moderate", label: "🏃 Moderate", desc: "3-4x/week" },
  { value: "active", label: "💪 Active", desc: "Daily exercise" },
  { value: "intense", label: "🔥 Intense", desc: "Athlete-level" },
];

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [form, setForm] = useState<UserProfile>({
    name: "",
    weight: 70,
    age: 25,
    city: "",
    wakeTime: "07:00",
    sleepTime: "23:00",
    activityLevel: "moderate",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city) return;
    saveProfile(form);
    onComplete(form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6 sm:mb-8">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mb-3 sm:mb-4"
          >
            <Droplets className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gradient-water">
            HydroSmart
          </h1>
          <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
            Weather-adaptive hydration assistant
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Your Name
            </Label>
            <Input
              placeholder="Enter your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="h-10 sm:h-11"
              autoComplete="name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Weight (kg)</Label>
              <Input
                type="number"
                min={30}
                max={200}
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: +e.target.value })}
                className="h-10 sm:h-11"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Age</Label>
              <Input
                type="number"
                min={10}
                max={100}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: +e.target.value })}
                className="h-10 sm:h-11"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> City
            </Label>
            <Input
              placeholder="e.g. Kakinada, Mumbai"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              required
              className="h-10 sm:h-11"
              autoComplete="address-level2"
            />
          </div>

          {/* Activity Level */}
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Activity Level
            </Label>
            <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
              {activityLevels.map((level) => (
                <button
                  key={level.value}
                  type="button"
                  onClick={() => setForm({ ...form, activityLevel: level.value })}
                  className={`flex flex-col items-center p-2 sm:p-2.5 rounded-xl border text-center transition-all ${
                    form.activityLevel === level.value
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/50 hover:border-primary/30"
                  }`}
                >
                  <span className="text-sm sm:text-base">{level.label.split(" ")[0]}</span>
                  <span className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 leading-tight">{level.label.split(" ")[1]}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Wake Up
              </Label>
              <Input
                type="time"
                value={form.wakeTime}
                onChange={(e) => setForm({ ...form, wakeTime: e.target.value })}
                className="h-10 sm:h-11"
              />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" /> Sleep
              </Label>
              <Input
                type="time"
                value={form.sleepTime}
                onChange={(e) => setForm({ ...form, sleepTime: e.target.value })}
                className="h-10 sm:h-11"
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl touch-target">
            Start Hydrating 💧
          </Button>
        </form>
      </motion.div>
    </div>
  );
}
