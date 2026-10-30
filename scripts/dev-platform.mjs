import http from 'node:http';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {createApp} from '../worker/app.mjs';
const require=createRequire(import.meta.url);
const {yogaProgrammes}=require('../lib/yoga-programmes.ts');
const {defaultSiteSettings}=require('../lib/platform-defaults.ts');
const {featuredReels}=require('../lib/social-content.ts');
const seed={settings:defaultSiteSettings,programmes:yogaProgrammes.map(content=>({id:content.slug,content,display:true,availability:'Enquiries open'})),batches:[],reels:featuredReels,contentBlocks:[],backendConfigured:false};
const env={...process.env};if(fs.existsSync('.env.local'))for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=/^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);if(m&&!Object.hasOwn(env,m[1]))env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2')}
const next=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port','3002'],{stdio:'inherit',windowsHide:true,env:{...process.env}});
const runtime=createApp({seed,serveAsset:async request=>{const url=new URL(request.url);url.host='127.0.0.1:3002';url.protocol='http:';const headers=new Headers(request.headers);headers.delete('cookie');headers.delete('host');headers.set('accept-encoding','identity');try{return await fetch(url,{headers,redirect:'manual'})}catch{return new Response('The local page compiler is starting. Please refresh.',{status:503,headers:{'Content-Type':'text/plain'}})}}});
const server=http.createServer(async(req,res)=>{try{const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>70000){res.writeHead(413).end();return}chunks.push(chunk)}const request=new Request('http://127.0.0.1:3000'+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const response=await runtime.fetch(request,env);res.statusCode=response.status;for(const [key,value] of response.headers)if(key!=='set-cookie')res.setHeader(key,value);const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);res.end(Buffer.from(await response.arrayBuffer()))}catch{res.writeHead(500).end('Local platform request failed.')}});
server.listen(3000,'127.0.0.1',()=>console.log('Bhramari development platform: http://127.0.0.1:3000 (pages compile on port 3002)'));
function stop(){server.close();next.kill();}
process.on('SIGINT',stop);process.on('SIGTERM',stop);next.on('exit',()=>server.close());
