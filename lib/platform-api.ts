'use client';
export class PlatformError extends Error {constructor(message:string,public status:number,public code=''){super(message)}}
export async function platformApi<T>(path:string,options:RequestInit={}):Promise<T>{
  const response=await fetch(path,{...options,credentials:'same-origin',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},cache:'no-store'});
  const body=await response.json().catch(()=>({error:'The service returned an unexpected response. Please try again.'}));
  if(!response.ok)throw new PlatformError(body.error||'The request could not be completed.',response.status,body.code||'');
  return body.data as T;
}
export const jsonBody=(value:unknown)=>JSON.stringify(value);
export function safeReturnTo(value:string|null,fallback='/account/'){
  if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\')||/[\r\n]/.test(value))return fallback;
  try{const url=new URL(value,window.location.origin);return url.origin===window.location.origin?url.pathname+url.search+url.hash:fallback}catch{return fallback}
}
export function formattedDate(value:string|null|undefined){if(!value)return 'Not specified';const date=new Date(value);return Number.isNaN(date.getTime())?'Not specified':date.toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Kolkata'})}
export function whatsappUrl(number:string,message:string){const digits=number.replace(/\D/g,'');return /^\d{7,15}$/.test(digits)?'https://wa.me/'+digits+'?text='+encodeURIComponent(message):''}
