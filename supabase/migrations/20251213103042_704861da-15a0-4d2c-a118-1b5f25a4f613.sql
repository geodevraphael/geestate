-- Update the default commission rate to 0.001 (5% of 2% = 0.1% of sale price)
ALTER TABLE public.buying_process_tracker 
ALTER COLUMN commission_rate SET DEFAULT 0.001;

-- Update any existing records with the old 5% rate to the correct 0.1%
UPDATE public.buying_process_tracker 
SET commission_rate = 0.001 
WHERE commission_rate = 0.05;