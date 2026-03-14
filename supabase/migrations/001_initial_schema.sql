-- ============================================================
-- CoreInventory — Initial Database Schema
-- Migration: 001_initial_schema.sql
-- Run this in the Supabase SQL Editor to bootstrap all tables.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  login_id TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('manager', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- WAREHOUSES
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.warehouses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- LOCATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- CATEGORIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- ────────────────────────────────────────────────────────────
-- PRODUCTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sku TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.categories(id),
  unit_of_measure TEXT NOT NULL DEFAULT 'pcs',
  cost_per_unit NUMERIC(10,2) DEFAULT 0,
  min_stock_threshold INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- STOCK
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.stock (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
  on_hand INTEGER NOT NULL DEFAULT 0,
  free_to_use INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, location_id)
);

-- ────────────────────────────────────────────────────────────
-- SEQUENCES for reference numbers
-- ────────────────────────────────────────────────────────────
CREATE SEQUENCE receipt_seq START 1;
CREATE SEQUENCE delivery_seq START 1;

-- ────────────────────────────────────────────────────────────
-- RECEIPTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.receipts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL DEFAULT
    'WH/IN/' || LPAD(nextval('receipt_seq')::TEXT, 3, '0'),
  from_contact TEXT,
  to_location_id UUID REFERENCES public.locations(id),
  responsible_id UUID REFERENCES public.profiles(id),
  schedule_date DATE,
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Ready','Done','Canceled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- RECEIPT LINES
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.receipt_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id UUID REFERENCES public.receipts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1
);

-- ────────────────────────────────────────────────────────────
-- DELIVERIES
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.deliveries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL DEFAULT
    'WH/OUT/' || LPAD(nextval('delivery_seq')::TEXT, 3, '0'),
  to_contact TEXT,
  from_location_id UUID REFERENCES public.locations(id),
  delivery_address TEXT,
  responsible_id UUID REFERENCES public.profiles(id),
  operation_type TEXT,
  schedule_date DATE,
  status TEXT NOT NULL DEFAULT 'Draft'
    CHECK (status IN ('Draft','Waiting','Ready','Done','Canceled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- DELIVERY LINES
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.delivery_lines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  delivery_id UUID REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL DEFAULT 1
);

-- ────────────────────────────────────────────────────────────
-- MOVE HISTORY (stock ledger)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.moves (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('IN','OUT','TRANSFER','ADJUSTMENT')),
  product_id UUID REFERENCES public.products(id),
  from_location_id UUID REFERENCES public.locations(id),
  to_location_id UUID REFERENCES public.locations(id),
  quantity INTEGER NOT NULL,
  reference_id UUID,
  reference_no TEXT,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- ACTIVITY LOG (audit trail per document)
-- ────────────────────────────────────────────────────────────
CREATE TABLE public.activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL,   -- 'receipt' or 'delivery'
  entity_id UUID NOT NULL,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_lines  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moves          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES — authenticated users get full access
-- ============================================================
CREATE POLICY "Authenticated users have full access"
  ON public.profiles FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.warehouses FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.locations FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.categories FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.products FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.stock FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.receipts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.receipt_lines FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.deliveries FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.delivery_lines FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.moves FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users have full access"
  ON public.activity_log FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- TRIGGER — auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, login_id, full_name, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'login_id',
    NEW.raw_user_meta_data->>'full_name',
    'staff'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
