import {body,caller,failure,headers} from './http.ts'
function assert(value:unknown,message:string){if(!value)throw new Error(message)}
Deno.test('CORS requires an exact configured origin and never reflects an attacker origin',()=>{
 Deno.env.set('REALM_ALLOWED_ORIGINS','http://127.0.0.1:5175,https://realm.example')
 assert(headers(new Request('https://edge.example',{headers:{Origin:'https://realm.example'}}))['Access-Control-Allow-Origin']==='https://realm.example','allowed origin missing')
 assert(!('Access-Control-Allow-Origin'in headers(new Request('https://edge.example',{headers:{Origin:'https://realm.example.evil'}}))),'reflected attacker origin')
})
Deno.test('input rejects unallowlisted origins, malformed JSON, oversized bodies and wrong methods',async()=>{
 Deno.env.set('REALM_ALLOWED_ORIGINS','https://realm.example')
 for(const req of [new Request('https://edge.example'),new Request('https://edge.example',{method:'POST',body:'{}',headers:{Origin:'https://evil.example'}}),new Request('https://edge.example',{method:'POST',body:'bad',headers:{Origin:'https://realm.example'}}),new Request('https://edge.example',{method:'POST',body:'x'.repeat(8200),headers:{Origin:'https://realm.example'}})]){
  let rejected=false;try{await body(req)}catch{rejected=true}assert(rejected,'unsafe input accepted')
 }
})
Deno.test('handlers return denial/conflict/throttle status and a bounded retry interval',()=>{
 const req=new Request('https://edge.example')
 assert(failure(req,{code:'42501',message:'Denied'}).status===403,'denial status')
 assert(failure(req,{code:'PT409',message:'Conflict'}).status===409,'conflict status')
 const throttled=failure(req,{code:'PT429',message:'Wait',details:'{"retry_after":10}'})
 assert(throttled.status===429&&throttled.headers.get('Retry-After')==='10','throttle status')
 assert(failure(req,{message:'sensitive internal detail'}).status===500,'internal failure status')
})
Deno.test('privileged caller verification rejects a missing bearer before any admin operation',async()=>{
 let rejected=false;try{await caller(new Request('https://edge.example'))}catch{rejected=true}assert(rejected,'missing bearer accepted')
})
