import type {SupabaseClient} from '@supabase/supabase-js'
import {IMAGE_LIMIT} from './profile-model.ts'
const signed=new Map<string,{expires:number;promise:Promise<string>}>()
export function profileImageUrl(db:SupabaseClient,path:string,viewer:string):Promise<string>{
 const key=viewer+':'+path,existing=signed.get(key);if(existing&&existing.expires>Date.now())return existing.promise
 const promise=db.storage.from('realm-profiles').createSignedUrl(path,60).then(({data,error})=>{if(error)throw error;return data.signedUrl}).catch(e=>{signed.delete(key);throw e})
 signed.set(key,{expires:Date.now()+45000,promise});return promise
}
export async function normalizeProfileImage(file:File):Promise<Blob>{
 if(!file.size||file.size>IMAGE_LIMIT)throw new Error('Choose an image up to 8 MiB.')
 if(!['image/png','image/jpeg','image/webp','image/gif','image/avif'].includes(file.type))throw new Error('Choose a PNG, JPEG, WebP, GIF or AVIF image.')
 // GIF keeps its animation. The authenticated server checks its frame/size budget.
 if(file.type==='image/gif')return file
 const bitmap=await createImageBitmap(file)
 try{
  if(bitmap.width>8192||bitmap.height>8192||bitmap.width*bitmap.height>16777216)throw new Error('Choose an image up to 8192 pixels per side and 16 megapixels.')
  const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Image processing is unavailable in this browser.');ctx.drawImage(bitmap,0,0)
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(v=>v?resolve(v):reject(new Error('This image could not be processed.')),'image/webp',.9))
  if(blob.size>IMAGE_LIMIT)throw new Error('This image is too large after processing. Choose a smaller image.');return blob
 }finally{bitmap.close()}
}
