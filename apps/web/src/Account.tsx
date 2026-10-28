import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react'
import type {Session} from '@supabase/supabase-js'
import {client} from './data'
import {applyAppearance,readAppearance,setAccountAppearance,type Appearance} from './appearance'
import {appearanceFor,errorText,getIdentity,saveIdentity,type Identity,type Profile} from './account-repository'

type Account={session:Session|null;identity:Identity|null;loading:boolean;error:string;reload:()=>Promise<Identity|null>;save:(profile:Profile,value:Appearance)=>Promise<Identity>}
const Context=createContext<Account|null>(null)
export function AccountProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null),[identity,setIdentity]=useState<Identity|null>(null),[ready,setReady]=useState(!client),[error,setError]=useState('')
 const user=useRef<string|null>(null),generation=useRef(0)
 useEffect(()=>{
  if(!client)return
  let alive=true,initial=true
  const receive=(next:Session|null)=>{if(!alive)return;const id=next?.user.id??null;if(id!==user.current){user.current=id;generation.current++;setIdentity(null);setError('');setAccountAppearance(null);applyAppearance(readAppearance())}setSession(next);setReady(true)}
  const {data:{subscription}}=client.auth.onAuthStateChange((_event,next)=>{initial=false;receive(next)})
  void client.auth.getSession().then(({data,error})=>{if(initial){if(error)setError(error.message);receive(data.session)}}).catch(()=>{if(alive){setReady(true);setError('Could not restore your session. Reload to try again.')}})
  return()=>{alive=false;subscription.unsubscribe()}
 },[])
 async function reload(){
  if(!client||!user.current)return null
  const id=user.current,version=++generation.current
  try{const next=await getIdentity(client);if(user.current===id&&version===generation.current){setIdentity(next);setError('');setAccountAppearance(appearanceFor(next));applyAppearance(appearanceFor(next))}return next}
  catch(e){if(user.current===id&&version===generation.current)setError(errorText(e));throw e}
 }
 useEffect(()=>{if(!session)return;void reload().catch(()=>{});return()=>{generation.current++}},[session?.user.id])
 async function save(profile:Profile,value:Appearance){
  if(!client||!session||profile.id!==user.current)throw new Error('Sign in to save to your account.')
  const id=user.current,next=await saveIdentity(client,profile,value)
  if(user.current!==id)throw new Error('Your account changed. Sign in and reload before saving.')
  generation.current++;setIdentity(next);setError('');setAccountAppearance(appearanceFor(next));applyAppearance(appearanceFor(next));return next
 }
 const current=identity?.profile.id===session?.user.id?identity:null
 return <Context.Provider value={{session,identity:current,loading:!ready||!!session&&!current&&!error,error,reload,save}}>{children}</Context.Provider>
}
export function useAccount(){const value=useContext(Context);if(!value)throw new Error('AccountProvider is required');return value}
export function AccountGate({children}:{children:ReactNode}){
 const account=useAccount()
 if(account.loading)return <main className="setup" role="status">Loading your account…</main>
 if(!account.session)return <main className="setup"><h1>Sign in to continue.</h1><p>Profiles, friends and shared homes belong to your Realm account.</p><a href="/">Go to sign in</a></main>
 if(!account.identity)return <main className="setup"><h1>Account unavailable</h1><p role="alert">{account.error}</p><button className="primary" onClick={()=>void account.reload().catch(()=>{})}>Try again</button> <a href="/">Back to chat</a></main>
 return children
}
