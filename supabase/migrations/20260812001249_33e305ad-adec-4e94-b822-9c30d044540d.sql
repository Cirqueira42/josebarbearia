ALTER TABLE public.cash_entries REPLICA IDENTITY FULL;
ALTER TABLE public.daily_closures REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_closures;