import {isIP} from 'node:net';

/** Adapt the existing Web runtime without changing its URL, cookies or response.
 * Vercel overwrites x-vercel-forwarded-for at its trusted ingress. CF-Connecting-IP
 * is a client header here, so it must never determine the rate-limit identity.
 */
export function createVercelHandler(runtime,{getEnv=()=>process.env}={}){
  return {
    fetch(request){
      const env=getEnv();
      const headers=new Headers(request.headers);
      headers.delete('CF-Connecting-IP');
      if(env.VERCEL==='1'){
        const address=request.headers.get('x-vercel-forwarded-for')?.trim();
        if(address&&isIP(address))headers.set('CF-Connecting-IP',address);
      }
      return runtime.fetch(new Request(request,{headers}),env);
    },
  };
}
