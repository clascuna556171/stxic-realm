import {beside} from './navigation.ts'
import type {Direction,Point,RoomAction,RoomObject} from './room.ts'

export type PoseObject=RoomObject&{kind?:string}
/** Artwork anchors are pixels, never movement destinations or saved coordinates. */
export function furniturePose(position:Point,action:RoomAction|null,objects:PoseObject[]){
 const object=action&&objects.find(o=>o.id===action.target)
 if(!object||!action||!beside(position,object))return null
 const kind=object.kind??object.id
 let offset:Point,direction:Direction
 if(action.type==='sit'&&kind==='desk'){offset={x:48,y:45};direction='up'}
 else if(action.type==='sit'&&kind==='sofa'){offset={x:23,y:46};direction='down'}
 else if(action.type==='rest'&&kind==='bed'){offset={x:44,y:51};direction='down'}
 else return null
 return {x:object.x*32+offset.x,y:object.y*32+offset.y,direction,kind,object,depth:(object.y+object.height)*32+1,type:action.type}
}
