-- Enable full row tracking for real-time updates on messages table
ALTER TABLE public.messages REPLICA IDENTITY FULL;