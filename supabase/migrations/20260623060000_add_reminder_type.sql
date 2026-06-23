-- Add reminder_type to reminder_logs table
ALTER TABLE public.reminder_logs 
ADD COLUMN IF NOT EXISTS reminder_type TEXT NOT NULL DEFAULT 'custom';
