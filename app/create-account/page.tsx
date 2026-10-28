import {PlatformAuth} from '@/components/platform-auth';
export const metadata={title:'Create Account',description:'Create your Bhramari customer account.',robots:{index:false,follow:false}};
export default function Register(){return <PlatformAuth mode='register'/>}
