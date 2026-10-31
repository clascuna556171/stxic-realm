import type Phaser from 'phaser'
import {SpeechLifecycle,bubbleFrame,typingActive,type WorldSnapshot,type FocusState} from './activity-state'

type Anchor={container:Phaser.GameObjects.Container}
export function activityOverlay(scene:Phaser.Scene,actors:()=>Map<string,Anchor>,snapshot:()=>WorldSnapshot,localId:string,focus:()=>FocusState|undefined){
 const lifecycle=new SpeechLifecycle(),joined=Date.now(),motion=matchMedia('(prefers-reduced-motion: reduce)')
 type Overlay={container:Phaser.GameObjects.Container;text:Phaser.GameObjects.Text;status:Phaser.GameObjects.Text;frame:Phaser.GameObjects.Graphics;glow:Phaser.GameObjects.Image;key:string;width:number;height:number}
 const overlays=new Map<string,Overlay>()
 const textureKey='realm-focus-glow'
 if(!scene.textures.exists(textureKey)){
  const texture=scene.textures.createCanvas(textureKey,96,96)!,ctx=texture.context,gradient=ctx.createRadialGradient(48,48,0,48,48,48)
  gradient.addColorStop(0,'#9bdaeb80');gradient.addColorStop(1,'#9bdaeb00');ctx.fillStyle=gradient;ctx.fillRect(0,0,96,96);texture.refresh()
 }
 const tick=()=>{
  const now=Date.now(),state=snapshot(),anchors=actors(),mine=focus()
  for(const message of state.messages)if(Date.parse(message.created_at)>=joined)lifecycle.receive(message,now)
  lifecycle.tick(now)
  for(const [id,overlay] of overlays)if(!anchors.has(id)){overlay.container.destroy(true);overlay.status.destroy();overlay.glow.destroy();overlays.delete(id);lifecycle.bubbles.delete(id)}
  for(const [id,actor] of anchors){
   const presence=state.activity.find(value=>value.user_id===id),bubble=lifecycle.bubbles.get(id)
   const deadline=id===localId?(mine?.status==='running'?mine.deadline:null):presence?.focus_until?Date.parse(presence.focus_until):null
   const focused=deadline!==null&&deadline>now,typing=typingActive(presence?.typing_until??null,now)
   const content=bubble?.text??(typing?(motion.matches?'...':'.'.repeat(Math.floor(now/350)%3+1)):focused?`⚡ ${Math.ceil((deadline!-now)/60000)}m`:'')
   let overlay=overlays.get(id)
   if(!content&&!focused){if(overlay){overlay.container.destroy(true);overlay.status.destroy();overlay.glow.destroy();overlays.delete(id)}continue}
   if(!overlay){
    const frame=scene.add.graphics(),text=scene.add.text(8,6,'',{fontFamily:'"Segoe UI", sans-serif',fontSize:'11px',color:'#e6e8ee',wordWrap:{width:144,useAdvancedWrap:true}})
    const container=scene.add.container(0,0,[frame,text]).setDepth(20000),glow=scene.add.image(0,0,textureKey).setDepth(19999).setAlpha(.4).setDisplaySize(76,58)
    const status=scene.add.text(0,0,'',{fontFamily:'"Segoe UI", sans-serif',fontSize:'10px',color:'#e6e8ee',backgroundColor:'#161922',padding:{x:5,y:3}}).setOrigin(.5,1).setDepth(20001)
    overlay={container,text,status,frame,glow,key:'',width:0,height:0};overlays.set(id,overlay)
   }
   // Reuse the same container on replacement; animation clocks reset in the lifecycle.
   if(overlay.key!==content){
    overlay.key=content;overlay.text.setText(content);overlay.width=Math.min(160,Math.ceil(overlay.text.width)+16);overlay.height=Math.ceil(overlay.text.height)+12
   }
   const frame=bubble?bubbleFrame(bubble,now,motion.matches):{opacity:1,rise:0}
   const x=Math.max(3,Math.min(scene.scale.width-overlay.width-3,actor.container.x-overlay.width/2))
   const y=Math.max(3,actor.container.y-64-overlay.height-frame.rise),tail=Math.max(6,Math.min(overlay.width-6,actor.container.x-x))
   overlay.frame.clear().fillStyle(0x77818f).fillRect(0,0,overlay.width,overlay.height).fillStyle(0x161922).fillRect(2,2,overlay.width-4,overlay.height-4)
   overlay.frame.fillStyle(0x77818f).fillTriangle(tail-5,overlay.height-1,tail+5,overlay.height-1,tail,overlay.height+5).fillStyle(0x161922).fillTriangle(tail-3,overlay.height-2,tail+3,overlay.height-2,tail,overlay.height+2)
   overlay.container.setPosition(x,y).setAlpha(frame.opacity)
   const extra=[bubble&&typing?(motion.matches?'...':'.'.repeat(Math.floor(now/350)%3+1)):'',focused&&(bubble||typing)?`⚡ ${Math.ceil((deadline!-now)/60000)}m`:''].filter(Boolean).join('   ')
   overlay.status.setText(extra).setVisible(!!extra).setPosition(Math.max(overlay.status.width/2+3,Math.min(scene.scale.width-overlay.status.width/2-3,actor.container.x)),Math.max(overlay.status.height+3,actor.container.y-47))
   overlay.glow.setPosition(actor.container.x,actor.container.y-25).setVisible(focused)
  }
 }
 const timer=scene.time.addEvent({delay:50,loop:true,callback:tick});tick()
 return ()=>{timer.remove();for(const overlay of overlays.values()){overlay.container.destroy(true);overlay.status.destroy();overlay.glow.destroy()}overlays.clear();lifecycle.clear()}
}
