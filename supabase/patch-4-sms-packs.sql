-- PATCH 4 — SMS packs / credits + overage (Phase B). Safe to run more than once.

-- 1. Persistent SMS credit balance (bought packs; carries across months).
alter table volunteer_settings
  add column if not exists sms_credit_balance int not null default 0;

-- 2. Audit log of pack purchases / grants.
create table if not exists volunteer_sms_packs (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null,
  sms_count int not null,
  amount_aud numeric,
  source text not null default 'manual',   -- manual | checkout | comp
  created_by uuid,
  created_at timestamptz not null default now()
);
alter table volunteer_sms_packs enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'volunteer_sms_packs' and policyname = 'vm_sms_packs_club') then
    create policy vm_sms_packs_club on volunteer_sms_packs
      for select to authenticated using (vm_is_club_member(club_id));
  end if;
end $$;
grant select, insert, update, delete on volunteer_sms_packs to service_role;
grant select on volunteer_sms_packs to authenticated;

-- 3. Quota now includes the monthly bundle (or trial) PLUS persistent credits.
create or replace function public.vm_sms_quota(p_club uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_included int; v_trial int; v_trial_active boolean; v_credits int; v_used int; v_monthly int;
begin
  select
    nullif(vp.features->'limits'->>'sms_monthly','')::int,
    coalesce(vs.trial_sms_allowance, 0),
    (vs.trial_ends_at is not null and vs.trial_ends_at > now()),
    coalesce(vs.sms_credit_balance, 0)
  into v_included, v_trial, v_trial_active, v_credits
  from volunteer_settings vs
  left join volunteer_plans vp on vp.key = vs.plan_key
  where vs.club_id = p_club;

  v_included := coalesce(v_included, 0);
  v_trial := coalesce(v_trial, 0);
  v_trial_active := coalesce(v_trial_active, false);
  v_credits := coalesce(v_credits, 0);

  select count(*) into v_used
  from volunteer_message_recipients
  where club_id = p_club and channel = 'sms'
    and sent_at >= date_trunc('month', now());

  v_monthly := case when v_trial_active then v_trial else v_included end;

  return jsonb_build_object(
    'used', coalesce(v_used, 0),
    'monthly', v_monthly,
    'credits', v_credits,
    'allowance', v_monthly + v_credits,
    'remaining', greatest(0, v_monthly - coalesce(v_used, 0)) + v_credits,
    'trial', v_trial_active,
    'plan_included', v_included
  );
end;
$$;

grant execute on function public.vm_sms_quota(uuid) to authenticated, service_role;
