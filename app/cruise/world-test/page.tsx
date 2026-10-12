import type {Metadata} from 'next'
import WorldClient from './WorldClient'
export const metadata:Metadata={title:'World First — Buena Onda Cruise',robots:{index:false,follow:false}}
export default function Page(){return <WorldClient/>}
