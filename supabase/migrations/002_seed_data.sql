-- ============================================================
-- CoreInventory — Seed Data
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. WAREHOUSES
INSERT INTO public.warehouses (id, name, short_code, address) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Main Warehouse',    'MAIN',  '123 Industrial Blvd, Mumbai'),
  ('a1000000-0000-0000-0000-000000000002', 'East Hub',          'EAST',  '45 Logistics Park, Kolkata'),
  ('a1000000-0000-0000-0000-000000000003', 'West Distribution', 'WEST',  '78 Harbour Road, Ahmedabad')
ON CONFLICT (id) DO NOTHING;

-- 2. LOCATIONS
INSERT INTO public.locations (id, name, short_code, warehouse_id) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Shelf A1',    'A1',   'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000002', 'Shelf A2',    'A2',   'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000003', 'Cold Store',  'COLD', 'a1000000-0000-0000-0000-000000000001'),
  ('b1000000-0000-0000-0000-000000000004', 'Rack B1',     'B1',   'a1000000-0000-0000-0000-000000000002'),
  ('b1000000-0000-0000-0000-000000000005', 'Loading Dock', 'DOCK','a1000000-0000-0000-0000-000000000003')
ON CONFLICT (id) DO NOTHING;

-- 3. CATEGORIES
INSERT INTO public.categories (id, name) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Electronics'),
  ('c1000000-0000-0000-0000-000000000002', 'Office Supplies'),
  ('c1000000-0000-0000-0000-000000000003', 'Raw Materials'),
  ('c1000000-0000-0000-0000-000000000004', 'Packaging'),
  ('c1000000-0000-0000-0000-000000000005', 'Safety Equipment')
ON CONFLICT (id) DO NOTHING;

-- 4. PRODUCTS
INSERT INTO public.products (id, name, sku, category_id, unit_of_measure, cost_per_unit, min_stock_threshold) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Wireless Mouse',      'WM-1001', 'c1000000-0000-0000-0000-000000000001', 'pcs',   450.00,  10),
  ('d1000000-0000-0000-0000-000000000002', 'USB-C Cable 1m',      'UC-2002', 'c1000000-0000-0000-0000-000000000001', 'pcs',   120.00,  20),
  ('d1000000-0000-0000-0000-000000000003', 'A4 Copy Paper (Ream)','CP-3003', 'c1000000-0000-0000-0000-000000000002', 'box',   280.00,  15),
  ('d1000000-0000-0000-0000-000000000004', 'Steel Rod 12mm',      'SR-4004', 'c1000000-0000-0000-0000-000000000003', 'kg',     85.00,   5),
  ('d1000000-0000-0000-0000-000000000005', 'Bubble Wrap Roll',    'BW-5005', 'c1000000-0000-0000-0000-000000000004', 'metre',  35.00,   8),
  ('d1000000-0000-0000-0000-000000000006', 'Safety Goggles',      'SG-6006', 'c1000000-0000-0000-0000-000000000005', 'pcs',   190.00,  12)
ON CONFLICT (id) DO NOTHING;

-- 5. STOCK (mix of healthy + low stock to trigger alerts)
INSERT INTO public.stock (id, product_id, location_id, on_hand, free_to_use) VALUES
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',  50,  50),
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 120, 120),
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002',   8,   8),  -- LOW (threshold 15)
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000003',  40,  40),
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000004',   3,   3),  -- LOW (threshold 8)
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000005',  70,  70),
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004',   5,   5),  -- LOW (threshold 10)
  (gen_random_uuid(), 'd1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000005',  90,  90);

-- 6. RECEIPTS (mix of statuses)
INSERT INTO public.receipts (id, reference, from_contact, to_location_id, schedule_date, status) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'WH/IN/0001', 'Acme Suppliers',    'b1000000-0000-0000-0000-000000000001', '2026-03-10', 'Done'),
  ('e1000000-0000-0000-0000-000000000002', 'WH/IN/0002', 'Global Electronics', 'b1000000-0000-0000-0000-000000000002', '2026-03-14', 'Ready'),
  ('e1000000-0000-0000-0000-000000000003', 'WH/IN/0003', 'Paper House Ltd',   'b1000000-0000-0000-0000-000000000003', '2026-03-16', 'Draft'),
  ('e1000000-0000-0000-0000-000000000004', 'WH/IN/0004', 'Steel Corp India',  'b1000000-0000-0000-0000-000000000004', '2026-03-12', 'Done')
ON CONFLICT (id) DO NOTHING;

-- Receipt lines
INSERT INTO public.receipt_lines (id, receipt_id, product_id, quantity) VALUES
  (gen_random_uuid(), 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 25),
  (gen_random_uuid(), 'e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002', 60),
  (gen_random_uuid(), 'e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000003', 30),
  (gen_random_uuid(), 'e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000004', 100),
  (gen_random_uuid(), 'e1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 50);

-- 7. DELIVERIES (mix of statuses)
INSERT INTO public.deliveries (id, reference, to_contact, from_location_id, delivery_address, schedule_date, status) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'WH/OUT/0001', 'RetailMax Store',   'b1000000-0000-0000-0000-000000000001', '99 Market St, Delhi',       '2026-03-11', 'Done'),
  ('f1000000-0000-0000-0000-000000000002', 'WH/OUT/0002', 'TechWorld Online',  'b1000000-0000-0000-0000-000000000001', '12 E-Commerce Blvd, Pune',  '2026-03-15', 'Ready'),
  ('f1000000-0000-0000-0000-000000000003', 'WH/OUT/0003', 'QuickShip Logistics','b1000000-0000-0000-0000-000000000004', '56 Cargo Lane, Chennai',    '2026-03-18', 'Waiting'),
  ('f1000000-0000-0000-0000-000000000004', 'WH/OUT/0004', 'BuildRight Co',     'b1000000-0000-0000-0000-000000000003', '88 Construction Rd, Jaipur', '2026-03-13', 'Draft')
ON CONFLICT (id) DO NOTHING;

-- Delivery lines
INSERT INTO public.delivery_lines (id, delivery_id, product_id, quantity) VALUES
  (gen_random_uuid(), 'f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 10),
  (gen_random_uuid(), 'f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000002', 20),
  (gen_random_uuid(), 'f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000005', 15),
  (gen_random_uuid(), 'f1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000004', 25);

-- 8. MOVES (history)
INSERT INTO public.moves (id, type, product_id, from_location_id, to_location_id, quantity, reference_no, created_at) VALUES
  (gen_random_uuid(), 'IN',         'd1000000-0000-0000-0000-000000000001', NULL, 'b1000000-0000-0000-0000-000000000001', 25,  'WH/IN/0001',  NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'IN',         'd1000000-0000-0000-0000-000000000002', NULL, 'b1000000-0000-0000-0000-000000000001', 60,  'WH/IN/0001',  NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'OUT',        'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', NULL, 10,  'WH/OUT/0001', NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'IN',         'd1000000-0000-0000-0000-000000000004', NULL, 'b1000000-0000-0000-0000-000000000003', 50,  'WH/IN/0004',  NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'TRANSFER',   'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 5, 'Internal transfer', NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'ADJUSTMENT', 'd1000000-0000-0000-0000-000000000003', NULL, 'b1000000-0000-0000-0000-000000000002', -7, 'Physical count correction', NOW() - INTERVAL '12 hours'),
  (gen_random_uuid(), 'IN',         'd1000000-0000-0000-0000-000000000006', NULL, 'b1000000-0000-0000-0000-000000000005', 70,  'WH/IN/0005',  NOW() - INTERVAL '6 hours');

-- 9. ACTIVITY LOG
INSERT INTO public.activity_log (id, entity_type, entity_id, action, created_at) VALUES
  (gen_random_uuid(), 'receipt',  'e1000000-0000-0000-0000-000000000001', 'Created by Admin',              NOW() - INTERVAL '5 days'),
  (gen_random_uuid(), 'receipt',  'e1000000-0000-0000-0000-000000000001', 'Validated by Admin',            NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'delivery', 'f1000000-0000-0000-0000-000000000001', 'Created by Admin',              NOW() - INTERVAL '4 days'),
  (gen_random_uuid(), 'delivery', 'f1000000-0000-0000-0000-000000000001', 'Validated by Admin',            NOW() - INTERVAL '3 days'),
  (gen_random_uuid(), 'receipt',  'e1000000-0000-0000-0000-000000000002', 'Created by Admin',              NOW() - INTERVAL '2 days'),
  (gen_random_uuid(), 'receipt',  'e1000000-0000-0000-0000-000000000002', 'Status changed to Ready',       NOW() - INTERVAL '1 day'),
  (gen_random_uuid(), 'delivery', 'f1000000-0000-0000-0000-000000000003', 'Created by Admin',              NOW() - INTERVAL '18 hours'),
  (gen_random_uuid(), 'delivery', 'f1000000-0000-0000-0000-000000000003', 'Status changed to Waiting',     NOW() - INTERVAL '12 hours'),
  (gen_random_uuid(), 'receipt',  'e1000000-0000-0000-0000-000000000003', 'Created by Admin',              NOW() - INTERVAL '6 hours'),
  (gen_random_uuid(), 'receipt',  'e1000000-0000-0000-0000-000000000004', 'Validated by Admin',            NOW() - INTERVAL '2 hours');

-- Done! ✅
SELECT 'Seed data inserted successfully!' AS result;
