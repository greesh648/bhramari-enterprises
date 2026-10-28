import {PlatformAuth} from '@/components/platform-auth';
export const metadata={title:'Reset Password',robots:{index:false,follow:false}};
export default function Reset(){return <PlatformAuth mode='reset'/>}
