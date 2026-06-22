-- 1. Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  age INTEGER NOT NULL,
  city TEXT NOT NULL,
  wake_time TEXT NOT NULL DEFAULT '07:00',
  sleep_time TEXT NOT NULL DEFAULT '23:00',
  custom_interval INTEGER NOT NULL DEFAULT 60,
  weather_reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in-app'],
  email TEXT,
  phone TEXT,
  manual_goal INTEGER,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Security Policies
CREATE POLICY "Users can manage their own profiles" 
  ON public.profiles FOR ALL 
  USING (auth.uid() = id);

-- 2. Water Intake Logs Table
CREATE TABLE IF NOT EXISTS public.intake_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.intake_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own intake logs" 
  ON public.intake_logs FOR ALL 
  USING (auth.uid() = user_id);

-- 3. Reminder Logs Table
CREATE TABLE IF NOT EXISTS public.reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  temp NUMERIC NOT NULL,
  city TEXT NOT NULL,
  interval_minutes INTEGER NOT NULL,
  channels TEXT[] NOT NULL,
  action TEXT NOT NULL DEFAULT 'pending',
  amount_logged INTEGER
);

ALTER TABLE public.reminder_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own reminder logs" 
  ON public.reminder_logs FOR ALL 
  USING (auth.uid() = user_id);
