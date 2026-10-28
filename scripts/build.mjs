import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const env={...process.env};
// Set the public origin before Next compiles both server and browser content.
// The explicit value takes precedence when a custom domain is connected.
if(!env.NEXT_PUBLIC_SITE_URL&&env.VERCEL==='1'){
  const host=env.VERCEL_PROJECT_PRODUCTION_URL||env.VERCEL_URL;
  if(host){
    if(!/^[a-z0-9.-]+\.vercel\.app$/i.test(host))throw new Error('Set NEXT_PUBLIC_SITE_URL to your verified HTTPS production origin.');
    env.NEXT_PUBLIC_SITE_URL='https://'+host;
  }
}
for(const args of [[require.resolve('next/dist/bin/next'),'build'],['scripts/build-platform.mjs']]){
  const result=spawnSync(process.execPath,args,{stdio:'inherit',env});
  if(result.error)throw result.error;
  if(result.status!==0)process.exit(result.status||1);
}
