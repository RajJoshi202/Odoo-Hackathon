-- ============================================================
-- Repair and Enforce free_to_use <= on_hand
-- ============================================================

-- 1. Repair existing data where free_to_use might be > on_hand
UPDATE public.stock 
SET free_to_use = on_hand 
WHERE free_to_use > on_hand;

-- 2. Add a constraint to prevent this from happening again
ALTER TABLE public.stock 
ADD CONSTRAINT check_free_to_use_lte_on_hand 
CHECK (free_to_use <= on_hand);

-- Done!
SELECT 'Stock logic constraint applied successfully' AS result;
