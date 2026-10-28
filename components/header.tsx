'use client';
import Link from 'next/link';
import {useState,useEffect,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {Menu,X,ChevronDown,ArrowUpRight} from 'lucide-react';
import {businesses} from '@/lib/content';
import {Logo} from './shared';
import {HeaderContact,usePublicContent} from './platform-public';
export function Header(){
 const [open,setOpen]=useState(false);const path=usePathname();const ref=useRef<HTMLElement>(null);const {currentUser}=usePublicContent();
 useEffect(()=>setOpen(false),[path]);
 function escape(e:React.KeyboardEvent<HTMLElement>){if(e.key!=='Escape')return;const details=ref.current?.querySelector('details');const expanded=details?.open;details?.removeAttribute('open');if(open){setOpen(false);ref.current?.querySelector<HTMLButtonElement>('.menu-toggle')?.focus()}else if(expanded)details?.querySelector('summary')?.focus()}
 return <header className='header' ref={ref} onKeyDown={escape}><div className='wrap header-inner'><Logo/><button className='menu-toggle' aria-label={open?'Close navigation':'Open navigation'} aria-expanded={open} aria-controls='main-navigation' onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button><nav id='main-navigation' aria-label='Main navigation' className={open?'main-nav open':'main-nav'}><Link aria-current={path==='/'?'page':undefined} href='/'>Home</Link><Link aria-current={path==='/about/'?'page':undefined} href='/about/'>About</Link><details className='business-menu'><summary>Our businesses<ChevronDown size={14}/></summary><div>{businesses.map(b=><Link href={'/businesses/'+b.slug+'/'} key={b.slug} onClick={e=>e.currentTarget.closest('details')?.removeAttribute('open')}>{b.name}</Link>)}</div></details><Link href='/partnerships/'>Partnerships</Link><Link href='/contact/'>Contact</Link><div className='nav-account'>{currentUser?<><Link href='/account/'>My Bhramari</Link>{currentUser.role==='admin'&&<Link href='/admin/' className='button outline-button'>Owner area</Link>}</>:<><Link href='/login/'>Login</Link><Link href='/create-account/' className='button outline-button'>Create account</Link></>}</div><HeaderContact/><Link href='/contact/' className='button nav-cta'>Get in touch<ArrowUpRight size={15}/></Link></nav></div></header>
}
