import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const target=path.resolve('dist/server/index.js');
if(!fs.existsSync(target))throw new Error('Run npm run build first.');
const runtime=(await import(pathToFileURL(target).href)).default;
// Local server secrets are read only by this Node adapter, never by Next/client code.
const env={...process.env};
if(fs.existsSync('.env.local')){for(const line of fs.readFileSync('.env.local','utf8').split(/\r?\n/)){const m=/^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line);if(m&&!Object.hasOwn(env,m[1]))env[m[1]]=m[2].replace(/^(['"])(.*)\1$/,'$2')}}
const port=Number(process.env.PORT)||3001;
http.createServer(async(req,res)=>{try{const buffers=[];for await(const chunk of req){buffers.push(chunk);if(buffers.reduce((n,b)=>n+b.length,0)>70000){res.writeHead(413).end();return}}const host='http://127.0.0.1:'+port;const request=new Request(host+req.url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(buffers)});const result=await runtime.fetch(request,env,{waitUntil:promise=>promise.catch(()=>{})});res.statusCode=result.status;for(const [k,v] of result.headers)if(k!=='set-cookie')res.setHeader(k,v);const cookies=result.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);res.end(Buffer.from(await result.arrayBuffer()))}catch{res.writeHead(500,{'Content-Type':'text/plain'}).end('Local platform preview failed.')}}).listen(port,'127.0.0.1',()=>console.log('Bhramari platform: http://127.0.0.1:'+port));
