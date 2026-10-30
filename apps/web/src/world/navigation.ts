import type { Direction, Point } from './room.ts'

export type Footprint = Point & { width: number; height: number }
export type WalkGoal = { point: Point; label?: string; id?: string } | { object: Footprint; label: string; id: string }
export const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y
export function facingFrom(a: Point, b: Point, fallback: Direction = 'down'): Direction {
 const dx=b.x-a.x,dy=b.y-a.y
 return dx===0&&dy===0 ? fallback : Math.abs(dx)>Math.abs(dy) ? dx>0?'right':'left' : dy>0?'down':'up'
}
export function beside(p: Point, o: Footprint) {
 return (p.x===o.x-1||p.x===o.x+o.width)&&p.y>=o.y&&p.y<o.y+o.height || (p.y===o.y-1||p.y===o.y+o.height)&&p.x>=o.x&&p.x<o.x+o.width
}
/** Cardinal BFS: the returned path excludes the start and never cuts furniture corners. */
export function findRoute(start: Point, goal: WalkGoal, walkable: (p: Point) => boolean): Point[] | null {
 const reached=(p:Point)=>'object' in goal?beside(p,goal.object):samePoint(p,goal.point)
 if(!walkable(start)||'point' in goal&&!walkable(goal.point))return null
 const key=(p:Point)=>`${p.x},${p.y}`,queue=[start],parents=new Map<string,Point|null>([[key(start),null]])
 for(let i=0;i<queue.length;i++){
  const p=queue[i]
  if(reached(p)){const path:Point[]=[];let at=p;while(!samePoint(at,start)){path.push(at);at=parents.get(key(at))!}return path.reverse()}
  for(const next of [{x:p.x,y:p.y-1},{x:p.x-1,y:p.y},{x:p.x+1,y:p.y},{x:p.x,y:p.y+1}]){
   if(!parents.has(key(next))&&walkable(next)){parents.set(key(next),p);queue.push(next)}
  }
 }
 return null
}

export type WalkState = { moving: boolean; message: string; arrived: string | null }
/** One serialized movement stream, including replacements during a server round trip. */
export function createWalker(options: {
 position: () => Point; walkable: (p: Point) => boolean; step: (p: Point) => Promise<void> | void
 changed: (state: WalkState) => void; interval?: number
}) {
 let goal:WalkGoal|null=null,version=0,running=false,active=true,timer:ReturnType<typeof setTimeout>|undefined,wake:(()=>void)|undefined
 const report=(state:WalkState)=>{if(active)options.changed(state)}
 const pause=()=>new Promise<void>(resolve=>{wake=resolve;timer=setTimeout(()=>{wake=undefined;resolve()},options.interval??240)})
 async function pump(){
  if(running)return
  running=true
  try{while(active&&goal){
   const requested=goal,generation=version,path=findRoute(options.position(),requested,options.walkable)
   if(path===null){goal=null;report({moving:false,arrived:null,message:'That destination cannot be reached. Choose another floor tile or object.'});break}
   if(!path.length){goal=null;report({moving:false,arrived:requested.id??null,message:requested.label?`Arrived at ${requested.label}. Choose an available action.`:'Destination reached.'});break}
   report({moving:true,arrived:null,message:requested.label?`Walking to ${requested.label}…`:'Walking…'})
   const before=options.position()
   try{await options.step(path[0]);if(generation===version&&samePoint(before,options.position()))throw new Error('Movement did not complete. Choose the destination again.')}catch(e){if(generation===version){goal=null;report({moving:false,arrived:null,message:e instanceof Error?e.message:'Movement stopped. Try again.'})}}
   // Even a replaced in-flight step must settle before the next request is sent.
   if(active)await pause()
  }}finally{running=false}
 }
 return {
  go(next:WalkGoal){if(!active)return;version++;goal=next;report({moving:true,arrived:null,message:'Finding a route…'});void pump()},
  cancel(message='Movement stopped.'){version++;goal=null;report({moving:false,arrived:null,message})},
  dispose(){active=false;version++;goal=null;clearTimeout(timer);wake?.()},
 }
}
