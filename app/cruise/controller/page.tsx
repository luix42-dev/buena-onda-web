import Link from 'next/link'
export const metadata={title:'Buena Onda Cruise',robots:{index:false,follow:false},referrer:'no-referrer'}
export default function Page(){return <main style={{minHeight:'100vh',display:'grid',placeContent:'center',gap:'1rem',padding:'2rem',background:'#102b26',color:'#fff',textAlign:'center'}}><h1>Phone pairing is taking a break.</h1><Link href="/cruise/prototype?drive=city" style={{color:'#f8d687'}}>Back to Cruise</Link></main>}
