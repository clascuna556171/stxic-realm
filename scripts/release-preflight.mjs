// Local, read-only inventory. This script never contacts Supabase or reads .env files.
import {readFile, readdir} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {resolve} from 'node:path'
import {execFileSync} from 'node:child_process'
const root=resolve(import.meta.dirname,'..')
const required=['20261029000000_home_social.sql','20261029010000_shared_server_halls.sql','20261029020000_account_profiles.sql','20261029030000_profile_media_cleanup_safety.sql']
const files=await readdir(resolve(root,'supabase/migrations'))
let failed=false
for(const file of required){
 if(!files.includes(file)){console.error(`MISSING ${file}`);failed=true;continue}
 const content=await readFile(resolve(root,'supabase/migrations',file))
 console.log(`${file} sha256 ${createHash('sha256').update(content).digest('hex')}`)
}
for(const file of ['supabase/functions/realm-profile-media/index.ts','supabase/functions/realm-worker/index.ts','apps/web/.env.example']){
 try{await readFile(resolve(root,file));console.log(`PRESENT ${file}`)}catch{console.error(`MISSING ${file}`);failed=true}
}
try{console.log(`Git HEAD: ${execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()}`)
 const dirty=execFileSync('git',['status','--porcelain'],{cwd:root,encoding:'utf8'}).trim()
 console.log(dirty?'Working tree is dirty; freeze and review the exact release source.':'Working tree is clean.')
}catch{console.error('Git status unavailable');failed=true}
console.log('LOCAL INVENTORY ONLY: no hosted ledger, backup, policies, secrets, runtime or release readiness verified.')
if(failed)process.exitCode=1
