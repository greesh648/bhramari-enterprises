import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {gzipSync} from 'node:zlib';
const require=createRequire(import.meta.url);
const {yogaProgrammes}=require('../lib/yoga-programmes.ts');
const {defaultSiteSettings}=require('../lib/platform-defaults.ts');
const {featuredReels}=require('../lib/social-content.ts');
const root=process.cwd();
const input=path.join(root,'out');
const output=path.join(root,'dist');
if(!fs.existsSync(path.join(input,'index.html')))throw new Error('Run the Next production export first.');
const hosting=JSON.parse(fs.readFileSync(path.join(root,'.openai/hosting.json'),'utf8'));
if(hosting.static)throw new Error('The Phase 2 runtime requires a Worker manifest without static.directory.');
const seed={settings:defaultSiteSettings,programmes:yogaProgrammes.map(content=>({id:content.slug,content,display:true,availability:'Enquiries open'})),batches:[],reels:featuredReels,contentBlocks:[],backendConfigured:false};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.xml':'application/xml; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.svg':'image/svg+xml','.ico':'image/x-icon','.ttf':'font/ttf','.woff2':'font/woff2'};
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)])}
// Worker ESM hosting packages only this module. The retained Next export is embedded
// byte-for-byte instead of relying on unsupported standalone asset bindings.
const assets={};
for(const file of walk(input)){const url='/'+path.relative(input,file).replaceAll('\\','/');const bytes=fs.readFileSync(file);assets[url]={data:bytes.toString('base64'),type:mime[path.extname(file)]||'application/octet-stream'};}
const staticRuntime=`function serveAsset(request){const url=new URL(request.url);let key;try{key=decodeURIComponent(url.pathname)}catch{return new Response('Invalid path',{status:400})}if(key.endsWith('/'))key+='index.html';else if(!STATIC_ASSETS[key]&&STATIC_ASSETS[key+'/index.html'])return Response.redirect(new URL(url.pathname+'/'+url.search,request.url),308);const asset=STATIC_ASSETS[key];const chosen=asset||STATIC_ASSETS['/404.html'];const bytes=Uint8Array.from(atob(chosen.data),c=>c.charCodeAt(0));return new Response(bytes,{status:asset?200:404,headers:{'Content-Type':chosen.type,'Cache-Control':key.startsWith('/_next/static/')?'public, max-age=31536000, immutable':key.endsWith('.html')?'no-cache':'public, max-age=3600'}})}`;
const source=fs.readFileSync(path.join(root,'worker/app.mjs'),'utf8').replace('export function createApp','function createApp');
const module='const STATIC_ASSETS='+JSON.stringify(assets)+';\nconst SEED='+JSON.stringify(seed)+';\n'+staticRuntime+'\n'+source+'\nexport default createApp({serveAsset,seed:SEED});\n';
fs.mkdirSync(path.join(output,'server'),{recursive:true});fs.mkdirSync(path.join(output,'.openai'),{recursive:true});fs.writeFileSync(path.join(output,'server/index.js'),module);fs.writeFileSync(path.join(output,'.openai/hosting.json'),JSON.stringify(hosting,null,2)+'\n');
// Vercel requires a nonempty output directory. Keep exported pages inside the
// protected runtime; no account/admin HTML or RSC assets are published directly.
const vercelPublic=path.join(root,'vercel-public');
fs.mkdirSync(vercelPublic,{recursive:true});
fs.writeFileSync(path.join(vercelPublic,'deployment-health.txt'),'Bhramari deployment assets are served through the protected server runtime.\n');
// Bootstrap is safe to rerun: it never overwrites owner edits.
const sqlEscape=value=>"'"+JSON.stringify(value).replaceAll("'","''")+"'::jsonb";
const reelSeed=seed.reels.map(r=>"insert into public.social_reels(id,title,url,thumbnail_url,display_order,published) select '"+r.id+"','"+r.title.replaceAll("'","''")+"','"+r.url+"','"+new URL(r.thumbnail_url,seed.settings.siteUrl).href+"',"+r.display_order+",true where not exists(select 1 from public.social_reels where url='"+r.url+"') on conflict(id) do nothing;");
const sql=['-- Generated from the central catalogue. Apply migration first; reruns preserve owner edits.','begin;',...seed.programmes.map(p=>`insert into public.yoga_programmes(id,content,display,availability) values ('${p.id}',${sqlEscape(p.content)},true,'Enquiries open') on conflict(id) do nothing;`),`insert into public.site_settings(id,content) values ('public',${sqlEscape(seed.settings)}) on conflict(id) do nothing;`,...['homepage-intro','yoga-intro','yoga-faq'].map(id=>`insert into public.content_blocks(id,title,body,faqs) values ('${id}','','','[]'::jsonb) on conflict(id) do nothing;`),...reelSeed,'commit;',''].join('\n');fs.mkdirSync(path.join(root,'supabase'),{recursive:true});fs.writeFileSync(path.join(root,'supabase/seed.sql'),sql);
const compressed=gzipSync(module).byteLength;console.log(`Worker built: ${Object.keys(assets).length} retained Next assets; ${(module.length/1048576).toFixed(2)} MiB source / ${(compressed/1048576).toFixed(2)} MiB gzip.`);
if(compressed>3*1048576)throw new Error('Worker exceeds the conservative 3 MiB compressed deployment budget.');
