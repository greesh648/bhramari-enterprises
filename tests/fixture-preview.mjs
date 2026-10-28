/** TEST FIXTURES ONLY — isolated frontend QA, never a real backend.
 * Run from the website folder: node tests/fixture-preview.mjs
 * The actual Worker handles requests; all Supabase traffic is intercepted below.
 * No external network calls, production credentials or persistent records exist.
 * This file is not imported by the production build or bundled Worker.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {createApp} from '../worker/app.mjs';

const require=createRequire(import.meta.url);
const {yogaProgrammes}=require('../lib/yoga-programmes.ts');
const {defaultSiteSettings}=require('../lib/platform-defaults.ts');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const assetRoot=path.join(root,'out');
if(!fs.existsSync(path.join(assetRoot,'index.html')))throw new Error('Build the retained Next export before starting fixture QA.');
const port=3003;
const origin='http://127.0.0.1:'+port;
const fixtureOrigin='https://fixtures.supabase.invalid';
const password='fixture-password-only';
const ownerId='a1111111-1111-4111-8111-111111111111';
const customerId='b2222222-2222-4222-8222-222222222222';
const now=()=>new Date().toISOString();
const clone=value=>structuredClone(value);
const users=[
  {id:ownerId,email:'owner@test.invalid',email_confirmed_at:'2026-10-01T00:00:00Z',phone_confirmed_at:null},
  {id:customerId,email:'customer@test.invalid',email_confirmed_at:'2026-10-01T00:00:00Z',phone_confirmed_at:null},
];
const seed={settings:clone(defaultSiteSettings),programmes:yogaProgrammes.map(content=>({id:content.slug,content:clone(content),display:true,availability:'Enquiries open'})),batches:[],reels:[],contentBlocks:[],backendConfigured:false};
const db={
  profiles:users.map((user,index)=>({user_id:user.id,full_name:index?'Fixture customer':'Fixture owner',email:user.email,phone:'',whatsapp_opt_in:false,created_at:now(),updated_at:now()})),
  yoga_programmes:clone(seed.programmes),site_settings:[{id:'public',content:clone(seed.settings),updated_at:now()}],
  yoga_batches:[],yoga_enrollments:[],enquiries:[],social_reels:[],content_blocks:[],
  batch_access:[],enquiry_notes:[],enrollment_notes:[],
};
const env={SUPABASE_URL:fixtureOrigin,SUPABASE_PUBLISHABLE_KEY:'fixture-publishable-key-only',SUPABASE_SERVICE_ROLE_KEY:'fixture-server-key-only',RATE_LIMIT_SALT:'fixture-only-no-real-identifiers',PHONE_OTP_ENABLED:'false'};
const sessions=new Map();
const refreshTokens=new Map();
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2'};

function result(data,status=200,headers={},head=false){return new Response(head?null:JSON.stringify(data),{status,headers:{'Content-Type':'application/json',...headers}})}
function fixtureError(message,status=400){return result({message,code:'FIXTURE_REQUEST_REJECTED'},status)}
function mintSession(user){
  const access_token='fixture-access-'+randomUUID();
  const refresh_token='fixture-refresh-'+randomUUID();
  sessions.set(access_token,user.id);refreshTokens.set(refresh_token,user.id);
  return {access_token,refresh_token,expires_in:3600,user:clone(user)};
}
function sessionUser(headers){const token=(headers.get('authorization')||'').replace(/^Bearer /,'');return users.find(user=>user.id===sessions.get(token))||null}
function ownEnrollment(user,id){return Boolean(user&&db.yoga_enrollments.some(row=>row.user_id===user.id&&row.programme_id===id))}
function visibleRows(table,user,service){
  const rows=db[table];
  if(service||user?.id===ownerId)return rows;
  switch(table){
    case 'profiles':return rows.filter(row=>row.user_id===user?.id);
    case 'enquiries':case 'yoga_enrollments':return rows.filter(row=>row.user_id&&row.user_id===user?.id);
    case 'enquiry_notes':case 'enrollment_notes':return [];
    case 'yoga_programmes':return rows.filter(row=>row.display||ownEnrollment(user,row.id));
    case 'yoga_batches':return rows.filter(row=>(['Open','Confirmed'].includes(row.status)&&db.yoga_programmes.some(p=>p.id===row.programme_id&&p.display))||Boolean(user&&db.yoga_enrollments.some(e=>e.user_id===user.id&&e.batch_id===row.id)));
    case 'batch_access':return rows.filter(row=>Boolean(user&&db.yoga_enrollments.some(e=>e.user_id===user.id&&e.batch_id===row.batch_id&&e.enrollment_status==='Confirmed')&&db.yoga_batches.some(b=>b.id===row.batch_id&&b.status==='Confirmed')));
    case 'site_settings':case 'content_blocks':return rows;
    case 'social_reels':return rows.filter(row=>row.published);
    default:throw new Error('Unsupported fixture table visibility: '+table);
  }
}
const queryControls=new Set(['select','order','limit','offset','on_conflict']);
function matches(row,query){
  for(const [field,filter] of query){
    if(queryControls.has(field))continue;
    if(filter.startsWith('eq.')){if(String(row[field])!==filter.slice(3))return false;}
    else if(filter.startsWith('in.(')&&filter.endsWith(')')){if(!filter.slice(4,-1).split(',').includes(String(row[field])))return false;}
    else throw new Error('Unsupported fixture filter: '+field+' '+filter);
  }
  return true;
}
function projected(row,select){if(!select||select==='*')return clone(row);const output={};for(const key of select.split(',')){if(!/^[a-z_]+$/i.test(key))throw new Error('Unsupported fixture selection: '+key);if(Object.hasOwn(row,key))output[key]=clone(row[key]);}return output}

async function fixtureFetch(input,init={}){
  const url=new URL(input);if(url.origin!==fixtureOrigin)throw new Error('Fixture QA blocked an external network request.');
  const method=(init.method||'GET').toUpperCase();const headers=new Headers(init.headers);const body=init.body?JSON.parse(init.body):null;
  const user=sessionUser(headers);const service=headers.get('apikey')===env.SUPABASE_SERVICE_ROLE_KEY;
  if(url.pathname==='/auth/v1/token'){
    if(method!=='POST')return fixtureError('Unsupported fixture Auth method.');
    if(url.searchParams.get('grant_type')==='password'){
      const found=users.find(u=>u.email===body?.email);if(!found||body?.password!==password)return fixtureError('Invalid fixture login.',401);return result(mintSession(found));
    }
    if(url.searchParams.get('grant_type')==='refresh_token'){
      const id=refreshTokens.get(body?.refresh_token);const found=users.find(u=>u.id===id);if(!found)return fixtureError('Invalid fixture refresh.',401);refreshTokens.delete(body.refresh_token);return result(mintSession(found));
    }
    throw new Error('Unsupported fixture token grant.');
  }
  if(url.pathname==='/auth/v1/user'){
    if(!user)return fixtureError('No fixture session.',401);
    if(method==='PUT')return result(clone(user));
    if(method==='GET')return result(clone(user));
    throw new Error('Unsupported fixture user method.');
  }
  if(url.pathname==='/auth/v1/logout'){
    if(method!=='POST')throw new Error('Unsupported fixture logout method.');
    const token=(headers.get('authorization')||'').replace(/^Bearer /,'');const id=sessions.get(token);sessions.delete(token);for(const [refresh,idForRefresh]of refreshTokens)if(idForRefresh===id)refreshTokens.delete(refresh);return result({});
  }
  if(url.pathname==='/auth/v1/signup')return result({user:{id:randomUUID()},identities:[]}); // Verification required; no real user/mail is created.
  if(url.pathname==='/auth/v1/recover')return result({}); // UI response only; no email sent.
  if(url.pathname==='/auth/v1/verify'){
    if(body?.token_hash!=='fixture-confirmation-only')return fixtureError('Unknown fixture confirmation.',400);
    return result(mintSession(users.find(u=>u.id===customerId)));
  }
  if(url.pathname==='/rest/v1/rpc/is_admin')return result(user?.id===ownerId);
  if(url.pathname==='/rest/v1/rpc/consume_rate_limit'){
    if(!service)return fixtureError('Server fixture privilege required.',403);return result(true);
  }
  if(url.pathname==='/rest/v1/rpc/submit_enquiry'){
    if(!service)return fixtureError('Server fixture privilege required.',403);
    const payload=body?.p_payload;if(payload?.privacy!==true)throw new Error('Fixture caught missing enquiry acknowledgement.');
    const programme=db.yoga_programmes.find(p=>p.id===payload.programme_id);
    if(payload.programme_id&&(!programme?.display||programme.availability!=='Enquiries open'))return fixtureError('Programme is not accepting fixture enquiries.');
    const enquiry={id:randomUUID(),user_id:body.p_user_id||null,name:payload.name,email:payload.email,phone:payload.phone,enquiry_type:payload.enquiry_type,programme_id:payload.programme_id||null,message:payload.message,source_page:payload.source_page,status:'New',whatsapp_opt_in:payload.whatsapp_opt_in===true,created_at:now()};
    db.enquiries.push(enquiry);const response={id:enquiry.id};
    if(body.p_user_id&&payload.programme_id){
      let enrollment=db.yoga_enrollments.find(e=>e.user_id===body.p_user_id&&e.programme_id===payload.programme_id&&e.enrollment_status!=='Completed');
      if(!enrollment){enrollment={id:randomUUID(),user_id:body.p_user_id,programme_id:payload.programme_id,batch_id:null,enquiry_id:enquiry.id,enrollment_status:'Enquiry Received',created_at:now(),updated_at:now()};db.yoga_enrollments.push(enrollment);}
      response.enrollmentId=enrollment.id;
    }
    return result(response);
  }
  if(!url.pathname.startsWith('/rest/v1/'))throw new Error('Unknown fixture upstream path: '+url.pathname);
  const table=url.pathname.slice('/rest/v1/'.length);if(!Object.hasOwn(db,table))throw new Error('Unknown fixture table: '+table);
  const query=url.searchParams;const readable=visibleRows(table,user,service);
  if(method==='GET'||method==='HEAD'){
    let selected=readable.filter(row=>matches(row,query));const total=selected.length;
    const order=query.get('order');if(order){const [key,direction]=order.split('.');selected=[...selected].sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*(direction==='desc'?-1:1));}
    const offset=Math.max(0,Number(query.get('offset'))||0);const limit=query.has('limit')?Math.max(0,Number(query.get('limit'))||0):selected.length;
    selected=selected.slice(offset,offset+limit);const range=selected.length?offset+'-'+(offset+selected.length-1)+'/'+total:'*/'+total;
    return result(selected.map(row=>projected(row,query.get('select'))),200,{'Content-Range':range},method==='HEAD');
  }
  const owner=user?.id===ownerId;
  const ownProfile=table==='profiles'&&user&&method==='PATCH';
  if(!owner&&!service&&!ownProfile)return fixtureError('Administrator fixture privilege required.',403);
  if(method==='PATCH'){
    let changed=db[table].filter(row=>matches(row,query));if(ownProfile)changed=changed.filter(row=>row.user_id===user.id);
    if(table==='yoga_enrollments'&&body.batch_id){for(const row of changed)if(!db.yoga_batches.some(batch=>batch.id===body.batch_id&&batch.programme_id===row.programme_id))return fixtureError('Fixture batch programme does not match.');}
    for(const row of changed){Object.assign(row,clone(body));row.updated_at=now();}
    return result(changed.map(row=>projected(row,query.get('select'))));
  }
  if(method==='POST'){
    const inputRows=Array.isArray(body)?body:[body];const saved=[];
    for(const item of inputRows){
      const conflict=query.get('on_conflict');let row=conflict?db[table].find(existing=>existing[conflict]===item[conflict]):null;
      if(row){Object.assign(row,clone(item));row.updated_at=now();}
      else {row={...clone(item),...(!['batch_access','enquiry_notes','enrollment_notes'].includes(table)&&!item.id?{id:randomUUID()}:{}),created_at:now(),updated_at:now()};db[table].push(row);}
      saved.push(row);
    }
    return result(clone(saved),201);
  }
  if(method==='DELETE'){
    const removed=db[table].filter(row=>matches(row,query));db[table]=db[table].filter(row=>!removed.includes(row));return result(clone(removed));
  }
  throw new Error('Unsupported fixture method: '+method+' '+table);
}

function serveAsset(request){
  const url=new URL(request.url);let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{return new Response('Invalid path',{status:400})}
  let target=path.resolve(assetRoot,'.'+pathname);if(target!==assetRoot&&!target.startsWith(assetRoot+path.sep))return new Response('Forbidden',{status:403});
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory()){
    if(!pathname.endsWith('/'))return Response.redirect(new URL(pathname+'/'+url.search,request.url),308);
    target=path.join(target,'index.html');
  }
  const found=fs.existsSync(target)&&fs.statSync(target).isFile();if(!found)target=path.join(assetRoot,'404.html');
  return new Response(fs.readFileSync(target),{status:found?200:404,headers:{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Bhramari-QA':'TEST FIXTURES ONLY'}});
}

const app=createApp({serveAsset,seed,fetchImpl:fixtureFetch});
http.createServer(async(req,res)=>{
  try {
    const buffers=[];let length=0;for await(const chunk of req){length+=chunk.length;if(length>70000){res.writeHead(413).end('Fixture request too large.');return}buffers.push(chunk);}
    const request=new Request(origin+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(buffers)});
    const response=await app.fetch(request,env,{waitUntil:promise=>promise.catch(()=>{})});
    res.statusCode=response.status;for(const[key,value]of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
    res.setHeader('X-Bhramari-QA','TEST FIXTURES ONLY');const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch(error){console.error('Fixture QA request failed:',error.message);res.writeHead(500,{'Content-Type':'text/plain'}).end('Fixture QA request failed.');}
}).listen(port,'127.0.0.1',()=>{
  console.log('TEST FIXTURES ONLY — '+origin+' — no real Supabase, email, SMS or persistent data.');
  console.log('Owner: owner@test.invalid / '+password);
  console.log('Customer: customer@test.invalid / '+password);
  console.log('All records are synthetic and reset when this process stops. Never deploy this QA server.');
});
