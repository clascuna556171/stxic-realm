import Phaser from 'phaser'
import { readAppearance, type Appearance } from '../appearance'
import type { Visitor } from '../account-repository'
import { CHARACTER_HEIGHT, CHARACTER_WIDTH, characterPixels, seatedCharacterPixels, type Pixel } from '../character'
import { ROOM, type Direction, type Point, type RoomObject, type RoomAction } from './room'
import { facingFrom, samePoint } from './navigation'
import { furniturePixels, roomPixels, furnitureActionForeground } from './art'
import { roomLighting } from './lighting'
import { furniturePose } from './furniture-pose'
import {activityOverlay} from './activity-overlay'
import type {WorldSnapshot,FocusState} from './activity-state'

const tile = 32
export function createRoom(
 parent: HTMLElement,
 onInspect: (id: string) => void,
 getPosition: () => Point,
 getObjects: () => RoomObject[],
 options?: { activity?:()=>WorldSnapshot; localId?:string; focus?:()=>FocusState; action?:()=>RoomAction|null; lights?:()=>Record<string,boolean>; appearance?: Appearance; people?: () => Visitor[]; onWalk?: (point:Point) => void; editor?: { enabled:()=>boolean; error:(id:string,x:number,y:number)=>string|null; place:(id:string,x:number,y:number)=>void; status:(message:string)=>void } },
) {
 class RoomScene extends Phaser.Scene {
  constructor() {
   super('room')
  }
  create() {
   const appearance = options?.appearance ?? readAppearance()
   const draw = (g: Phaser.GameObjects.Graphics, pixels: Pixel[]) => {
    for (const p of pixels) {
     g.fillStyle(parseInt(p.color.slice(1), 16))
     g.fillRect(p.x, p.y, p.w, p.h)
    }
   }
   draw(this.add.graphics(), roomPixels(appearance.mood))

   let lighting: Phaser.GameObjects.Image[] = []
   let enabledLights:Record<string,boolean> = options?.lights?.()??{}
   const drawLighting = (objects: RoomObject[]) => {
    lighting.forEach(light => light.destroy())
    lighting = roomLighting(appearance.mood, objects, enabledLights).map(light => {
     const key = `realm-light-${light.color}`
     if (!this.textures.exists(key)) {
      const texture = this.textures.createCanvas(key, 128, 128)!
      const ctx = texture.context
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
      gradient.addColorStop(0, light.color)
      gradient.addColorStop(.4, `${light.color}88`)
      gradient.addColorStop(1, `${light.color}00`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 128, 128)
      texture.refresh()
     }
     return this.add.image(light.x, light.y, key).setDisplaySize(light.rx * 2, light.ry * 2).setAlpha(light.strength).setDepth(1)
    })
   }

   const onLights=(enabled:Record<string,boolean>)=>{enabledLights=enabled;drawLighting(getObjects())}
   this.game.events.on('room:lights',onLights)
   let furnishings: Phaser.GameObjects.GameObject[] = []
   let zones: Phaser.GameObjects.Zone[] = []
   const drawObjects = (objects: RoomObject[]) => {
    drawLighting(objects)
    furnishings.forEach(o => o.destroy())
    zones.forEach(o => o.destroy())
    furnishings = []
    zones = []
    for (const item of objects) {
     const baseDepth = item.y * tile + item.height * tile
     const g = this.add.graphics({ x: item.x * tile, y: item.y * tile }).setDepth(baseDepth)
     g.fillStyle(0x12131c, 0.34)
     g.fillEllipse(item.width * 16, item.height * 32 - 3, item.width * 32 + 8, 12)
     draw(g, furniturePixels(item.id, appearance.mood))
     furnishings.push(g)

     if (item.id === 'coffee-table') {
      const tag = this.add
       .text((item.x + item.width * 0.38) * tile, item.y * tile - 2, item.name, {
        fontFamily: 'Inter, "Segoe UI", sans-serif',
        fontSize: '8.5px',
        color: '#ececf4',
        backgroundColor: '#1b1926',
        padding: { x: 5, y: 2 },
       })
       .setOrigin(0.5, 1)
       .setDepth(baseDepth + 2)
      furnishings.push(tag)
     }

     const hoverRing = this.add
      .graphics({ x: item.x * tile, y: item.y * tile })
      .setDepth(baseDepth - 1)
      .setVisible(false)
     hoverRing.lineStyle(1, 0xe7c58c, 0.85)
     hoverRing.strokeRoundedRect(1, 2, item.width * tile - 2, item.height * tile - 2, 5)
     furnishings.push(hoverRing)

     const zone = this.add
      .zone((item.x + item.width / 2) * tile, (item.y + item.height / 2) * tile, item.width * tile, item.height * tile)
      .setDepth(baseDepth + 1)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => hoverRing.setVisible(true))
      .on('pointerout', () => hoverRing.setVisible(false))

     zones.push(zone)
    }
   }
   drawObjects(getObjects())
   this.game.events.on('room:layout', drawObjects)

   // One pointer path serves mouse and touch; editing never runs walking handlers.
   const preview=this.add.graphics().setDepth(10000)
   let drag:{id:string;x:number;y:number;offsetX:number;offsetY:number;last:string}|null=null
   const clearPlacement=()=>{drag=null;preview.clear()}
   const pointerTile=(p:Phaser.Input.Pointer)=>({x:Math.floor(p.x/tile),y:Math.floor(p.y/tile)})
   const hit=(p:Point)=>[...getObjects()].reverse().find(o=>p.x>=o.x&&p.x<o.x+o.width&&p.y>=o.y&&p.y<o.y+o.height)
   this.input.on('pointerdown',(pointer:Phaser.Input.Pointer)=>{
    if(pointer.button>0)return
    const p=pointerTile(pointer),item=hit(p)
    parent.focus({preventScroll:true})
    if(options?.editor){
     if(!options.editor.enabled()||!item)return
     onInspect(item.id);drag={id:item.id,x:item.x,y:item.y,offsetX:p.x-item.x,offsetY:p.y-item.y,last:''}
     const event=pointer.event as PointerEvent
     if(event.pointerId!==undefined)this.game.canvas.setPointerCapture(event.pointerId)
    }else if(item)onInspect(item.id)
    else options?.onWalk?.(p)
   })
   this.input.on('pointermove',(pointer:Phaser.Input.Pointer)=>{
    if(!drag||!options?.editor)return
    const p=pointerTile(pointer),x=p.x-drag.offsetX,y=p.y-drag.offsetY,key=`${x},${y}`
    if(drag.last===key)return
    drag.last=key
    const item=getObjects().find(o=>o.id===drag!.id)!
    const error=options.editor.error(item.id,x,y)
    preview.clear();preview.fillStyle(error?0xc86767:0xb7e7d5,.22);preview.fillRect(x*tile,y*tile,item.width*tile,item.height*tile)
    preview.lineStyle(2,error?0xffa3a3:0xb7e7d5,1);preview.strokeRect(x*tile+1,y*tile+1,item.width*tile-2,item.height*tile-2)
    if(error){preview.lineBetween(x*tile,y*tile,(x+item.width)*tile,(y+item.height)*tile);preview.lineBetween((x+item.width)*tile,y*tile,x*tile,(y+item.height)*tile)}
    options.editor.status(error?`Invalid placement: ${error}`:`Valid placement · Column ${x+1}, row ${y+1}. Release to place.`)
   })
   this.input.on('pointerup',(pointer:Phaser.Input.Pointer)=>{
    if(!drag||!options?.editor)return
    const start=drag,p=pointerTile(pointer);clearPlacement()
    const x=p.x-start.offsetX,y=p.y-start.offsetY
    if(options.editor.enabled()&&(x!==start.x||y!==start.y))options.editor.place(start.id,x,y)
   })
   const cancelPlacement=()=>{if(drag)options?.editor?.status('Placement cancelled. Original position kept.');clearPlacement()}
   this.input.on('pointerupoutside',cancelPlacement)
   window.addEventListener('blur',cancelPlacement)
   this.game.canvas.addEventListener('pointercancel',cancelPlacement)
   this.game.events.on('room:cancel-placement',cancelPlacement)

   const motion=matchMedia('(prefers-reduced-motion: reduce)')
   type Actor={container:Phaser.GameObjects.Container;art:Phaser.GameObjects.Graphics;shadow:Phaser.GameObjects.Ellipse;point:Point;direction:Direction;appearance:Appearance;until:number;sequence:number;seated:boolean}
   const baseY=-CHARACTER_HEIGHT*.66
   const paint=(actor:Actor,frame=0)=>{actor.art.clear();draw(actor.art,actor.seated?seatedCharacterPixels(actor.appearance,actor.direction):characterPixels(actor.appearance,actor.direction,frame))}
   const makeActor=(p:Point,value:Appearance):Actor=>{
    const art=this.add.graphics().setScale(.66).setPosition(-CHARACTER_WIDTH*.33,baseY)
    const shadow=this.add.ellipse(0,-2,22,7,0x12191a,.5)
    const container=this.add.container(p.x*tile+16,p.y*tile+27,[shadow,art]).setDepth((p.y+1)*tile)
    const actor={container,art,shadow,point:{...p},direction:'down' as Direction,appearance:value,until:0,sequence:-1,seated:false};paint(actor);return actor
   }
   const avatar=makeActor(getPosition(),appearance)
   const moveActor=(actor:Actor,p:Point,reset=false)=>{
    if(reset){this.tweens.killTweensOf(actor.container);actor.direction='down';actor.point={...p};actor.until=0;actor.container.setPosition(p.x*tile+16,p.y*tile+27).setDepth((p.y+1)*tile);paint(actor);return}
    if(samePoint(actor.point,p))return
    const adjacent=Math.abs(p.x-actor.point.x)+Math.abs(p.y-actor.point.y)===1
    actor.direction=facingFrom(actor.point,p,actor.direction);actor.point={...p};paint(actor)
    this.tweens.killTweensOf(actor.container)
    const x=p.x*tile+16,y=p.y*tile+27,depth=(p.y+1)*tile
    // Polling can skip tiles. Snap authoritative snapshots rather than drawing a route through obstacles.
    if(motion.matches||!adjacent){actor.container.setPosition(x,y).setDepth(depth);actor.until=0;return}
    actor.until=this.time.now+220
    this.tweens.add({targets:actor.container,x,y,duration:220,ease:'Linear',onUpdate:()=>actor.container.setDepth(actor.container.y+5),onComplete:()=>{actor.container.setDepth(depth);actor.until=0;paint(actor)}})
   }
   const position=(p:Point)=>{if(activeAction&&!samePoint(avatar.point,p))onAction(null);moveActor(avatar,p)}
   this.game.events.on('room:move',position)
   let activeAction:RoomAction|null=null
   let actionBadge:Phaser.GameObjects.Text|null=null
   let furnitureFront:Phaser.GameObjects.Graphics|null=null
   const onAction=(action:RoomAction|null)=>{
    actionBadge?.destroy();actionBadge=null
    furnitureFront?.destroy();furnitureFront=null
    const pose=furniturePose(avatar.point,action,getObjects())
    activeAction=pose?action:null
    this.tweens.killTweensOf(avatar.container);avatar.until=0
    avatar.seated=pose?.type==='sit';avatar.shadow.setVisible(!pose)
    avatar.art.setPosition(-CHARACTER_WIDTH*.33,baseY).setRotation(0)
    if(pose){
     avatar.direction=pose.direction
     avatar.container.setPosition(pose.x,pose.y).setDepth(pose.depth)
     furnitureFront=this.add.graphics({x:pose.object.x*tile,y:pose.object.y*tile}).setDepth(pose.depth+1)
     draw(furnitureFront,furnitureActionForeground(pose.kind,appearance.mood,appearance.skin))
     actionBadge=this.add.text(0,-48,pose.type==='rest'?'zZz':action!.label,{fontFamily:'Inter, sans-serif',fontSize:'8px',color:'#f3f4f8',backgroundColor:'#191b24',padding:{x:4,y:3}}).setOrigin(.5,1);avatar.container.add(actionBadge)
    }else avatar.container.setPosition(avatar.point.x*tile+16,avatar.point.y*tile+27).setDepth((avatar.point.y+1)*tile)
    paint(avatar)
   }
   this.game.events.on('room:action',onAction)
   onAction(options?.action?.()??null)
   const reconcilePose=()=>{if(activeAction)onAction(activeAction)}
   this.game.events.on('room:layout',reconcilePose)
   const guests=new Map<string,Actor>()
   const drawPeople=(people:Visitor[])=>{
    const ids=new Set(people.map(p=>p.id))
    for(const [id,actor] of guests)if(!ids.has(id)){actor.container.destroy(true);guests.delete(id)}
    for(const person of people){
     let actor=guests.get(person.id)
     if(!actor){actor=makeActor(person,{...appearance,...person.character});const label=this.add.text(0,-46,person.name.slice(0,18),{fontFamily:'Inter, sans-serif',fontSize:'9px',color:'#f5f3ff',backgroundColor:'#1d1b29',padding:{x:4,y:2}}).setOrigin(.5,1);actor.container.add(label);guests.set(person.id,actor)}
     const reset=person.sequence<actor.sequence
     actor.sequence=person.sequence;actor.appearance={...appearance,...person.character};moveActor(actor,person,reset);if(!actor.until)paint(actor)
    }
   }
   drawPeople(options?.people?.()??[])
   this.game.events.on('room:people',drawPeople)
   const disposeActivity=activityOverlay(this,()=>new Map([[options?.localId??'local',avatar],...guests]),()=>options?.activity?.()??{messages:[],activity:[]},options?.localId??'local',()=>options?.focus?.())
   const animation=this.time.addEvent({delay:85,loop:true,callback:()=>{for(const actor of [avatar,...guests.values()])if(actor.until>this.time.now&&!motion.matches)paint(actor,Math.floor(this.time.now/85)%2+1)}})
   const reduce=()=>{for(const actor of [avatar,...guests.values()]){this.tweens.killTweensOf(actor.container);actor.container.setPosition(actor.point.x*tile+16,actor.point.y*tile+27).setDepth((actor.point.y+1)*tile);actor.until=0;paint(actor)}reconcilePose()}
   motion.addEventListener('change',reduce)

   this.events.once('shutdown', () => {
    this.game.events.off('room:layout', drawObjects)
    this.game.events.off('room:layout', reconcilePose)
    this.game.events.off('room:move', position)
    this.game.events.off('room:action', onAction)
    this.game.events.off('room:lights',onLights)
    this.game.events.off('room:people', drawPeople)
    this.game.events.off('room:cancel-placement',cancelPlacement)
    this.game.canvas.removeEventListener('pointercancel',cancelPlacement)
    window.removeEventListener('blur',cancelPlacement)
    motion.removeEventListener('change',reduce)
    animation.remove()
    disposeActivity()
   })
  }
 }
 const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent,
  width: ROOM.width * tile,
  height: ROOM.height * tile,
  backgroundColor: '#11121c',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: RoomScene,
  audio: { noAudio: true },
  banner: false,
 })
 let frame=0
 const resize=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{if(game.isRunning){game.scale.getParentBounds();game.scale.refresh()}})})
 resize.observe(parent)
 game.events.once('destroy',()=>{resize.disconnect();cancelAnimationFrame(frame)})
 return game
}
