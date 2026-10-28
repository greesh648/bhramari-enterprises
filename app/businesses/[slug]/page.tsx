import Link from 'next/link';
import Image from 'next/image';
import {notFound} from 'next/navigation';
import {businesses,foodProducts,seo} from '@/lib/content';
import {Breadcrumb,CTA,BusinessCard} from '@/components/shared';
import {Visual} from '@/components/visual';
export const dynamicParams=false;
export function generateStaticParams(){return businesses.filter(b=>b.slug!=='yoga-wellness').map(b=>({slug:b.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const b=businesses.find(b=>b.slug===slug);return b?seo(b.name,b.description,'/businesses/'+slug+'/'):{};}
export default async function Business({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const b=businesses.find(b=>b.slug===slug);if(!b)notFound();
 return <><div className='wrap'><Breadcrumb current={b.name} business/>
 <section className='business-hero'><div><span className='eyebrow business-label'>{b.name}</span><h1>{b.headline}</h1><p className='lead'>{b.intro}</p><Link className='button' href={'/contact/?type='+encodeURIComponent(b.name)}>Make an enquiry<span>↗</span></Link></div><Visual {...b.image} label={b.name} variant={businesses.indexOf(b)%3}/></section>
 <section className='section intro'><span className='eyebrow'>THE VERTICAL</span><div><h2>{b.name}</h2><p className='lead'>{b.overview}</p></div></section>
 <section className='section'><div className='section-heading'><div><span className='eyebrow'>AREAS OF FOCUS</span><h2>Purposeful support.<br/>A practical perspective.</h2></div></div><div className='two-grid service-grid'>{b.areas.map(([title,text],i)=><article key={title}><span className='index'>0{i+1}</span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
 <section className='section intro'><span className='eyebrow'>WORKING TOGETHER</span><div><h2>Built around your context.</h2><h3>Who this vertical serves</h3><p>{b.audience}</p><h3>Engagement formats</h3><ul className='refined-list'>{b.formats.map(format=><li key={format}>{format}</li>)}</ul><p className='small'>The scope, delivery arrangements and requirements of each engagement are discussed and agreed individually.</p></div></section>
 {slug==='food-products'&&<section className='section'><span className='eyebrow'>PRODUCT INFORMATION</span><h2>Thoughtfully considered offerings.</h2>{foodProducts.length>0?<div className='two-grid'>{foodProducts.map(product=><article className='product-placeholder' key={product.slug}>{product.image.src&&<Image src={product.image.src} alt={product.image.alt} width={600} height={400}/>}<h3>{product.name}</h3><p>{product.description}</p><dl className='product-facts'><dt>Ingredients</dt><dd>{product.ingredients.join(', ')}</dd><dt>Allergens</dt><dd>{product.allergens.join(', ')}</dd><dt>Pack size</dt><dd>{product.packSize}</dd><dt>Price</dt><dd>{product.price}</dd></dl><Link className='text-link' href={product.enquiryHref}>Product enquiry ↗</Link></article>)}</div>:<div className='food-editorial'><p className='lead'>Our food products vertical brings a product-focused perspective to the Bhramari enterprise.</p><div><h3>Clarity in every detail.</h3><p>Product selection, ingredients, allergen information, pack sizes, pricing and availability belong together. Enquire about this vertical to discuss your interests and the product information relevant to your needs.</p><Link className='text-link' href='/contact/?type=Food%20Products'>Discuss food products ↗</Link></div></div>}</section>}
 <section className='section'><div className='section-heading'><div><span className='eyebrow'>A CONNECTED ENTERPRISE</span><h2>Explore related verticals.</h2></div><Link className='text-link' href='/#businesses'>All businesses ↗</Link></div><div className='two-grid'>{businesses.filter(x=>(b.related as readonly string[]).includes(x.slug)).map((x,i)=><BusinessCard key={x.slug} business={x} index={i}/>)}</div></section>
 </div><CTA title='Let’s discuss the possibilities.'/></>;
}
