'use client';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, Clock3 } from 'lucide-react';
import { YogaIllustration } from './yoga-illustration';
import { BrandMark } from './shared';
import {usePublicContent} from './platform-public';
import { programmeHref, yogaProgrammes, yogaSettings, type YogaProgramme } from '@/lib/yoga-programmes';

export function ProgrammePrice({programme}:{programme:YogaProgramme}) {
  return <span className='programme-price'><strong>{programme.price || '₹ —'}</strong>{!programme.price && <small>{yogaSettings.priceNote}</small>}</span>;
}

export function ProgrammeArt({programme,decorative=false}:{programme:YogaProgramme;decorative?:boolean}) {
  return <div className='programme-art'>{programme.image.src ? <Image src={programme.image.src} alt={decorative?'':programme.image.alt} fill sizes='(max-width:760px) 100vw, 50vw' style={{objectFit:'contain'}}/> : <YogaIllustration pose={programme.illustration} decorative={decorative}/>}</div>;
}

export function ProgrammeCard({programme,index}:{programme:YogaProgramme;index:number}) {
  return <Link href={programmeHref(programme.slug)} className={'programme-poster pose-'+programme.illustration} aria-label={'View '+programme.title}>
    <div className='poster-top'><BrandMark/><span className='poster-index'>YOGA & WELLNESS / 0{index+1}</span></div>
    <div className='poster-title'><span className='eyebrow'>{programme.shortTitle}</span><h3>{programme.title}</h3></div>
    <ProgrammeArt programme={programme} decorative/>
    <div className='poster-meta'><span>{programme.duration}</span><span><Clock3 size={12}/>{programme.timing} IST</span></div>
    <p>{programme.shortDescription}</p><span className='poster-mode'>LIVE ONLINE VIA ZOOM</span>
    <div className='poster-bottom'><ProgrammePrice programme={programme}/><span className='poster-link'>View programme <ArrowUpRight size={18}/></span></div>
  </Link>;
}

export function ProgrammeComparison() {
 const {data}=usePublicContent();const programmes=data.programmes.filter(p=>p.display).map(p=>p.content);
  return <section className='section programme-comparison' aria-labelledby='compare-heading'>
    <div className='section-heading'><div><span className='eyebrow'>A ROUTINE THAT FITS</span><h2 id='compare-heading'>Find the programme<br/>that fits your routine.</h2></div><p>Morning or evening. A first step or a longer journey.<br/>All timings are in Indian Standard Time.</p></div>
    <table><caption className='sr-only'>Yoga programme duration, session timing in IST and fee</caption><thead><tr><th scope='col'>Programme</th><th scope='col'>Duration</th><th scope='col'>Timing · IST</th><th scope='col'>Programme fee</th></tr></thead><tbody>{programmes.map(p=><tr key={p.slug}><th scope='row'><Link href={programmeHref(p.slug)}>{p.title}<ArrowUpRight size={15}/></Link></th><td data-label='Duration'>{p.duration}</td><td data-label='Timing · IST'>{p.timing}</td><td data-label='Programme fee'><ProgrammePrice programme={p}/></td></tr>)}</tbody></table>
    <p className='small comparison-note'>Start dates, meeting days, fee inclusions and booking terms are confirmed before enrolment. Enquiries register interest and do not reserve a place.</p>
  </section>;
}
