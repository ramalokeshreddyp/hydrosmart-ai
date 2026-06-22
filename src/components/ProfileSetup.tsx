import { useState } from "react";
import { motion } from "framer-motion";
import { Droplets, User, MapPin, Clock, ShieldCheck, Mail, Phone, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveProfile, type UserProfile } from "@/lib/hydration";

interface ProfileSetupProps {
  onComplete: (profile: UserProfile) => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [form, setForm] = useState<UserProfile>({
    name: "",
    weight: 70,
    age: 25,
    gender: "other",
    city: "",
    wakeTime: "07:00",
    sleepTime: "23:00",
    workStart: "09:00",
    workEnd: "17:00",
    customInterval: 60,
    weatherRemindersEnabled: true,
    channels: ["in-app"],
    email: "",
    phone: "",
    manualGoal: null,
  });

  const [step, setStep] = useState(1);

  const handleChannelToggle = (channel: "in-app" | "email" | "whatsapp") => {
    const nextChannels = form.channels.includes(channel)
      ? form.channels.filter((c) => c !== channel)
      : [...form.channels, channel];
    
    // Ensure at least one channel is selected
    if (nextChannels.length > 0) {
      setForm({ ...form, channels: nextChannels });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.city) return;
    
    // Validate email if selected
    if (form.channels.includes("email") && !form.email) return;
    // Validate phone if selected
    if (form.channels.includes("whatsapp") && !form.phone) return;

    saveProfile(form);
    onComplete(form);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-background">
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
            Intelligent Hydration Reminder System
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-5 sm:p-6 space-y-5 sm:space-y-6">
          
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Step 1: Core Metrics</h2>
              
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                  <User className="w-3.5 h-3.5 text-primary" /> Name
                </Label>
                <Input
                  placeholder="Enter your name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="h-10 sm:h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium">Weight (kg)</Label>
                  <Input
                    type="number"
                    min={30}
                    max={200}
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: +e.target.value })}
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs sm:text-sm font-medium">Age</Label>
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    value={form.age}
                    onChange={(e) => setForm({ ...form, age: +e.target.value })}
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Gender</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["male", "female", "other"] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setForm({ ...form, gender: g })}
                      className={`h-10 rounded-xl border text-xs font-semibold capitalize transition-all ${
                        form.gender === g
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/50 hover:border-primary/20"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> City for Weather Scaling
                </Label>
                <Input
                  placeholder="e.g. London, Dubai, Delhi"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  required
                  className="h-10 sm:h-11"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Wake Up
                  </Label>
                  <Input
                    type="time"
                    value={form.wakeTime}
                    onChange={(e) => setForm({ ...form, wakeTime: e.target.value })}
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Sleep
                  </Label>
                  <Input
                    type="time"
                    value={form.sleepTime}
                    onChange={(e) => setForm({ ...form, sleepTime: e.target.value })}
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Work Start
                  </Label>
                  <Input
                    type="time"
                    value={form.workStart}
                    onChange={(e) => setForm({ ...form, workStart: e.target.value })}
                    className="h-10 sm:h-11"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Work End
                  </Label>
                  <Input
                    type="time"
                    value={form.workEnd}
                    onChange={(e) => setForm({ ...form, workEnd: e.target.value })}
                    className="h-10 sm:h-11"
                  />
                </div>
              </div>

              <Button
                type="button"
                onClick={() => form.name && form.city && setStep(2)}
                disabled={!form.name || !form.city}
                className="w-full h-11 mt-4 font-semibold rounded-xl"
              >
                Next Step ➔
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Step 2: Smart Preferences</h2>

              {/* Weather Settings */}
              <div className="bg-secondary/40 rounded-xl p-3 sm:p-4 border border-border/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs sm:text-sm font-bold flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" /> Weather-Based Reminders
                    </Label>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                      Automatically adjust interval based on temperature.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.weatherRemindersEnabled}
                    onChange={(e) => setForm({ ...form, weatherRemindersEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                  />
                </div>

                {!form.weatherRemindersEnabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-1.5 pt-2 border-t border-border/30"
                  >
                    <Label className="text-xs sm:text-sm font-medium">Custom Interval (minutes)</Label>
                    <Input
                      type="number"
                      min={10}
                      max={360}
                      value={form.customInterval}
                      onChange={(e) => setForm({ ...form, customInterval: +e.target.value })}
                      className="h-10 sm:h-11"
                    />
                  </motion.div>
                )}
              </div>

              {/* Goal Override */}
              <div className="space-y-1.5">
                <Label className="text-xs sm:text-sm font-medium">Daily Water Intake Goal (ml) <span className="text-[10px] text-muted-foreground">(Optional)</span></Label>
                <Input
                  type="number"
                  placeholder="Leave empty for auto-calculation (35ml/kg)"
                  value={form.manualGoal || ""}
                  onChange={(e) => setForm({ ...form, manualGoal: e.target.value ? +e.target.value : null })}
                  className="h-10 sm:h-11"
                  min={500}
                />
              </div>

              {/* Reminder Channels */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-xs sm:text-sm font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Notification Channels
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["in-app", "email", "whatsapp"] as const).map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      onClick={() => handleChannelToggle(ch)}
                      className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                        form.channels.includes(ch)
                          ? "border-primary bg-primary/10"
                          : "border-border/50 hover:border-primary/20"
                      }`}
                    >
                      <span className="text-xs font-semibold capitalize">{ch.replace("-", " ")}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact Details */}
              {form.channels.includes("email") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1.5"
                >
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="name@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    className="h-10 sm:h-11"
                  />
                </motion.div>
              )}

              {form.channels.includes("whatsapp") && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-1.5"
                >
                  <Label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
                    <Phone className="w-3.5 h-3.5 text-primary" /> WhatsApp Phone Number
                  </Label>
                  <Input
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    className="h-10 sm:h-11"
                  />
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-11 rounded-xl"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="h-11 font-semibold rounded-xl"
                  disabled={
                    (form.channels.includes("email") && !form.email) ||
                    (form.channels.includes("whatsapp") && !form.phone)
                  }
                >
                  Save Profile 💧
                </Button>
              </div>
            </motion.div>
          )}

        </form>
      </motion.div>
    </div>
  );
}
