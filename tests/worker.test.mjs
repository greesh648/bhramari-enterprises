import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createApp} from '../worker/app.mjs';
const require=createRequire(import.meta.url);
const {yogaProgrammes}=require('../lib/yoga-programmes.ts');
const {defaultSiteSettings}=require('../lib/platform-defaults.ts');
const userId='11111111-1111-4111-8111-111111111111',otherId='22222222-2222-4222-8222-222222222222',batchId='33333333-3333-4333-8333-333333333333';
const seed={settings:defaultSiteSettings,programmes:yogaProgrammes.map(content=>({id:content.slug,content,display:true,availability:'Enquiries open'})),batches:[],reels:[],contentBlocks:[],backendConfigured:false};
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_unit_test',SUPABASE_SERVICE_ROLE_KEY:'unit-test-server-secret',RATE_LIMIT_SALT:'unit-test-only',EMAIL_DELIVERY_ENABLED:'true'};
const profile={user_id:userId,full_name:'Test customer',email:'test@example.com',phone:'9000000000',whatsapp_opt_in:false};
function setup(options={}){
  const calls=[];const state={settings:{...seed.settings},...options};const runtimeEnv={...env,...options.env};if(Object.hasOwn(options,'emailDeliveryFlag')){if(options.emailDeliveryFlag===undefined)delete runtimeEnv.EMAIL_DELIVERY_ENABLED;else runtimeEnv.EMAIL_DELIVERY_ENABLED=options.emailDeliveryFlag;}
  const upstream=async(url,init={})=>{const hostname=new URL(url).hostname;const path=new URL(url).pathname;const query=new URL(url).searchParams;const body=init.body?JSON.parse(init.body):null;calls.push({hostname,path,query,init,body});const ok=(data,headers={})=>new Response(init.method==='HEAD'?null:JSON.stringify(data),{headers:{'Content-Type':'application/json',...headers}});
    if(hostname==='graph.facebook.com')return state.whatsappFailure?new Response('{"error":"private provider detail"}',{status:500}):ok({messages:[{id:'wamid.test-only'}]});
    if(state.upstreamFailure?.path===path)return new Response(state.upstreamFailure.body||'{}',{status:state.upstreamFailure.status,headers:{'Content-Type':'application/json'}});
    if(path.endsWith('/rpc/consume_rate_limit'))return ok(state.rateAllowed!==false);
    if(path.endsWith('/auth/v1/user')){if(init.method==='PUT')return ok({id:userId});if(init.headers.Authorization==='Bearer valid-user'||init.headers.Authorization==='Bearer valid-admin'||init.headers.Authorization==='Bearer rotated-token')return ok({id:userId,email:profile.email,email_confirmed_at:'2026-10-01',user_metadata:{role:'admin'}});return new Response('{}',{status:401})}
    if(path.endsWith('/auth/v1/token')){if(state.invalidLogin)return new Response('{}',{status:400});return ok({access_token:query.get('grant_type')==='refresh_token'?'rotated-token':'valid-user',refresh_token:'new-refresh-token',expires_in:3600})}
    if(path.endsWith('/auth/v1/signup'))return ok({user:{id:userId}});
    if(path.endsWith('/auth/v1/logout')||path.endsWith('/auth/v1/recover')||path.endsWith('/auth/v1/otp'))return ok({});
    if(path.endsWith('/auth/v1/verify'))return ok({access_token:'valid-user',refresh_token:'new-refresh-token',expires_in:3600,user:state.verifiedUser||{id:userId,email_confirmed_at:'2026-10-01'}});
    if(path.endsWith('/rpc/is_admin'))return ok(init.headers.Authorization==='Bearer valid-admin');
    if(path.endsWith('/rpc/submit_enquiry')){assert.equal(body.p_payload.privacy,true,'server must forward the verified acknowledgement');if(state.saveFailure)return ok({});return ok({id:'44444444-4444-4444-8444-444444444444',...(body.p_user_id?{enrollmentId:'55555555-5555-4555-8555-555555555555'}:{})})}
    if(path.endsWith('/site_settings')){if(init.method==='PATCH')state.settings=body.content;return ok([{id:'public',content:state.settings}],{'Content-Range':'0-0/1'})}
    if(path.endsWith('/profiles'))return ok([state.profile||profile],{'Content-Range':'0-0/1'});
    if(path.endsWith('/yoga_programmes'))return ok(state.hiddenProgramme?[]:seed.programmes,{'Content-Range':'0-3/4'});
    if(path.endsWith('/yoga_enrollments'))return ok(state.enrollments||[],{'Content-Range':'*/0'});
    if(path.endsWith('/yoga_batches'))return ok(state.batches||[],{'Content-Range':'*/0'});
    if(path.endsWith('/batch_access'))return ok([{batch_id:batchId,zoom_url:'https://zoom.us/j/private-test',zoom_passcode:'private-passcode'}]);
    if(path.endsWith('/enquiries'))return ok([] ,{'Content-Range':'*/0'});
    if(path.endsWith('/social_reels')||path.endsWith('/content_blocks')||path.endsWith('/enquiry_notes')||path.endsWith('/enrollment_notes'))return ok([] ,{'Content-Range':'*/0'});
    throw Error('Unexpected upstream request: '+path);
  };
  const app=createApp({seed,fetchImpl:upstream,serveAsset:async request=>new Response('<!doctype html><html><head><title>Published title</title><meta name="description" content="Published description"><link rel="canonical" href="https://example.com/"><meta property="og:url" content="https://example.com/"></head><body>Published public shell</body></html>',{headers:{'Content-Type':'text/html'}})});
  async function request(path,{method='GET',body,cookie='',origin='https://bhramari.test',configured=true,headers={}}={}){return app.fetch(new Request('https://bhramari.test'+path,{method,headers:{...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body===undefined?undefined:JSON.stringify(body)}),configured?runtimeEnv:{});}
  return {request,calls,state};
}
const userCookie='bhramari_access=valid-user',adminCookie='bhramari_access=valid-admin';
const enquiry={name:'Test customer',email:'test@example.com',phone:'9000000000',enquiry_type:'Yoga & Wellness',programme_id:'7-day-course',message:'I would like to discuss this programme.',source_page:'/businesses/yoga-wellness/',privacy:true,whatsapp_opt_in:false,website:''};

test('yoga short URLs permanently redirect GET and HEAD to the same-origin canonical page without a backend or asset lookup',async()=>{
  const app=createApp({seed,serveAsset:async()=>assert.fail('a short URL must not render a duplicate page'),fetchImpl:async()=>assert.fail('a short URL must not call Supabase')});
  const query='?utm_source=instagram&utm_campaign=yoga%20wellness&returnTo=https%3A%2F%2Fattacker.invalid%2F&tag=a&tag=b';
  for(const origin of ['https://bhramari.vercel.app','https://wellness.example:8443','http://localhost:4173']){
    for(const path of ['/yoga','/yoga/'])for(const method of ['GET','HEAD'])for(const runtimeEnv of [{},env]){
      const response=await app.fetch(new Request(origin+path+query,{method,headers:{Cookie:'bhramari_access=forged;bhramari_refresh=expired'}}),runtimeEnv);
      assert.equal(response.status,308);assert.equal(response.headers.get('Location'),origin+'/businesses/yoga-wellness/'+query);
      assert.equal(await response.text(),'');assert.equal(response.headers.getSetCookie().length,0);
      assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
    }
  }
});

test('yoga short URLs keep unsupported methods and mutation origin protection unchanged',async()=>{
  const s=setup();
  for(const path of ['/yoga','/yoga/']){
    for(const method of ['POST','PATCH','PUT','DELETE','OPTIONS']){
      const response=await s.request(path,{method});
      assert.equal(response.status,405);assert.equal(response.headers.get('Location'),null);assert.equal(response.headers.getSetCookie().length,0);
    }
    for(const options of [{origin:'https://attacker.invalid'},{headers:{'Sec-Fetch-Site':'cross-site'}}]){
      const response=await s.request(path,{method:'POST',...options});
      assert.equal(response.status,403);assert.equal((await response.json()).code,'ORIGIN_REJECTED');assert.equal(response.headers.get('Location'),null);
    }
  }
  assert.equal(s.calls.length,0);
});

test('yoga short URL matching does not broaden to other paths or bypass private-page authorization',async()=>{
  const s=setup();
  for(const path of ['/yoga/index.html','/yoga/7-day-course/','/yogatherapy/']){
    const response=await s.request(path,{configured:false});assert.equal(response.status,200);assert.equal(response.headers.get('Location'),null);
  }
  for(const path of ['/account/','/admin/']){
    let response=await s.request(path,{configured:false});assert.equal(response.status,503);assert.equal(response.headers.get('Location'),null);
    response=await s.request(path);assert.equal(response.status,303);assert.equal(new URL(response.headers.get('Location')).pathname,'/login/');assert.equal(response.headers.get('Cache-Control'),'no-store');
  }
  assert.equal(s.calls.length,0);
});

test('unconfigured public site has truthful fallbacks and no fake save/auth',async()=>{const s=setup();let r=await s.request('/api/config',{configured:false});assert.equal((await r.json()).data.configured,false);r=await s.request('/api/public',{configured:false});assert.equal((await r.json()).data.programmes.length,4);r=await s.request('/api/enquiries',{method:'POST',body:enquiry,configured:false});assert.equal(r.status,503);assert.match((await r.json()).error,/Requires backend configuration/);assert.equal(s.calls.length,0)});
test('optional public identity never treats missing configuration as an error',async()=>{const s=setup();const r=await s.request('/api/me?optional=1',{configured:false});assert.equal(r.status,200);assert.equal((await r.json()).data,null)});
test('protected pages including export/RSC variants fail closed without backend',async()=>{const s=setup();for(const path of ['/account/','/account/index.html','/admin/','/admin/__next.admin.txt','/%61dmin/']){const r=await s.request(path,{configured:false});assert.equal(r.status,503);assert.match(await r.text(),/Requires backend configuration/);assert.equal(r.headers.get('Cache-Control'),'no-store')}});
test('anonymous protected pages redirect to login and admin APIs deny access',async()=>{const s=setup();let r=await s.request('/account/');assert.equal(r.status,303);assert.match(r.headers.get('Location'),/login/);r=await s.request('/api/admin/programmes');assert.equal(r.status,401);assert.equal(s.calls.length,0)});
test('customer cannot become admin through metadata or a body role',async()=>{const s=setup();let r=await s.request('/api/me',{cookie:userCookie});assert.equal((await r.json()).data.role,'customer');r=await s.request('/api/admin/settings/public',{method:'PATCH',cookie:userCookie,body:{role:'admin',content:seed.settings}});assert.equal(r.status,403);assert(!s.calls.some(c=>c.init.method==='PATCH'))});
test('forged or expired access token cannot open a private page',async()=>{const s=setup();const r=await s.request('/admin/',{cookie:'bhramari_access=forged-admin'});assert.equal(r.status,303);assert(r.headers.getSetCookie().every(c=>c.includes('Max-Age=0')))});
test('verified admin calls use user JWT and RLS, never a service-role bypass',async()=>{const s=setup();const r=await s.request('/api/admin/programmes',{cookie:adminCookie});assert.equal(r.status,200);const q=s.calls.find(c=>c.path.endsWith('/yoga_programmes'));assert.equal(q.init.headers.Authorization,'Bearer valid-admin');assert.equal(q.init.headers.apikey,env.SUPABASE_PUBLISHABLE_KEY)});
test('cross-origin mutations are rejected before any upstream call',async()=>{const s=setup();const r=await s.request('/api/enquiries',{method:'POST',origin:'https://attacker.invalid',body:enquiry});assert.equal(r.status,403);assert.equal(s.calls.length,0)});
test('login uses secure HttpOnly cookies and never returns tokens to JS',async()=>{const s=setup();const r=await s.request('/api/auth/login',{method:'POST',body:{email:'test@example.com',password:'test-password-long'}});assert.equal(r.status,200);assert(!JSON.stringify(await r.json()).includes('valid-user'));const cookies=r.headers.getSetCookie();assert.equal(cookies.length,2);for(const c of cookies){assert(c.includes('HttpOnly'));assert(c.includes('SameSite=Lax'));assert(c.includes('Secure'))}});
test('failed login does not mint a session',async()=>{const s=setup({invalidLogin:true});const r=await s.request('/api/auth/login',{method:'POST',body:{email:'test@example.com',password:'incorrect-password'}});assert.equal(r.status,400);assert.equal(r.headers.getSetCookie().length,0)});
test('refresh rotates cookies and verifies the resulting identity',async()=>{const s=setup();const r=await s.request('/api/me',{cookie:'bhramari_access=expired;bhramari_refresh=old-refresh'});assert.equal(r.status,200);assert(r.headers.getSetCookie().some(c=>c.includes('rotated-token')));assert(s.calls.some(c=>c.path.endsWith('/auth/v1/user')&&c.init.headers.Authorization==='Bearer rotated-token'))});
test('logout clears local session even when backend is unconfigured',async()=>{const s=setup();const r=await s.request('/api/auth/logout',{method:'POST',configured:false});assert.equal(r.status,200);assert.equal(r.headers.getSetCookie().length,2);assert(r.headers.getSetCookie().every(c=>c.includes('Max-Age=0')))});
test('sign-up awaits real verification and does not manually store passwords',async()=>{const s=setup();const r=await s.request('/api/auth/register',{method:'POST',body:{full_name:'Test customer',email:'test@example.com',phone:'+919000000000',password:'long-secure-password',privacy:true,whatsapp_opt_in:false,role:'admin'}});assert.equal((await r.json()).data.verificationRequired,true);const call=s.calls.find(c=>c.path.endsWith('/signup'));assert.equal(call.body.data.role,undefined);assert(!s.calls.some(c=>c.path.endsWith('/profiles')&&c.init.method==='POST'))});
test('signup and recovery provider failures return a safe retryable error without a session or false success',async()=>{
  const diagnostic='SMTP 535 private-credential-marker '+env.SUPABASE_SERVICE_ROLE_KEY;
  for(const [route,upstreamPath] of [['register','signup'],['recover','recover']]){
    for(const status of [500,503]){
      const s=setup({upstreamFailure:{path:'/auth/v1/'+upstreamPath,status,body:status===500?JSON.stringify({code:'unexpected_failure',msg:diagnostic,access_token:'private-access-marker',refresh_token:'private-refresh-marker'}):diagnostic}});
      const response=await s.request('/api/auth/'+route,{method:'POST',body:{full_name:'Test customer',email:'test@example.com',phone:'+919000000000',password:'long-secure-password',privacy:true}});
      assert.equal(response.status,503);assert.equal(response.headers.getSetCookie().length,0);
      const raw=await response.text();const result=JSON.parse(raw);
      assert.deepEqual(result,{error:'Account email delivery is temporarily unavailable. Please try again later or contact Bhramari.',code:'EMAIL_DELIVERY_FAILED'});
      for(const sensitive of [diagnostic,env.SUPABASE_SERVICE_ROLE_KEY,'unexpected_failure','private-access-marker','private-refresh-marker'])assert(!raw.includes(sensitive));
      assert.equal(result.data,undefined);assert.equal(result.verificationRequired,undefined);
      assert(s.calls.some(call=>call.path==='/auth/v1/'+upstreamPath));
    }
  }
});
test('email provider error bodies are cancelled even when stream cleanup rejects',async()=>{
  for(const rejects of [false,true]){
    let cancelled=false;
    const body=new ReadableStream({cancel(){cancelled=true;if(rejects)return Promise.reject(new Error('private cancellation diagnostic'));}});
    const s=setup({upstreamFailure:{path:'/auth/v1/signup',status:500,body}});
    const response=await s.request('/api/auth/register',{method:'POST',body:{full_name:'Test customer',email:'test@example.com',phone:'+919000000000',password:'long-secure-password',privacy:true}});
    assert.equal(cancelled,true);assert.equal(response.status,503);assert.equal(response.headers.getSetCookie().length,0);
    assert.deepEqual(await response.json(),{error:'Account email delivery is temporarily unavailable. Please try again later or contact Bhramari.',code:'EMAIL_DELIVERY_FAILED'});
  }
});
test('email delivery error mapping preserves existing authorization, throttling and unrelated provider errors',async()=>{
  for(const route of ['register','recover']){
    for(const status of [400,401,403,429]){
      const s=setup({upstreamFailure:{path:'/auth/v1/'+(route==='register'?'signup':'recover'),status}});
      const response=await s.request('/api/auth/'+route,{method:'POST',body:{full_name:'Test customer',email:'test@example.com',phone:'+919000000000',password:'long-secure-password',privacy:true}});
      assert.equal(response.status,status);assert.equal((await response.json()).code,'UPSTREAM_REQUEST_FAILED');assert.equal(response.headers.getSetCookie().length,0);
    }
  }
  for(const upstreamPath of ['/rest/v1/rpc/consume_rate_limit','/auth/v1/token']){
    const s=setup({upstreamFailure:{path:upstreamPath,status:500}});
    const response=await s.request('/api/auth/login',{method:'POST',body:{email:'test@example.com',password:'long-secure-password'}});
    assert.equal(response.status,400);assert.equal((await response.json()).code,'UPSTREAM_REQUEST_FAILED');assert.equal(response.headers.getSetCookie().length,0);
  }
});
test('short passwords and missing registration consent are rejected',async()=>{for(const body of [{privacy:false,password:'long-password-123'},{privacy:true,password:'short'}]){const s=setup();const r=await s.request('/api/auth/register',{method:'POST',body:{full_name:'Test',email:'test@example.com',phone:'+919000000000',...body}});assert.equal(r.status,400);assert(!s.calls.some(c=>c.path.endsWith('/signup')))}});
test('phone OTP does not run until explicitly configured',async()=>{const s=setup();const r=await s.request('/api/auth/otp',{method:'POST',body:{phone:'+919000000000'}});assert.equal(r.status,503);assert(!s.calls.some(c=>c.path.endsWith('/otp')))});
test('enquiry validation blocks missing consent, spam traps and punctuation-only phone',async()=>{for(const changes of [{privacy:false},{website:'spam'},{phone:'-------'},{programme_id:'not-a-programme'},{message:'short'}]){const s=setup();const r=await s.request('/api/enquiries',{method:'POST',body:{...enquiry,...changes}});assert.equal(r.status,400);assert(!s.calls.some(c=>c.path.endsWith('/submit_enquiry')))}});
test('guest enquiry saves only after server validation and never trusts client user_id',async()=>{const s=setup();const r=await s.request('/api/enquiries',{method:'POST',body:{...enquiry,user_id:otherId,enrollment_status:'Confirmed'}});assert.equal(r.status,201);const data=(await r.json()).data;assert(data.id);assert.equal(data.enrollmentId,undefined);const call=s.calls.find(c=>c.path.endsWith('/submit_enquiry'));assert.equal(call.body.p_user_id,null);assert.equal(call.body.p_payload.enrollment_status,undefined);assert.equal(call.init.headers.apikey,env.SUPABASE_SERVICE_ROLE_KEY)});
test('authenticated enquiry binds only the server-verified customer identity',async()=>{const s=setup();const r=await s.request('/api/enquiries',{method:'POST',cookie:userCookie,body:{...enquiry,user_id:otherId}});assert.equal(r.status,201);assert.equal(s.calls.find(c=>c.path.endsWith('/submit_enquiry')).body.p_user_id,userId);assert((await r.json()).data.enrollmentId)});
test('rate-limit rejection prevents any enquiry insert',async()=>{const s=setup({rateAllowed:false});const r=await s.request('/api/enquiries',{method:'POST',body:enquiry});assert.equal(r.status,429);assert(!s.calls.some(c=>c.path.endsWith('/submit_enquiry')))});
test('a provider response without a saved ID is not presented as a save',async()=>{const s=setup({saveFailure:true});const r=await s.request('/api/enquiries',{method:'POST',body:enquiry});assert.equal(r.status,502);assert.equal((await r.json()).code,'SAVE_NOT_CONFIRMED')});
test('pending enrollment never triggers a private Zoom query',async()=>{const s=setup({enrollments:[{id:otherId,user_id:userId,programme_id:'7-day-course',batch_id:batchId,enrollment_status:'Enrollment Pending'}],batches:[{id:batchId,status:'Confirmed'}]});const r=await s.request('/api/account',{cookie:userCookie});assert.equal(r.status,200);assert.equal((await r.json()).data.joiningDetails.length,0);assert(!s.calls.some(c=>c.path.endsWith('/batch_access')))});
test('only matching confirmed enrollment and batch fetch private joining data',async()=>{const s=setup({enrollments:[{id:otherId,user_id:userId,programme_id:'7-day-course',batch_id:batchId,enrollment_status:'Confirmed'}],batches:[{id:batchId,status:'Confirmed'}]});const r=await s.request('/api/account',{cookie:userCookie});assert.equal((await r.json()).data.joiningDetails[0].batch_id,batchId);assert.equal(s.calls.find(c=>c.path.endsWith('/batch_access')).init.headers.Authorization,'Bearer valid-user')});
test('profile edits cannot change email, owner role or another customer',async()=>{const s=setup();const r=await s.request('/api/account/profile',{method:'PATCH',cookie:userCookie,body:{full_name:'Updated name',phone:'9000000000',whatsapp_opt_in:false,email:'other@example.com',user_id:otherId,role:'admin'}});assert.equal(r.status,200);const call=s.calls.find(c=>c.path.endsWith('/profiles')&&c.init.method==='PATCH');assert.equal(call.query.get('user_id'),'eq.'+userId);assert.deepEqual(Object.keys(call.body).sort(),['full_name','phone','whatsapp_opt_in'])});
test('admin cannot accidentally confirm without assigning a batch',async()=>{const s=setup();const r=await s.request('/api/admin/enrollments/'+otherId,{method:'PATCH',cookie:adminCookie,body:{enrollment_status:'Confirmed',batch_id:null}});assert.equal(r.status,400);assert(!s.calls.some(c=>c.path.endsWith('/yoga_enrollments')&&c.init.method==='PATCH'))});
test('public API never queries or includes batch credentials',async()=>{const s=setup();const r=await s.request('/api/public');assert.equal(r.status,200);const raw=await r.text();assert(!raw.includes('private-passcode'));assert(!raw.includes(env.SUPABASE_SERVICE_ROLE_KEY));assert(!s.calls.some(c=>c.path.endsWith('/batch_access')))});
test('admin settings changes are immediately available without a rebuild',async()=>{const s=setup();const changed={...seed.settings,publicPhone:'+919000000000',announcement:'A new batch notice',seoTitle:'Updated Bhramari title'};let r=await s.request('/api/admin/settings/public',{method:'PATCH',cookie:adminCookie,body:{content:changed}});assert.equal(r.status,200);r=await s.request('/api/public');assert.equal((await r.json()).data.settings.announcement,changed.announcement);r=await s.request('/');assert.match(await r.text(),/<title>Updated Bhramari title<\/title>/)});
test('unsafe Instagram/website URLs are rejected in settings',async()=>{const s=setup();const r=await s.request('/api/admin/settings/public',{method:'PATCH',cookie:adminCookie,body:{content:{...seed.settings,instagramUrl:'javascript:alert(1)'}}});assert.equal(r.status,400);assert(!s.calls.some(c=>c.path.endsWith('/site_settings')&&c.init.method==='PATCH'))});
test('a hidden programme is removed from public direct-page serving',async()=>{const s=setup({hiddenProgramme:true});const r=await s.request('/businesses/yoga-wellness/7-day-course/');assert.equal(r.status,404)});
test('no mutation accepts an unbounded body',async()=>{const s=setup();const r=await s.request('/api/enquiries',{method:'POST',body:{...enquiry,message:'a'.repeat(70000)}});assert.equal(r.status,413);assert(!s.calls.some(c=>c.path.endsWith('/submit_enquiry')))});

test('email-delivery readiness is independent from password login availability',async()=>{
  const s=setup({emailDeliveryFlag:'false'});const response=await s.request('/api/config');const config=(await response.json()).data;
  assert.equal(config.configured,true);assert.equal(config.emailAuthEnabled,true);assert.equal(config.emailDeliveryEnabled,false);assert.equal(s.calls.length,0);
  const unconfigured=await s.request('/api/config',{configured:false});const missing=(await unconfigured.json()).data;
  assert.equal(missing.emailAuthEnabled,false);assert.equal(missing.emailDeliveryEnabled,false);
});

test('missing or unverified email delivery cannot create users or request recovery mail',async()=>{
  for(const emailDeliveryFlag of [undefined,'false','TRUE']){
    const s=setup({emailDeliveryFlag});
    const registration=await s.request('/api/auth/register',{method:'POST',body:{full_name:'Test customer',email:'test@example.com',phone:'+919000000000',password:'long-secure-password',privacy:true,whatsapp_opt_in:false}});
    assert.equal(registration.status,503);const result=await registration.json();assert.equal(result.code,'EMAIL_DELIVERY_NOT_CONFIGURED');assert.equal(result.data,undefined);assert.equal(registration.headers.getSetCookie().length,0);
    const recovery=await s.request('/api/auth/recover',{method:'POST',body:{email:'test@example.com'}});
    assert.equal(recovery.status,503);assert.equal((await recovery.json()).code,'EMAIL_DELIVERY_NOT_CONFIGURED');assert.equal(recovery.headers.getSetCookie().length,0);
    assert.equal(s.calls.length,0,'disabled email flow must not call Auth or database rate functions');
  }
});

test('existing password and verified administrator access work with email delivery disabled',async()=>{
  const s=setup({emailDeliveryFlag:'false'});let response=await s.request('/api/auth/login',{method:'POST',body:{email:'test@example.com',password:'existing-long-password'}});
  assert.equal(response.status,200);assert.equal((await response.json()).data.signedIn,true);assert.equal(response.headers.getSetCookie().length,2);assert(s.calls.some(call=>call.path.endsWith('/auth/v1/token')));
  response=await s.request('/api/me',{cookie:adminCookie});assert.equal(response.status,200);assert.equal((await response.json()).data.role,'admin');
  assert(!s.calls.some(call=>call.path.endsWith('/signup')||call.path.endsWith('/recover')));
});

test('explicitly configured email delivery permits a real provider recovery request',async()=>{
  const s=setup();let response=await s.request('/api/config');assert.equal((await response.json()).data.emailDeliveryEnabled,true);
  response=await s.request('/api/auth/recover',{method:'POST',body:{email:'test@example.com'}});assert.equal(response.status,200);assert.equal((await response.json()).data.requested,true);assert(s.calls.some(call=>call.path.endsWith('/auth/v1/recover')));
});

test('delivery gate preserves validation of an existing provider confirmation link',async()=>{
  const s=setup({emailDeliveryFlag:'false'});const response=await s.request('/api/auth/confirm?token_hash=existing-valid-token-hash&type=email');
  assert.equal(response.status,303);assert.equal(response.headers.getSetCookie().length,2);assert(s.calls.some(call=>call.path.endsWith('/auth/v1/verify')));
});

const whatsappEnv={WHATSAPP_REGISTRATION_ENABLED:'true',WHATSAPP_ACCESS_TOKEN:'server-only-whatsapp-fixture',WHATSAPP_PHONE_NUMBER_ID:'123456789',WHATSAPP_API_VERSION:'v99.0',WHATSAPP_WELCOME_TEMPLATE:'bhramari_registration',WHATSAPP_TEMPLATE_LANGUAGE:'en'};
const consentingProfile={...profile,phone:'+91 90000 00000',whatsapp_opt_in:true};
const confirmSignup='/api/auth/confirm?token_hash=valid-signup-token-hash&type=signup';
const metaCalls=s=>s.calls.filter(c=>c.hostname==='graph.facebook.com');

test('verified signup requests the approved WhatsApp template only for the consenting profile',async()=>{
  const s=setup({env:whatsappEnv,profile:consentingProfile});const response=await s.request(confirmSignup);
  assert.equal(response.status,303);assert.equal(new URL(response.headers.get('Location')).pathname,'/account/');
  assert(response.headers.getSetCookie().every(c=>c.includes('HttpOnly')));
  assert.equal(metaCalls(s).length,1);const call=metaCalls(s)[0];
  assert.equal(call.path,'/v99.0/123456789/messages');assert.equal(call.init.headers.Authorization,'Bearer server-only-whatsapp-fixture');
  assert.deepEqual(call.body,{messaging_product:'whatsapp',recipient_type:'individual',to:'919000000000',type:'template',template:{name:'bhramari_registration',language:{code:'en'}}});
  const read=s.calls.find(c=>c.path.endsWith('/profiles'));assert.equal(read.query.get('user_id'),'eq.'+userId);assert.equal(read.init.headers.Authorization,'Bearer valid-user');
  const budget=s.calls.find(c=>c.path.endsWith('/consume_rate_limit'));assert.equal(budget.body.p_limit,1);assert.equal(budget.body.p_window_seconds,86400);
});

test('unconfigured, opted-out, unverified, mismatched and invalid-phone profiles cannot receive automatic WhatsApp',async()=>{
  const cases=[{}, {env:{...whatsappEnv,WHATSAPP_ACCESS_TOKEN:''},profile:consentingProfile}, {env:whatsappEnv}, {env:whatsappEnv,profile:{...consentingProfile,phone:'9000000000'}}, {env:whatsappEnv,profile:{...consentingProfile,user_id:otherId}}, {env:whatsappEnv,profile:consentingProfile,verifiedUser:{id:userId}}];
  for(const options of cases){const s=setup(options);assert.equal((await s.request(confirmSignup)).status,303);assert.equal(metaCalls(s).length,0);}
});

test('recovery and ordinary email verification never send a registration welcome',async()=>{
  for(const type of ['recovery','email']){const s=setup({env:whatsappEnv,profile:consentingProfile});assert.equal((await s.request('/api/auth/confirm?token_hash=valid-verification-token&type='+type)).status,303);assert.equal(metaCalls(s).length,0);}
});

test('a pending signup does not send a WhatsApp message and opted-in numbers need a country code',async()=>{
  const s=setup({env:whatsappEnv,profile:consentingProfile});const body={full_name:'Test customer',email:'test@example.com',phone:'+919000000000',password:'test-only-long-password',privacy:true,whatsapp_opt_in:true};
  let response=await s.request('/api/auth/register',{method:'POST',body});assert.equal(response.status,200);assert.equal((await response.json()).data.verificationRequired,true);assert.equal(metaCalls(s).length,0);
  response=await s.request('/api/auth/register',{method:'POST',body:{...body,phone:'9000000000'}});assert.equal(response.status,400);assert.match((await response.json()).error,/country code/);
});

test('WhatsApp provider failure or an exhausted per-account budget does not undo confirmation',async()=>{
  for(const options of [{whatsappFailure:true},{rateAllowed:false}]){const s=setup({env:whatsappEnv,profile:consentingProfile,...options});const response=await s.request(confirmSignup);assert.equal(response.status,303);assert.equal(response.headers.getSetCookie().length,2);assert.equal(metaCalls(s).length,options.rateAllowed===false?0:1);assert.doesNotMatch(await response.text(),/private provider detail|server-only-whatsapp-fixture/);}
});

test('public configuration exposes WhatsApp readiness without credentials',async()=>{
  for(const options of [{},{env:whatsappEnv},{env:{...whatsappEnv,WHATSAPP_PHONE_NUMBER_ID:''}}]){const s=setup(options);const response=await s.request('/api/config');const body=await response.text();const data=JSON.parse(body).data;assert.equal(data.whatsappRegistrationEnabled,options.env===whatsappEnv);assert.doesNotMatch(body,/server-only-whatsapp-fixture|WHATSAPP_ACCESS_TOKEN|123456789/);}
});
