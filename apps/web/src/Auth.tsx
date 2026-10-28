import {useEffect,useState,type FormEvent} from 'react'
import {client} from './data'
import {errorText,invoke} from './account-repository'
import {callbackUrl,parseAuthCallback,type Callback} from './auth-flow'
import {Brand} from './Brand'

const key='realm.auth.continuation.v1'
let initialization:Promise<{type:Callback['type'];admission?:string;user:string}>|undefined
async function initialize(){
 const parsed=parseAuthCallback(window.location.href)
 // Remove URL credentials before rendering links or making app-data requests.
 if(parsed)history.replaceState(null,'','/auth/callback')
 if(!client)throw new Error('Account services are not configured.')
 if(parsed){
  const result=parsed.tokenHash?await client.auth.verifyOtp({token_hash:parsed.tokenHash,type:parsed.type}):await client.auth.setSession({access_token:parsed.accessToken!,refresh_token:parsed.refreshToken!})
  if(result.error||!result.data.session)throw new Error('This link has expired or is unavailable. Request a new link.')
  const value={type:parsed.type,admission:parsed.admission,user:result.data.session.user.id}
  sessionStorage.setItem(key,JSON.stringify(value));return value
 }
 const saved=JSON.parse(sessionStorage.getItem(key)??'null') as {type:Callback['type'];admission?:string;user:string}|null
 const {data,error}=await client.auth.getUser()
 if(error||!saved||saved.user!==data.user?.id||!['invite','recovery'].includes(saved.type))throw new Error('Open a valid invitation or recovery link to continue.')
 return saved
}
export function AuthCallback(){
 const [flow,setFlow]=useState<{type:Callback['type'];admission?:string;user:string}|null>(null),[password,setPassword]=useState(''),[repeat,setRepeat]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false)
 useEffect(()=>{let active=true;initialization??=initialize();void initialization.then(value=>{if(active)setFlow(value)}).catch(e=>{history.replaceState(null,'','/auth/callback');if(active)setError(errorText(e))});return()=>{active=false}},[])
 async function save(e:FormEvent){e.preventDefault();if(!flow||!client)return;if(password!==repeat){setError('The passwords do not match.');return}setBusy(true);setError('');try{
  const {data:user}=await client.auth.getUser();if(user.user?.id!==flow.user)throw new Error('Your account changed. Open the link again.')
  if(flow.type==='invite'){if(!flow.admission)throw new Error('The invitation grant is missing. Ask your administrator for a new invitation.');await invoke(client,'realm-onboarding',{token:flow.admission,password})}
  else{const result=await client.auth.updateUser({password});if(result.error)throw result.error}
  sessionStorage.removeItem(key);setPassword('');setRepeat('');await client.auth.signOut();setDone(true)
 }catch(e){setError(errorText(e))}finally{setBusy(false)}}
 return <main className="auth-page"><Brand/><section className="auth-form"><h1>{done?'Your password is saved.':flow?.type==='invite'?'Make yourself at home.':'Set a new password.'}</h1>{done?<><p>Sign in to continue. Your existing memberships and account restrictions still apply.</p><a className="primary" href="/">Go to sign in</a></>:<><p>{flow?.type==='invite'?'Your verified invitation gives you access to Realm. Set your password to continue.':'Choose a password of at least 12 characters.'}</p>{flow&&<form onSubmit={save}><label>New password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirm password<input type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={repeat} onChange={e=>setRepeat(e.target.value)}/></label><button className="primary" disabled={busy}>{busy?'Saving…':'Save password'}</button></form>}{!flow&&!error&&<p role="status">Checking your link…</p>}{error&&<p className="error" role="alert">{error}</p>}<a href="/auth/recover">Request a new recovery link</a><button onClick={()=>void client?.auth.signOut().then(()=>{sessionStorage.removeItem(key);window.location.assign('/')})}>Cancel and sign out</button></>}</section></main>
}
export function Recovery(){
 const [email,setEmail]=useState(''),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[cooldown,setCooldown]=useState(false)
 async function submit(e:FormEvent){e.preventDefault();if(!client||cooldown)return;setBusy(true);try{await client.auth.resetPasswordForEmail(email,{redirectTo:callbackUrl(location.origin,'recovery')})}catch{/* Neutral response also for transport/provider failures. */}finally{setBusy(false);setSent(true);setCooldown(true)}}
 useEffect(()=>{if(!cooldown)return;const t=setTimeout(()=>setCooldown(false),60000);return()=>clearTimeout(t)},[cooldown])
 return <main className="auth-page"><Brand/><section className="auth-form"><h1>Find your way back.</h1><p>If your address can receive recovery mail, a link will arrive shortly. Check your spam folder too.</p><form onSubmit={submit}><label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="primary" disabled={busy||cooldown||!client}>{busy?'Requesting…':cooldown?'Please wait before requesting again':'Send recovery link'}</button></form>{sent&&<p role="status">If eligible, you’ll receive a recovery link. Delivery can take a few minutes.</p>}<a href="/">Back to sign in</a></section></main>
}
