-- Each player gets a unique shareable payment token.
-- Owners copy the /pay/player/{token} URL and share it with their player
-- so the player can submit their own ₹650 payment proof without signing in.
-- DEFAULT gen_random_uuid() populates the token for all existing and future rows.

ALTER TABLE players ADD COLUMN payment_token UUID UNIQUE DEFAULT gen_random_uuid();
