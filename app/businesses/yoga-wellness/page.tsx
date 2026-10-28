import {seo} from '@/lib/content';
import {yogaPath} from '@/lib/yoga-programmes';
import {YogaIndex} from '@/components/yoga-index';
export const metadata=seo('Yoga & Wellness — Courses & Programmes','Explore four live online Bhramari Yoga programmes through Zoom, from a 7-day introduction to a progressive three-month practice. View timings and enquire.',yogaPath);
export default function Yoga(){return <YogaIndex/>}
