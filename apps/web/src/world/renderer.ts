import Phaser from 'phaser'
import { readAppearance, type Appearance } from '../appearance'
import type { Visitor } from '../account-repository'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels, type Pixel } from '../character'
import { ROOM, type Point, type RoomObject } from './room'
import { furniturePixels, roomPixels } from './art'

const tile=32
export function createRoom(parent:HTMLElement,onInspect:(id:string)=>void,getPosition:()=>Point,getObjects:()=>RoomObject[],options?:{appearance?:Appearance;people?:()=>Visitor[]}) {
 class RoomScene extends Phaser.Scene {
  constructor(){super('room')}
  create(){
   const appearance=options?.appearance??readAppearance()
   const draw=(g:Phaser.GameObjects.Graphics,pixels:Pixel[])=>{for(const p of pixels){g.fillStyle(parseInt(p.color.slice(1),16));g.fillRect(p.x,p.y,p.w,p.h)}}
   draw(this.add.graphics(),roomPixels(appearance.mood))
   let furnishings:Phaser.GameObjects.Graphics[]=[]
   let zones:Phaser.GameObjects.Zone[]=[]
   const drawObjects=(objects:RoomObject[])=>{
    furnishings.forEach(o=>o.destroy());zones.forEach(o=>o.destroy());furnishings=[];zones=[]
    for(const item of objects){
     const g=this.add.graphics({x:item.x*tile,y:item.y*tile}).setDepth(item.y*tile+item.height*tile)
     g.fillStyle(0x171820,.2);g.fillEllipse(item.width*16,item.height*32-4,item.width*32+8,12)
     draw(g,furniturePixels(item.id));furnishings.push(g)
     zones.push(this.add.zone((item.x+item.width/2)*tile,(item.y+item.height/2)*tile,item.width*tile,item.height*tile).setDepth(item.y*tile+item.height*tile+1).setInteractive({useHandCursor:true}).on('pointerdown',()=>onInspect(item.id)))
    }
   }
   drawObjects(getObjects());this.game.events.on('room:layout',drawObjects)
   const sprite=this.add.graphics();draw(sprite,characterPixels(appearance));sprite.setPosition(-CHARACTER_WIDTH*.33,-CHARACTER_HEIGHT*.66).setScale(.66)
   const shadow=this.add.ellipse(0,-2,22,7,0x171820,.3)
   const avatar=this.add.container(0,0,[shadow,sprite])
   const position=(p:Point)=>{avatar.setPosition(p.x*tile+16,p.y*tile+27).setDepth((p.y+1)*tile)}
   position(getPosition());this.game.events.on('room:move',position)
   let guests:Phaser.GameObjects.Container[]=[]
   const drawPeople=(people:Visitor[])=>{
    guests.forEach(g=>g.destroy(true));guests=[]
    for(const person of people){
     const art=this.add.graphics();draw(art,characterPixels({...appearance,...person.character}));art.setScale(.66).setPosition(-CHARACTER_WIDTH*.33,-CHARACTER_HEIGHT*.66)
     const shadow=this.add.ellipse(0,-2,22,7,0x171820,.3)
     const label=this.add.text(0,-48,person.name.slice(0,18),{fontFamily:'Segoe UI',fontSize:'9px',color:'#ffffff',backgroundColor:'#24232c',padding:{x:3,y:2}}).setOrigin(.5,1)
     guests.push(this.add.container(person.x*tile+16,person.y*tile+27,[shadow,art,label]).setDepth((person.y+1)*tile))
    }
   }
   drawPeople(options?.people?.()??[]);this.game.events.on('room:people',drawPeople)
   this.events.once('shutdown',()=>{this.game.events.off('room:layout',drawObjects);this.game.events.off('room:move',position);this.game.events.off('room:people',drawPeople)})
  }
 }
 return new Phaser.Game({type:Phaser.AUTO,parent,width:ROOM.width*tile,height:ROOM.height*tile,backgroundColor:'#181b23',pixelArt:true,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:RoomScene,audio:{noAudio:true}})
}
