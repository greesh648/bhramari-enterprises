'use client';
import {useEffect,useRef,useState} from 'react';
import Script from 'next/script';
import {businesses} from '@/lib/content';
import {BrandMark} from './shared';
import {usePublicContent,whatsappHref} from './platform-public';
type TurnstileAPI={render:(element:HTMLElement,options:Record<string,unknown>)=>string;remove:(id:string)=>void;reset:(id:string)=>void};
export function TurnstileChallenge({siteKey,onToken}:{siteKey:string;onToken:(token:string)=>void}){
 const target=useRef<HTMLDivElement>(null);const [ready,setReady]=useState(false);
 useEffect(()=>{const api=(window as typeof window&{turnstile?:TurnstileAPI}).turnstile;if(!ready||!api||!target.current)return;const id=api.render(target.current,{sitekey:siteKey,theme:'light',callback:(token:string)=>onToken(token),'expired-callback':()=>onToken(''),'error-callback':()=>onToken('')});return()=>{api.remove(id);onToken('')}},[ready,siteKey,onToken]);
 if(!siteKey)return null;
 return <><Script id='bhramari-turnstile' src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit' strategy='afterInteractive' onReady={()=>setReady(true)}/><div ref={target} className='turnstile-slot' aria-label='Enquiry spam protection'/></>;
}
export function EnquiryForm({yoga=false}:{yoga?:boolean}){
 const {data,config,currentUser,loading}=usePublicContent();const programmes=data.programmes.filter(p=>p.display);const options=yoga?[...programmes.map(p=>p.content.title),'General Yoga Enquiry']:['General',...businesses.map(b=>b.name),'Partnership','Other'];
 const [type,setType]=useState(yoga?'General Yoga Enquiry':'General'),[state,setState]=useState(''),[busy,setBusy]=useState(false),[turnstileToken,setTurnstileToken]=useState(''),[after,setAfter]=useState<{name:string;programme:string;type:string}|null>(null);const status=useRef<HTMLParagraphElement>(null);
 useEffect(()=>{const query=new URLSearchParams(window.location.search);const programme=programmes.find(p=>p.id===query.get('programme'));const value=yoga?programme?.content.title:query.get('type');if(value&&options.includes(value))setType(value)},[yoga,data.programmes]);
 function feedback(message:string){setState(message);requestAnimationFrame(()=>status.current?.focus())}
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();const form=e.currentTarget;if(!form.reportValidity())return;const values=Object.fromEntries(new FormData(form));const name=String(values.name||'').trim(),email=String(values.email||'').trim(),phone=String(values.phone||'').trim(),message=String(values.message||'').trim();
  if(values.website){feedback('Unable to process this enquiry.');return}
  if(name.length<2||message.length<10){feedback('Please enter your name and a message of at least 10 characters.');return}
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){feedback('Please enter a valid email address.');return}
  if(phone&&(!/^[+()\d\s-]{7,25}$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15)){feedback('Please enter a valid phone number containing 7 to 15 digits.');return}
  const programme=yoga?programmes.find(p=>p.content.title===type):undefined;setAfter({name,programme:programme?.content.title||'',type});
  if(!config.configured){feedback('Requires backend configuration. Your details have been checked, but your enquiry has not been saved or sent.');return}
  if(config.turnstileSiteKey&&!turnstileToken){feedback('Please complete the spam-protection check before submitting.');return}
  setBusy(true);setState('');
  try{const response=await fetch('/api/enquiries',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,phone,enquiry_type:yoga?'Yoga & Wellness':type,programme_id:programme?.id||null,message:(yoga?'Preferred contact method: '+String(values.contactMethod||'Email')+'\n\n':'')+message,source_page:window.location.pathname,privacy:values.privacy==='on',whatsapp_opt_in:values.whatsapp_opt_in==='on',website:String(values.website||''),turnstileToken})});const result=await response.json();if(!response.ok||!result.data?.id)throw new Error(result.error||'Your enquiry could not be recorded. Please try again later.');feedback('Your enquiry has been recorded. Programme enrolment and batch details require confirmation; no place has been automatically booked.');form.reset();setType(yoga?'General Yoga Enquiry':'General');setTurnstileToken('')}catch(error){feedback(error instanceof Error?error.message:'Your enquiry could not be recorded. Please try again later.')}finally{setBusy(false)}
 }
 const wa=after?whatsappHref(data.settings,'Hello Bhramari Enterprises, my name is '+after.name+'. '+(after.programme?'I am interested in the '+after.programme+'. I would like to know more about the upcoming batch.':'I would like to discuss my '+after.type.toLowerCase()+' enquiry.')):null;
 return <form onSubmit={submit} method='post' action='/api/enquiries' className='enquiry-form' aria-label={yoga?'Yoga programme enquiry':'Contact enquiry'}>
  {yoga&&<div className='form-brand'><BrandMark/><span>YOGA & WELLNESS<br/>PROGRAMME ENQUIRY</span></div>}
  <p className='form-notice'>{loading?'Checking the enquiry service…':config.configured?'Your enquiry will be stored securely so Bhramari can respond.':'Requires backend configuration. You can check your details, but enquiries cannot be saved or sent yet.'}</p>
  {yoga&&currentUser&&<p className='small'>Your programme enquiry will be associated with your Bhramari account once it is recorded.</p>}
  <label>Your name <span>Required</span><input name='name' autoComplete='name' required minLength={2} maxLength={100} defaultValue={currentUser?.profile?.full_name||''}/></label>
  <div className='form-row'><label>Email <span>Required</span><input name='email' type='email' autoComplete='email' required maxLength={254} defaultValue={currentUser?.email||''}/></label><label>Phone <span>{yoga?'Required':'Optional'}</span><input name='phone' type='tel' autoComplete='tel' required={yoga} minLength={7} maxLength={25} defaultValue={currentUser?.profile?.phone||''}/></label></div>
  <label>{yoga?'Select programme':'Enquiry type'}<select name={yoga?'programme':'type'} value={type} onChange={e=>setType(e.target.value)}>{options.map(x=><option key={x}>{x}</option>)}</select></label>
  {yoga&&<label>Preferred contact method<select name='contactMethod' defaultValue='Email'><option>Email</option><option>Phone</option><option>No preference</option></select></label>}
  <label>Your message <span>Required</span><textarea name='message' required minLength={10} maxLength={4500} rows={5}/></label>
  <div className='honey' aria-hidden='true'><label>Leave empty<input name='website' tabIndex={-1} autoComplete='off'/></label></div>
  <label className='check'><input type='checkbox' required name='privacy'/><span>I have read the <a href='/privacy/'>privacy notice</a> and agree that my details may be used to respond to this enquiry.</span></label>
  <label className='check'><input type='checkbox' name='whatsapp_opt_in'/><span>Receive programme-related updates on WhatsApp. Optional; this does not subscribe me to promotional marketing.</span></label>
  {config.turnstileSiteKey&&<TurnstileChallenge siteKey={config.turnstileSiteKey} onToken={setTurnstileToken}/>}
  <button className='button' disabled={busy||loading} type='submit'>{busy?'Recording enquiry…':config.configured?'Submit enquiry':'Check enquiry details'}<span aria-hidden='true'>↗</span></button>
  <p ref={status} tabIndex={-1} role='status' aria-live='polite' className='form-status'>{state}</p>
  {wa&&<div className='whatsapp-followup'><h3>Continue your conversation on WhatsApp.</h3><p>Your context is ready to review. Opening WhatsApp does not send the message; you choose whether to send it.</p><a href={wa} className='button outline-button' target='_blank' rel='noopener noreferrer'>Continue on WhatsApp<span aria-hidden='true'>↗</span></a></div>}
  <noscript><p>This form needs JavaScript. Use a configured direct contact option to continue.</p></noscript>
 </form>;
}
