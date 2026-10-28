import {notFound} from 'next/navigation';
import {seo} from '@/lib/content';
import {yogaProgrammes,programmeHref} from '@/lib/yoga-programmes';
import {YogaProgrammeDetail} from '@/components/yoga-programme-detail';
export const dynamicParams=false;
export function generateStaticParams(){return yogaProgrammes.map(p=>({programme:p.slug}))}
export async function generateMetadata({params}:{params:Promise<{programme:string}>}){const {programme}=await params;const p=yogaProgrammes.find(p=>p.slug===programme);return p?seo(p.title+' — Yoga & Wellness',p.shortDescription+' Live Online via Zoom. View the curriculum, '+p.timing+' IST schedule and enquiry details.',programmeHref(p.slug)):{};}
export default async function ProgrammePage({params}:{params:Promise<{programme:string}>}){const {programme}=await params;if(!yogaProgrammes.some(p=>p.slug===programme))notFound();return <YogaProgrammeDetail slug={programme}/>}
