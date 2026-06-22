import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Droplets, Mail, Lock, User, AlertCircle } from "lucide-react";

interface AuthProps {
  onSuccess: (userId: string) => void;
  onOffline: () => void;
}

export function Auth({ onSuccess, onOffline }: AuthProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!supabase) {
      setError("Supabase client is not configured. Running offline.");
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name || "User",
            },
          },
        });
        if (signUpError) throw signUpError;
        if (data.user) {
          onSuccess(data.user.id);
        }
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          onSuccess(data.user.id);
        }
      }
    } catch (err: unknown) {
      console.error("Authentication error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred. Please try again.");
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
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4"
          >
            <Droplets className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gradient-water">
            HydroSmart
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Intelligent Hydration Companion
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-strong rounded-2xl p-5 sm:p-6 space-y-4 border border-primary/10 shadow-xl">
          <h2 className="text-lg font-heading font-bold text-foreground">
            {isSignUp ? "Create an Account" : "Welcome Back"}
          </h2>

          {error && (
            <div className="flex gap-2 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl p-3 items-start">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!supabase && (
            <div className="flex flex-col gap-2.5 bg-warning/10 border border-warning/20 text-warning-foreground text-xs rounded-xl p-3">
              <div className="flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-warning" />
                <span className="font-semibold text-foreground/90">Supabase config missing</span>
              </div>
              <p className="text-muted-foreground leading-normal">
                Credentials are not configured in your environment. You can run locally in offline mode using local storage.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-1 border-warning/30 hover:bg-warning/20 text-foreground text-xs rounded-lg h-8"
                onClick={onOffline}
              >
                Continue Offline ➔
              </Button>
            </div>
          )}

          {supabase && (
            <>
              {isSignUp && (
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
              )}

              <div className="space-y-1.5">
                <Label className="flex items-center gap-2 text-xs font-medium">
                  <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
                </Label>
                <Input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
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
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="h-10 rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 mt-2 font-semibold rounded-xl"
              >
                {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
              </Button>

              <div className="text-center pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary font-semibold hover:underline"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>

              <div className="border-t border-border/40 pt-3 text-center">
                <button
                  type="button"
                  onClick={onOffline}
                  className="text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Skip and Continue Offline
                </button>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}
