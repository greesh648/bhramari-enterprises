/** Bhramari server boundary. Supabase tokens and privileged keys never reach JavaScript clients.
 * Database RLS remains authoritative for every authenticated customer/admin operation.
 */
export function createApp({serveAsset,seed,fetchImpl=fetch}) {
  const mutableMethods=new Set(['POST','PATCH','PUT','DELETE']);
  const enquiryTypes=new Set(['General','Yoga & Wellness','Skill Development & Training','Agriculture & Livelihoods','CSR & Project Implementation','Consultancy','Consultancy Services','Food Products','Partnership','Other']);
  const tables={programmes:'yoga_programmes',batches:'yoga_batches',enquiries:'enquiries',users:'profiles',enrollments:'yoga_enrollments',settings:'site_settings',reels:'social_reels',content:'content_blocks'};
  const programmeIds=new Set(seed.programmes.map(p=>p.id));
  const accessCookie='bhramari_access',refreshCookie='bhramari_refresh';
  const json=(data,status=200)=>new Response(JSON.stringify({data}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  const problem=(message,status=400,code='INVALID_REQUEST')=>Object.assign(new Error(message),{status,code});
  const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
  const text=(value,max=5000)=>typeof value==='string'?value.trim().slice(0,max):'';
  function configured(env){return Boolean(env.SUPABASE_URL&&env.SUPABASE_PUBLISHABLE_KEY&&env.SUPABASE_SERVICE_ROLE_KEY)}
  function emailDeliveryEnabled(env){return configured(env)&&env.EMAIL_DELIVERY_ENABLED==='true'}
  function requireBackend(env){if(!configured(env))throw problem('Requires backend configuration. Connect Supabase before using accounts or saving enquiries.',503,'BACKEND_NOT_CONFIGURED')}
  function safeReturn(value,fallback='/account/'){return typeof value==='string'&&/^\/(?!\/)/.test(value)&&!/[\\\r\n]/.test(value)?value:fallback}
  function safeURL(value,hosts=null,allowEmpty=true){if(!value&&allowEmpty)return '';try{const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||hosts&&!hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h)))throw Error();return u.href}catch{throw problem('Please enter a valid secure URL for this service.')}}
  function phone(value,required=false){const p=text(value,25);const count=p.replace(/\D/g,'').length;if(!p&&!required)return '';if(!/^[+()\d\s-]{7,25}$/.test(p)||count<7||count>15)throw problem('Please enter a phone number containing 7 to 15 digits.');return p}
  function email(value){const e=text(value,254).toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))throw problem('Please enter a valid email address.');return e}
  function bounded(value,min,max,label){if(typeof value!=='string'||value.trim().length<min||value.length>max)throw problem('Please check '+label+'.');return value.trim()}
  function listStrings(value,max=12){if(!Array.isArray(value)||value.length>max||value.some(x=>typeof x!=='string'||x.length>600))throw problem('Please check the list content.');return value.map(x=>x.trim())}
  function faqs(value){if(!Array.isArray(value)||value.length>30)throw problem('Please use up to 30 FAQ entries.');return value.map(f=>({question:bounded(f.question,2,250,'the FAQ question'),answer:bounded(f.answer,2,2000,'the FAQ answer')}))}
  function cookieMap(request){return Object.fromEntries((request.headers.get('cookie')||'').split(';').map(pair=>{const i=pair.indexOf('=');if(i<0)return['',''];try{return[pair.slice(0,i).trim(),decodeURIComponent(pair.slice(i+1))]}catch{return['','']}}))}
  function cookie(name,value,maxAge,secure){return name+'='+encodeURIComponent(value)+'; Path=/; HttpOnly; SameSite=Lax; Max-Age='+maxAge+(secure?'; Secure':'')}
  function setSession(context,result,request){if(!result.access_token||!result.refresh_token)throw problem('The authentication service did not establish a session.',502,'AUTH_SERVICE_ERROR');const secure=new URL(request.url).protocol==='https:';context.cookies.push(cookie(accessCookie,result.access_token,Math.max(60,Math.min(Number(result.expires_in)||3600,86400)),secure),cookie(refreshCookie,result.refresh_token,604800,secure));context.token=result.access_token}
  function clearSession(context,request){const secure=new URL(request.url).protocol==='https:';context.cookies.push(cookie(accessCookie,'',0,secure),cookie(refreshCookie,'',0,secure))}
  async function supabase(env,path,{method='GET',body,token,service=false,headers={}}={}){
    const key=service?env.SUPABASE_SERVICE_ROLE_KEY:env.SUPABASE_PUBLISHABLE_KEY;
    let response;try{response=await fetchImpl(env.SUPABASE_URL.replace(/\/$/,'')+path,{method,headers:{apikey:key,...(token?{Authorization:'Bearer '+token}:service&&key.startsWith('eyJ')?{Authorization:'Bearer '+key}:{}),'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(15000)})}catch{throw problem('The account service is temporarily unavailable. Please try again.',502,'UPSTREAM_UNAVAILABLE')}
    if(method==='POST'&&/^\/auth\/v1\/(?:signup|recover)(?:\?|$)/.test(path)&&response.status>=500){
      try{await response.body?.cancel()}catch{ /* Keep the safe email error if stream cleanup fails. */ }
      throw problem('Account email delivery is temporarily unavailable. Please try again later or contact Bhramari.',503,'EMAIL_DELIVERY_FAILED');
    }
    let data=null;if(method!=='HEAD'){const raw=await response.text();if(raw){try{data=JSON.parse(raw)}catch{throw problem('The account service returned an unexpected response.',502,'UPSTREAM_ERROR')}}}
    if(!response.ok){const status=response.status===429?429:response.status===401?401:response.status===403?403:400;const errors={401:'Please sign in again.',403:'You do not have permission to perform this action.',429:'Too many attempts. Please wait before trying again.'};throw problem(errors[status]||'The request could not be completed. Check your information and backend setup.',status,'UPSTREAM_REQUEST_FAILED')}
    return {data,response};
  }
  async function identity(request,env,context){
    if(context.identityChecked)return context.user;
    context.identityChecked=true;const cookies=cookieMap(request);let token=cookies[accessCookie];
    if(!token&&!cookies[refreshCookie])return null;
    if(token){try{const {data}=await supabase(env,'/auth/v1/user',{token});if(data?.id){context.token=token;context.user=data;return data}}catch(error){if(error.status!==401)throw error}}
    if(cookies[refreshCookie]){try{const {data}=await supabase(env,'/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:cookies[refreshCookie]}});setSession(context,data,request);const verified=await supabase(env,'/auth/v1/user',{token:context.token});if(verified.data?.id){context.user=verified.data;return context.user}}catch(error){if(error.status>=500)throw error}}
    clearSession(context,request);return null;
  }
  async function requireUser(request,env,context){requireBackend(env);const user=await identity(request,env,context);if(!user)throw problem('Please log in to access your Bhramari account.',401,'AUTH_REQUIRED');if(!user.email_confirmed_at&&!user.phone_confirmed_at)throw problem('Please verify your email or mobile number before continuing.',403,'VERIFICATION_REQUIRED');return user}
  async function isAdmin(env,context){const {data}=await supabase(env,'/rest/v1/rpc/is_admin',{method:'POST',token:context.token,body:{}});return data===true}
  async function requireAdmin(request,env,context){const user=await requireUser(request,env,context);if(!await isAdmin(env,context))throw problem('Administrator access is required.',403,'ADMIN_REQUIRED');return user}
  async function rows(env,table,query='',token){return (await supabase(env,'/rest/v1/'+table+'?'+query,{token})).data||[]}
  async function rate(request,env,action,limit=10,seconds=900,extra=''){
    const ip=request.headers.get('CF-Connecting-IP')||'local';const bytes=new TextEncoder().encode((env.RATE_LIMIT_SALT||env.SUPABASE_SERVICE_ROLE_KEY)+':'+action+':'+(extra||ip));const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),n=>n.toString(16).padStart(2,'0')).join('');
    const {data}=await supabase(env,'/rest/v1/rpc/consume_rate_limit',{method:'POST',service:true,body:{p_key:hash,p_limit:limit,p_window_seconds:seconds}});if(data!==true)throw problem('Too many attempts. Please wait before trying again.',429,'RATE_LIMITED');
  }
  async function turnstile(request,env,token){if(!env.TURNSTILE_SECRET_KEY)return;if(!token)throw problem('Please complete the security check.',400,'CAPTCHA_REQUIRED');let result;try{const r=await fetchImpl('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get('CF-Connecting-IP')||undefined}),signal:AbortSignal.timeout(10000)});result=await r.json()}catch{throw problem('The security check is temporarily unavailable.',502,'CAPTCHA_UNAVAILABLE')}if(!result.success)throw problem('The security check could not be verified. Please try again.',400,'CAPTCHA_FAILED')}
  async function bodyOf(request){const length=Number(request.headers.get('content-length')||0);if(length>65536)throw problem('This request is too large.',413);if(!request.headers.get('content-type')?.includes('application/json'))throw problem('Send this request as JSON.',415);let raw='';let received=0;const reader=request.body?.getReader();const decoder=new TextDecoder();if(reader){while(true){const chunk=await reader.read();if(chunk.done)break;received+=chunk.value.byteLength;if(received>65536){await reader.cancel();throw problem('This request is too large.',413)}raw+=decoder.decode(chunk.value,{stream:true})}raw+=decoder.decode();}let value;try{value=JSON.parse(raw)}catch{throw problem('The request could not be read.')};if(!value||typeof value!=='object'||Array.isArray(value))throw problem('The request could not be read.');return value}
  function publicFallback(){return {...structuredClone(seed),backendConfigured:false}}
  async function publicContent(env){
    if(!configured(env))return publicFallback();
    const [settings,programmes,batches,reels,blocks]=await Promise.all([rows(env,'site_settings','id=eq.public&select=content'),rows(env,'yoga_programmes','display=eq.true&select=id,content,display,availability,updated_at&order=id'),rows(env,'yoga_batches','status=in.(Open,Confirmed)&select=id,programme_id,name,start_date,end_date,timing,capacity,status&order=start_date'),rows(env,'social_reels','published=eq.true&order=display_order&limit=6'),rows(env,'content_blocks','select=id,title,body,faqs')]);
    return {settings:validSettings({...seed.settings,...(settings[0]?.content||{})}),programmes:programmes.map(p=>({...p,content:validProgramme(p.content,p.id)})).sort((a,b)=>seed.programmes.findIndex(p=>p.id===a.id)-seed.programmes.findIndex(p=>p.id===b.id)),batches,reels:reels.map(r=>({id:r.id,...validReel(r)})),contentBlocks:blocks,backendConfigured:true};
  }
  function validSettings(value){
    if(!value||typeof value!=='object')throw problem('Please check the site settings.');const output={...seed.settings};
    for(const k of ['brandName','whatsappDefaultMessage','businessHours','announcement','zoomStatement','seoTitle','seoDescription'])output[k]=text(value[k],k==='announcement'?1000:1000);
    output.brandName=bounded(output.brandName,2,100,'the brand name');output.publicPhone=phone(value.publicPhone);output.publicEmail=value.publicEmail?email(value.publicEmail):'';output.whatsappNumber=text(value.whatsappNumber,25).replace(/[+\s()-]/g,'');if(output.whatsappNumber&&!/^\d{8,15}$/.test(output.whatsappNumber))throw problem('Use the WhatsApp number with its country code.');output.instagramUrl=safeURL(text(value.instagramUrl,500),['instagram.com']);output.siteUrl=safeURL(text(value.siteUrl,500));if(output.siteUrl)output.siteUrl=new URL(output.siteUrl).origin;output.socialLinks=Array.isArray(value.socialLinks)?value.socialLinks.slice(0,8).map(s=>({label:bounded(s.label,1,100,'a social link label'),url:safeURL(s.url,null,false)})):[];return output;
  }
  function validProgramme(value,id){
    if(!value||typeof value!=='object')throw problem('Please check the programme content.');const result={slug:id};
    for(const key of ['title','shortTitle','duration','timing','shortDescription','description','audience'])result[key]=bounded(value[key],key==='title'||key==='timing'?2:1,({title:150,shortTitle:160,duration:80,timing:100,shortDescription:500,description:6000,audience:2000})[key],'the programme '+key);
    result.price=value.price===null||!value.price?null:bounded(value.price,1,150,'the programme price');if(!['seated','tree','warrior','dancer'].includes(value.illustration))throw problem('Choose a supported illustration.');result.illustration=value.illustration;const image=value.image||{};const src=text(image.src,1500);if(src&&!src.startsWith('/images/'))safeURL(src,null,false);result.image={src,alt:bounded(image.alt||result.title,1,300,'the image description')};for(const k of ['highlights','suitableFor','requirements'])result[k]=listStrings(value[k],20);result.faqs=faqs(value.faqs);if(!Array.isArray(value.curriculum)||value.curriculum.length>31)throw problem('Please check the curriculum.');result.curriculum=value.curriculum.map(item=>({label:bounded(item.label,1,80,'a curriculum label'),title:bounded(item.title,1,250,'a curriculum title'),description:bounded(item.description,1,1500,'curriculum details')}));return result;
  }
  function validBatch(value){const programme_id=text(value.programme_id,100);if(!programmeIds.has(programme_id))throw problem('Choose a yoga programme.');const output={programme_id,name:bounded(value.name,2,150,'the batch name'),timing:bounded(value.timing,2,100,'the batch timing'),status:value.status};if(!['Draft','Open','Confirmed','Completed'].includes(output.status))throw problem('Choose a batch status.');for(const k of ['start_date','end_date']){output[k]=value[k]||null;if(output[k]&&!/^\d{4}-\d{2}-\d{2}$/.test(output[k]))throw problem('Use a valid batch date.')}if(output.start_date&&output.end_date&&output.end_date<output.start_date)throw problem('The end date must follow the start date.');output.capacity=value.capacity==null||value.capacity===''?null:Number(value.capacity);if(output.capacity!==null&&(!Number.isInteger(output.capacity)||output.capacity<1||output.capacity>10000))throw problem('Choose a valid capacity.');return output}
  function validAccess(value){return {zoom_url:safeURL(text(value.zoom_url,1000),['zoom.us']),zoom_meeting_id:text(value.zoom_meeting_id,100),zoom_passcode:text(value.zoom_passcode,100),whatsapp_group_url:safeURL(text(value.whatsapp_group_url,1000),['chat.whatsapp.com']),instructions:text(value.instructions,5000)}}
  function validReel(value){const url=safeURL(value.url,['instagram.com'],false);if(!/^\/(?:reel|reels)\/[A-Za-z0-9_-]+\/?$/.test(new URL(url).pathname))throw problem('Use an Instagram Reel URL.');const n=Number(value.display_order)||0;return {title:bounded(value.title,2,150,'the reel title'),url,thumbnail_url:safeURL(text(value.thumbnail_url,1000)),display_order:Math.max(0,Math.min(Math.trunc(n),999)),published:value.published===true}}
  async function write(env,table,method,body,token,id){return (await supabase(env,'/rest/v1/'+table+(id?'?'+(table==='profiles'?'user_id':'id')+'=eq.'+encodeURIComponent(id):''),{method,body,token,headers:{Prefer:'return=representation'}})).data}
  async function adminList(request,env,context,key){
    const url=new URL(request.url);const page=Math.max(0,Math.min(Number.parseInt(url.searchParams.get('page')||'0',10)||0,10000));const pageSize=50;const table=tables[key];if(!table)throw problem('Unknown management area.',404);
    const sort=['programmes','settings','content'].includes(key)?'id':key==='reels'?'display_order':'created_at.desc';const {data,response}=await supabase(env,'/rest/v1/'+table+'?select=*&order='+sort+'&limit='+pageSize+'&offset='+(page*pageSize),{token:context.token,headers:{Prefer:'count=exact'}});
    const items=data||[];if(key==='enquiries'||key==='enrollments'){const noteTable=key==='enquiries'?'enquiry_notes':'enrollment_notes';const foreign=key==='enquiries'?'enquiry_id':'enrollment_id';const field=key==='enquiries'?'owner_notes':'admin_notes';if(items.length){const notes=await rows(env,noteTable,foreign+'=in.('+items.map(r=>r.id).join(',')+')',context.token);for(const row of items)row[field]=notes.find(n=>n[foreign]===row.id)?.[field]||''}}
    const total=Number(response.headers.get('content-range')?.split('/')[1]);return json({items,total:Number.isFinite(total)?total:items.length,page,pageSize});
  }
  async function api(request,env,context,path){
    if(path==='/api/config'&&request.method==='GET')return json({configured:configured(env),phoneOtpEnabled:configured(env)&&env.PHONE_OTP_ENABLED==='true',emailAuthEnabled:configured(env),emailDeliveryEnabled:emailDeliveryEnabled(env),turnstileSiteKey:env.TURNSTILE_SECRET_KEY?env.TURNSTILE_SITE_KEY||'':''});
    if(path==='/api/public'&&request.method==='GET'){try{return json(await publicContent(env))}catch{return json({...publicFallback(),contentUnavailable:true})}}
    if(path==='/api/auth/logout'&&request.method==='POST'){if(configured(env)){try{const user=await identity(request,env,context);if(user)await supabase(env,'/auth/v1/logout?scope=local',{method:'POST',token:context.token})}catch{ /* Local cookies are cleared even if the provider is unavailable. */ }}clearSession(context,request);return json({signedOut:true})}
    if(path==='/api/me'&&request.method==='GET'&&new URL(request.url).searchParams.get('optional')==='1'){if(!configured(env))return json(null);const optional=await identity(request,env,context);if(!optional||!optional.email_confirmed_at&&!optional.phone_confirmed_at)return json(null)}
    requireBackend(env);
    if(path==='/api/auth/confirm'&&request.method==='GET'){
      const url=new URL(request.url);const type=url.searchParams.get('type');if(!['signup','email','recovery'].includes(type))throw problem('This verification link is invalid.');const token_hash=bounded(url.searchParams.get('token_hash'),10,2000,'the verification link');const {data}=await supabase(env,'/auth/v1/verify',{method:'POST',body:{token_hash,type}});setSession(context,data,request);return Response.redirect(new URL(type==='recovery'?'/reset-password/':'/account/',request.url),303);
    }
    if(path.startsWith('/api/auth/')&&request.method==='POST'){
      if((path==='/api/auth/register'||path==='/api/auth/recover')&&!emailDeliveryEnabled(env))throw problem('Email verification and password recovery are not available yet. Please contact Bhramari for programme enquiries. Existing verified accounts can still log in.',503,'EMAIL_DELIVERY_NOT_CONFIGURED');
      const body=await bodyOf(request);await rate(request,env,'auth-'+path.split('/').pop(),10,900);
      if(path==='/api/auth/login'){const {data}=await supabase(env,'/auth/v1/token?grant_type=password',{method:'POST',body:{email:email(body.email),password:bounded(body.password,1,256,'your password')}});setSession(context,data,request);return json({signedIn:true})}
      if(path==='/api/auth/register'){
        if(body.privacy!==true)throw problem('Please acknowledge the privacy notice.');const password=bounded(body.password,12,128,'a password of at least 12 characters');const payload={email:email(body.email),password,data:{full_name:bounded(body.full_name,2,100,'your name'),phone:phone(body.phone,true),whatsapp_opt_in:body.whatsapp_opt_in===true}};
        const {data}=await supabase(env,'/auth/v1/signup?redirect_to='+encodeURIComponent(new URL('/api/auth/confirm',request.url).href),{method:'POST',body:payload});if(data.access_token)setSession(context,data,request);return json({verificationRequired:!data.access_token});
      }
      if(path==='/api/auth/otp'||path==='/api/auth/verify-otp'){
        if(env.PHONE_OTP_ENABLED!=='true')throw problem('Mobile OTP requires provider configuration.',503,'PHONE_OTP_NOT_CONFIGURED');const number=phone(body.phone,true).replace(/[\s()-]/g,'');if(!/^\+[1-9]\d{6,14}$/.test(number))throw problem('Use your mobile number with + and country code.');
        if(path.endsWith('/otp')){await supabase(env,'/auth/v1/otp',{method:'POST',body:{phone:number,create_user:false}});return json({requested:true})}
        const token=bounded(body.token,4,10,'the verification code');if(!/^\d{4,10}$/.test(token))throw problem('Enter the numeric verification code.');const {data}=await supabase(env,'/auth/v1/verify',{method:'POST',body:{phone:number,token,type:'sms'}});setSession(context,data,request);return json({signedIn:true});
      }
      if(path==='/api/auth/recover'){await supabase(env,'/auth/v1/recover?redirect_to='+encodeURIComponent(new URL('/api/auth/confirm',request.url).href),{method:'POST',body:{email:email(body.email)}});return json({requested:true})}
      if(path==='/api/auth/reset-password'){await requireUser(request,env,context);await supabase(env,'/auth/v1/user',{method:'PUT',token:context.token,body:{password:bounded(body.password,12,128,'a password of at least 12 characters')}});return json({updated:true})}
      throw problem('Unknown authentication action.',404);
    }
    if(path==='/api/me'&&request.method==='GET'){const user=await requireUser(request,env,context);const profile=(await rows(env,'profiles','user_id=eq.'+user.id+'&select=user_id,full_name,email,phone,whatsapp_opt_in,created_at',context.token))[0]||null;return json({id:user.id,email:user.email||'',role:await isAdmin(env,context)?'admin':'customer',profile})}
    if(path==='/api/account'&&request.method==='GET'){
      const user=await requireUser(request,env,context);const [profiles,enquiries,enrollments]=await Promise.all([rows(env,'profiles','user_id=eq.'+user.id,context.token),rows(env,'enquiries','user_id=eq.'+user.id+'&order=created_at.desc&limit=100',context.token),rows(env,'yoga_enrollments','user_id=eq.'+user.id+'&order=created_at.desc&limit=100',context.token)]);const ids=[...new Set(enrollments.map(e=>e.batch_id).filter(Boolean))];const batches=ids.length?await rows(env,'yoga_batches','id=in.('+ids.join(',')+')',context.token):[];
      const permitted=enrollments.filter(e=>e.enrollment_status==='Confirmed'&&batches.some(b=>b.id===e.batch_id&&b.status==='Confirmed')).map(e=>e.batch_id);const joiningDetails=permitted.length?await rows(env,'batch_access','batch_id=in.('+permitted.join(',')+')',context.token):[];const programmeIds=[...new Set(enrollments.map(e=>e.programme_id))];const programmes=programmeIds.length?await rows(env,'yoga_programmes','id=in.('+programmeIds.map(encodeURIComponent).join(',')+')',context.token):[];return json({profile:profiles[0]||null,enquiries,enrollments,batches,joiningDetails,programmes});
    }
    if(path==='/api/account/profile'&&request.method==='PATCH'){const user=await requireUser(request,env,context);const body=await bodyOf(request);await write(env,'profiles','PATCH',{full_name:bounded(body.full_name,2,100,'your name'),phone:phone(body.phone,true),whatsapp_opt_in:body.whatsapp_opt_in===true},context.token,user.id);return json({updated:true})}
    if(path==='/api/enquiries'&&request.method==='POST'){
      const body=await bodyOf(request);if(body.website)throw problem('This enquiry could not be processed.');if(body.privacy!==true)throw problem('Please acknowledge the privacy notice.');const payload={name:bounded(body.name,2,100,'your name'),email:email(body.email),phone:phone(body.phone,Boolean(body.programme_id)),enquiry_type:text(body.enquiry_type,100),programme_id:body.programme_id||null,message:bounded(body.message,10,5000,'a message of 10 to 5000 characters'),source_page:text(body.source_page,500),privacy:true,whatsapp_opt_in:body.whatsapp_opt_in===true};if(!enquiryTypes.has(payload.enquiry_type))throw problem('Choose an enquiry type.');if(payload.programme_id&&!programmeIds.has(payload.programme_id))throw problem('Choose a yoga programme.');if(!/^\/(?!\/)/.test(payload.source_page))payload.source_page='/contact/';await turnstile(request,env,body.turnstileToken);await rate(request,env,'enquiry',5,3600);await rate(request,env,'enquiry-email',5,3600,payload.email);const user=await identity(request,env,context);const verified=user&&(user.email_confirmed_at||user.phone_confirmed_at)?user:null;const {data}=await supabase(env,'/rest/v1/rpc/submit_enquiry',{method:'POST',service:true,body:{p_payload:payload,p_user_id:verified?.id||null}});if(!data?.id)throw problem('The enquiry service did not confirm that your details were saved.',502,'SAVE_NOT_CONFIRMED');return json(data,201);
    }
    if(path.startsWith('/api/admin/')){
      await requireAdmin(request,env,context);const parts=path.slice('/api/admin/'.length).split('/').filter(Boolean);const [key,id]=parts;
      if(key==='overview'&&request.method==='GET'){
        const count=async(table,filter='')=>{const {response}=await supabase(env,'/rest/v1/'+table+'?select=id'+filter,{method:'HEAD',token:context.token,headers:{Prefer:'count=exact'}});return Number(response.headers.get('content-range')?.split('/')[1])||0};
        const [newEnquiries,totalUsers,enrollments,recent]=await Promise.all([count('enquiries','&status=eq.New'),(async()=>{const {response}=await supabase(env,'/rest/v1/profiles?select=user_id',{method:'HEAD',token:context.token,headers:{Prefer:'count=exact'}});return Number(response.headers.get('content-range')?.split('/')[1])||0})(),count('yoga_enrollments'),rows(env,'enquiries','order=created_at.desc&limit=5',context.token)]);return json({counts:{newEnquiries,totalUsers,enrollments},recent});
      }
      if(key==='batch-access'){
        if(!uuid(id))throw problem('Choose a batch.');if(request.method==='GET')return json((await rows(env,'batch_access','batch_id=eq.'+id,context.token))[0]||null);if(['POST','PATCH'].includes(request.method)){const value=validAccess(await bodyOf(request));await supabase(env,'/rest/v1/batch_access?on_conflict=batch_id',{method:'POST',token:context.token,body:{batch_id:id,...value},headers:{Prefer:'resolution=merge-duplicates,return=representation'}});return json({updated:true})}throw problem('Unsupported action.',405);
      }
      if(request.method==='GET'&&!id)return adminList(request,env,context,key);
      if(!tables[key]||key==='users')throw problem('This management action is not available.',405);
      if(id&&!['programmes','settings','content'].includes(key)&&!uuid(id))throw problem('Choose a valid record.');
      if(request.method==='DELETE'&&key==='reels'&&uuid(id)){await write(env,tables[key],'DELETE',undefined,context.token,id);return json({deleted:true})}
      if(!['POST','PATCH'].includes(request.method))throw problem('Unsupported action.',405);
      const body=await bodyOf(request);let value;
      if(key==='programmes'){if(request.method!=='PATCH'||!programmeIds.has(id))throw problem('Choose a yoga programme.');if(!['Enquiries open','Paused'].includes(body.availability))throw problem('Choose programme availability.');value={content:validProgramme(body.content,id),display:body.display===true,availability:body.availability}}
      else if(key==='settings'){if(id!=='public'||request.method!=='PATCH')throw problem('Choose public site settings.');value={content:validSettings(body.content)}}
      else if(key==='batches')value=validBatch(body);
      else if(key==='reels')value=validReel(body);
      else if(key==='content'){const blockId=text(body.id||id,80);if(!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(blockId))throw problem('Use a simple content key.');value={id:blockId,title:text(body.title,200),body:text(body.body,10000),faqs:faqs(body.faqs||[])}}
      else if(key==='enquiries'){if(request.method!=='PATCH'||!uuid(id)||!['New','Contacted','In Discussion','Closed'].includes(body.status))throw problem('Choose an enquiry status.');value={status:body.status}}
      else if(key==='enrollments'){if(request.method!=='PATCH'||!uuid(id)||!['Enquiry Received','Enrollment Pending','Confirmed','Completed'].includes(body.enrollment_status))throw problem('Choose an enrolment status.');if(body.batch_id&&!uuid(body.batch_id))throw problem('Choose a valid batch.');if(body.enrollment_status==='Confirmed'&&!body.batch_id)throw problem('Assign a batch before confirming this enrolment.');value={enrollment_status:body.enrollment_status,batch_id:body.batch_id||null}}
      else throw problem('Unsupported action.',405);
      const saved=await write(env,tables[key],request.method,value,context.token,id);
      if((key==='enquiries'&&Object.hasOwn(body,'owner_notes'))||(key==='enrollments'&&Object.hasOwn(body,'admin_notes'))){const field=key==='enquiries'?'owner_notes':'admin_notes';const foreign=key==='enquiries'?'enquiry_id':'enrollment_id';await supabase(env,'/rest/v1/'+(key==='enquiries'?'enquiry_notes':'enrollment_notes')+'?on_conflict='+foreign,{method:'POST',token:context.token,body:{[foreign]:id,[field]:text(body[field],5000)},headers:{Prefer:'resolution=merge-duplicates'}})}
      return json({updated:true,items:saved||[]},request.method==='POST'?201:200);
    }
    throw problem('This action was not found.',404,'NOT_FOUND');
  }
  function accessPage(title,message,status){return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta name="robots" content="noindex"><title>'+title+' | Bhramari Enterprises</title><body style="margin:0;background:white;color:#222;font:16px/1.8 Arial,sans-serif"><main style="max-width:700px;margin:12vh auto;padding:28px"><p style="font-size:11px;letter-spacing:.2em">BHRAMARI ENTERPRISES</p><h1 style="font-weight:500;font-size:38px;line-height:1.2">'+title+'</h1><p>'+message+'</p><p><a href="/login/" style="color:inherit">Login</a> · <a href="/" style="color:inherit">Return to the website</a></p></main></body></html>',{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'}})}
  const escapeHTML=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function runtimeSEO(response,request,env){
    const url=new URL(request.url);const path=url.pathname;
    if(!configured(env)||/^\/(?:login|create-account|reset-password|account|admin)(?:\/|$)/.test(path))return response;
    const isHTML=response.headers.get('content-type')?.includes('text/html');
    if(!isHTML&&path!=='/sitemap.xml'&&path!=='/robots.txt')return response;
    try{
      const settingsRows=await rows(env,'site_settings','id=eq.public&select=content');
      const settings=validSettings({...seed.settings,...(settingsRows[0]?.content||{})});
      const origin=settings.siteUrl||seed.settings.siteUrl;
      if(path==='/sitemap.xml'||path==='/robots.txt'){
        if(path==='/robots.txt')return new Response('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /account/\nDisallow: /api/\nDisallow: /login/\nDisallow: /create-account/\nDisallow: /reset-password/\nSitemap: '+new URL('/sitemap.xml',origin).href+'\n',{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-cache'}});
        const programmes=await rows(env,'yoga_programmes','display=eq.true&select=id');
        const paths=['/','/about/','/partnerships/','/contact/','/privacy/',...['yoga-wellness','skill-development','agriculture-livelihoods','csr-project-implementation','consultancy','food-products'].map(id=>'/businesses/'+id+'/'),...programmes.filter(p=>programmeIds.has(p.id)).map(p=>'/businesses/yoga-wellness/'+p.id+'/')];
        return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(p=>'<url><loc>'+escapeHTML(new URL(p,origin).href)+'</loc></url>').join('')+'</urlset>',{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-cache'}});
      }
      let title,description;const match=/^\/businesses\/yoga-wellness\/([^/]+)\/$/.exec(path);
      if(match&&programmeIds.has(match[1])){const found=await rows(env,'yoga_programmes','id=eq.'+encodeURIComponent(match[1])+'&display=eq.true&select=content');if(!found.length){const missing=await serveAsset(new Request(new URL('/404.html',request.url)));return new Response(missing.body,{status:404,headers:missing.headers})}const p=validProgramme(found[0].content,match[1]);title=p.title+' — Yoga & Wellness | Bhramari Enterprises';description=p.shortDescription+' Live Online via Zoom. '+p.timing+' IST.'}
      if(path==='/'){title=settings.seoTitle;description=settings.seoDescription}
      let html=await response.text();const canonical=new URL(path,origin).href;
      html=html.replace(/(<link\b[^>]*rel="canonical"[^>]*href=")[^"]*(")/i,'$1'+escapeHTML(canonical)+'$2').replace(/(<meta\b[^>]*property="og:url"[^>]*content=")[^"]*(")/i,'$1'+escapeHTML(canonical)+'$2');
      if(title){html=html.replace(/<title>[^]*?<\/title>/i,'<title>'+escapeHTML(title)+'</title>');for(const name of ['og:title','twitter:title'])html=html.replace(new RegExp('(<meta\\b[^>]*(?:name|property)="'+name+'"[^>]*content=")[^"]*(")','i'),'$1'+escapeHTML(title)+'$2')}
      if(description)for(const name of ['description','og:description','twitter:description'])html=html.replace(new RegExp('(<meta\\b[^>]*(?:name|property)="'+name+'"[^>]*content=")[^"]*(")','i'),'$1'+escapeHTML(description)+'$2');
      return new Response(html,{status:response.status,headers:response.headers});
    }catch{return response}
  }
  return {async fetch(request,env={},ctx={}){
    const context={cookies:[],identityChecked:false,user:null,token:null};let response,path='';
    try{
      const url=new URL(request.url);try{path=decodeURIComponent(url.pathname)}catch{throw problem('Invalid path.',400)}
      if(mutableMethods.has(request.method)){
        if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')throw problem('This request must come from the Bhramari website.',403,'ORIGIN_REJECTED');
      }
      if(path.startsWith('/api/'))response=await api(request,env,context,path.replace(/\/$/,''));
      else {
        const privatePage=/^\/(account|admin)(?:\/|\.|$)/.exec(path);
        if(privatePage){if(!configured(env))response=accessPage('Requires backend configuration','Connect Supabase and complete the owner setup before account or administrator access is enabled.',503);else{try{if(privatePage[1]==='admin')await requireAdmin(request,env,context);else await requireUser(request,env,context)}catch(error){if(error.status===401)response=Response.redirect(new URL('/login/?returnTo='+encodeURIComponent(safeReturn(path)),request.url),303);else if(error.status===403)response=accessPage('Access restricted','This area is available only to an authorised Bhramari administrator.',403);else throw error}}}
        if(!response){if(!['GET','HEAD'].includes(request.method))throw problem('Unsupported request method.',405);response=await serveAsset(request);if(privatePage)response=new Response(response.body,{status:response.status,headers:{...Object.fromEntries(response.headers),'Cache-Control':'no-store','X-Robots-Tag':'noindex'}});else response=await runtimeSEO(response,request,env)}
      }
    }catch(error){const status=error.status||500;const message=status===500?'Something went wrong. Please try again later.':error.message;response=new Response(JSON.stringify({error:message,code:error.code||'SERVER_ERROR'}),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}})}
    const headers=new Headers(response.headers);headers.set('X-Content-Type-Options','nosniff');headers.set('Referrer-Policy','strict-origin-when-cross-origin');headers.set('Permissions-Policy','camera=(), microphone=(), geolocation=()');
    if(/^\/(?:account|admin)(?:\/|\.|$)/.test(path)){headers.set('Cache-Control','no-store');headers.set('X-Robots-Tag','noindex');headers.set('Vary','Cookie');}
    if(new URL(request.url).pathname.startsWith('/api/')){headers.set('Cache-Control','no-store');headers.set('Vary','Cookie, Origin');}
    for(const c of context.cookies)headers.append('Set-Cookie',c);
    return new Response(request.method==='HEAD'?null:response.body,{status:response.status,statusText:response.statusText,headers});
  }};
}
