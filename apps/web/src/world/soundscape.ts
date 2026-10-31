export const soundNames={rain:'Gentle Rain',embers:'Hearth Embers',crickets:'Night Crickets',lofi:'Lofi Focus'} as const
export type Sound=keyof typeof soundNames
export type Mix=Record<Sound,{enabled:boolean;volume:number}>
export const initialMix:Mix={rain:{enabled:false,volume:.35},embers:{enabled:false,volume:.3},crickets:{enabled:false,volume:.25},lofi:{enabled:false,volume:.3}}
/** Periodic synthesis makes the endpoints continuous; no network media or playback timers. */
export function synthesize(sound:Sound,rate:number,seconds=8){
 const data=new Float32Array(rate*seconds),length=data.length
 let seed=7183,low=0
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296*2-1}
 for(let i=0;i<length;i++){
  const t=i/rate,phase=t/seconds*Math.PI*2,noise=random();low=.97*low+.03*noise
  if(sound==='rain')data[i]=noise*.16+low*.8
  if(sound==='embers')data[i]=low*.9+noise*Math.pow(Math.max(0,Math.sin(phase*17)),24)*.12
  if(sound==='crickets')data[i]=Math.sin(2*Math.PI*3200*t)*Math.pow(Math.max(0,Math.sin(phase*24)),12)*(.12+.04*Math.sin(phase))
  if(sound==='lofi'){
   const chord=[130.875,164.875,196.125].reduce((sum,hz)=>sum+Math.sin(2*Math.PI*hz*t),0)*.05
   const beat=(t%.5)/.5,envelope=Math.exp(-beat*18)
   data[i]=chord+Math.sin(2*Math.PI*60*t)*envelope*.13+low*.08
  }
 }
 // Equal-power overlaps aren't necessary here: a tiny endpoint taper removes noise discontinuities.
 const fade=Math.min(rate*.02,length/2)
 for(let i=0;i<fade;i++){const gain=.5-.5*Math.cos(Math.PI*i/fade);data[i]*=gain;data[length-1-i]*=gain}
 return data
}
export class Soundscape {
 private context:AudioContext
 private master:GainNode
 private tracks=new Map<Sound,{source:AudioBufferSourceNode;gain:GainNode}>()
 private disposed=false
 constructor(){this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=.65;this.master.connect(this.context.destination)}
 async resume(){await this.context.resume()}
 update(mix:Mix,muted:boolean){
  if(this.disposed)return
  this.master.gain.setTargetAtTime(muted?0:.65,this.context.currentTime,.04)
  for(const sound of Object.keys(soundNames) as Sound[]){
   const value=mix[sound];let track=this.tracks.get(sound)
   if(!value.enabled){if(track){track.source.stop();track.source.disconnect();track.gain.disconnect();this.tracks.delete(sound)}continue}
   if(!track){
    const source=this.context.createBufferSource(),gain=this.context.createGain(),data=synthesize(sound,this.context.sampleRate)
    const buffer=this.context.createBuffer(1,data.length,this.context.sampleRate);buffer.copyToChannel(data,0);source.buffer=buffer;source.loop=true
    gain.gain.value=0;source.connect(gain);gain.connect(this.master);source.start();track={source,gain};this.tracks.set(sound,track)
   }
   track.gain.gain.setTargetAtTime(Math.max(0,Math.min(1,value.volume)),this.context.currentTime,.04)
  }
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const track of this.tracks.values()){track.source.stop();track.source.disconnect();track.gain.disconnect()}this.tracks.clear();this.master.disconnect();void this.context.close().catch(()=>{})}
}
