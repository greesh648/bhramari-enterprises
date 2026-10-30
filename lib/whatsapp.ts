import type {Profile} from './platform-types';

/** A draft only. The owner must review and send from the official business app. */
export function registrationWhatsAppDraft(profile:Pick<Profile,'phone'|'whatsapp_opt_in'>):string|null{
  if(!profile.whatsapp_opt_in)return null;
  const phone=profile.phone.replace(/[\s()-]/g,'');
  if(!/^\+[1-9]\d{6,14}$/.test(phone))return null;
  const message='Welcome to Bhramari Enterprises. Thank you for creating your account. For yoga programme details or help with your account, reply here or visit https://bhramari-enterprises.vercel.app/yoga. Reply STOP to opt out of WhatsApp updates.';
  return 'https://wa.me/'+phone.slice(1)+'?text='+encodeURIComponent(message);
}
