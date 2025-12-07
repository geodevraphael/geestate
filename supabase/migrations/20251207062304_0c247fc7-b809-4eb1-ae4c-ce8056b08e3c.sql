-- Create tables for service provider booking system

-- Provider services table (services offered by providers)
CREATE TABLE IF NOT EXISTS public.provider_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC DEFAULT 0,
  price_type TEXT DEFAULT 'fixed' CHECK (price_type IN ('fixed', 'hourly', 'per_sqm', 'negotiable')),
  duration_hours NUMERIC,
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Provider availability (weekly schedule)
CREATE TABLE IF NOT EXISTS public.provider_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider_id, day_of_week)
);

-- Provider blocked dates (holidays, vacations, etc.)
CREATE TABLE IF NOT EXISTS public.provider_blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(provider_id, date)
);

-- Service bookings
CREATE TABLE IF NOT EXISTS public.service_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.provider_services(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  notes TEXT,
  provider_notes TEXT,
  total_price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.provider_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for provider_services
CREATE POLICY "Anyone can view active services" ON public.provider_services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Providers can view own services" ON public.provider_services
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Providers can create own services" ON public.provider_services
  FOR INSERT WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Providers can update own services" ON public.provider_services
  FOR UPDATE USING (auth.uid() = provider_id);

CREATE POLICY "Providers can delete own services" ON public.provider_services
  FOR DELETE USING (auth.uid() = provider_id);

-- RLS Policies for provider_availability
CREATE POLICY "Anyone can view provider availability" ON public.provider_availability
  FOR SELECT USING (true);

CREATE POLICY "Providers can manage own availability" ON public.provider_availability
  FOR ALL USING (auth.uid() = provider_id);

-- RLS Policies for provider_blocked_dates
CREATE POLICY "Anyone can view blocked dates" ON public.provider_blocked_dates
  FOR SELECT USING (true);

CREATE POLICY "Providers can manage own blocked dates" ON public.provider_blocked_dates
  FOR ALL USING (auth.uid() = provider_id);

-- RLS Policies for service_bookings
CREATE POLICY "Clients can view own bookings" ON public.service_bookings
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Providers can view their bookings" ON public.service_bookings
  FOR SELECT USING (auth.uid() = provider_id);

CREATE POLICY "Admins can view all bookings" ON public.service_bookings
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create bookings" ON public.service_bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Providers can update their bookings" ON public.service_bookings
  FOR UPDATE USING (auth.uid() = provider_id);

CREATE POLICY "Clients can cancel their bookings" ON public.service_bookings
  FOR UPDATE USING (auth.uid() = client_id AND status = 'pending');

-- Create triggers for updated_at
CREATE TRIGGER update_provider_services_updated_at
  BEFORE UPDATE ON public.provider_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_service_bookings_updated_at
  BEFORE UPDATE ON public.service_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for bookings
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bookings;
