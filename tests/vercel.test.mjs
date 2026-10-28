import test from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../worker/app.mjs';
import {createVercelHandler} from '../worker/vercel.mjs';

const origin='https://bhramari-test.vercel.app';
const backend={VERCEL:'1',SUPABASE_URL:'https://unit-test.supabase.co',SUPABASE_PUBLISHABLE_KEY:'test-public-key',SUPABASE_SERVICE_ROLE_KEY:'test-server-key',RATE_LIMIT_SALT:'test-only-random-salt'};
const seed={settings:{},programmes:[],batches:[],reels:[],contentBlocks:[],backendConfigured:false};

function setup({env={},upstream=async()=>{throw Error('Unexpected upstream call')},serveAsset=async()=>new Response('Public test page',{headers:{'Content-Type':'text/html'}})}={}){
  const app=createApp({seed,fetchImpl:upstream,serveAsset});
  return createVercelHandler(app,{getEnv:()=>env});
}
function request(path,options={}){return new Request(origin+path,options)}
function post(path,body,headers={}){return request(path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...headers},body:JSON.stringify(body)})}

test('Vercel wrapper preserves full request URL, body stream and authentication/CSRF headers',async()=>{
  let received;
  const bytes=new Uint8Array([0,255,17,42]);
  const response=new Response('saved',{status:201});
  response.headers.append('Set-Cookie','one=first; HttpOnly; Secure');
  response.headers.append('Set-Cookie','two=second; HttpOnly; Secure');
  const handler=createVercelHandler({async fetch(input,env){received={url:input.url,method:input.method,origin:input.headers.get('Origin'),cookie:input.headers.get('Cookie'),body:new Uint8Array(await input.arrayBuffer()),env};return response}},{getEnv:()=>backend});
  const input=request('/api/enquiries?source=yoga%20practice&source=second',{method:'POST',headers:{Origin:origin,Cookie:'bhramari_access=valid; bhramari_refresh=refresh','Content-Type':'application/octet-stream'},body:bytes});
  const output=await handler.fetch(input);
  assert.equal(received.url,input.url);
  assert.equal(received.method,'POST');
  assert.equal(received.origin,origin);
  assert.equal(received.cookie,'bhramari_access=valid; bhramari_refresh=refresh');
  assert.deepEqual(received.body,bytes);
  assert.equal(received.env,backend);
  assert.equal(output,response,'return the response directly instead of joining Set-Cookie headers');
  assert.equal(output.status,201);
  assert.deepEqual(output.headers.getSetCookie(),['one=first; HttpOnly; Secure','two=second; HttpOnly; Secure']);
});

test('private exported and RSC pages remain closed when the backend is absent',async()=>{
  let assetsRead=0;
  const handler=setup({serveAsset:async()=>{assetsRead++;return new Response('must never be served')}});
  for(const path of ['/account/','/admin/','/account/index.html','/admin/__next.admin.txt','/%61dmin/']){
    const response=await handler.fetch(request(path));
    assert.equal(response.status,503,path);
    assert.match(await response.text(),/Requires backend configuration/);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  }
  assert.equal(assetsRead,0);
});

test('configured anonymous private-page requests keep the runtime login redirect',async()=>{
  const handler=setup({env:backend});
  for(const path of ['/account/','/admin/index.html']){
    const response=await handler.fetch(request(path+'?from=original'));
    assert.equal(response.status,303);
    const location=new URL(response.headers.get('Location'),origin);
    assert.equal(location.pathname,'/login/');
    assert.equal(location.origin,origin);
    assert.equal(response.headers.get('Cache-Control'),'no-store');
  }
});

test('same-origin logout preserves both cookie clears while a cross-origin mutation is rejected',async()=>{
  const handler=setup();
  let response=await handler.fetch(post('/api/auth/logout',{}));
  assert.equal(response.status,200);
  const cookies=response.headers.getSetCookie();
  assert.equal(cookies.length,2);
  assert(cookies.every(cookie=>cookie.includes('Max-Age=0')&&cookie.includes('HttpOnly')&&cookie.includes('Secure')));
  response=await handler.fetch(post('/api/auth/logout',{}, {Origin:'https://attacker.invalid'}));
  assert.equal(response.status,403);
  assert.equal(response.headers.getSetCookie().length,0);
});

test('Vercel adapter forwards real login JSON and preserves HttpOnly session cookies',async()=>{
  const calls=[];
  const handler=setup({env:backend,upstream:async(url,init)=>{
    const pathname=new URL(url).pathname;
    const body=JSON.parse(init.body);
    calls.push({pathname,body});
    if(pathname.endsWith('/consume_rate_limit'))return Response.json(true);
    if(pathname==='/auth/v1/token')return Response.json({access_token:'test-access',refresh_token:'test-refresh',expires_in:3600});
    throw Error('Unexpected upstream call');
  }});
  const response=await handler.fetch(post('/api/auth/login',{email:'person@example.com',password:'test-password-long'}));
  assert.equal(response.status,200);
  assert.deepEqual(calls.find(call=>call.pathname==='/auth/v1/token').body,{email:'person@example.com',password:'test-password-long'});
  assert.equal(response.headers.getSetCookie().length,2);
  assert(response.headers.getSetCookie().every(cookie=>cookie.includes('HttpOnly')&&cookie.includes('Secure')));
  assert(!(await response.text()).includes('test-access'));
});

test('rate budgets use trusted Vercel IP and ignore forged CF/forwarded-for headers',async()=>{
  async function budget({vercel='1',trusted='203.0.113.10',forged='198.51.100.200'}={}){
    let key;
    const handler=setup({env:{...backend,VERCEL:vercel},upstream:async(url,init)=>{
      assert(new URL(url).pathname.endsWith('/consume_rate_limit'));
      key=JSON.parse(init.body).p_key;
      return Response.json(false);
    }});
    const response=await handler.fetch(post('/api/enquiries',{name:'Test person',email:'test@example.com',enquiry_type:'General',message:'Please tell me about available services.',privacy:true,website:''},{'x-vercel-forwarded-for':trusted,'CF-Connecting-IP':forged,'x-forwarded-for':forged}));
    assert.equal(response.status,429);
    assert.match(key,/^[a-f0-9]{64}$/);
    return key;
  }
  const initial=await budget();
  assert.equal(await budget({forged:'192.0.2.200'}),initial);
  assert.notEqual(await budget({trusted:'203.0.113.11'}),initial);
  assert.notEqual(await budget({trusted:'2001:db8::1'}),initial);
  assert.equal(await budget({vercel:'0',trusted:'203.0.113.10'}),await budget({vercel:'0',trusted:'203.0.113.11'}));
  assert.equal(await budget({trusted:'spoofed, 203.0.113.10'}),await budget({trusted:'invalid-address'}));
});

test('public asset status, query strings and HEAD behavior survive the Vercel adapter',async()=>{
  let seen;
  const handler=setup({serveAsset:async input=>{seen=input.url;return new Response('not found',{status:404,headers:{'Content-Type':'text/plain','Cache-Control':'no-cache'}})}});
  const response=await handler.fetch(request('/missing-file.txt?version=2',{method:'HEAD'}));
  assert.equal(seen,origin+'/missing-file.txt?version=2');
  assert.equal(response.status,404);
  assert.equal(response.headers.get('Content-Type'),'text/plain');
  assert.equal(await response.text(),'');
});
