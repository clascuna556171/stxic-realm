import React, { Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AccountProvider, AccountGate, useAccount } from './Account'
import { applyAppearance, readAppearance } from './appearance'
import AppearanceStudio from './AppearanceStudio'
import './styles.css'
import './social.css'
import './administration.css'
import './world/world-theme.css'
import {AuthCallback,Recovery} from './Auth'
const Spaces=lazy(()=>import('./Spaces'))
const HallPreview=lazy(()=>import('./HallPreview'))
const SharedServerHall=lazy(()=>import('./world/SharedServerHall'))
const HallStudio=lazy(()=>import('./world/HallStudio'))
const Privacy=lazy(()=>import('./Safety').then(m=>({default:m.PrivacyPage})))
const Moderation=lazy(()=>import('./Safety').then(m=>({default:m.ModerationPage})))
const Platform=lazy(()=>import('./Platform'))
const RoomPreview=lazy(()=>import('./world/RoomPreview'))
const HomeStudio=lazy(()=>import('./world/HomeStudio'))
const SharedHome=lazy(()=>import('./world/SharedHome'))
const DirectMessages=lazy(()=>import('./DirectMessages'))
const Friends=lazy(()=>import('./Social').then(m=>({default:m.FriendsPage})))
const Profile=lazy(()=>import('./Social').then(m=>({default:m.ProfilePage})))
applyAppearance(readAppearance())
function Routes(){
 const account=useAccount(),params=new URLSearchParams(window.location.search)
 if(window.location.pathname==='/auth/callback')return <AuthCallback/>
 if(window.location.pathname==='/auth/recover')return <Recovery/>
 if(params.has('privacy'))return <Privacy key={account.session?.user.id??'signed-out'}/>
 if(account.loading)return <main className="setup" role="status">Loading your account…</main>
 if(params.has('appearance'))return account.session?<AccountGate><AppearanceStudio key={account.session.user.id}/></AccountGate>:<AppearanceStudio key="local"/>
 if(params.has('room-studio'))return account.session?<AccountGate><HomeStudio key={account.session.user.id}/></AccountGate>:<HomeStudio key="local"/>
 if(params.has('room-preview'))return <RoomPreview/>
 if(params.has('hall-preview'))return <HallPreview/>
 if(params.has('server-hall'))return <SharedServerHall key={account.session?.user.id??'guest'} space={params.get('server-hall')??''}/>
 if(params.has('hall-studio'))return account.session?<AccountGate><HallStudio key={account.session.user.id}/></AccountGate>:<HallStudio key="guest"/>
 if(params.has('home'))return <SharedHome owner={params.get('home')??''}/>
 if(params.has('friends'))return <Friends/>
 if(params.has('profile'))return <Profile/>
 if(params.has('dm'))return <DirectMessages id={params.get('dm')??''}/>
 if(params.has('spaces'))return <Spaces/>
 if(params.has('moderation'))return <Moderation/>
 if(params.has('platform'))return <Platform/>
 return <App/>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><AccountProvider><Suspense fallback={<main className="setup" role="status">Opening Realm…</main>}><Routes/></Suspense></AccountProvider></React.StrictMode>)
