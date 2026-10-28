-- Run only on a local/disposable database with the migration applied.
-- All fixtures are synthetic, use reserved addresses, and are rolled back.
-- Execute as the database owner; assertions fail the transaction on a regression.
begin;

do $$ begin
  assert not exists(select 1 from auth.users where id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003')), 'Fixture UUID collision; stop and choose other test IDs';
end $$;

insert into auth.users(id,email,raw_user_meta_data,email_confirmed_at) values
 ('10000000-0000-4000-8000-000000000001','customer-a@security-test.invalid','{"full_name":"Security Customer A","role":"admin"}',now()),
 ('10000000-0000-4000-8000-000000000002','customer-b@security-test.invalid','{"full_name":"Security Customer B"}',now()),
 ('10000000-0000-4000-8000-000000000003','owner@security-test.invalid','{"full_name":"Security Owner"}',now());
insert into public.admin_users(user_id) values('10000000-0000-4000-8000-000000000003');
insert into public.yoga_programmes(id,content,display,availability) values
 ('security-check-programme','{"slug":"security-check-programme","title":"Security check programme","timing":"7:00 AM"}',true,'Enquiries open'),
 ('security-check-hidden','{"slug":"security-check-hidden","title":"Hidden security check","timing":"7:00 AM"}',false,'Enquiries open'),
 ('security-check-enquiry','{"slug":"security-check-enquiry","title":"Enquiry security check","timing":"7:00 AM"}',true,'Enquiries open'),
 ('security-check-paused','{"slug":"security-check-paused","title":"Paused security check","timing":"7:00 AM"}',true,'Paused');
insert into public.yoga_batches(id,programme_id,name,timing,status) values
 ('20000000-0000-4000-8000-000000000001','security-check-programme','Confirmed test batch','7:00 AM','Confirmed'),
 ('20000000-0000-4000-8000-000000000002','security-check-programme','Draft test batch','7:00 AM','Draft'),
 ('20000000-0000-4000-8000-000000000003','security-check-hidden','Other programme batch','7:00 AM','Confirmed');
insert into public.batch_access(batch_id,zoom_meeting_id,instructions) values
 ('20000000-0000-4000-8000-000000000001','SECURITY_TEST_ONLY','Synthetic private access fixture'),
 ('20000000-0000-4000-8000-000000000002','SECURITY_TEST_DRAFT','Synthetic draft access fixture');
insert into public.enquiries(id,user_id,name,email,enquiry_type,message) values
 ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','Security Customer A','customer-a@security-test.invalid','General','This is a synthetic security test enquiry.');
insert into public.enquiry_notes(enquiry_id,owner_notes) values('30000000-0000-4000-8000-000000000001','Private test owner notes');
insert into public.yoga_enrollments(id,user_id,programme_id,batch_id,enrollment_status) values
 ('40000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','security-check-programme','20000000-0000-4000-8000-000000000001','Confirmed'),
 ('40000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002','security-check-programme','20000000-0000-4000-8000-000000000001','Enrollment Pending'),
 ('40000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001','security-check-hidden',null,'Enquiry Received');
insert into public.enrollment_notes(enrollment_id,admin_notes) values('40000000-0000-4000-8000-000000000001','Private test enrollment notes');

-- Anonymous visitors see only public catalogue content, never identities or access.
set local role anon;
do $$ begin
  assert (select count(*) from public.yoga_programmes where id like 'security-check-%') = 3, 'Hidden programme leaked to anonymous visitor';
  assert (select count(*) from public.yoga_batches where id in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003')) = 1, 'Non-public batch leaked';
  begin perform 1 from public.profiles; raise exception 'Anonymous profiles readable'; exception when insufficient_privilege then null; end;
  begin perform 1 from public.batch_access; raise exception 'Anonymous Zoom details readable'; exception when insufficient_privilege then null; end;
  begin perform public.submit_enquiry('{}'::jsonb,null); raise exception 'Anonymous enquiry RPC executable'; exception when insufficient_privilege then null; end;
  begin perform public.consume_rate_limit('test',1,60); raise exception 'Anonymous rate limit RPC executable'; exception when insufficient_privilege then null; end;
end $$;
reset role;

-- User A's editable metadata does not grant admin privileges or customer B access.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
  assert not public.is_admin(), 'User metadata incorrectly grants admin';
  assert (select count(*) from public.yoga_programmes where id = 'security-check-hidden') = 1, 'Enrolled customer lost access to a hidden course';
  assert (select count(*) from public.profiles where user_id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003')) = 1, 'Customer profile isolation failed';
  assert (select count(*) from public.yoga_enrollments where id in ('40000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002')) = 1, 'Customer enrollment isolation failed';
  assert (select count(*) from public.batch_access where batch_id = '20000000-0000-4000-8000-000000000001') = 1, 'Confirmed assigned participant lacks access';
  assert (select count(*) from public.enquiry_notes where enquiry_id = '30000000-0000-4000-8000-000000000001') = 0, 'Owner notes leaked';
  assert (select count(*) from public.enrollment_notes where enrollment_id = '40000000-0000-4000-8000-000000000001') = 0, 'Admin notes leaked';
  begin insert into public.admin_users(user_id) values('10000000-0000-4000-8000-000000000001'); raise exception 'Customer self-promotion allowed'; exception when insufficient_privilege then null; end;
  begin update public.profiles set email = 'changed@security-test.invalid' where user_id = '10000000-0000-4000-8000-000000000001'; raise exception 'Customer changed provider-owned email'; exception when insufficient_privilege then null; end;
  begin perform public.submit_enquiry('{}'::jsonb,'10000000-0000-4000-8000-000000000001'); raise exception 'Authenticated enquiry RPC executable'; exception when insufficient_privilege then null; end;
end $$;
update public.profiles set phone = '+91 9000000000' where user_id = '10000000-0000-4000-8000-000000000001';
reset role;

-- Pending user B cannot see joining data or confirm their own enrollment.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.yoga_programmes where id = 'security-check-hidden') = 0, 'Unenrolled customer saw a hidden course';
  assert (select count(*) from public.batch_access where batch_id = '20000000-0000-4000-8000-000000000001') = 0, 'Pending participant saw Zoom details';
  assert (select count(*) from public.enquiries where id = '30000000-0000-4000-8000-000000000001') = 0, 'Another customer enquiry leaked';
end $$;
update public.yoga_enrollments set enrollment_status = 'Confirmed' where id = '40000000-0000-4000-8000-000000000002';
reset role;
do $$ begin
  assert (select enrollment_status from public.yoga_enrollments where id = '40000000-0000-4000-8000-000000000002') = 'Enrollment Pending', 'Customer changed own enrollment status';
  assert (select phone from public.profiles where user_id = '10000000-0000-4000-8000-000000000001') = '+91 9000000000', 'Own contact update failed';
  begin update public.yoga_enrollments set batch_id = '20000000-0000-4000-8000-000000000003' where id = '40000000-0000-4000-8000-000000000001'; raise exception 'Programme/batch mismatch accepted'; exception when foreign_key_violation then null; end;
end $$;

-- A confirmed enrollment in a Draft batch must not reveal its access details.
update public.yoga_enrollments set batch_id = '20000000-0000-4000-8000-000000000002' where id = '40000000-0000-4000-8000-000000000001';
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.batch_access where batch_id = '20000000-0000-4000-8000-000000000002') = 0, 'Draft batch revealed joining credentials';
  assert (select count(*) from public.yoga_batches where id = '20000000-0000-4000-8000-000000000002') = 1, 'Assigned customer cannot see safe batch information';
end $$;
reset role;

-- Trusted admin reads all relevant records and can edit public prices/content.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ begin
  assert public.is_admin(), 'Trusted admin not recognized';
  assert (select count(*) from public.profiles where user_id in ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003')) = 3, 'Admin cannot inspect users';
  assert (select count(*) from public.enquiry_notes where enquiry_id = '30000000-0000-4000-8000-000000000001') = 1, 'Admin notes inaccessible';
  assert (select count(*) from public.batch_access where batch_id in ('20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002')) = 2, 'Admin batch access management failed';
end $$;
update public.yoga_programmes set content = content || '{"price":"SECURITY TEST VALUE"}'::jsonb where id = 'security-check-programme';
reset role;
do $$ begin
  assert (select content->>'price' from public.yoga_programmes where id = 'security-check-programme') = 'SECURITY TEST VALUE', 'Admin content edit failed';
end $$;

-- Service RPCs are atomic, budgeted, consent validated, and never auto-confirm.
set local role service_role;
do $$
declare response jsonb; repeated jsonb; guest jsonb;
begin
  assert public.consume_rate_limit('synthetic-security-budget',2,60), 'First rate budget rejected';
  assert public.consume_rate_limit('synthetic-security-budget',2,60), 'Second rate budget rejected';
  assert not public.consume_rate_limit('synthetic-security-budget',2,60), 'Rate budget failed to reject excess';
  begin perform public.submit_enquiry('{"privacy":false}'::jsonb,null); raise exception 'Missing consent accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.submit_enquiry('{"privacy":true,"name":"Security test","email":"test@security-test.invalid","phone":"-------","message":"Synthetic validation test"}'::jsonb,null); raise exception 'Punctuation-only phone accepted'; exception when invalid_parameter_value then null; end;
  begin perform public.submit_enquiry('{"privacy":true,"name":"Security test","email":"test@security-test.invalid","phone":"9000000000","message":"Synthetic validation test","enquiry_type":"Yoga & Wellness","programme_id":"security-check-paused"}'::jsonb,null); raise exception 'Paused programme accepted enquiry'; exception when invalid_parameter_value then null; end;
  guest := public.submit_enquiry('{"privacy":true,"name":"Security Guest","email":"guest@security-test.invalid","message":"Synthetic guest enquiry for security checking.","enquiry_type":"General","source_page":"/contact/"}'::jsonb,null);
  assert guest ? 'id' and not guest ? 'enrollmentId', 'Guest enquiry created fake enrollment';
  response := public.submit_enquiry('{"privacy":true,"name":"Security Customer A","email":"customer-a@security-test.invalid","phone":"9000000000","message":"Synthetic programme enquiry for security checking.","enquiry_type":"Yoga & Wellness","programme_id":"security-check-enquiry","source_page":"/businesses/yoga-wellness/"}'::jsonb,'10000000-0000-4000-8000-000000000001');
  assert response ? 'id' and response ? 'enrollmentId', 'Customer programme enquiry did not create enrollment';
  assert (select enrollment_status from public.yoga_enrollments where id = (response->>'enrollmentId')::uuid) = 'Enquiry Received', 'Enrollment was automatically confirmed';
  repeated := public.submit_enquiry('{"privacy":true,"name":"Security Customer A","email":"customer-a@security-test.invalid","phone":"9000000000","message":"Second synthetic programme enquiry for security checking.","enquiry_type":"Yoga & Wellness","programme_id":"security-check-enquiry","source_page":"/businesses/yoga-wellness/"}'::jsonb,'10000000-0000-4000-8000-000000000001');
  assert repeated->>'enrollmentId' = response->>'enrollmentId', 'Duplicate open enrollment was created';
end $$;
reset role;

rollback;
