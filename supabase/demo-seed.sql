-- VolunteerOne — DEMO CLUB seed ("Riverside United FC").
-- A fully-populated, separate demo club so a prospect can walk the full product
-- with realistic dummy data — including SMS history so usage/quota look live.
-- Idempotent: RE-RUN ANY TIME TO RESET THE DEMO (it deletes + reinserts demo data).
-- Real clubs / free trials are untouched. SMS/email here are seeded records only —
-- no real messages are sent (flip on provider keys to send for real).
--
-- Demo club id: de300000-0000-4000-a000-000000000001
-- To let someone log in to it, see the DEMO LOGIN block at the very bottom.

-- ============================================================ reset
do $$
declare c uuid := 'de300000-0000-4000-a000-000000000001';
begin
  delete from volunteer_message_recipients where club_id = c;
  delete from volunteer_message_dispatches  where club_id = c;
  delete from volunteer_messages            where club_id = c;
  delete from volunteer_hours               where club_id = c;
  delete from volunteer_shift_assignments   where club_id = c;
  delete from volunteer_shifts              where club_id = c;
  delete from volunteer_applications        where club_id = c;
  delete from volunteer_opportunities       where club_id = c;
  delete from volunteer_compliance_records  where club_id = c;
  delete from volunteer_training_records    where club_id = c;
  delete from volunteer_recognition         where club_id = c;
  delete from volunteer_feedback            where club_id = c;
  delete from volunteer_ai_suggestions      where club_id = c;
  delete from team_members                  where club_id = c;
  delete from teams                         where club_id = c;
  delete from volunteer_profiles            where club_id = c;
  delete from volunteers                    where club_id = c;
  delete from people                        where club_id = c;
end $$;

-- ============================================================ club + module + settings
insert into clubs (id, name, slug, sport_type, primary_colour, secondary_colour, website_status, subscription_status, is_trial, contact_email)
values ('de300000-0000-4000-a000-000000000001', 'Riverside United FC', 'riverside-united-demo', 'afl', '#00BFA6', '#1F2328', 'published', 'active', false, 'demo@volunteerone.app')
on conflict (id) do update set name = excluded.name, primary_colour = excluded.primary_colour;

insert into modules (club_id, module_name, enabled, label)
values ('de300000-0000-4000-a000-000000000001', 'volunteers', true, 'Volunteer Manager')
on conflict (club_id, module_name) do update set enabled = true, label = 'Volunteer Manager';

insert into volunteer_settings (club_id, plan_key, status, check_in_method, sms_sender_status, sms_sender_id, trial_sms_allowance, sms_credit_balance, volunteer_value_per_hour, require_approval_before_send, block_restricted_without_checks, avoid_overuse, allow_self_select, publish_to_website, config)
values ('de300000-0000-4000-a000-000000000001', 'vm_full', 'active', 'qr', 'approved', 'RIVUTD', 25, 200, 40, true, true, true, true, true, '{"source":"demo"}'::jsonb)
on conflict (club_id) do update set plan_key = 'vm_full', sms_credit_balance = 200, sms_sender_status = 'approved', sms_sender_id = 'RIVUTD', trial_ends_at = null;

-- ============================================================ people + volunteers
insert into people (id, club_id, full_name, first_name, last_name, mobile, email, status, sms_marketing_consent, email_marketing_consent)
select ('de301000-0000-4000-a000-' || lpad(t.i::text, 12, '0'))::uuid,
       'de300000-0000-4000-a000-000000000001'::uuid,
       t.fn || ' ' || t.ln, t.fn, t.ln, t.mob, t.em, 'active', t.sc, t.ec
from (values
  (1,'Sarah','Nguyen','0400 100 001','sarah.n@example.com',true,true),
  (2,'James','O''Brien','0400 100 002','james.ob@example.com',true,true),
  (3,'Priya','Sharma','0400 100 003','priya.s@example.com',false,true),
  (4,'Tom','Jackson','0400 100 004','tom.j@example.com',true,false),
  (5,'Mei','Lin','0400 100 005','mei.l@example.com',true,true),
  (6,'David','Kelly','0400 100 006','david.k@example.com',false,false),
  (7,'Aroha','Williams','0400 100 007','aroha.w@example.com',true,true),
  (8,'Luca','Rossi','0400 100 008','luca.r@example.com',true,true),
  (9,'Emma','Thompson','0400 100 009','emma.t@example.com',false,true),
  (10,'Hassan','Ali','0400 100 010','hassan.a@example.com',true,true),
  (11,'Chloe','Baker','0400 100 011','chloe.b@example.com',true,false),
  (12,'Noah','Murphy','0400 100 012','noah.m@example.com',true,true)
) as t(i,fn,ln,mob,em,sc,ec);

insert into volunteers (id, club_id, person_id, status, volunteer_since)
select ('de302000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       'de300000-0000-4000-a000-000000000001'::uuid,
       ('de301000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       case when i <= 9 then 'active' when i in (10,11) then 'approved' else 'applied' end,
       (current_date - (i * 40))
from generate_series(1,12) i;

insert into volunteer_profiles (club_id, volunteer_id, status, preferred_roles, max_shifts_week)
select 'de300000-0000-4000-a000-000000000001'::uuid,
       ('de302000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       'active', (array['Canteen','BBQ','Gate','Timekeeper'])[1:1 + (i % 3)], 1 + (i % 3)
from generate_series(1,8) i;

-- ============================================================ teams + members
insert into teams (id, club_id, name, age_group, gender, grade, status)
select ('de308000-0000-4000-a000-' || lpad(t.i::text, 12, '0'))::uuid,
       'de300000-0000-4000-a000-000000000001'::uuid, t.name, t.ag, t.gender, t.grade, 'published'
from (values
  (1,'Under 12 Red','U12','Mixed','Division 2'),
  (2,'Under 14 Netball B','U14','Female','B Grade'),
  (3,'Seniors Reserves','Open','Male','Reserves')
) as t(i,name,ag,gender,grade);

insert into team_members (club_id, team_id, person_id, role, status)
select 'de300000-0000-4000-a000-000000000001'::uuid,
       ('de308000-0000-4000-a000-' || lpad(t.team::text, 12, '0'))::uuid,
       ('de301000-0000-4000-a000-' || lpad(t.person::text, 12, '0'))::uuid, t.role, 'active'
from (values
  (1,1,'coach'),(1,2,'player'),(1,3,'player'),(1,4,'player'),
  (2,5,'manager'),(2,6,'player'),(2,7,'player'),
  (3,8,'player'),(3,9,'player'),(3,10,'player')
) as t(team,person,role);

-- ============================================================ roles
insert into volunteer_roles (id, club_id, title, category, risk_level, required_checks, status)
select ('de303000-0000-4000-a000-' || lpad(t.i::text, 12, '0'))::uuid,
       'de300000-0000-4000-a000-000000000001'::uuid, t.title, t.cat, t.risk, t.checks, 'active'
from (values
  (1,'Canteen Coordinator','Game day','medium', array['Food handling']),
  (2,'BBQ Helper','Game day','low', array[]::text[]),
  (3,'Gate / Ticketing','Game day','low', array[]::text[]),
  (4,'Timekeeper','Game day','low', array[]::text[]),
  (5,'First Aid Officer','Safety','high', array['First Aid','WWCC']),
  (6,'Team Manager','Team','medium', array['WWCC'])
) as t(i,title,cat,risk,checks);

-- ============================================================ sign-ups (opportunities) + applications
insert into volunteer_opportunities (id, club_id, title, description, location, starts_at, volunteers_needed, visibility, status, signup_token)
select ('de305000-0000-4000-a000-' || lpad(t.i::text, 12, '0'))::uuid,
       'de300000-0000-4000-a000-000000000001'::uuid, t.title, t.descr, t.loc, t.starts, t.needed, 'public', 'open', gen_random_uuid()::text
from (values
  (1,'Saturday canteen helpers','Two-hour shifts on the canteen for Saturday home games.','Main oval canteen', now() + interval '3 days', 4),
  (2,'Finals BBQ crew','Help run the BBQ for finals day — cook, serve, pack down.','Riverside Reserve', now() + interval '10 days', 6),
  (3,'Match-day gate','Welcome families and take entry at the gate.','Front gate', now() + interval '5 days', 2)
) as t(i,title,descr,loc,starts,needed);

insert into volunteer_applications (club_id, opportunity_id, response, applicant_name, applicant_mobile, status)
values
  ('de300000-0000-4000-a000-000000000001','de305000-0000-4000-a000-000000000001','hand_up','Sarah Nguyen','0400 100 001','approved'),
  ('de300000-0000-4000-a000-000000000001','de305000-0000-4000-a000-000000000001','hand_up','Tom Jackson','0400 100 004','new'),
  ('de300000-0000-4000-a000-000000000001','de305000-0000-4000-a000-000000000002','occasional','Mei Lin','0400 100 005','new'),
  ('de300000-0000-4000-a000-000000000001','de305000-0000-4000-a000-000000000003','hand_up','Noah Murphy','0400 100 012','new');

-- ============================================================ shifts + assignments
insert into volunteer_shifts (id, club_id, title, shift_date, start_time, end_time, location, volunteers_needed, status, check_in_token, requires_check_in)
select ('de304000-0000-4000-a000-' || lpad(t.i::text, 12, '0'))::uuid,
       'de300000-0000-4000-a000-000000000001'::uuid, t.title, t.d, t.st, t.et, t.loc, t.needed, t.status, gen_random_uuid()::text, true
from (values
  (1,'Canteen — morning', current_date,     time '08:30', time '11:00','Canteen',2,'filled'),
  (2,'BBQ — lunch',       current_date,     time '11:00', time '14:00','BBQ area',2,'open'),
  (3,'Gate',              current_date,     time '08:00', time '10:00','Front gate',1,'filled'),
  (4,'Timekeeper — U17s', current_date + 1, time '09:00', time '11:00','Timekeepers box',1,'open'),
  (5,'Canteen — afternoon',current_date + 7,time '13:00', time '16:00','Canteen',2,'open'),
  (6,'Ground pack-down',  current_date - 7, time '16:00', time '17:30','Riverside Reserve',3,'completed')
) as t(i,title,d,st,et,loc,needed,status);

insert into volunteer_shift_assignments (club_id, shift_id, volunteer_id, assignment_type, status, check_in_at, hours_credited, ai_reason, ai_confidence)
values
  ('de300000-0000-4000-a000-000000000001','de304000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000001','assigned','confirmed', null, null, null, null),
  ('de300000-0000-4000-a000-000000000001','de304000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000002','assigned','checked_in', now() - interval '2 hours', null, null, null),
  ('de300000-0000-4000-a000-000000000001','de304000-0000-4000-a000-000000000003','de302000-0000-4000-a000-000000000003','assigned','checked_in', now() - interval '3 hours', null, null, null),
  ('de300000-0000-4000-a000-000000000001','de304000-0000-4000-a000-000000000002','de302000-0000-4000-a000-000000000008','proposed','invited', null, null, 'Available and prefers the BBQ', 0.82),
  ('de300000-0000-4000-a000-000000000001','de304000-0000-4000-a000-000000000006','de302000-0000-4000-a000-000000000004','assigned','completed', now() - interval '7 days', 1.5, null, null),
  ('de300000-0000-4000-a000-000000000001','de304000-0000-4000-a000-000000000006','de302000-0000-4000-a000-000000000005','assigned','completed', now() - interval '7 days', 1.5, null, null),
  ('de300000-0000-4000-a000-000000000001','de304000-0000-4000-a000-000000000006','de302000-0000-4000-a000-000000000007','assigned','completed', now() - interval '7 days', 1.5, null, null);

-- ============================================================ hours (for Reports)
insert into volunteer_hours (club_id, volunteer_id, occurred_on, hours, status, source)
select 'de300000-0000-4000-a000-000000000001'::uuid,
       ('de302000-0000-4000-a000-' || lpad((1 + (i % 8))::text, 12, '0'))::uuid,
       (date_trunc('month', now())::date + (i % 20)), (1 + (i % 3))::numeric, 'approved', 'shift'
from generate_series(1,12) i;

-- ============================================================ compliance (traffic lights)
insert into volunteer_compliance_records (club_id, volunteer_id, check_type, status, expires_on)
select 'de300000-0000-4000-a000-000000000001'::uuid,
       ('de302000-0000-4000-a000-' || lpad(t.i::text, 12, '0'))::uuid, t.ct, t.st, t.exp
from (values
  (1,'WWCC','valid', current_date + 200),
  (2,'WWCC','valid', current_date + 120),
  (3,'WWCC','expiring_soon', current_date + 18),
  (4,'Food handling','valid', current_date + 300),
  (5,'WWCC','expired', current_date - 20),
  (5,'First Aid','valid', current_date + 150),
  (6,'WWCC','missing', null),
  (7,'First Aid','expiring_soon', current_date + 25),
  (8,'WWCC','valid', current_date + 90)
) as t(i,ct,st,exp);

-- ============================================================ training
insert into volunteer_training_records (club_id, volunteer_id, course, status, completed_on, expires_on)
select 'de300000-0000-4000-a000-000000000001'::uuid,
       ('de302000-0000-4000-a000-' || lpad(t.i::text, 12, '0'))::uuid, t.course, t.st, t.done, t.exp
from (values
  (1,'Level 1 First Aid','completed', current_date - 200, current_date + 160),
  (5,'Food Safety Supervisor','completed', current_date - 100, current_date + 260),
  (7,'Child Safe Induction','completed', current_date - 30, null),
  (2,'Canteen Induction','in_progress', null, null)
) as t(i,course,st,done,exp);

-- ============================================================ recognition
insert into volunteer_recognition (club_id, volunteer_id, kind, badge, reason, status)
values
  ('de300000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000001','Volunteer of the month','Volunteer of the month','Ran the canteen every home game this season — an absolute legend.','published'),
  ('de300000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000004','Thank you','Thank you','Always first to set up and last to leave on pack-down.','published'),
  ('de300000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000007','Milestone','Milestone','50 volunteer hours this season. Thank you!','published');

-- ============================================================ feedback / surveys
insert into volunteer_feedback (club_id, volunteer_id, survey_type, rating, comment, status)
values
  ('de300000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000001','Post-shift pulse',5,'Loved it, really well organised.','received'),
  ('de300000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000003','Post-shift pulse',4,'Good shift, the EFTPOS was a bit slow.','received'),
  ('de300000-0000-4000-a000-000000000001','de302000-0000-4000-a000-000000000005','Season survey',5,'Great team atmosphere this year.','received'),
  ('de300000-0000-4000-a000-000000000001', null,'General feedback',3,'Would like a bit more notice before shifts.','received');

-- ============================================================ AI suggestion (Dashboard)
insert into volunteer_ai_suggestions (club_id, type, title, summary, payload, confidence, status)
values ('de300000-0000-4000-a000-000000000001','roster','Draft roster ready for review',
        'Drafted 4 assignments for Saturday — 1 needs a compliance check before confirming.',
        '{"assignments":[]}'::jsonb, 0.86, 'needs_review');

-- ============================================================ message history (incl. SMS)
insert into volunteer_messages (id, club_id, type, category, title, subject, body, channels, audience, status, sent_at, approved_at)
values
  ('de306000-0000-4000-a000-000000000001','de300000-0000-4000-a000-000000000001','call_out','operational','Canteen help — Saturday','Volunteers needed Saturday','Hi {name}! We''re short a few hands on Saturday. Can you help on the canteen or BBQ? Tap to put your hand up.', array['email','sms'], '{"statuses":["active"]}'::jsonb,'sent', date_trunc('month', now()) + interval '2 days', date_trunc('month', now()) + interval '2 days'),
  ('de306000-0000-4000-a000-000000000002','de300000-0000-4000-a000-000000000001','newsletter','marketing','Season wrap & thanks','A huge thank you from Riverside United','Hi {name}, what a season! Thanks to every one of our volunteers who made it happen.', array['email'], '{"statuses":["active"]}'::jsonb,'sent', date_trunc('month', now()) + interval '5 days', date_trunc('month', now()) + interval '5 days'),
  ('de306000-0000-4000-a000-000000000003','de300000-0000-4000-a000-000000000001','reminder','operational','Shift reminder','Your shift tomorrow','Hi {name}, just a reminder of your shift tomorrow. See you there!', array['sms'], '{"statuses":["active"]}'::jsonb,'draft', null, null);

insert into volunteer_message_dispatches (club_id, message_id, channel, provider, status, sent_at, stats)
values
  ('de300000-0000-4000-a000-000000000001','de306000-0000-4000-a000-000000000001','email','zeptomail','sent', date_trunc('month', now()) + interval '2 days', '{"sent":12,"failed":0}'::jsonb),
  ('de300000-0000-4000-a000-000000000001','de306000-0000-4000-a000-000000000001','sms','twilio','sent', date_trunc('month', now()) + interval '2 days', '{"sent":12,"failed":0}'::jsonb),
  ('de300000-0000-4000-a000-000000000001','de306000-0000-4000-a000-000000000002','email','zeptomail','sent', date_trunc('month', now()) + interval '5 days', '{"sent":9,"failed":0}'::jsonb);

-- m01 SMS recipients (12) — these count toward this month's SMS usage / quota
insert into volunteer_message_recipients (club_id, message_id, volunteer_id, person_id, channel, address, status, sent_at, delivered_at, cost_estimate, provider_message_id)
select 'de300000-0000-4000-a000-000000000001'::uuid,'de306000-0000-4000-a000-000000000001'::uuid,
       ('de302000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       ('de301000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       'sms', '0400 100 ' || lpad(i::text, 3, '0'), 'delivered',
       date_trunc('month', now()) + interval '2 days', date_trunc('month', now()) + interval '2 days', 0.08, 'demo-sms-' || i
from generate_series(1,12) i;

-- m01 email recipients (12)
insert into volunteer_message_recipients (club_id, message_id, volunteer_id, person_id, channel, address, status, sent_at, delivered_at, opened_at)
select 'de300000-0000-4000-a000-000000000001'::uuid,'de306000-0000-4000-a000-000000000001'::uuid,
       ('de302000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       ('de301000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       'email', 'vol' || i || '@example.com',
       case when i % 3 = 0 then 'opened' else 'delivered' end,
       date_trunc('month', now()) + interval '2 days', date_trunc('month', now()) + interval '2 days',
       case when i % 3 = 0 then date_trunc('month', now()) + interval '2 days 1 hour' else null end
from generate_series(1,12) i;

-- m02 marketing email recipients (9)
insert into volunteer_message_recipients (club_id, message_id, volunteer_id, person_id, channel, address, status, sent_at, delivered_at)
select 'de300000-0000-4000-a000-000000000001'::uuid,'de306000-0000-4000-a000-000000000002'::uuid,
       ('de302000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       ('de301000-0000-4000-a000-' || lpad(i::text, 12, '0'))::uuid,
       'email', 'vol' || i || '@example.com', 'delivered',
       date_trunc('month', now()) + interval '5 days', date_trunc('month', now()) + interval '5 days'
from generate_series(1,9) i;

-- ============================================================ DEMO LOGIN (do this once)
-- 1) Supabase → Authentication → Users → Add user (or Invite): e.g. demo@volunteerone.app
--    Copy that user's User UID.
-- 2) Paste the UID below and run THIS statement (uncomment it):
--
-- insert into club_users (club_id, user_id, role)
-- values ('de300000-0000-4000-a000-000000000001', 'PASTE-DEMO-USER-UID-HERE', 'club_admin')
-- on conflict do nothing;
--
-- That demo user should be mapped ONLY to the demo club (the app shows the first
-- club a user belongs to). Then sign in as that user to explore Riverside United FC.
