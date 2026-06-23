import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  User,
  MapPin,
  Clock,
  ShieldCheck,
  Phone,
  Settings,
  Scale,
  Calendar,
  LogOut,
  Droplets,
  BellRing,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/lib/hydration";
import { fetchWeatherByCoords } from "@/lib/weather";

interface ProfileSetupProps {
  isOpen: boolean;
  onClose: () => void;
  initialProfile: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onLogout: () => void;
}

export function ProfileSetup({
  isOpen,
  onClose,
  initialProfile,
  onComplete,
  onLogout,
}: ProfileSetupProps) {
  const [form, setForm] = useState<UserProfile>(() => ({ ...initialProfile }));
  const [error, setError] = useState<string | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [locationMode, setLocationMode] = useState<"auto" | "manual">("manual");

  const handleAutoDetectLocation = () => {
    if (navigator.geolocation) {
      setDetectingLocation(true);
      setError(null);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const w = await fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
            if (w && w.city) {
              setForm(prev => ({ ...prev, city: w.city }));
            } else {
              setError("Could not resolve city from coordinates. Please enter manually.");
            }
          } catch (e) {
            console.error("Coords weather retrieval error:", e);
            setError("Failed to fetch location weather. Please enter manually.");
          } finally {
            setDetectingLocation(false);
          }
        },
        (err) => {
          console.warn("Geolocation permission blocked/failed:", err);
          setError("Location access denied or timed out. Please enter manually.");
          setDetectingLocation(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  const selectLocationMode = (mode: "auto" | "manual") => {
    setLocationMode(mode);
    if (mode === "auto") {
      handleAutoDetectLocation();
    }
  };

  // Individual notification channel states for easy binding
  const [channelEmail, setChannelEmail] = useState(false);
  const [channelInApp, setChannelInApp] = useState(false);
  const [channelWhatsApp, setChannelWhatsApp] = useState(false);

  // Sync state when initialProfile changes or modal opens
  useEffect(() => {
    if (initialProfile) {
      setForm({ ...initialProfile });
      setChannelEmail(initialProfile.channels.includes("email"));
      setChannelInApp(initialProfile.channels.includes("in-app"));
      setChannelWhatsApp(initialProfile.channels.includes("whatsapp"));
    }
  }, [initialProfile, isOpen]);

  const validateIndianPhone = (num: string): boolean => {
    const regex = /^(?:\+91|91)?[6-9]\d{9}$/;
    return regex.test(num.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.name || !form.city || !form.manualGoal) {
      setError("Name, City, and Daily Water Goal are required fields.");
      return;
    }

    if (Number(form.manualGoal) < 500) {
      setError("Daily Water Goal is mandatory and must be at least 500 ml.");
      return;
    }

    if (form.customInterval < 10) {
      setError("Reminder interval must be at least 10 minutes.");
      return;
    }

    if (channelWhatsApp && !validateIndianPhone(form.phone || "")) {
      setError("Please enter a valid 10-digit Indian phone number for WhatsApp.");
      return;
    }

    const nextChannels: ("in-app" | "email" | "whatsapp")[] = [];
    if (channelInApp) nextChannels.push("in-app");
    if (channelEmail) nextChannels.push("email");
    if (channelWhatsApp) nextChannels.push("whatsapp");

    const updatedProfile: UserProfile = {
      ...form,
      channels: nextChannels,
      phone: channelWhatsApp ? form.phone : "",
      manualGoal: Number(form.manualGoal),
    };

    onComplete(updatedProfile);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="glass-strong rounded-2xl w-full max-w-lg border border-border/80 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10 relative"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/50 flex items-center justify-between bg-card/50">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary animate-spin-slow" />
                <h2 className="text-lg font-heading font-bold text-foreground">
                  Edit Profile & Preferences
                </h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close settings"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Form */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-5 flex-1 text-sm">
              {error && (
                <div className="flex gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 items-start">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* SECTION 1: Personal Info */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4" /> Personal Health Details
                </h3>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Full Name</Label>
                  <Input
                    placeholder="Enter your name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Scale className="w-3.5 h-3.5 text-muted-foreground" /> Weight (kg)
                    </Label>
                    <Input
                      type="number"
                      min={30}
                      max={200}
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: +e.target.value })}
                      required
                      className="h-10 rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Age (years)
                    </Label>
                    <Input
                      type="number"
                      min={10}
                      max={100}
                      value={form.age}
                      onChange={(e) => setForm({ ...form, age: +e.target.value })}
                      required
                      className="h-10 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Gender</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["male", "female", "other"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setForm({ ...form, gender: g })}
                        className={`h-9 rounded-xl border text-xs font-semibold capitalize transition-all ${
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
                  <Label className="text-xs font-medium">Location Mode</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => selectLocationMode("auto")}
                      className={`h-9 rounded-xl border text-xs font-semibold transition-all ${
                        locationMode === "auto"
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/50 hover:border-primary/20"
                      }`}
                    >
                      Auto-Detect GPS
                    </button>
                    <button
                      type="button"
                      onClick={() => selectLocationMode("manual")}
                      className={`h-9 rounded-xl border text-xs font-semibold transition-all ${
                        locationMode === "manual"
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border/50 hover:border-primary/20"
                      }`}
                    >
                      Enter Manually
                    </button>
                  </div>
                </div>

                {locationMode === "auto" ? (
                  <div className="space-y-1.5 bg-primary/5 rounded-xl p-3 border border-primary/10">
                    <Label className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <MapPin className="w-3.5 h-3.5 text-primary" /> Resolved Location
                    </Label>
                    <div className="flex gap-2 mt-1">
                      <Input
                        placeholder={detectingLocation ? "Detecting GPS location..." : "City name resolved from GPS"}
                        value={form.city}
                        readOnly
                        required
                        className="h-10 rounded-xl flex-1 bg-secondary/30 border-primary/20 font-semibold"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAutoDetectLocation}
                        disabled={detectingLocation}
                        className="h-10 px-3 rounded-xl border-primary/20 text-primary hover:bg-primary/5 gap-1.5 text-xs shrink-0 font-semibold"
                      >
                        <Compass className={`w-3.5 h-3.5 ${detectingLocation ? "animate-spin" : ""}`} />
                        {detectingLocation ? "Detecting..." : "Detect"}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
                      Requires browser location permissions to fetch coordinates.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> City (Manual Input)
                    </Label>
                    <Input
                      placeholder="e.g. Mumbai, Dubai"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      required
                      className="h-10 rounded-xl"
                    />
                  </div>
                )}
              </div>

              <hr className="border-border/40" />

              {/* SECTION 2: Active Hours Schedule */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Sleep & Work Schedule
                </h3>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Wake Up Time</Label>
                    <Input
                      type="time"
                      value={form.wakeTime}
                      onChange={(e) => setForm({ ...form, wakeTime: e.target.value })}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Sleep Time</Label>
                    <Input
                      type="time"
                      value={form.sleepTime}
                      onChange={(e) => setForm({ ...form, sleepTime: e.target.value })}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Work Start Time</Label>
                    <Input
                      type="time"
                      value={form.workStart}
                      onChange={(e) => setForm({ ...form, workStart: e.target.value })}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Work End Time</Label>
                    <Input
                      type="time"
                      value={form.workEnd}
                      onChange={(e) => setForm({ ...form, workEnd: e.target.value })}
                      className="h-10 rounded-xl"
                      required
                    />
                  </div>
                </div>
              </div>

              <hr className="border-border/40" />

              {/* SECTION 3: Smart Reminder Settings */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <BellRing className="w-4 h-4" /> Reminder Preferences
                </h3>

                <div className="space-y-1.5 bg-secondary/30 rounded-xl p-3 border border-border/30">
                  <Label className="text-xs font-bold text-foreground">
                    Base Reminder Interval (Minutes) *
                  </Label>
                  <p className="text-[10px] text-muted-foreground mb-1.5">
                    Interval period is mandatory. Set how often you want regular reminders.
                  </p>
                  <Input
                    type="number"
                    min={10}
                    max={360}
                    value={form.customInterval}
                    onChange={(e) => setForm({ ...form, customInterval: +e.target.value })}
                    className="h-10 rounded-xl bg-background"
                    required
                  />
                </div>

                <div className="flex items-start justify-between bg-secondary/30 rounded-xl p-3 border border-border/30">
                  <div className="space-y-0.5 pr-2">
                    <Label className="text-xs font-bold text-foreground">
                      Adaptive Weather Reminders
                    </Label>
                    <p className="text-[10px] text-muted-foreground leading-normal">
                      Get extra reminders when the temperature rises above 30°C or 40°C in your city.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={form.weatherRemindersEnabled}
                    onChange={(e) => setForm({ ...form, weatherRemindersEnabled: e.target.checked })}
                    className="w-4 h-4 mt-1 text-primary rounded focus:ring-primary"
                  />
                </div>

                {/* Daily Water Target - MANDATORY */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center justify-between">
                    Daily Water Target Goal (ml) *
                  </Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2000 or 2500"
                    value={form.manualGoal || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        manualGoal: e.target.value ? +e.target.value : 0,
                      })
                    }
                    className="h-10 rounded-xl"
                    min={500}
                    max={10000}
                    required
                  />
                </div>
              </div>

              <hr className="border-border/40" />

              {/* SECTION 4: Channels */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Notification Delivery
                </h3>

                <div className="space-y-2">
                  {/* In-app */}
                  <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-2.5 border border-border/30">
                    <div>
                      <p className="text-xs font-bold text-foreground">In-App Browser Popups</p>
                      <p className="text-[10px] text-muted-foreground">Receive popups inside the browser</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={channelInApp}
                      onChange={(e) => setChannelInApp(e.target.checked)}
                      className="w-4 h-4 text-primary rounded"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-2.5 border border-border/30">
                    <div>
                      <p className="text-xs font-bold text-foreground">Email Messages</p>
                      <p className="text-[10px] text-muted-foreground">Receive reminders to: {form.email}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={channelEmail}
                      onChange={(e) => setChannelEmail(e.target.checked)}
                      className="w-4 h-4 text-primary rounded"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="bg-secondary/30 rounded-xl p-2.5 border border-border/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-foreground">WhatsApp Messages</p>
                        <p className="text-[10px] text-muted-foreground">Receive reminders via WhatsApp</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={channelWhatsApp}
                        onChange={(e) => setChannelWhatsApp(e.target.checked)}
                        className="w-4 h-4 text-primary rounded"
                      />
                    </div>

                    {channelWhatsApp && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="space-y-1.5 pt-1.5 border-t border-border/40"
                      >
                        <Label className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                          <Phone className="w-3.5 h-3.5 text-primary" /> Indian WhatsApp Number (+91)
                        </Label>
                        <Input
                          type="tel"
                          placeholder="e.g. 9876543210"
                          value={form.phone || ""}
                          onChange={(e) => setForm({ ...form, phone: e.target.value })}
                          className="h-9 rounded-lg bg-background text-xs"
                          required
                        />
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </form>

            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-border/50 flex items-center justify-between bg-card/50">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="rounded-xl flex items-center gap-1.5 h-10 text-xs px-3 font-semibold"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  className="rounded-xl h-10 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-xl h-10 font-semibold text-xs px-4"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// AlertCircle local definition in case of missing import
function AlertCircle(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
