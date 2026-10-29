import {body,caller,failure,response,headers,allowedOrigins,service} from '../_shared/http.ts'
import {inspectProfileImage,readImageBody} from '../_shared/profile-images.ts'
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)})
 try{
  if(req.method!=='POST'||!allowedOrigins().includes(req.headers.get('origin')??''))throw {code:'42501',message:'Origin or method is not allowed.'}
  const {user,db}=await caller(req),access=await db.rpc('access_status');if(access.error||!access.data?.active)throw {code:'42501',message:'Account access is unavailable.'}
  const admin=service(),operation=async(args:Record<string,unknown>)=>{const result=await admin.rpc('profile_media_operation',{p_actor:user.id,...args});if(result.error)throw result.error;return result.data}
  if(req.headers.get('content-type')?.includes('application/json')){
   const input=await body(req);if(input.action!=='delete'||typeof input.id!=='string')throw {code:'22023',message:'Choose an unused upload to delete.'}
   const media=await operation({p_action:'cleanup',p_id:input.id}),removed=await admin.storage.from('realm-profiles').remove([media.object_path]);if(removed.error)throw removed.error
   await operation({p_action:'removed',p_id:input.id});return response(req,{removed:true})
  }
  const kind=req.headers.get('x-realm-slot'),client=req.headers.get('x-realm-client')
  if(!['avatar','banner','photo'].includes(kind??'')||!client||!/^[0-9a-f-]{36}$/i.test(client))throw {code:'22023',message:'Choose an account photo, banner or gallery image.'}
  const bytes=await readImageBody(req),info=inspectProfileImage(bytes)
  const media=await operation({p_action:'reserve',p_client:client,p_kind:kind,p_mime:info.mime,p_bytes:bytes.length,p_width:info.width,p_height:info.height})
  if(media.state==='deleting')throw {code:'PT409',message:'This upload is being removed. Select the file again.'}
  if(media.state!=='ready'){
   const uploaded=await admin.storage.from('realm-profiles').upload(media.object_path,bytes,{contentType:info.mime,cacheControl:'60',upsert:false})
   // A lost response may leave the exact reserved blob uploaded. It is never overwritten.
   if(uploaded.error){const existing=await admin.storage.from('realm-profiles').download(media.object_path);if(existing.error||!existing.data||existing.data.size!==bytes.length)throw uploaded.error;const old=new Uint8Array(await existing.data.arrayBuffer());if(old.some((v:number,i:number)=>v!==bytes[i]))throw {code:'PT409',message:'Upload retry differs. Select the file again.'}}
  }
  return response(req,await operation({p_action:'finish',p_id:media.id}))
 }catch(e){return failure(req,e)}
})
