export type Memo = {id:string;body:string;pinned:boolean;created_at:string;updated_at:string}
export type ItemContent = {revision:number;notes:Memo[];reading:{title:string;url:string}[]}
export const emptyContent:ItemContent={revision:0,notes:[],reading:[]}
export function itemActionLabel(kind:string){
 return ({'coffee-table':'Open Notebook','round-table':'Open Notebook',desk:'Open Workstation',console:'Open Workstation',bookshelf:'Browse Shelf',plant:'Check Plant',bed:'Rest on Bed',lantern:'Toggle Light','floor-lamp':'Toggle Light',hearth:'Stoke Fire',sofa:'Relax',banner:'Inspect Banner'} as Record<string,string>)[kind]??'Interact'
}
export function plantMood(watered:number|undefined,now=Date.now()){
 return !watered?'Ready for water':now-watered<86400000?'Thriving':'Time for a drink'
}
export function remainingSeconds(deadline:number|null,now=Date.now()) {return deadline===null?0:Math.max(0,Math.ceil((deadline-now)/1000))}
export function sortMemos(notes:Memo[]){return [...notes].sort((a,b)=>Number(b.pinned)-Number(a.pinned)||b.updated_at.localeCompare(a.updated_at))}
