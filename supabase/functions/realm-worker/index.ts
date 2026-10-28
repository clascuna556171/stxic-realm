import {service} from '../_shared/http.ts'
async function sameSecret(actual:string,expected:string){const encode=new TextEncoder(),a=new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(actual))),b=new Uint8Array(await crypto.subtle.digest('SHA-256',encode.encode(expected)));let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0}
Deno.serve(async req=>{
 const secret=Deno.env.get('REALM_WORKER_SECRET')
 if(req.method!=='POST'||!secret||!await sameSecret(req.headers.get('Authorization')??'',`Bearer ${secret}`))return new Response(null,{status:403})
 const admin=service(),purge=await admin.rpc('run_maintenance')
 if(purge.error)return new Response(null,{status:500})
 const {data,error}=await admin.rpc('process_privacy_jobs')
 if(error)return new Response(null,{status:error.code==='42501'?403:500})
 for(const job of data as {id:string;user_id:string}[]){
  // If a previous attempt deleted Auth but lost its response, finish the same job safely.
  const lookup=await admin.auth.admin.getUserById(job.user_id)
  const missing=lookup.error?.status===404
  const result=missing?{error:null}:lookup.error?{error:lookup.error}:await admin.auth.admin.deleteUser(job.user_id)
  const finished=await admin.rpc('finish_deletion',{p_job:job.id,p_success:!result.error})
  if(finished.error)return new Response(null,{status:500})
 }
 return new Response(null,{status:204,headers:{'Cache-Control':'no-store'}})
})
