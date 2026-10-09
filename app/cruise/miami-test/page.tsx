'use client'
import dynamic from 'next/dynamic'
const Street = dynamic(()=>import('@/components/cruise/master/MiamiStreet'),{ssr:false})
export default function Page(){return <Street/>}
