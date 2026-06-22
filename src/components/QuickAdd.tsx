import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, GlassWater } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/supabase";

const quickAmounts = [150, 250, 350, 500];

interface QuickAddProps {
  userId: string;
  onAdd: () => void;
}

export function QuickAdd({ userId, onAdd }: QuickAddProps) {
  const [showRipple, setShowRipple] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const handleAdd = async (amount: number) => {
    await db.addIntakeLog(userId, amount);
    setShowRipple(true);
    setTimeout(() => setShowRipple(false), 600);
    onAdd();
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customValue);
    if (val > 0 && val <= 5000) {
      handleAdd(val);
      setCustomValue("");
      setCustomOpen(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="glass-strong rounded-2xl p-4 sm:p-5"
    >
      <h3 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2 text-sm sm:text-base">
        <GlassWater className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
        Log Water
      </h3>

      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {quickAmounts.map((ml) => (
          <div key={ml} className="relative">
            <Button
              variant="secondary"
              className="w-full h-12 sm:h-14 flex flex-col gap-0.5 rounded-xl font-heading hover:bg-primary hover:text-primary-foreground transition-colors touch-target"
              onClick={() => handleAdd(ml)}
              aria-label={`Add ${ml} milliliters`}
            >
              <span className="text-sm sm:text-base font-bold">{ml}</span>
              <span className="text-[9px] sm:text-[10px] opacity-70">ml</span>
            </Button>
            <AnimatePresence>
              {showRipple && (
                <motion.div
                  initial={{ scale: 0, opacity: 0.5 }}
                  animate={{ scale: 3, opacity: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-xl border-2 border-primary pointer-events-none"
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {customOpen ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 mt-3">
              <input
                type="number"
                min={1}
                max={5000}
                placeholder="ml"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
                className="flex-1 h-10 sm:h-11 px-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
                inputMode="numeric"
                aria-label="Custom amount in milliliters"
              />
              <Button onClick={handleCustomSubmit} className="rounded-xl h-10 sm:h-11 px-4" disabled={!customValue || parseInt(customValue) <= 0}>
                Add
              </Button>
              <Button variant="ghost" onClick={() => setCustomOpen(false)} className="rounded-xl h-10 sm:h-11">
                ✕
              </Button>
            </div>
          </motion.div>
        ) : (
          <Button
            variant="outline"
            className="w-full mt-2 sm:mt-3 rounded-xl touch-target text-xs sm:text-sm"
            onClick={() => setCustomOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Custom Amount
          </Button>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
