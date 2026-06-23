import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase, db } from "@/lib/supabase";
import { fetchWeatherByCoords } from "@/lib/weather";
import { requestNotificationPermission } from "@/lib/notifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Droplets,
  Mail,
  Lock,
  User,
  AlertCircle,
  MapPin,
  Clock,
  Phone,
  ShieldCheck,
  TrendingUp,
  Activity,
  Compass,
} from "lucide-react";
import type { UserProfile } from "@/lib/hydration";

interface AuthProps {
  onSuccess: (userId: string) => void;
}

export function Auth({ onSuccess }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
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
              setCity(w.city);
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

  // Login credentials
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Registration wizard steps
  const [regStep, setRegStep] = useState(1);

  // Registration profile fields
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(70);
  const [age, setAge] = useState(25);
  const [gender, setGender] = useState<"male" | "female" | "other">("other");
  const [city, setCity] = useState("");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [sleepTime, setSleepTime] = useState("23:00");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("17:00");
  const [customInterval, setCustomInterval] = useState(60);
  const [weatherRemindersEnabled, setWeatherRemindersEnabled] = useState(true);
  const [manualGoal, setManualGoal] = useState<string>("");
  
  // Channels selection
  const [channelEmail, setChannelEmail] = useState(true);
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelWhatsApp, setChannelWhatsApp] = useState(false);
  const [phone, setPhone] = useState("");

  // Register login details (mandatory)
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Validate Indian Phone Number
  const validateIndianPhone = (num: string): boolean => {
    const regex = /^(?:\+91|91)?[6-9]\d{9}$/;
    return regex.test(num.trim());
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      // Offline mode login mock
      const offlineUsers = JSON.parse(localStorage.getItem("hydration_offline_users") || "[]");
      const matched = offlineUsers.find(
        (u: any) => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword
      );

      if (matched) {
        localStorage.setItem("hydration_profile", JSON.stringify(matched.profile));
        localStorage.setItem("hydration_notifications_enabled", "true");
        onSuccess("offline");
      } else {
        setError("Invalid email or password. Please check your credentials or register a new account.");
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (signInError) throw signInError;
      if (data.user) {
        // Load the profile from DB
        const p = await db.getProfile(data.user.id);
        if (p) {
          localStorage.setItem("hydration_profile", JSON.stringify(p));
        }
        localStorage.setItem("hydration_notifications_enabled", "true");
        onSuccess(data.user.id);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Final checks
    if (!name || !city || !regEmail || !regPassword || !manualGoal) {
      setError("Please fill in all mandatory fields, including your daily water goal.");
      return;
    }

    if (Number(manualGoal) < 500) {
      setError("Daily Water Goal is mandatory and must be at least 500 ml.");
      return;
    }

    if (customInterval < 10) {
      setError("Reminder interval must be at least 10 minutes.");
      return;
    }

    if (channelWhatsApp && !validateIndianPhone(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number for WhatsApp.");
      return;
    }

    setLoading(true);

    const channels: ("in-app" | "email" | "whatsapp")[] = [];
    if (channelInApp) channels.push("in-app");
    if (channelEmail) channels.push("email");
    if (channelWhatsApp) channels.push("whatsapp");

    const profileData: UserProfile = {
      name,
      weight,
      age,
      gender,
      city,
      wakeTime,
      sleepTime,
      workStart,
      workEnd,
      customInterval,
      weatherRemindersEnabled,
      channels,
      email: regEmail,
      phone: channelWhatsApp ? phone : "",
      manualGoal: manualGoal ? parseInt(manualGoal) : null,
    };

    if (!supabase) {
      // Offline mode signup mock
      const offlineUsers = JSON.parse(localStorage.getItem("hydration_offline_users") || "[]");
      const alreadyExists = offlineUsers.some(
        (u: any) => u.email.toLowerCase() === regEmail.toLowerCase()
      );

      if (alreadyExists) {
        setError("This email is already registered in offline storage.");
        setLoading(false);
        return;
      }

      offlineUsers.push({ email: regEmail, password: regPassword, profile: profileData });
      localStorage.setItem("hydration_offline_users", JSON.stringify(offlineUsers));
      localStorage.setItem("hydration_profile", JSON.stringify(profileData));
      localStorage.setItem("hydration_notifications_enabled", "true");
      if (channelInApp) {
        await requestNotificationPermission();
      }
      onSuccess("offline");
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Save the profile metadata to profiles table
        await db.saveProfile(data.user.id, profileData);
        localStorage.setItem("hydration_profile", JSON.stringify(profileData));
        localStorage.setItem("hydration_notifications_enabled", "true");
        if (channelInApp) {
          await requestNotificationPermission();
        }
        onSuccess(data.user.id);
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Could not complete registration. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg space-y-6"
      >
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-3"
          >
            <Droplets className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-3xl font-heading font-bold text-gradient-water">
            HydroSmart
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Intelligent Hydration & Weather Companion
          </p>
        </div>

        {error && (
          <div className="flex gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 items-start">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="glass-strong rounded-2xl p-5 sm:p-6 border border-border/60 shadow-xl space-y-4">
          <AnimatePresence mode="wait">
            {!isSignUp ? (
              // LOGIN FORM
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <h2 className="text-xl font-heading font-bold text-foreground">
                  Welcome Back
                </h2>
                <p className="text-xs text-muted-foreground">
                  Sign in to track your water goals and access adaptive reminders.
                </p>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs font-medium">
                    <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
                  </Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-2 text-xs font-medium">
                    <Lock className="w-3.5 h-3.5 text-primary" /> Password
                  </Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 font-semibold rounded-xl mt-2"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </Button>

                <div className="text-center pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(true);
                      setRegStep(1);
                      setError(null);
                    }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Don't have an account? Register Now
                  </button>
                </div>


              </motion.form>
            ) : (
              // MULTI-STEP REGISTRATION WIZARD
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-heading font-bold text-foreground">
                    Create Account
                  </h2>
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Step {regStep} of 3
                  </span>
                </div>

                {/* STEP 1: HEALTH & GEOGRAPHY */}
                {regStep === 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-2 text-xs font-medium">
                        <User className="w-3.5 h-3.5 text-primary" /> Full Name
                      </Label>
                      <Input
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="h-10 rounded-xl"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Weight (kg)</Label>
                        <Input
                          type="number"
                          min={30}
                          max={200}
                          value={weight}
                          onChange={(e) => setWeight(+e.target.value)}
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Age (years)</Label>
                        <Input
                          type="number"
                          min={10}
                          max={100}
                          value={age}
                          onChange={(e) => setAge(+e.target.value)}
                          className="h-10 rounded-xl"
                          required
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
                            onClick={() => setGender(g)}
                            className={`h-10 rounded-xl border text-xs font-semibold capitalize transition-all ${
                              gender === g
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
                            value={city}
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
                        <Label className="flex items-center gap-2 text-xs font-medium">
                          <MapPin className="w-3.5 h-3.5 text-primary" /> City (Manual Input)
                        </Label>
                        <Input
                          placeholder="e.g. Mumbai, Delhi, London"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>
                    )}

                    <Button
                      type="button"
                      disabled={!name || !city}
                      onClick={() => setRegStep(2)}
                      className="w-full h-11 font-semibold rounded-xl mt-2"
                    >
                      Next Step: Schedule ➔
                    </Button>
                  </motion.div>
                )}

                {/* STEP 2: ACTIVE HOURS & SCHEDULE */}
                {regStep === 2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-primary" /> Wake Up Time
                        </Label>
                        <Input
                          type="time"
                          value={wakeTime}
                          onChange={(e) => setWakeTime(e.target.value)}
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" /> Sleep Time
                        </Label>
                        <Input
                          type="time"
                          value={sleepTime}
                          onChange={(e) => setSleepTime(e.target.value)}
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Activity className="w-3.5 h-3.5 text-primary" /> Work Start Time
                        </Label>
                        <Input
                          type="time"
                          value={workStart}
                          onChange={(e) => setWorkStart(e.target.value)}
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Activity className="w-3.5 h-3.5 text-muted-foreground" /> Work End Time
                        </Label>
                        <Input
                          type="time"
                          value={workEnd}
                          onChange={(e) => setWorkEnd(e.target.value)}
                          className="h-10 rounded-xl"
                          required
                        />
                      </div>
                    </div>

                    {/* Base Reminder Interval (MANDATORY) */}
                    <div className="space-y-1.5 bg-secondary/30 rounded-xl p-3 border border-border/30">
                      <Label className="text-xs font-bold text-foreground">
                        Reminder Interval (Minutes) *
                      </Label>
                      <p className="text-[10px] text-muted-foreground mb-1.5">
                        How often do you want a water reminder? (Base interval)
                      </p>
                      <Input
                        type="number"
                        min={10}
                        max={360}
                        value={customInterval}
                        onChange={(e) => setCustomInterval(+e.target.value)}
                        className="h-10 rounded-xl bg-background"
                        required
                      />
                    </div>

                    {/* Weather Checkbox */}
                    <div className="flex items-start justify-between bg-secondary/30 rounded-xl p-3 border border-border/30">
                      <div className="space-y-0.5 pr-2">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          Adaptive Weather Reminders
                        </Label>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Get extra alerts when the temperature exceeds 30°C or 40°C in your city.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={weatherRemindersEnabled}
                        onChange={(e) => setWeatherRemindersEnabled(e.target.checked)}
                        className="w-4 h-4 mt-1 text-primary rounded focus:ring-primary"
                      />
                    </div>

                    {/* Daily Water Target - MANDATORY */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold flex items-center justify-between">
                        Daily Water Goal (ml) *
                      </Label>
                      <Input
                        type="number"
                        placeholder="e.g. 2000 or 2500"
                        value={manualGoal}
                        onChange={(e) => setManualGoal(e.target.value)}
                        className="h-10 rounded-xl"
                        min={500}
                        max={10000}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRegStep(1)}
                        className="h-11 rounded-xl"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        disabled={!manualGoal || Number(manualGoal) < 500}
                        onClick={() => setRegStep(3)}
                        className="h-11 font-semibold rounded-xl"
                      >
                        Next Step: Channels ➔
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: NOTIFICATION CHANNELS & CREDENTIALS */}
                {regStep === 3 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <ShieldCheck className="w-4 h-4 text-primary" /> Select Notification Channels
                      </Label>
                      
                      <div className="space-y-2.5">
                        {/* In App toggle */}
                        <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-2.5 border border-border/30">
                          <div>
                            <p className="text-xs font-bold text-foreground">In-App Popups</p>
                            <p className="text-[10px] text-muted-foreground">Receive browser popups when active</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={channelInApp}
                            onChange={(e) => setChannelInApp(e.target.checked)}
                            className="w-4 h-4 text-primary rounded"
                          />
                        </div>

                        {/* Email toggle */}
                        <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-2.5 border border-border/30">
                          <div>
                            <p className="text-xs font-bold text-foreground">Email Notifications</p>
                            <p className="text-[10px] text-muted-foreground">Receive periodic reminder emails</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={channelEmail}
                            onChange={(e) => setChannelEmail(e.target.checked)}
                            className="w-4 h-4 text-primary rounded"
                          />
                        </div>

                        {/* WhatsApp toggle */}
                        <div className="bg-secondary/30 rounded-xl p-2.5 border border-border/30 space-y-2">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-foreground">WhatsApp Messages</p>
                              <p className="text-[10px] text-muted-foreground">Receive messages via WhatsApp</p>
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
                                placeholder="9876543210"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="h-9 rounded-lg bg-background text-xs"
                                required
                              />
                              <p className="text-[9px] text-muted-foreground">
                                Format: 10-digit number starting with 6, 7, 8, or 9
                              </p>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-border/50 pt-3 space-y-3">
                      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                        Step 3: Account Credentials
                      </h3>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Mail className="w-3.5 h-3.5 text-primary" /> Login Email
                        </Label>
                        <Input
                          type="email"
                          placeholder="your-email@example.com"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          required
                          className="h-10 rounded-xl"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5 text-xs font-medium">
                          <Lock className="w-3.5 h-3.5 text-primary" /> Account Password
                        </Label>
                        <Input
                          type="password"
                          placeholder="Min 6 characters"
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          required
                          minLength={6}
                          className="h-10 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setRegStep(2)}
                        disabled={loading}
                        className="h-11 rounded-xl"
                      >
                        Back
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          loading ||
                          !regEmail ||
                          !regPassword ||
                          regPassword.length < 6 ||
                          !manualGoal ||
                          Number(manualGoal) < 500 ||
                          (channelWhatsApp && !validateIndianPhone(phone))
                        }
                        onClick={handleRegister}
                        className="h-11 font-semibold rounded-xl"
                      >
                        {loading ? "Registering..." : "Register & Hydrate! 💧"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                <div className="text-center pt-2 border-t border-border/40 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(false);
                      setError(null);
                    }}
                    className="text-primary font-semibold hover:underline"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
