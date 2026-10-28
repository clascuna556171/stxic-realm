import {allowedOrigins,body,caller,failure,response,service,headers} from '../_shared/http.ts'
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)})
 try{
  const input=await body(req),{user}=await caller(req),admin=service()
  const action=String(input.action??'')
  if(!['list','create','revoke'].includes(action))throw {code:'22023',message:'Unknown invitation action.'}
  const call=async (operation:string,extra:Record<string,unknown>={})=>{const {data,error}=await admin.rpc('server_invitation',{p_actor:user.id,p_action:operation,...extra});if(error)throw error;return data}
  if(action==='list')return response(req,await call('list'))
  if(action==='revoke')return response(req,await call('revoke',{p_invite:input.invite}))
  const origin=String(input.origin??'')
  if(!allowedOrigins().includes(origin)||origin!==req.headers.get('origin'))throw {code:'42501',message:'Callback origin is not allowed.'}
  if(typeof input.email!=='string')throw {code:'22023',message:'Enter an email.'}
  const grant=await call('create',{p_email:input.email})
  const redirect=new URL('/auth/callback',origin);redirect.searchParams.set('flow','invite');redirect.searchParams.set('admission',grant.token)
  // Supported Auth-admin mail flow; its response means provider acceptance, not inbox delivery.
  const {data,error}=await admin.auth.admin.inviteUserByEmail(input.email.trim(),{redirectTo:redirect.href})
  await call(error?'failed':'sent',{p_invite:grant.id,p_user:data.user?.id??null})
  if(error)throw {code:'PT502',message:'The mail request failed. The invitation is recorded as failed; verify sender settings before replacing it.'}
  return response(req,{id:grant.id,delivery:'sent'})
 }catch(e){return failure(req,e)}
})
