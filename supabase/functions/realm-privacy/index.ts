import {body,caller,failure,response,headers} from '../_shared/http.ts'
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(req)})
 try{
  const input=await body(req),{db}=await caller(req)
  if(typeof input.job!=='string')throw {code:'22023',message:'Choose your export request.'}
  // The caller's JWT reaches the RPC, so ownership and recent Auth are checked again at download.
  const {data,error}=await db.rpc('privacy_request',{p_action:'download',p_job:input.job});if(error)throw error
  const result=response(req,data);result.headers.set('Content-Disposition','attachment; filename="realm-own-data.json"');return result
 }catch(e){return failure(req,e)}
})
