import {createClient} from 'npm:@supabase/supabase-js@2.49.8'
export const service=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
export function allowedOrigins(){return (Deno.env.get('REALM_ALLOWED_ORIGINS')??'').split(',').map(v=>v.trim()).filter(Boolean)}
export function headers(req:Request){const origin=req.headers.get('origin')??'';return {'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','Vary':'Origin',...(allowedOrigins().includes(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type, x-realm-slot, x-realm-client','Access-Control-Allow-Methods':'POST, OPTIONS'}:{})}}
export function response(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:headers(req)})}
export async function body(req:Request){
 if(req.method!=='POST')throw {code:'PT405',message:'Use POST.'}
 const origin=req.headers.get('origin');if(!origin||!allowedOrigins().includes(origin))throw {code:'42501',message:'Origin is not allowed.'}
 const reader=req.body?.getReader(),decoder=new TextDecoder();let text='',bytes=0
 if(reader){try{while(true){const chunk=await reader.read();if(chunk.done)break;bytes+=chunk.value.byteLength;if(bytes>8192){await reader.cancel();throw {code:'PT413',message:'Request too large.'}}text+=decoder.decode(chunk.value,{stream:true})}text+=decoder.decode()}finally{reader.releaseLock()}}
 try{return JSON.parse(text) as Record<string,unknown>}catch{throw {code:'22023',message:'Invalid JSON request.'}}
}
export async function caller(req:Request){
 const authorization=req.headers.get('Authorization')??''
 if(!authorization.startsWith('Bearer '))throw {code:'PT401',message:'Sign in required.'}
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:authorization}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})
 const {data,error}=await db.auth.getUser(authorization.slice(7));if(error||!data.user)throw {code:'PT401',message:'Sign in required.'}
 return {db,user:data.user}
}
export function failure(req:Request,error:unknown){
 const e=error as {code?:string;message?:string;details?:string};const status=e.code==='42501'?403:e.code==='22023'?400:e.code?.startsWith('PT')?Number(e.code.slice(2)):500
 const result=response(req,{error:status===500?'The operation could not be completed. Retry or contact the operator.':e.message,...(status<500?{code:e.code}:{})},status)
 if(status===429){let retry=60;try{retry=Number(JSON.parse(e.details??'{}').retry_after)||60}catch{/* A quota may omit a retry interval. */}result.headers.set('Retry-After',String(Math.max(1,Math.min(retry,86400))))}
 return result
}
