import type { Appearance } from '../appearance'
export type SocialIntent = 'chat' | 'focus' | 'group'
export type HallOccupant = {id:string;name:string;intent:SocialIntent|null;x:number;y:number;character:Partial<Appearance>;expires_at:string}
export type Contribution = {id:string;author:string;name:string;milestone:number;body:string;status:'pending'|'accepted'|'rejected';revision:number;created_at:string}
export type CommunityProject = {id:string;goal:string;description:string;milestones:string[];accepted:number[];contributions:Contribution[];revision:number;created_at:string;completed_at:string|null}
export type CommunityNotice = {id:string;author:string;name:string;body:string;resolved:boolean;revision:number;created_at:string}
export type CommunityMemory = {id:string;author:string;name:string;kind:'project'|'event'|'milestone'|'conversation';title:string;body:string;displayed:boolean;revision:number;created_at:string;updated_at:string;message_id:string|null;project_id:string|null;channel_id:string|null}
export type FocusSession = {id:string;host:string|null;title:string;started_at:string;ends_at:string;joined:boolean;participation_visible:boolean;participants:{id:string;name:string;expires_at:string}[]}
export type CommunityState = {server_now:string;can_manage:boolean;occupants:HallOccupant[];session:FocusSession|null;projects:CommunityProject[];notices:CommunityNotice[];memories:CommunityMemory[]}
export const intentLabel = (intent:SocialIntent|null) => intent?({chat:'Open to chat',focus:'Focusing',group:'Looking for a group'})[intent]:'No intent shared'
// Use a server timestamp and monotonic elapsed time: device-clock changes cannot jump the timer.
export function focusSeconds(endsAt:string,serverAtRead:string,elapsedMs:number){return Math.max(0,Math.ceil((Date.parse(endsAt)-Date.parse(serverAtRead)-Math.max(0,elapsedMs))/1000))}
export function focusClock(seconds:number){return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`}
