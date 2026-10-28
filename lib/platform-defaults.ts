import {site} from './content.ts';
import type {SiteSettings} from './platform-types';
export const defaultSiteSettings:SiteSettings={
  brandName:'BHRAMARI ENTERPRISES',siteUrl:site.url,
  publicEmail:site.contact.email,publicPhone:site.contact.phone,
  whatsappNumber:'',instagramUrl:'',businessHours:'',announcement:'',
  whatsappDefaultMessage:'Hello Bhramari Enterprises, I would like to know more about your services.',
  zoomStatement:'Join your Bhramari Yoga practice from wherever you are. All scheduled sessions are conducted live online through Zoom.',
  seoTitle:'Bhramari Enterprises — A Thoughtful Approach to Growth',
  seoDescription:'One brand. Multiple capabilities across wellness, learning, livelihoods and business support.',
  socialLinks:[],
};
