import {PlatformAuth} from '@/components/platform-auth';
export const metadata={title:'Login',description:'Access your Bhramari account.',robots:{index:false,follow:false}};
export default function Login(){return <PlatformAuth mode='login'/>}
