import {Brand} from './Brand'
import './loading-screen.css'

/** Decorative placeholders contain no account data or pretend controls. */
export function LoadingScreen({message='Opening Realm…'}:{message?:string}){
 const params=new URLSearchParams(window.location.search)
 const scene=['spaces','home','room-preview','hall-preview','server-hall','room-studio','hall-studio','appearance'].some(key=>params.has(key))
 const chat=!window.location.search||params.has('dm')
 return <main className="realm-loading" aria-busy="true" aria-label="Realm loading">
  <div className="realm-loading-status" role="status"><Brand/><p>{message}</p></div>
  <div className={`realm-loading-frame ${scene?'is-scene':chat?'is-chat':'is-page'}`} aria-hidden="true">
   <div className="realm-loading-rail"><span className="skeleton-block skeleton-nav"/>{Array.from({length:5},(_,i)=><span key={i} className="skeleton-block skeleton-nav"/>)}</div>
   <div className="realm-loading-sidebar"><span className="skeleton-block skeleton-title"/>{Array.from({length:6},(_,i)=><span key={i} className="skeleton-block skeleton-line"/>)}</div>
   <div className="realm-loading-content">
    <div className="realm-loading-header"><span className="skeleton-block skeleton-title"/><span className="skeleton-block skeleton-avatar"/></div>
    {scene?<div className="realm-loading-scene skeleton-block"/>:chat?<><div className="realm-loading-messages">{Array.from({length:4},(_,i)=><div className="realm-loading-message" key={i}><span className="skeleton-block skeleton-avatar"/><div><span className="skeleton-block skeleton-name"/><span className="skeleton-block skeleton-line"/><span className="skeleton-block skeleton-line"/></div></div>)}</div><div className="realm-loading-composer skeleton-block"/></>:<div className="realm-loading-rows">{Array.from({length:4},(_,i)=><div key={i}><span className="skeleton-block skeleton-name"/><span className="skeleton-block skeleton-line"/></div>)}</div>}
   </div>
  </div>
 </main>
}
