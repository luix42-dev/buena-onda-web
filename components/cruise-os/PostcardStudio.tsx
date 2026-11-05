'use client'
import { useEffect, useRef, useState } from 'react'
import { createPostcardBlob, normalizePostcardDetails, type PostcardDetails } from '@/lib/experience/postcard'
import { isFreshHumanRadioTrack, type HumanRadioMetadata } from '@/lib/human-radio/metadata'

/** Inline Glovebox page: deliberately avoids stacking a second modal dialog. */
export default function PostcardStudio({capture, carLabel, locationName, station, metadata, url, available, onShared}: {capture:()=>Promise<Blob>;carLabel:string;locationName:string;station:string;metadata:HumanRadioMetadata|null;url:string;available:boolean;onShared:()=>void}) {
  const [preview,setPreview] = useState<{blob:Blob;url:string;details:PostcardDetails}|null>(null)
  const [busy,setBusy] = useState(false), [note,setNote] = useState('')
  const mounted = useRef(true)
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false}},[])
  useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview.url)},[preview])
  const make = async()=>{
    if(busy||!available)return
    setBusy(true);setNote('')
    const details=normalizePostcardDetails({carLabel,location:locationName,station,verifiedTrack:isFreshHumanRadioTrack(metadata)?`${metadata.artist} - ${metadata.title}`:null,url})
    try{const blob=await createPostcardBlob(await capture(),details);if(mounted.current)setPreview({blob,url:URL.createObjectURL(blob),details})}
    catch(error){if(mounted.current)setNote(error instanceof Error?error.message:'Capture is unavailable. Copy the Cruise link instead.')}
    finally{if(mounted.current)setBusy(false)}
  }
  const copy=async()=>{try{await navigator.clipboard.writeText(preview?.details.url||url);setNote('Cruise link copied.');onShared()}catch{setNote(`Copy this link: ${preview?.details.url||url}`)}}
  const share=async()=>{if(!preview)return;const file=new File([preview.blob],'buena-onda-cruise.png',{type:'image/png'});try{if(navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:'Buena Onda Cruise',url:preview.details.url});onShared()}else await copy()}catch(error){if((error as Error).name!=='AbortError')setNote('File sharing is unavailable. Download the PNG or copy the link.')}}
  return <section className="os-postcard"><p>A postcard from your actual drive. No radio recording, upload or account.</p><button disabled={busy||!available} onClick={()=>void make()}>{busy?'Capturing...':preview?'Capture another postcard':'Capture postcard'}</button>{!available&&<p>Start cruising with scenery enabled to capture a postcard.</p>}{preview&&<><img src={preview.url} alt={`Actual Cruise view at ${preview.details.location}, ${preview.details.carLabel}, listening to ${preview.details.station}.`}/><div className="os-actions"><button onClick={()=>{const link=document.createElement('a');link.href=preview.url;link.download='buena-onda-cruise.png';link.click()}}>Download PNG</button><button onClick={()=>void share()}>Share postcard</button></div></>}<button onClick={()=>void copy()}>Copy Cruise link</button>{note&&<p role="status">{note}</p>}</section>
}
