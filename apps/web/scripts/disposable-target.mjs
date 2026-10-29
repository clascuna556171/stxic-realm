import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'
// Defense in depth only: an operator must independently verify any target is disposable.
export function requireDisposableTarget(value){
 let target
 try{target=new URL(value)}catch{throw new Error('A valid disposable project URL is required.')}
 if(target.username||target.password||target.search||target.hash||target.pathname!=='/'||!['https:','http:'].includes(target.protocol))throw new Error('Use the exact disposable project origin.')
 let linked=''
 try{linked=readFileSync(resolve(import.meta.dirname,'../../../supabase/.temp/project-ref'),'utf8').trim()}catch{/* The checkout might not be linked. */}
 const host=target.hostname.toLowerCase(),knownDevelopment='rrprjxubfdixoqvquptq'
 if([linked.toLowerCase(),knownDevelopment].filter(Boolean).some(ref=>host===ref||host.startsWith(ref+'.')))throw new Error('Refusing the linked or known development project.')
 if(process.env.REALM_DISPOSABLE_TEST_CONFIRM!==target.origin)throw new Error('Independently verify the disposable target, then set REALM_DISPOSABLE_TEST_CONFIRM to its exact origin.')
}
