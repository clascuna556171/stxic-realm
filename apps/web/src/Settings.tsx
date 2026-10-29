import {WorkspaceNav} from './WorkspaceNav'
import {Icon} from './Icon'
import {useAccount} from './Account'
import './settings.css'

export default function Settings(){
 const {session}=useAccount()
 return <main className="workspace-page settings-page"><WorkspaceNav current="settings"/><header className="workspace-header"><strong>App settings</strong><a href="/">Back to chat <Icon name="back"/></a></header><div className="settings-content"><h1>Make Realm yours.</h1><p className="muted">Your account, your interface and your spaces. Choose what you want to change.</p><section aria-labelledby="settings-account"><h2 id="settings-account">Account & app</h2><div className="settings-destinations">
 <a href={session?'/?profile':'/'}><Icon name="profile"/><span><strong>Your profile</strong><small>Account photo, banner, bio and profile style</small></span><Icon name="arrow"/></a>
 <a href="/?appearance&section=interface#interface-settings"><Icon name="settings"/><span><strong>Interface & colors</strong><small>Private app accent and logo color</small></span><Icon name="arrow"/></a>
 <a href="/?privacy"><Icon name="shield"/><span><strong>Privacy & data</strong><small>Blocked accounts, exports and account deletion</small></span><Icon name="arrow"/></a>
 </div></section><section aria-labelledby="settings-world"><h2 id="settings-world">Your world</h2><div className="settings-destinations">
 <a href="/?appearance"><Icon name="avatar"/><span><strong>Character</strong><small>Your pixel character, clothes and accessories</small></span><Icon name="arrow"/></a>
 <a href="/?room-studio"><Icon name="studio"/><span><strong>Home Studio</strong><small>Room layout and who can visit</small></span><Icon name="arrow"/></a>
 <a href={session?`/?home=${session.user.id}#home-social`:'/?room-preview'}><Icon name="book"/><span><strong>Guestbook & project links</strong><small>Home visitors, posting rules and your shared links</small></span><Icon name="arrow"/></a>
 <a href="/?hall-studio"><Icon name="hall"/><span><strong>Personal hall</strong><small>Your hub arrangement on this device</small></span><Icon name="arrow"/></a>
 </div></section><p className="muted">Your account photo and pixel character are separate. Save changes in the editor you open.</p></div></main>
}
