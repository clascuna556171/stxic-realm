import {useEffect,useState,type ImgHTMLAttributes} from 'react'
// Capture a still frame for reduced motion, including animated GIF/WebP uploads.
// A failed CORS/decode capture stays hidden rather than playing an animation.
export function ProfileImage({src,style,...props}:ImgHTMLAttributes<HTMLImageElement>){
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[still,setStill]=useState<{src:string;url:string}|null>(null)
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change)},[])
 useEffect(()=>{if(!reduced||!src)return;let alive=true;const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{if(!alive)return;try{const canvas=document.createElement('canvas'),scale=Math.min(1,1600/image.naturalWidth,1600/image.naturalHeight);canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));const context=canvas.getContext('2d');if(!context)return;context.drawImage(image,0,0,canvas.width,canvas.height);setStill({src,url:canvas.toDataURL('image/png')})}catch{/* A still cannot be safely extracted. */}finally{image.src=''}};image.src=src;return()=>{alive=false;image.onload=null;image.src=''}},[src,reduced])
 const frozen=still&&still.src===src?still.url:undefined
 return <img {...props} src={reduced?frozen:src} data-reduced-motion={reduced} style={{...style,...(reduced&&!frozen?{visibility:'hidden'}:{})}}/>
}
