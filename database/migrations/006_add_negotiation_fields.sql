-- Add price negotiation fields to bookings table
ALTER TABLE bookings 
ADD COLUMN negotiation JSON DEFAULT NULL COMMENT 'Price negotiation between client and provider',
ADD COLUMN service_charges DECIMAL(10,2) DEFAULT NULL COMMENT 'Provider set service charges',
ADD COLUMN final_agreed_amount DECIMAL(10,2) DEFAULT NULL COMMENT 'Final agreed amount after negotiation';

-- negotiation JSON structure:
-- {
--   "status": "pending" | "accepted" | "rejected" | "counter_offered",
--   "provider_proposed_amount": 1500,
--   "client_counter_amount": 1200,
--   "history": [
--     {"by": "provider", "amount": 1500, "timestamp": "2026-01-26T..."},
--     {"by": "client", "amount": 1200, "timestamp": "2026-01-26T..."}
--   ]
-- }
