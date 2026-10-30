import type {Profile} from './platform-types';

/** A draft only. The owner must review and send from the official business app. */
function whatsappDraft(profile:Pick<Profile,'phone'|'whatsapp_opt_in'>,message:string):string|null{
  if(!profile.whatsapp_opt_in)return null;
  const phone=profile.phone.replace(/[\s()-]/g,'');
  if(!/^\+[1-9]\d{6,14}$/.test(phone))return null;
  return 'https://wa.me/'+phone.slice(1)+'?text='+encodeURIComponent(message);
}

export function registrationWhatsAppDraft(profile:Pick<Profile,'phone'|'whatsapp_opt_in'>):string|null{
  return whatsappDraft(profile,'Welcome to Bhramari Enterprises. Thank you for creating your account. For yoga programme details or help with your account, reply here or visit https://bhramari-enterprises.vercel.app/yoga. Reply STOP to opt out of WhatsApp updates.');
}

export function enquiryWhatsAppDraft(contact:Pick<Profile,'phone'|'whatsapp_opt_in'>):string|null{
  return whatsappDraft(contact,'Thank you for contacting Bhramari Enterprises. We have received your website enquiry and will respond about your request. Programme places and batch details require separate confirmation. Reply STOP to opt out of WhatsApp updates.');
}
