import {useEffect,useMemo,useRef,useState} from 'react'
import {SpeechLifecycle,bubbleFrame,typingActive,wrapSpeech,type WorldSnapshot,type FocusState} from './activity-state'
export function TravelerActivity({snapshot,user,x,y,focus}:{snapshot:WorldSnapshot;user:string;x:number;y:number;focus:FocusState}){
 const life=useRef(new SpeechLifecycle()),joined=useRef(Date.now()),[now,setNow]=useState(Date.now()),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)
 const measure=useMemo(()=>{const context=document.createElement('canvas').getContext('2d');if(context)context.font='11px "Segoe UI", sans-serif';return (text:string)=>context?.measureText(text).width??Array.from(text).length*12},[])
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(media.matches);media.addEventListener('change',change);const timer=setInterval(()=>setNow(Date.now()),80);return()=>{clearInterval(timer);media.removeEventListener('change',change);life.current.clear()}},[])
 for(const message of snapshot.messages)if(message.author_id===user&&Date.parse(message.created_at)>=joined.current)life.current.receive(message,now)
 life.current.tick(now)
 const bubble=life.current.bubbles.get(user),presence=snapshot.activity.find(a=>a.user_id===user),typing=typingActive(presence?.typing_until??null,now),focused=focus.status==='running'&&focus.deadline!==null&&focus.deadline>now
 const content=bubble?.text??(typing?(reduced?'...':'.'.repeat(Math.floor(now/350)%3+1)):focused?`⚡ ${Math.ceil((focus.deadline!-now)/60000)}m`:'')
 const lines=wrapSpeech(content,144,measure),width=Math.min(160,Math.max(38,...lines.map(line=>Math.ceil(measure(line))+16))),height=lines.length*15+12,frame=bubble?bubbleFrame(bubble,now,reduced):{opacity:1,rise:0}
 const extra=[bubble&&typing?(reduced?'...':'.'.repeat(Math.floor(now/350)%3+1)):'',focused&&(bubble||typing)?`⚡ ${Math.ceil((focus.deadline!-now)/60000)}m`:''].filter(Boolean).join('   '),extraWidth=measure(extra)+16,extraX=Math.max(extraWidth/2+3,Math.min(768-extraWidth/2-3,x))
 const left=Math.max(3,Math.min(768-width-3,x-width/2)),top=Math.max(3,y-64-height-frame.rise),tail=Math.max(6,Math.min(width-6,x-left))
 return <g className="hall-speech" aria-hidden="true">{focused&&<ellipse cx={x} cy={y-24} rx="35" ry="27" fill="#9bdaeb" opacity=".14"/>}{content&&<g transform={`translate(${left} ${top})`} opacity={frame.opacity}><path d={`M0 0H${width}V${height}H${tail+5}L${tail} ${height+5}L${tail-5} ${height}H0Z`} fill="#161922" stroke="#77818f" strokeWidth="2"/>{lines.map((line,i)=><text key={i} x="8" y={17+i*15}>{line}</text>)}</g>}{extra&&<g transform={`translate(${extraX} ${Math.max(20,y-48)})`}><rect x={-extraWidth/2} y="-14" width={extraWidth} height="18" fill="#161922" stroke="#77818f"/><text textAnchor="middle">{extra}</text></g>}</g>
}
