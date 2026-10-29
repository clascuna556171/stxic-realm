export type ProfileStyle={surface:string;text:string;accent:string;font:'sans'|'serif'|'mono';avatar_shape:'circle'|'rounded'|'square';avatar_x:number;avatar_y:number;banner_x:number;banner_y:number;banner_height:number;sections:Section[];hidden:Section[]}
export type Section='about'|'details'|'connections'|'photos'|'member'
export const sectionNames:Record<Section,string>={about:'About me',details:'Details',connections:'Connections',photos:'Photos',member:'Member since'}
export type ProfileCard={user_id:string;pronouns:string;status:string;about:string;avatar_id:string|null;banner_id:string|null;gallery:string[];connections:{title:string;url:string}[];details:{label:string;value:string}[];style:ProfileStyle;revision:number;joined_at:string|null}
export type ProfileMedia={id:string;user_id:string;kind:'avatar'|'banner'|'photo';object_path:string;mime:string;bytes:number;width:number;height:number;state:'pending'|'ready'|'deleting'}
export const IMAGE_LIMIT=8*1024*1024
export const profileFonts={sans:'Inter, "Segoe UI", sans-serif',serif:'Georgia, serif',mono:'Consolas, monospace'}
export function moveSection(style:ProfileStyle,section:Section,offset:number):ProfileStyle{const sections=[...style.sections],index=sections.indexOf(section),next=index+offset;if(index<0||next<0||next>=sections.length)return style;[sections[index],sections[next]]=[sections[next],sections[index]];return {...style,sections}}
export function readableInk(hex:string){return profileContrast(hex,'#000000')>=profileContrast(hex,'#ffffff')?'#000000':'#ffffff'}
export function profileContrast(a:string,b:string){const luminance=(hex:string)=>{const v=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722};const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
