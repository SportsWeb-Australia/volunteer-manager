-- PATCH 2 — grant the Edge Functions (service_role) access to the volunteer tables.
--
-- Symptom this fixes: Edge Functions (public signup, shift check-in, AI roster
-- builder, message dispatch, billing-sync) fail with
--   "permission denied for table volunteer_*"
-- and the public signup link shows "This volunteer link wasn't found."
--
-- Cause: PATCH 1 granted privileges to `authenticated` (the logged-in app) but
-- never to `service_role` (the role Edge Functions run as). RLS is bypassed by
-- service_role, but the plain table GRANT is still required.
--
-- Safe to run more than once.

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public'
      and (tablename like 'volunteer_%' or tablename in ('people', 'modules'))
  loop
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;

-- entitlement + helper functions the Edge Functions call (vm_feature, vm_limit, …)
grant execute on all functions in schema public to service_role;

-- make sure any volunteer tables added later are reachable too
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
