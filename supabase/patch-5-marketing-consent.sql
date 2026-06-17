-- PATCH 5 — marketing consent + opt-out (Phase C, part 1). Idempotent.
--
-- Operational/transactional messages (rosters, reminders, check-in) send to
-- everyone. MARKETING messages only go to people who opted in and haven't opted
-- out, and always carry an opt-out (SMS "Reply STOP", email unsubscribe link).

alter table people
  add column if not exists sms_marketing_consent  boolean not null default false,
  add column if not exists email_marketing_consent boolean not null default false,
  add column if not exists marketing_opt_out       boolean not null default false,
  add column if not exists marketing_opt_out_at    timestamptz,
  add column if not exists unsubscribe_token        uuid not null default gen_random_uuid();

create index if not exists people_unsubscribe_token_idx on people (unsubscribe_token);

-- STOP handling: opt a mobile out everywhere it appears (match on last 9 digits).
create or replace function public.vm_marketing_opt_out_by_mobile(p_mobile text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int; v_last text;
begin
  v_last := right(regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g'), 9);
  if length(v_last) < 8 then return 0; end if;
  update people
    set marketing_opt_out = true, marketing_opt_out_at = now(), sms_marketing_consent = false
  where right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 9) = v_last;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- START / UNSTOP: opt a mobile back in.
create or replace function public.vm_marketing_opt_in_by_mobile(p_mobile text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int; v_last text;
begin
  v_last := right(regexp_replace(coalesce(p_mobile, ''), '\D', '', 'g'), 9);
  if length(v_last) < 8 then return 0; end if;
  update people
    set marketing_opt_out = false, marketing_opt_out_at = null, sms_marketing_consent = true
  where right(regexp_replace(coalesce(mobile, ''), '\D', '', 'g'), 9) = v_last;
  get diagnostics n = row_count;
  return n;
end;
$$;

grant execute on function public.vm_marketing_opt_out_by_mobile(text) to service_role;
grant execute on function public.vm_marketing_opt_in_by_mobile(text)  to service_role;
