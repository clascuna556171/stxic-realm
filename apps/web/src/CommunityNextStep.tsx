import {useCommunity} from './world/useCommunity'

/** Membership-scoped facts only; browsing never registers presence or joins a session. */
export function CommunityNextStep({space,archived}:{space:string;archived:boolean}){
 const c=useCommunity(space,!archived),data=c.data
 const project=data?.projects.find(p=>!p.completed_at),session=data?.session
 const destination=session?'focus':project?'projects':'noticeboard'
 const url=(section:string)=>`/?server-hall=${encodeURIComponent(space)}&activity=${section}`
 return <section className="community-next-step" aria-label="What’s happening">
  <h2>What’s happening</h2>
  {archived?<p>This space is read-only. You can still read its conversations.</p>:c.error?<><p role="status">Activities are unavailable. You can keep chatting here.</p><button onClick={()=>void c.refresh().catch(()=>{})}>Retry activity summary</button><a href={url('focus')}>Check shared hall access</a></>:!data?<p role="status">Checking community activities…</p>:<>
   <p>{session?<>Focus session: <strong>{session.title}</strong></>:project?<>Project open: <strong>{project.goal}</strong></>:'No focus session or open project yet. Share an idea or ask for help.'}</p>
   {session&&project&&<p>Project open: <strong>{project.goal}</strong></p>}
   <a className="community-next-action" href={url(destination)}>{session?'Join a focus session':project?'Contribute to a project':'Open noticeboard'}</a>
   <nav aria-label="Community activities"><a href={url('focus')}>Focus</a><a href={url('projects')}>Projects</a><a href={url('memory')}>Memory</a><a href={url('hall')}>Shared hall</a></nav>
  </>}
 </section>
}
