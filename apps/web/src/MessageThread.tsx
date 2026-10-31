import {useTyping} from './world/useWorldActivity'
import {useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react'
import {useAccount} from './Account'
import {errorText,publicIdentities,rpc,type PublicIdentity} from './account-repository'
import {client} from './data'
import {MemberPortrait} from './Social'
import {draftKey,historyPage,mergeMessages,recoverStream,sameDraft,type StreamKind,type StreamMessage} from './stream-repository'
import {listSpaces,listChannels} from './space-repository'
import {ReportForm} from './Safety'

function SmileIcon({size=18}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
}
function PencilIcon({size=18}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
}
function ReplyIcon({size=18}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
}
function ForwardIcon({size=18}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 0 1 4-4h12"/></svg>
}
function DotsIcon({size=18}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
}
function CopyIcon({size=16}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
}
function PinIcon({size=16}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-2l-2-2V5a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v8l-2 2v2z"/></svg>
}
function TrashIcon({size=16}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
}
function FlagIcon({size=16}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
}
function SearchIcon({size=16}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}
function CheckIcon({size=16}:{size?:number}){
 return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
}

const DEFAULT_QUICK_REACTIONS = ['😆', '👍', '❤️']

function loadQuickReactions(): string[] {
 try {
  const saved = localStorage.getItem('realm:quick-reactions')
  if (saved) {
   const parsed = JSON.parse(saved)
   if (Array.isArray(parsed) && parsed.length > 0 && parsed.every(x => typeof x === 'string')) {
    return parsed.slice(0, 3)
   }
  }
 } catch {}
 return DEFAULT_QUICK_REACTIONS
}

function saveQuickReactions(emojis: string[]) {
 try {
  localStorage.setItem('realm:quick-reactions', JSON.stringify(emojis.slice(0, 3)))
 } catch {}
}

const EMOJI_CATEGORIES = [
 {
  name: 'Frequently Used & Reactions',
  emojis: [
   { e: '😆', k: 'laugh lol rofl haha funny smile' },
   { e: '👍', k: 'thumbs up yes ok good approve agree like' },
   { e: '❤️', k: 'heart love red romance' },
   { e: '🍴', k: 'fork knife food eat dinner lunch meal dining restaurant' },
   { e: '🔥', k: 'fire lit hot flame burn' },
   { e: '🎉', k: 'party celebrate celebration tada party popper' },
   { e: '😂', k: 'joy laugh cry tears rofl' },
   { e: '💀', k: 'skull dead dying rip' },
   { e: '✨', k: 'sparkles shine magic star' },
   { e: '👀', k: 'eyes look seeing stare glance' },
   { e: '💯', k: '100 hundred perfect score full' },
   { e: '🙌', k: 'hands praise celebrate yay hooray' },
   { e: '👏', k: 'clap applause bravo well done' },
   { e: '🚀', k: 'rocket launch fast moon boost' }
  ]
 },
 {
  name: 'Smileys & Emotion',
  emojis: [
   { e: '😀', k: 'grinning smile happy face' },
   { e: '😃', k: 'happy smile joy big grin' },
   { e: '😄', k: 'smile happy laugh eyes' },
   { e: '😁', k: 'grin smiling teeth beaming' },
   { e: '😆', k: 'laugh haha lol closed eyes' },
   { e: '😅', k: 'sweat smile relief nervous' },
   { e: '😂', k: 'joy tears laugh crying laughing' },
   { e: '🤣', k: 'rofl rolling floor laughing funny' },
   { e: '🥲', k: 'smile tear bittersweet happy sad' },
   { e: '🥹', k: 'pleading holding tears moved emotional' },
   { e: '😊', k: 'blush smile happy warm' },
   { e: '😇', k: 'angel innocent halo good' },
   { e: '🙂', k: 'slightly smiling calm fine' },
   { e: '🙃', k: 'upside down silly sarcasm ironical' },
   { e: '😉', k: 'wink playful flirt tease' },
   { e: '😌', k: 'relieved peaceful calm zen' },
   { e: '😍', k: 'heart eyes love crush adore' },
   { e: '🥰', k: 'smiling hearts affectionate love loved' },
   { e: '😘', k: 'blow kiss love romance mwah' },
   { e: '😋', k: 'yum delicious tongue tasty food' },
   { e: '😛', k: 'tongue silly goofy playful' },
   { e: '😜', k: 'tongue wink party fun crazy' },
   { e: '🤪', k: 'zany goofy crazy wild' },
   { e: '🤨', k: 'eyebrow skeptical suspicious hmm' },
   { e: '🧐', k: 'monocle curious smart inspect' },
   { e: '🤓', k: 'nerd glasses geek smart code' },
   { e: '😎', k: 'cool sunglasses boss awesome chill' },
   { e: '🤩', k: 'star struck excited amazed wow' },
   { e: '🥳', k: 'party horn celebrate birthday' },
   { e: '😏', k: 'smirk flirt sassy sly' },
   { e: '😒', k: 'unamused annoyed bored whatever' },
   { e: '😞', k: 'disappointed sad regret down' },
   { e: '😔', k: 'pensive thoughtful sad down' },
   { e: '😟', k: 'worried nervous anxious concern' },
   { e: '😕', k: 'confused puzzled unsure' },
   { e: '🙁', k: 'frown sad slightly unhappy' },
   { e: '☹️', k: 'sad unhappy down frown' },
   { e: '🥺', k: 'pleading puppy eyes please beg' },
   { e: '😢', k: 'cry tear sad weeping' },
   { e: '😭', k: 'sob crying loudly bawling' },
   { e: '😤', k: 'triumph huff steam proud angry' },
   { e: '😠', k: 'angry mad grr annoyed' },
   { e: '😡', k: 'pouting rage furious red mad' },
   { e: '🤬', k: 'swearing curse angry mad symbols' },
   { e: '🤯', k: 'exploding head mind blown shocked' },
   { e: '😳', k: 'flushed embarrassed stunned red' },
   { e: '🥵', k: 'hot sweating heat spicy warm' },
   { e: '🥶', k: 'cold freezing ice winter blue' },
   { e: '😱', k: 'scream shock scared afraid terror' },
   { e: '😨', k: 'fearful scared fright fear' },
   { e: '😰', k: 'anxious blue sweat nervous' },
   { e: '😥', k: 'sad relieved whew close' },
   { e: '🤗', k: 'hugging open arms warm friendly' },
   { e: '🤔', k: 'thinking hmm wonder ponder consider' },
   { e: '🫡', k: 'salute respect yes sir captain' },
   { e: '🤫', k: 'shh quiet secret silent' },
   { e: '😐', k: 'neutral poker face straight' },
   { e: '😑', k: 'expressionless blank fine' },
   { e: '😬', k: 'grimace awkward oof yikes' },
   { e: '🫠', k: 'melting dissolving disappearing heat' },
   { e: '🙄', k: 'eye roll whatever duh' },
   { e: '😯', k: 'surprised wow oh gasped' },
   { e: '😴', k: 'sleeping zzz tired bedtime sleep' },
   { e: '🤤', k: 'drooling hungry crave sleep' },
   { e: '😵', k: 'dizzy dead knocked out spiral' },
   { e: '🤐', k: 'zipper mouth silent secret hush' },
   { e: '🥴', k: 'woozy drunk unsteady dizzy' },
   { e: '🤢', k: 'nauseated sick gross disgust green' },
   { e: '🤮', k: 'vomiting barf puke sick disgust' },
   { e: '🤧', k: 'sneezing tissue cold sick allergy' },
   { e: '😷', k: 'mask sick hospital medical flu' },
   { e: '🤠', k: 'cowboy hat western yeehaw' },
   { e: '🤡', k: 'clown circus funny fool' },
   { e: '💩', k: 'poop funny crap crap dung' },
   { e: '👻', k: 'ghost spooky halloween boo spirit' },
   { e: '💀', k: 'skull dead skeleton bone dying' },
   { e: '👽', k: 'alien ufo extraterrestrial martian' },
   { e: '🤖', k: 'robot bot tech ai machine' }
  ]
 },
 {
  name: 'Gestures & People',
  emojis: [
   { e: '👋', k: 'wave hello goodbye hi hey' },
   { e: '✋', k: 'hand stop five high five' },
   { e: '🖖', k: 'vulcan spock trek live long prosper' },
   { e: '👌', k: 'ok hand perfect fine nice' },
   { e: '🤌', k: 'pinched fingers italian mama mia what' },
   { e: '🤏', k: 'pinching hand small little tiny bit' },
   { e: '✌️', k: 'peace victory two v sign' },
   { e: '🤞', k: 'fingers crossed luck hope wishing' },
   { e: '🫰', k: 'hand heart snap kpop love money' },
   { e: '🤟', k: 'love you gesture ily sign' },
   { e: '🤘', k: 'rock on metal horns rock' },
   { e: '🤙', k: 'call me shaka hang loose aloha' },
   { e: '👈', k: 'point left back index' },
   { e: '👉', k: 'point right next index' },
   { e: '👆', k: 'point up above index' },
   { e: '👇', k: 'point down below index' },
   { e: '🫵', k: 'pointing at you index targeting' },
   { e: '👍', k: 'thumbs up like good yes approve' },
   { e: '👎', k: 'thumbs down dislike bad no disapprove' },
   { e: '✊', k: 'fist power strength solid' },
   { e: '👊', k: 'punch brofist fist bump smash' },
   { e: '👏', k: 'clap applause congrats brava' },
   { e: '🙌', k: 'raising hands celebrate praise cheer' },
   { e: '🫶', k: 'heart hands love care' },
   { e: '🤝', k: 'handshake deal agree partnership' },
   { e: '🙏', k: 'pray please thank you folded hands namaste' },
   { e: '💪', k: 'muscle flex strong gym power bicep' },
   { e: '👀', k: 'eyes look see peep watch' },
   { e: '🧠', k: 'brain smart think mind intelligence' }
  ]
 },
 {
  name: 'Hearts, Symbols & Items',
  emojis: [
   { e: '❤️', k: 'red heart love romance passion' },
   { e: '🧡', k: 'orange heart warm care' },
   { e: '💛', k: 'yellow heart sunny friendship' },
   { e: '💚', k: 'green heart nature env' },
   { e: '💙', k: 'blue heart calm trust' },
   { e: '💜', k: 'purple heart regal' },
   { e: '🖤', k: 'black heart dark emo' },
   { e: '🤍', k: 'white heart pure peace' },
   { e: '🤎', k: 'brown heart earth chocolate' },
   { e: '💔', k: 'broken heart heartbreak sad dump' },
   { e: '❤️‍🔥', k: 'heart on fire passion burning hot' },
   { e: '❤️‍🩹', k: 'mending heart healing recovery' },
   { e: '💖', k: 'sparkling heart love sparkle shine' },
   { e: '🔥', k: 'fire flame lit hot trend' },
   { e: '✨', k: 'sparkles stars magic sparkle glow' },
   { e: '⭐', k: 'star favorite rating yellow' },
   { e: '🌟', k: 'glowing star shine bright' },
   { e: '⚡', k: 'lightning bolt zap energy electricity fast' },
   { e: '💥', k: 'boom collision explosion blast pow' },
   { e: '💯', k: 'hundred percent perfect score real' },
   { e: '🎉', k: 'party celebration tada popper festive' },
   { e: '🎊', k: 'confetti ball celebration fiesta' },
   { e: '🏆', k: 'trophy winner champion cup prize gold' },
   { e: '🥇', k: 'first medal gold winner 1st' },
   { e: '👑', k: 'crown king queen royal royalty prince' },
   { e: '💎', k: 'diamond gem rich jewelry shiny' },
   { e: '🚀', k: 'rocket launch blast speed space' },
   { e: '✅', k: 'check mark done complete correct pass' },
   { e: '❌', k: 'cross mark x wrong no reject fail' },
   { e: '⚠️', k: 'warning alert caution danger attention' }
  ]
 },
 {
  name: 'Food & Activities',
  emojis: [
   { e: '🍴', k: 'fork knife dining food eating restaurant dinner' },
   { e: '🍕', k: 'pizza slice cheese italian crust' },
   { e: '🍔', k: 'burger hamburger fast food cheeseburger' },
   { e: '🍟', k: 'fries french fries fast food potato' },
   { e: '🍿', k: 'popcorn movie snack cinema butter' },
   { e: '🥓', k: 'bacon meat breakfast pork crispy' },
   { e: '🍣', k: 'sushi japanese fish roll salmon' },
   { e: '🍜', k: 'ramen noodles soup broth japanese' },
   { e: '🍦', k: 'ice cream dessert sweet cold cone' },
   { e: '🍰', k: 'cake slice dessert birthday bakery' },
   { e: '🎂', k: 'birthday cake celebration candles party' },
   { e: '🍩', k: 'donut doughnut sweet glaze bakery' },
   { e: '🍪', k: 'cookie chocolate chip baked sweet' },
   { e: '🍫', k: 'chocolate candy bar cocoa sweet' },
   { e: '☕', k: 'coffee tea hot cup cafe morning espresso' },
   { e: '🧋', k: 'boba bubble tea milk drink tapioca' },
   { e: '🍺', k: 'beer drink alcohol pub glass ale' },
   { e: '🍻', k: 'beers cheering toast celebrate pints' },
   { e: '🥂', k: 'champagne celebration toast glasses wine party' },
   { e: '🎮', k: 'game video game controller gaming play console' },
   { e: '🎲', k: 'dice board game roll lucky chance' },
   { e: '⚽', k: 'soccer football ball sport goal' },
   { e: '🏀', k: 'basketball ball hoop court nba' },
   { e: '🎾', k: 'tennis ball racket match court' },
   { e: '🎧', k: 'headphones music audio listen sound beats' },
   { e: '💡', k: 'light bulb idea bright thinking smart electricity' },
   { e: '💰', k: 'money bag cash rich dollar rich wealth' }
  ]
 }
]

function formatDiscordTimestamp(dateStr: string) {
 try {
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true })
  if (isToday) return `Today at ${timeStr}`
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${timeStr}`
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()} ${timeStr}`
 } catch {
  return dateStr
 }
}

export function MessageThread({kind,id,title,channelName,topic,readOnly=false,visible=true,onSync,onOpenSettings,availableChannels}:{kind:StreamKind;id:string;title:string;channelName?:string;topic?:string;readOnly?:boolean;visible?:boolean;onSync?:()=>void;onOpenSettings?:()=>void;availableChannels?:{id:string;name:string;spaceName?:string}[]}){
 const user=useAccount().session!.user.id,key=draftKey(user,kind,id)
 const worldTyping=useTyping(kind==='channel'&&visible&&!readOnly?{kind:'channel',id}:null,user)
 const [messages,setMessages]=useState<StreamMessage[]>([]),[people,setPeople]=useState<Record<string,PublicIdentity>>({}),[body,setBody]=useState(()=>{try{return localStorage.getItem(key)??''}catch{return ''}}),[error,setError]=useState(''),[status,setStatus]=useState('Loading messages…'),[loading,setLoading]=useState(true),[older,setOlder]=useState(false),[end,setEnd]=useState(false),[sending,setSending]=useState(false),[denied,setDenied]=useState(false),[editing,setEditing]=useState<StreamMessage|null>(null),[editBody,setEditBody]=useState(''),[changing,setChanging]=useState(false),[report,setReport]=useState<StreamMessage|null>(null)
 const [activeMenu,setActiveMenu]=useState<string|null>(null),[copiedId,setCopiedId]=useState<string|null>(null),[replyingTo,setReplyingTo]=useState<StreamMessage|null>(null)
 const [reactions,setReactions]=useState<Record<string,Record<string,string[]>>>(()=>{try{const s=localStorage.getItem(`realm_reactions_${id}`);return s?JSON.parse(s):{}}catch{return {}}})
 const [pinnedIds,setPinnedIds]=useState<Set<string>>(()=>{try{const s=localStorage.getItem(`realm_pinned_${id}`);return s?new Set(JSON.parse(s)):new Set()}catch{return new Set()}})

 const [forwardingMessage,setForwardingMessage]=useState<StreamMessage|null>(null)
 const [forwardSearch,setForwardSearch]=useState('')
 const [forwardNote,setForwardNote]=useState('')
 const [selectedDests,setSelectedDests]=useState<Set<string>>(new Set())
 const [forwardingBusy,setForwardingBusy]=useState(false)
 const [forwardError,setForwardError]=useState('')
 const [destinations,setDestinations]=useState<{id:string;name:string;spaceName:string}[]>([])

 const [emojiPickerMessage,setEmojiPickerMessage]=useState<StreamMessage|null>(null)
 const [emojiSearch,setEmojiSearch]=useState('')
 const emojiSearchInputRef=useRef<HTMLInputElement>(null)
 const [quickReactions,setQuickReactions]=useState<string[]>(()=>loadQuickReactions())
 const [editingQuickReactions,setEditingQuickReactions]=useState(false)
 const [quickReactionAlert,setQuickReactionAlert]=useState('')

 const stopSubscription=useRef<()=>void>(()=>{});const alive=useRef(false),watermark=useRef<number|null>(null),visibility=useRef<string|undefined>(undefined),syncing=useRef(false),queued=useRef(false),retry=useRef<string|null>(null),draftVersion=useRef(0),thread=useRef<HTMLElement|null>(null),prepend=useRef<number|null>(null),atBottom=useRef(true),syncRef=useRef<()=>Promise<void>>(async()=>{}),read=useRef(0)

 useEffect(()=>{try{localStorage.setItem(key,body)}catch{/* Storage is optional. */}},[body,key])
 useEffect(()=>{if(!activeMenu)return;const h=(e:KeyboardEvent)=>{if(e.key==='Escape')setActiveMenu(null)};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[activeMenu])
 useEffect(()=>{if(!forwardingMessage)return;const h=(e:KeyboardEvent)=>{if(e.key==='Escape')closeForward()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[forwardingMessage])
 useEffect(()=>{if(!emojiPickerMessage)return;const h=(e:KeyboardEvent)=>{if(e.key==='Escape')closeEmojiPicker()};window.addEventListener('keydown',h);return()=>window.removeEventListener('keydown',h)},[emojiPickerMessage])

 useEffect(()=>{
  if(emojiPickerMessage){
   requestAnimationFrame(()=>emojiSearchInputRef.current?.focus())
  }
 },[emojiPickerMessage])

 useEffect(()=>{
  if(availableChannels&&availableChannels.length>0){
   setDestinations(availableChannels.map(c=>({id:c.id,name:c.name,spaceName:c.spaceName||'Current Server'})))
  }
 },[availableChannels])

 useEffect(()=>{
  if(!forwardingMessage)return
  let active=true
  const loadAll=async()=>{
   try{
    const spaces=await listSpaces(client!)
    const items:{id:string;name:string;spaceName:string}[]=[]
    for(const sp of spaces){
     if(sp.closed_at||sp.archived_at)continue
     const chs=await listChannels(client!,sp.id).catch(()=>[])
     for(const ch of chs){
      if(!ch.archived_at){
       items.push({id:ch.id,name:ch.name,spaceName:sp.name})
      }
     }
    }
    if(active&&items.length>0)setDestinations(items)
   }catch{}
  }
  void loadAll()
  return()=>{active=false}
 },[forwardingMessage])

 function openForward(m:StreamMessage){
  setForwardingMessage(m)
  setForwardSearch('')
  setForwardNote('')
  setForwardError('')
  setSelectedDests(new Set())
  setActiveMenu(null)
 }

 function closeForward(){
  setForwardingMessage(null)
  setForwardSearch('')
  setForwardNote('')
  setForwardError('')
  setSelectedDests(new Set())
 }

 function openEmojiPicker(m:StreamMessage,startEditingQuick=false){
  setEmojiPickerMessage(m)
  setEmojiSearch('')
  setEditingQuickReactions(startEditingQuick)
  setQuickReactionAlert('')
  setActiveMenu(null)
 }

 function closeEmojiPicker(){
  setEmojiPickerMessage(null)
  setEmojiSearch('')
  setEditingQuickReactions(false)
  setQuickReactionAlert('')
 }

 function handleRemoveQuickReaction(emoji:string){
  setQuickReactions(prev=>{
   const next=prev.filter(e=>e!==emoji)
   saveQuickReactions(next)
   return next
  })
  setQuickReactionAlert('')
 }

 function handleSelectEmoji(emoji:string){
  if(editingQuickReactions){
   if(quickReactions.includes(emoji)){
    handleRemoveQuickReaction(emoji)
    return
   }
   if(quickReactions.length>=3){
    setQuickReactionAlert('Maximum 3 quick reactions. Remove one above to replace.')
    setTimeout(()=>setQuickReactionAlert(''),3500)
    return
   }
   setQuickReactions(prev=>{
    const next=[...prev,emoji]
    saveQuickReactions(next)
    return next
   })
   setQuickReactionAlert('')
   return
  }
  if(!emojiPickerMessage)return
  toggleReaction(emojiPickerMessage.id,emoji)
  closeEmojiPicker()
 }

 function toggleDest(destId:string){
  setSelectedDests(prev=>{
   const next=new Set(prev)
   if(next.has(destId))next.delete(destId)
   else next.add(destId)
   return next
  })
 }

 async function handleSendForward(){
  if(!forwardingMessage||selectedDests.size===0||forwardingBusy)return
  setForwardingBusy(true)
  setForwardError('')
  try{
   const origAuthor=forwardingMessage.author_id===user?(people[user]?.display_name||'You'):(forwardingMessage.author_id?people[forwardingMessage.author_id]?.display_name||'Member':'Deleted account')
   const quoteBlock=`> ↪️ *Forwarded from #${channelName||'channel'}*:\n> **${origAuthor}**: ${forwardingMessage.body.replace(/\n/g,'\n> ')}`
   const fullBody=forwardNote.trim()?`${forwardNote.trim()}\n\n${quoteBlock}`:quoteBlock

   for(const destId of Array.from(selectedDests)){
    await rpc(client!,'message_send',{p_kind:'channel',p_stream:destId,p_body:fullBody,p_client:crypto.randomUUID()})
   }

   if(selectedDests.has(id)){
    await syncRef.current()
   }
   closeForward()
  }catch(err){
   setForwardError(errorText(err))
  }finally{
   setForwardingBusy(false)
  }
 }

 function fail(e:unknown){if(!alive.current)return;const code=(e as {code?:string})?.code;setError(errorText(e));if(code==='42501'||code==='PT403'){worldTyping.stop();setDenied(true);setMessages([]);setPeople({});setReport(null);setEditing(null);setStatus('Access changed');watermark.current=null;stopSubscription.current()}else setStatus('Reconnecting…')}

 useEffect(()=>{
  alive.current=true
  const sync=async()=>{if(syncing.current){queued.current=true;return}syncing.current=true;try{
   if(watermark.current===null){const page=await historyPage(client!,kind,id);if(!alive.current)return;setMessages(page.messages);setEnd(page.messages.length<50);watermark.current=page.watermark;visibility.current=page.visibility}
   else{const next=await recoverStream(client!,kind,id,watermark.current,page=>{if(!alive.current)return;if(page.visibility!==visibility.current){page.reset=true;visibility.current=page.visibility}if(!page.reset)setMessages(current=>mergeMessages(current,page.messages,page.events.map(e=>e.message_id)))});if(!alive.current)return;
    if(next<0){const page=await historyPage(client!,kind,id);if(!alive.current)return;setMessages(page.messages);setEnd(page.messages.length<50);visibility.current=page.visibility;watermark.current=page.watermark}else watermark.current=next
   }
   setError('');setDenied(false);setLoading(false);setStatus('Messages up to date');onSync?.()
  }catch(e){fail(e);if(alive.current)setLoading(false)}finally{syncing.current=false;if(queued.current&&alive.current){queued.current=false;void sync()}}}
  syncRef.current=sync;void sync()
  const sub=client!.channel(`stream:${kind}:${id}`).on('postgres_changes',{event:'*',schema:'public',table:kind==='channel'?'messages':'direct_messages',filter:`${kind==='channel'?'channel_id':'conversation_id'}=eq.${id}`},()=>void sync()).subscribe(s=>{if(!alive.current)return;if(s==='SUBSCRIBED')void sync();else setStatus('Reconnecting…')})
  stopSubscription.current=()=>{void client!.removeChannel(sub)};const timer=setInterval(()=>void sync(),10000),online=()=>void sync();window.addEventListener('online',online)
  return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('online',online);void client!.removeChannel(sub)}
 },[kind,id,user])

 useEffect(()=>{let active=true;void publicIdentities(client!,messages.flatMap(m=>m.author_id?[m.author_id]:[])).then(rows=>{if(active)setPeople(rows)}).catch(()=>{});return()=>{active=false}},[messages])

 useLayoutEffect(()=>{const el=thread.current;if(!el||!visible)return;if(prepend.current!==null){el.scrollTop+=el.scrollHeight-prepend.current;prepend.current=null}else if(atBottom.current)el.scrollTop=el.scrollHeight},[messages,visible])

 useEffect(()=>{
  const root=thread.current;if(!root||denied)return
  const observer=new IntersectionObserver(entries=>{
   if(document.visibilityState!=='visible')return
   const reached=entries.filter(e=>e.isIntersecting&&e.intersectionRatio>=0.8).map(e=>messages.find(m=>m.id===(e.target as HTMLElement).dataset.read)).filter((m):m is StreamMessage=>!!m).sort((a,b)=>b.created_revision-a.created_revision)[0]
   if(reached&&reached.created_revision>read.current){read.current=reached.created_revision;void rpc(client!,'message_read',{p_kind:kind,p_stream:id,p_message:reached.id}).then(()=>onSync?.()).catch(e=>{read.current=0;fail(e)})}
  },{root,threshold:0.8})
  root.querySelectorAll('[data-read]').forEach(el=>observer.observe(el));return()=>observer.disconnect()
 },[messages,kind,id,denied])

 function toggleReaction(msgId:string,emoji:string){
  setReactions(prev=>{
   const msgReactions={...(prev[msgId]||{})}
   const users=[...(msgReactions[emoji]||[])]
   const idx=users.indexOf(user)
   if(idx>=0){users.splice(idx,1);if(users.length===0)delete msgReactions[emoji];else msgReactions[emoji]=users}
   else users.push(user);if(users.length>0)msgReactions[emoji]=users
   const next={...prev,[msgId]:msgReactions}
   try{localStorage.setItem(`realm_reactions_${id}`,JSON.stringify(next))}catch{}
   return next
  })
 }

 function togglePin(msgId:string){
  setPinnedIds(prev=>{
   const next=new Set(prev)
   if(next.has(msgId))next.delete(msgId);else next.add(msgId)
   try{localStorage.setItem(`realm_pinned_${id}`,JSON.stringify(Array.from(next)))}catch{}
   return next
  })
 }

 async function earlier(){if(older||!messages.length)return;setOlder(true);try{const page=await historyPage(client!,kind,id,messages[0]);if(!alive.current)return;prepend.current=thread.current?.scrollHeight??null;setMessages(current=>mergeMessages(current,page.messages));setEnd(page.messages.length<50)}catch(e){fail(e)}finally{if(alive.current)setOlder(false)}}

 async function send(e:FormEvent){
  e.preventDefault();if(sending||readOnly||denied||!body.trim())return;setSending(true);setError('')
  worldTyping.stop();const version=draftVersion.current,clientId=retry.current??crypto.randomUUID();retry.current=clientId
  try{
   await rpc(client!,'message_send',{p_kind:kind,p_stream:id,p_body:body.trim(),p_client:clientId})
   if(!alive.current)return
   if(sameDraft(version,draftVersion.current)){setBody('');retry.current=null;setReplyingTo(null)}
   atBottom.current=true;await syncRef.current()
  }catch(e){if(alive.current)setError(errorText(e)+' Retry the same text to confirm delivery.')}finally{if(alive.current)setSending(false)}
 }

 async function change(m:StreamMessage,remove:boolean){
  if(changing)return;if(remove&&!confirm('Remove this message? A removed-message marker will remain.'))return
  setChanging(true);setError('')
  try{
   await rpc(client!,'message_change',{p_kind:kind,p_stream:id,p_message:m.id,p_revision:m.revision,p_body:editBody,p_remove:remove})
   if(!alive.current)return;setEditing(null);await syncRef.current()
  }catch(e){if(alive.current)setError(errorText(e)+' Refresh before retrying.')}finally{if(alive.current)setChanging(false)}
 }

 const filteredDestinations=destinations.filter(d=>d.name.toLowerCase().includes(forwardSearch.trim().toLowerCase())||d.spaceName.toLowerCase().includes(forwardSearch.trim().toLowerCase()))
 const forwardAuthorName=forwardingMessage?(forwardingMessage.author_id===user?(people[user]?.display_name||'You'):(forwardingMessage.author_id?people[forwardingMessage.author_id]?.display_name||'Member':'Deleted account')):''

 const normalizedEmojiQuery=emojiSearch.trim().toLowerCase()
 const filteredEmojiCategories=normalizedEmojiQuery===''?EMOJI_CATEGORIES:EMOJI_CATEGORIES.map(cat=>({
  name:cat.name,
  emojis:cat.emojis.filter(item=>item.e.includes(normalizedEmojiQuery)||item.k.includes(normalizedEmojiQuery))
 })).filter(cat=>cat.emojis.length>0)

 return (
  <div className="conversation">
   <div className="dm-toolbar">
    <span role="status">{status}</span>
    <button className="text-button" onClick={()=>void syncRef.current()}>Refresh messages</button>
   </div>
   {error&&<p className="error" role="alert">{error}</p>}
   {report&&<ReportForm kind={kind} stream={id} message={report.id} onClose={()=>setReport(null)} onReported={()=>{setReport(null);void syncRef.current()}}/>}
   <section ref={thread} className="dm-thread" aria-label={title} onScroll={e=>{const el=e.currentTarget;atBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<80}}>
    {!end&&messages.length>0&&<button className="load-earlier" disabled={older} onClick={()=>void earlier()}>{older?'Loading earlier messages…':'Load earlier messages'}</button>}
    {kind==='channel'&&end&&<div className="channel-start-welcome"><div className="channel-start-badge" aria-hidden="true">#</div><h2>Welcome to #{channelName||title.replace(/^Message #/,'')}!</h2><p className="channel-start-sub">This is the start of the #{channelName||title.replace(/^Message #/,'')} channel.</p>{topic&&<div className="channel-start-topic"><p>{topic}</p></div>}{onOpenSettings&&<button type="button" className="channel-start-edit-btn" onClick={onOpenSettings}>Edit Channel</button>}</div>}
    {!loading&&!messages.length&&!denied&&kind!=='channel'&&<p className="social-empty">No messages yet. Start the conversation.</p>}
    {messages.map(m=>{
     const isOwn=m.author_id===user,person=m.author_id?people[m.author_id]:undefined
     const authorName=isOwn?(person?.display_name||'You'):(person?.display_name||'Member')
     const isMenuOpen=activeMenu===m.id,isPinned=pinnedIds.has(m.id),msgReactions=reactions[m.id]||{}
     return (
      <article key={m.id} data-message={m.id} className={`message ${isOwn?'is-own':'is-peer'} ${isMenuOpen?'has-active-menu':''}`}>
       <MemberPortrait person={person}/>
       <div className="message-content">
        <div className="message-meta">
         <strong className="message-author">{authorName}</strong>
         <time dateTime={m.created_at}>{formatDiscordTimestamp(m.created_at)}</time>
         {isPinned&&<span className="message-pinned-badge" title="Pinned message">📌</span>}
         {m.edited_at&&!m.removed_at&&<span className="message-edited-badge">(edited)</span>}
        </div>
        <div className="message-bubble">
         {m.removed_at?<p className="muted">Message removed</p>:editing?.id===m.id?(
          <form className="message-edit" onSubmit={e=>{e.preventDefault();void change(m,false)}}>
           <label className="sr-only" htmlFor={`edit-${m.id}`}>Edit message</label>
           <textarea id={`edit-${m.id}`} aria-label="Edit message" required maxLength={4000} value={editBody} onChange={e=>setEditBody(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setEditing(null);else if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void change(m,false)}}}/>
           <div className="message-edit-hint"><span>escape to <button type="button" onClick={()=>setEditing(null)}>cancel</button> • enter to <button type="submit" disabled={changing||!editBody.trim()}>save</button></span></div>
          </form>
         ):<p>{m.body}</p>}
        </div>
        {!m.removed_at&&Object.keys(msgReactions).length>0&&(
         <div className="message-reaction-list">
          {Object.entries(msgReactions).map(([emoji,users])=>(
           <button key={emoji} type="button" className={`message-reaction-pill ${users.includes(user)?'is-reacted':''}`} onClick={()=>toggleReaction(m.id,emoji)} title={`${users.length} reaction${users.length>1?'s':''}`}>
            <span className="reaction-emoji">{emoji}</span>
            <span className="reaction-count">{users.length}</span>
           </button>
          ))}
         </div>
        )}
       </div>
       {!m.removed_at&&(
        <aside className="message-hover-toolbar" aria-label="Message actions">
         {quickReactions.map(emoji=>(
          <button key={emoji} type="button" className="toolbar-btn" title={`React ${emoji}`} onClick={()=>toggleReaction(m.id,emoji)}>{emoji}</button>
         ))}
         <div className="toolbar-separator"/>
         <button type="button" className="toolbar-btn" title="Add Reaction" onClick={()=>openEmojiPicker(m)}><SmileIcon/></button>
         {isOwn&&<button type="button" className="toolbar-btn" title="Edit" disabled={changing||readOnly} onClick={()=>{setEditing(m);setEditBody(m.body)}}><PencilIcon/></button>}
         <button type="button" className="toolbar-btn" title="Reply" onClick={()=>setReplyingTo(m)}><ReplyIcon/></button>
         <button type="button" className="toolbar-btn" title="Forward" onClick={()=>openForward(m)}><ForwardIcon/></button>
         <button type="button" className={`toolbar-btn ${isMenuOpen?'is-active':''}`} title="More" onClick={()=>setActiveMenu(isMenuOpen?null:m.id)}><DotsIcon/></button>
         {isMenuOpen&&(
          <>
           <div className="menu-backdrop" onClick={()=>setActiveMenu(null)}/>
           <div className="message-more-popover" role="menu">
            <div className="menu-emoji-row">
             {quickReactions.map(emoji=>(
              <button key={emoji} type="button" className="menu-emoji-btn" onClick={()=>{toggleReaction(m.id,emoji);setActiveMenu(null)}} title={`React with ${emoji}`}>{emoji}</button>
             ))}
             <button type="button" className="menu-emoji-edit-btn" title="Edit quick reactions (max 3)" aria-label="Edit quick reactions" onClick={()=>openEmojiPicker(m,true)}><PencilIcon size={14}/></button>
            </div>
            <div className="menu-divider"/>
            <button type="button" className="menu-item" role="menuitem" onClick={()=>{openEmojiPicker(m);setActiveMenu(null)}}><span>Add Reaction</span><SmileIcon size={16}/></button>
            {isOwn&&<button type="button" className="menu-item" role="menuitem" disabled={changing||readOnly} onClick={()=>{setEditing(m);setEditBody(m.body);setActiveMenu(null)}}><span>Edit Message</span><PencilIcon size={16}/></button>}
            <button type="button" className="menu-item" role="menuitem" onClick={()=>{setReplyingTo(m);setActiveMenu(null)}}><span>Reply</span><ReplyIcon size={16}/></button>
            <button type="button" className="menu-item" role="menuitem" onClick={()=>openForward(m)}><span>Forward</span><ForwardIcon size={16}/></button>
            <button type="button" className="menu-item" role="menuitem" onClick={()=>{void navigator.clipboard.writeText(m.body);setCopiedId(m.id);setTimeout(()=>setCopiedId(null),2000);setActiveMenu(null)}}><span>{copiedId===m.id?'Copied!':'Copy Text'}</span><CopyIcon size={16}/></button>
            <button type="button" className="menu-item" role="menuitem" onClick={()=>{togglePin(m.id);setActiveMenu(null)}}><span>{isPinned?'Unpin Message':'Pin Message'}</span><PinIcon size={16}/></button>
            <div className="menu-divider"/>
            {isOwn?<button type="button" className="menu-item is-danger" role="menuitem" disabled={changing||readOnly} onClick={()=>{setActiveMenu(null);void change(m,true)}}><TrashIcon size={16}/><span>Delete Message</span></button>:<button type="button" className="menu-item is-danger" role="menuitem" onClick={()=>{setActiveMenu(null);setReport(m)}}><FlagIcon size={16}/><span>Report Message</span></button>}
           </div>
          </>
         )}
        </aside>
       )}
       <span className="read-marker" data-read={m.id} aria-hidden="true"/>
      </article>
     )
    })}
   </section>
   {replyingTo&&(
    <div className="composer-reply-bar">
     <div className="composer-reply-content">
      <ReplyIcon size={14}/>
      <span>Replying to <strong>{replyingTo.author_id===user?(people[user]?.display_name||'You'):(replyingTo.author_id?people[replyingTo.author_id]?.display_name:undefined)||'Member'}</strong></span>
     </div>
     <button type="button" className="composer-reply-close" onClick={()=>setReplyingTo(null)} title="Cancel reply">✕</button>
    </div>
   )}
   <form className="composer" onSubmit={send}>
    <label className="sr-only" htmlFor="stream-body">{title}</label>
    <input id="stream-body" value={body} disabled={readOnly||denied} maxLength={4000} onChange={e=>{setBody(e.target.value);worldTyping.input(e.target.value);draftVersion.current++;retry.current=null}} placeholder={denied?'Access unavailable':readOnly?'This conversation is read-only':title}/>
    <button disabled={sending||readOnly||denied||!body.trim()}>{sending?'Sending…':'Send'}</button>
   </form>
   <p className="muted dm-note">{readOnly?'Archived conversations preserve their history.':'Drafts stay on this device for this account. Press Enter to send.'}</p>

   {forwardingMessage&&(
    <div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)closeForward()}}>
     <div className="modal-dialog realm-forward-dialog" role="dialog" aria-modal="true" aria-labelledby="realm-forward-title">
      <div className="realm-forward-header">
       <div className="realm-forward-header-left">
        <div className="realm-forward-badge" aria-hidden="true"><ForwardIcon size={20}/></div>
        <div>
         <h2 id="realm-forward-title">Forward Message</h2>
         <p className="realm-forward-subtitle">Select channels to share this message with</p>
        </div>
       </div>
       <button type="button" className="modal-close-btn" aria-label="Close" onClick={closeForward}>✕</button>
      </div>

      <div className="realm-forward-search-box">
       <SearchIcon size={16}/>
       <input type="text" placeholder="Search channels..." value={forwardSearch} onChange={e=>setForwardSearch(e.target.value)}/>
       {forwardSearch&&<button type="button" className="realm-forward-search-clear" onClick={()=>setForwardSearch('')} aria-label="Clear search">✕</button>}
      </div>

      <div className="realm-forward-destinations" role="listbox" aria-label="Destinations">
       {filteredDestinations.length===0?<p className="realm-forward-empty">No channels found matching &ldquo;{forwardSearch}&rdquo;</p>:filteredDestinations.map(dest=>{
        const isChecked=selectedDests.has(dest.id)
        return (
         <div key={dest.id} role="option" aria-selected={isChecked} className={`realm-forward-dest-item ${isChecked?'is-selected':''}`} onClick={()=>toggleDest(dest.id)}>
          <div className="realm-forward-dest-glyph" aria-hidden="true">#</div>
          <div className="realm-forward-dest-info">
           <span className="realm-forward-dest-name">{dest.name}</span>
           <span className="realm-forward-dest-space">{dest.spaceName}</span>
          </div>
          <div className={`realm-forward-dest-check ${isChecked?'is-checked':''}`}>
           {isChecked&&<span aria-hidden="true">✓</span>}
          </div>
         </div>
        )
       })}
      </div>

      <div className="realm-forward-preview">
       <div className="realm-forward-preview-meta">
        <span className="realm-forward-preview-tag">FORWARDING</span>
        <span className="realm-forward-preview-author">{forwardAuthorName}</span>
       </div>
       <p className="realm-forward-preview-text">{forwardingMessage.body}</p>
      </div>

      <div className="realm-forward-comment">
       <input type="text" placeholder="Add an optional message..." maxLength={1000} value={forwardNote} onChange={e=>setForwardNote(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey))void handleSendForward()}}/>
      </div>

      {forwardError&&<p className="error" role="alert">{forwardError}</p>}

      <div className="realm-forward-actions">
       <span className="realm-forward-selection-count">{selectedDests.size>0?`${selectedDests.size} channel${selectedDests.size>1?'s':''} selected`:'Choose at least 1 channel'}</span>
       <div className="realm-forward-btn-group">
        <button type="button" className="secondary-btn" disabled={forwardingBusy} onClick={closeForward}>Cancel</button>
        <button type="button" className="primary realm-forward-send-btn" disabled={selectedDests.size===0||forwardingBusy} onClick={()=>void handleSendForward()}>
         {forwardingBusy?'Sending…':selectedDests.size>0?`Send (${selectedDests.size})`:'Send'}
         <ForwardIcon size={16}/>
        </button>
       </div>
      </div>
     </div>
    </div>
   )}

   {emojiPickerMessage&&(
    <div className="modal-backdrop" role="presentation" onClick={e=>{if(e.target===e.currentTarget)closeEmojiPicker()}}>
     <div className="modal-dialog emoji-picker-dialog" role="dialog" aria-modal="true" aria-labelledby="emoji-picker-title">
      <div className="emoji-picker-header">
       <div>
        <h2 id="emoji-picker-title">Add Reaction</h2>
        <p className="modal-subtitle">Select an emoji to react to this message</p>
       </div>
       <button type="button" className="modal-close-btn" aria-label="Close" onClick={closeEmojiPicker}>✕</button>
      </div>

      <div className="emoji-search-box">
       <SearchIcon size={16}/>
       <input
        ref={emojiSearchInputRef}
        type="text"
        placeholder="Search emojis..."
        value={emojiSearch}
        onChange={e=>setEmojiSearch(e.target.value)}
       />
       {emojiSearch&&<button type="button" className="emoji-search-clear" onClick={()=>setEmojiSearch('')} aria-label="Clear search">✕</button>}
      </div>

      <div className={`quick-reactions-panel ${editingQuickReactions?'is-editing':''}`}>
       <div className="quick-reactions-panel-header">
        <div className="quick-reactions-title-group">
         <span className="quick-reactions-panel-title">QUICK REACTIONS</span>
         <span className="quick-reactions-count-pill">{quickReactions.length}/3 max</span>
        </div>
        <button
         type="button"
         className={`quick-reactions-toggle-btn ${editingQuickReactions?'is-done-mode':''}`}
         onClick={()=>{setEditingQuickReactions(!editingQuickReactions);setQuickReactionAlert('')}}
         title={editingQuickReactions?'Save and finish editing quick reactions':'Customize quick reactions (max 3)'}
        >
         {editingQuickReactions?(
          <>
           <CheckIcon size={14}/>
           <span>Done</span>
          </>
         ):(
          <>
           <PencilIcon size={13}/>
           <span>Edit</span>
          </>
         )}
        </button>
       </div>

       {editingQuickReactions&&(
        <div className="quick-reactions-guidance">
         {quickReactionAlert?(
          <span className="quick-reactions-alert-msg">{quickReactionAlert}</span>
         ):quickReactions.length>=3?(
          <span>Maximum 3 selected. Click ✕ on a slot to remove one and pick a replacement below.</span>
         ):(
          <span>Click any emoji in the catalog below to add it (up to 3), or click ✕ to remove.</span>
         )}
        </div>
       )}

       <div className="quick-reactions-slots-row">
        {quickReactions.map(emoji=>(
         <div key={emoji} className="quick-reaction-slot-wrapper">
          <button
           type="button"
           className="quick-reaction-slot-btn"
           onClick={()=>{
            if(editingQuickReactions){
             handleRemoveQuickReaction(emoji)
            }else{
             handleSelectEmoji(emoji)
            }
           }}
           title={editingQuickReactions?`Remove ${emoji}`:`React with ${emoji}`}
          >
           <span className="slot-emoji-glyph">{emoji}</span>
           {editingQuickReactions&&(
            <span className="slot-remove-badge" title="Remove" aria-hidden="true">✕</span>
           )}
          </button>
         </div>
        ))}

        {editingQuickReactions&&Array.from({length:Math.max(0,3-quickReactions.length)}).map((_,idx)=>(
         <div key={`empty-${idx}`} className="quick-reaction-slot-empty" title="Pick an emoji below to fill this slot">
          <span className="slot-empty-plus">+</span>
         </div>
        ))}
       </div>
      </div>

      <div className="emoji-grid-container" role="listbox" aria-label="Emojis">
       {filteredEmojiCategories.length===0?<p className="emoji-picker-empty">No emojis found matching &ldquo;{emojiSearch}&rdquo;</p>:filteredEmojiCategories.map(cat=>(
        <div key={cat.name} className="emoji-category-section">
         <h3 className="emoji-category-title">{cat.name}</h3>
         <div className="emoji-grid">
          {cat.emojis.map(item=>{
           const isInQuick=editingQuickReactions&&quickReactions.includes(item.e)
           return (
            <button
             key={item.e}
             type="button"
             className={`emoji-grid-btn ${isInQuick?'is-in-quick-reactions':''}`}
             title={isInQuick?`In Quick Reactions (Click to remove)`:item.k}
             onClick={()=>handleSelectEmoji(item.e)}
            >
             {item.e}
            </button>
           )
          })}
         </div>
        </div>
       ))}
      </div>

      <div className="emoji-picker-footer">
       <button type="button" className="secondary-btn" onClick={closeEmojiPicker}>Close</button>
      </div>
     </div>
    </div>
   )}
  </div>
 )
}
