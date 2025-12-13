-- Create mobile money accounts table for admin to manage Lipa numbers
CREATE TABLE public.mobile_money_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name TEXT NOT NULL, -- M-Pesa, Tigo Pesa, Airtel Money, Halopesa
  account_name TEXT NOT NULL, -- Business name
  phone_number TEXT NOT NULL,
  business_number TEXT, -- Lipa/Paybill number if applicable
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contact settings table for admin to manage contact page info
CREATE TABLE public.contact_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE, -- email, phone, address, whatsapp, etc.
  setting_value TEXT NOT NULL,
  setting_label TEXT, -- Display label
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create seller payment info table for sellers to upload their payment details
CREATE TABLE public.seller_payment_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type TEXT NOT NULL, -- bank, mobile_money
  provider_name TEXT, -- Bank name or mobile money provider
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL, -- Bank account or phone number
  swift_code TEXT, -- For bank accounts
  is_primary BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mobile_money_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payment_info ENABLE ROW LEVEL SECURITY;

-- Mobile money accounts policies (admin only for management, anyone can view active)
CREATE POLICY "Admins can manage mobile money accounts"
  ON public.mobile_money_accounts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active mobile money accounts"
  ON public.mobile_money_accounts FOR SELECT
  USING (is_active = true);

-- Contact settings policies (admin only for management, anyone can view active)
CREATE POLICY "Admins can manage contact settings"
  ON public.contact_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active contact settings"
  ON public.contact_settings FOR SELECT
  USING (is_active = true);

-- Seller payment info policies
CREATE POLICY "Sellers can manage own payment info"
  ON public.seller_payment_info FOR ALL
  USING (auth.uid() = seller_id);

CREATE POLICY "Anyone can view active seller payment info"
  ON public.seller_payment_info FOR SELECT
  USING (is_active = true);

-- Insert default contact settings
INSERT INTO public.contact_settings (setting_key, setting_value, setting_label, display_order) VALUES
  ('email', 'support@geoestate.co.tz', 'Email', 1),
  ('phone', '+255 XXX XXX XXX', 'Phone', 2),
  ('address', 'Dar es Salaam, Tanzania', 'Office Address', 3),
  ('whatsapp', '+255 XXX XXX XXX', 'WhatsApp', 4);