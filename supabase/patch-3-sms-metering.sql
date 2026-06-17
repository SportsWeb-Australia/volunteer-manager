-- PATCH 3 — SMS metering, sender identity, trial allowance, free push/email.
-- Phase A of the communications plan. Safe to run more than once.

-- 1. Email + push are free in EVERY tier (only SMS is metered/sold).
update volunteer_plans
set features = jsonb_set(
  jsonb_set(features, '{flags,channel_push}', 'true'::jsonb),
  '{flags,channel_email}', 'true'::jsonb
);

-- 2. New columns.
alter table volunteer_messages
  add column if not exists category text not null default 'operational';   -- operational | marketing

alter table volunteer_message_recipients
  add column if not exists cost_estimate numeric;

alter table volunteer_settings
  add column if not exists sms_sender_id text,
  add column if not exists sms_sender_status text not null default 'not_started', -- not_started|pending|approved|rejected
  add column if not exists trial_ends_at timestamptz,
  add column if not exists trial_sms_allowance int not null default 25;

-- 3. SMS quota helper — used by dispatch-message (cap) and the UI (display).
--    During an active trial the allowance is the trial allowance; otherwise it's
--    the plan's monthly SMS bundle (features.limits.sms_monthly).
create or replace function public.vm_sms_quota(p_club uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_included int;
  v_trial int;
  v_trial_active boolean;
  v_used int;
  v_allowance int;
begin
  select
    nullif(vp.features->'limits'->>'sms_monthly','')::int,
    coalesce(vs.trial_sms_allowance, 0),
    (vs.trial_ends_at is not null and vs.trial_ends_at > now())
  into v_included, v_trial, v_trial_active
  from volunteer_settings vs
  left join volunteer_plans vp on vp.key = vs.plan_key
  where vs.club_id = p_club;

  v_included := coalesce(v_included, 0);
  v_trial := coalesce(v_trial, 0);
  v_trial_active := coalesce(v_trial_active, false);

  select count(*) into v_used
  from volunteer_message_recipients
  where club_id = p_club and channel = 'sms'
    and sent_at >= date_trunc('month', now());

  v_allowance := case when v_trial_active then v_trial else v_included end;

  return jsonb_build_object(
    'used', coalesce(v_used, 0),
    'allowance', v_allowance,
    'remaining', greatest(0, v_allowance - coalesce(v_used, 0)),
    'trial', v_trial_active,
    'plan_included', v_included
  );
end;
$$;

grant execute on function public.vm_sms_quota(uuid) to authenticated, service_role;

-- 4. Make the test club a trial so the 25-SMS trial UX is visible.
--    (Remove this line / clear trial_ends_at to make it a normal paid club.)
update volunteer_settings
set trial_ends_at = now() + interval '30 days', trial_sms_allowance = 25
where club_id = 'd4232df2-faae-4557-87dd-8de56840587e';
