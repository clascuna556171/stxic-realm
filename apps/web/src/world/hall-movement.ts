import { HALL, hallCatalog, type HallLayout } from './hall-layout.ts'
import type { Point } from './room.ts'
export const HALL_SPAWN:Point={x:12,y:13}
export const hallDoorPoint=(slot:number):Point=>({x:6+slot*6,y:7})
export function hallObjects(layout:HallLayout){return layout.pieces.map(p=>({...p,...hallCatalog.find(c=>c.kind===p.kind)!}))}
export function canWalkHall(p:Point,layout:HallLayout){return Number.isInteger(p.x)&&Number.isInteger(p.y)&&p.x>=1&&p.x<HALL.columns-1&&p.y>=7&&p.y<15&&!hallObjects(layout).some(o=>p.x>=o.x&&p.x<o.x+o.width&&p.y>=o.y&&p.y<o.y+o.height)}
