import type {YogaProgramme} from './yoga-programmes';
export type SiteSettings = {
  brandName:string; siteUrl:string; publicEmail:string; publicPhone:string;
  whatsappNumber:string; instagramUrl:string; whatsappDefaultMessage:string;
  businessHours:string; announcement:string; zoomStatement:string;
  seoTitle:string; seoDescription:string; socialLinks:{label:string;url:string}[];
};
export type ProgrammeRecord={id:string;content:YogaProgramme;display:boolean;availability:'Enquiries open'|'Paused';updated_at?:string};
export type YogaBatch={id:string;programme_id:string;name:string;start_date:string|null;end_date:string|null;timing:string;capacity:number|null;status:'Draft'|'Open'|'Confirmed'|'Completed';created_at?:string};
export type BatchAccess={batch_id:string;zoom_url:string;zoom_meeting_id:string;zoom_passcode:string;whatsapp_group_url:string;instructions:string};
export type Profile={user_id:string;full_name:string;email:string;phone:string;whatsapp_opt_in:boolean;created_at?:string};
export type Enquiry={id:string;user_id:string|null;name:string;email:string;phone:string;enquiry_type:string;programme_id:string|null;message:string;source_page:string;status:'New'|'Contacted'|'In Discussion'|'Closed';whatsapp_opt_in:boolean;created_at:string};
export type Enrollment={id:string;user_id:string;programme_id:string;batch_id:string|null;enquiry_id:string|null;enrollment_status:'Enquiry Received'|'Enrollment Pending'|'Confirmed'|'Completed';created_at:string};
export type Reel={id:string;title:string;url:string;thumbnail_url:string;display_order:number;published:boolean};
export type ContentBlock={id:string;title:string;body:string;faqs:{question:string;answer:string}[]};
export type PublicContent={settings:SiteSettings;programmes:ProgrammeRecord[];batches:YogaBatch[];reels:Reel[];contentBlocks:ContentBlock[];backendConfigured:boolean};
export type PlatformConfig={configured:boolean;phoneOtpEnabled:boolean;turnstileSiteKey:string;emailAuthEnabled:boolean;emailDeliveryEnabled:boolean;whatsappRegistrationEnabled:boolean;whatsappEnquiryEnabled:boolean};
export type CurrentUser={id:string;email:string;role:'customer'|'admin';profile:Profile|null};
export type AccountData={profile:Profile|null;enquiries:Enquiry[];enrollments:Enrollment[];batches:YogaBatch[];joiningDetails:BatchAccess[];programmes?:ProgrammeRecord[]};
