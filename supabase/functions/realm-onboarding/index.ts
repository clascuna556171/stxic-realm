import {body,caller,failure,response,service,headers} from '../_shared/http.ts'
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)})
 try{
  const input=await body(req),{db,user}=await caller(req),admin=service()
  if(typeof input.token!=='string'||typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw {code:'22023',message:'Use a valid invitation and a password of 12–128 characters.'}
  const validate=await admin.rpc('complete_account_invite',{p_user:user.id,p_token:input.token,p_finish:false});if(validate.error)throw validate.error
  const changed=await db.auth.updateUser({password:input.password});if(changed.error)throw {code:'22023',message:'Password could not be saved. Check your link and password, then retry.'}
  const finished=await admin.rpc('complete_account_invite',{p_user:user.id,p_token:input.token,p_finish:true});if(finished.error)throw finished.error
  return response(req,{accepted:true})
 }catch(e){return failure(req,e)}
})
