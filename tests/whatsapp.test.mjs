import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {registrationWhatsAppDraft}=require('../lib/whatsapp.ts');

test('owner welcome drafts require consent and an unambiguous international number',()=>{
  for(const phone of ['8130525975','javascript:alert(1)','+0001234567','+91/8130525975',''])assert.equal(registrationWhatsAppDraft({phone,whatsapp_opt_in:true}),null);
  assert.equal(registrationWhatsAppDraft({phone:'+918130525975',whatsapp_opt_in:false}),null);
  const url=new URL(registrationWhatsAppDraft({phone:'+91 81305-25975',whatsapp_opt_in:true}));
  assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/918130525975');
  assert.match(url.searchParams.get('text'),/Welcome to Bhramari Enterprises/);
  assert.match(url.searchParams.get('text'),/Reply STOP/);
});

test('owner welcome drafts address the registrant and do not claim to choose the sending account',()=>{
  const draft=new URL(registrationWhatsAppDraft({phone:'+1 (202) 555-0123',whatsapp_opt_in:true}));
  assert.equal(draft.origin,'https://wa.me');assert.equal(draft.pathname,'/12025550123');
  assert.deepEqual([...draft.searchParams.keys()],['text']);
  assert.match(draft.searchParams.get('text'),/https:\/\/bhramari-enterprises\.vercel\.app\/yoga/);
});
