-- PATCH 6 — let the shared `notify` service log to club_messages.
-- Optional: sending works without it; this just enables the cross-module send log.
grant select, insert on club_messages to service_role;
