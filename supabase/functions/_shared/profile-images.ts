export const MAX_IMAGE_BYTES=8*1024*1024
export type ImageInfo={mime:'image/png'|'image/jpeg'|'image/webp'|'image/gif';width:number;height:number}
export function inspectProfileImage(bytes:Uint8Array):ImageInfo {
 const fail=():never=>{throw {code:'22023',message:'Choose a valid PNG, JPEG, WebP or GIF image (up to 8 MiB, 8192 pixels per side and 16 megapixels).'}}
 if(bytes.length<12||bytes.length>MAX_IMAGE_BYTES)fail()
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),ascii=(start:number,size:number)=>String.fromCharCode(...bytes.slice(start,start+size))
 let width=0,height=0,mime:ImageInfo['mime']='image/png',frames=1
 if(ascii(0,8)==='\x89PNG\r\n\x1a\n'){
  mime='image/png';let end=8,seen=false,finished=false
  while(end+12<=bytes.length){const size=data.getUint32(end),type=ascii(end+4,4);if(size>bytes.length-end-12)fail();if(!seen){if(type!=='IHDR'||size!==13)fail();width=data.getUint32(end+8);height=data.getUint32(end+12);seen=true}if(type==='acTL')fail();end+=size+12;if(type==='IEND'){finished=true;break}}
  if(!finished||end!==bytes.length)fail()
 }else if(ascii(0,6)==='GIF87a'||ascii(0,6)==='GIF89a'){
  mime='image/gif';width=data.getUint16(6,true);height=data.getUint16(8,true);let at=13,finished=false;frames=0
  if(bytes[10]&128)at+=3*(1<<((bytes[10]&7)+1))
  const blocks=()=>{while(at<bytes.length){const n=bytes[at++];if(!n)return;at+=n;if(at>bytes.length)fail()}fail()}
  while(at<bytes.length){const kind=bytes[at++];if(kind===0x3b){finished=true;break}if(kind===0x21){at++;blocks()}else if(kind===0x2c){if(at+9>bytes.length)fail();const frameWidth=data.getUint16(at+4,true),frameHeight=data.getUint16(at+6,true);if(!frameWidth||!frameHeight||frameWidth>width||frameHeight>height)fail();const flags=bytes[at+8];at+=9;if(flags&128)at+=3*(1<<((flags&7)+1));if(at>=bytes.length)fail();at++;blocks();frames++;if(frames>100)fail()}else fail()}
  if(!finished||!frames||at!==bytes.length)fail()
 }else if(ascii(0,4)==='RIFF'&&ascii(8,4)==='WEBP'){
  mime='image/webp';if(data.getUint32(4,true)+8!==bytes.length)fail();let at=12,frameChunks=0
  while(at+8<=bytes.length){const kind=ascii(at,4),size=data.getUint32(at+4,true),start=at+8;if(size>bytes.length-start)fail()
   if(kind==='VP8X'&&size>=10){width=1+bytes[start+4]+(bytes[start+5]<<8)+(bytes[start+6]<<16);height=1+bytes[start+7]+(bytes[start+8]<<8)+(bytes[start+9]<<16)}
   else if(!width&&kind==='VP8 '&&size>=10&&ascii(start+3,3)==='\x9d\x01\x2a'){width=data.getUint16(start+6,true)&16383;height=data.getUint16(start+8,true)&16383}
   else if(!width&&kind==='VP8L'&&size>=5&&bytes[start]===0x2f){const packed=data.getUint32(start+1,true);width=(packed&16383)+1;height=((packed>>>14)&16383)+1}
   if(kind==='ANMF')frameChunks++;at=start+size+(size%2)
  }if(at!==bytes.length)fail();frames=Math.max(1,frameChunks)
 }else if(bytes[0]===255&&bytes[1]===216&&bytes.at(-2)===255&&bytes.at(-1)===217){
  mime='image/jpeg';let at=2
  while(at+4<=bytes.length){if(bytes[at++]!==255)fail();while(bytes[at]===255)at++;const marker=bytes[at++];if(marker===0xda||marker===0xd9)break;if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;const size=data.getUint16(at);if(size<2||at+size>bytes.length)fail();if([0xc0,0xc1,0xc2].includes(marker)){if(size<8)fail();height=data.getUint16(at+3);width=data.getUint16(at+5);break}at+=size}
 }else fail()
 if(!width||!height||width>8192||height>8192||width*height>16777216||frames>100||width*height*frames>100000000)fail()
 return {mime,width,height}
}
export async function readImageBody(req:Request):Promise<Uint8Array>{
 const reader=req.body?.getReader();if(!reader)throw {code:'22023',message:'Choose an image.'}
 const chunks:Uint8Array[]=[];let length=0
 try{while(true){const chunk=await reader.read();if(chunk.done)break;length+=chunk.value.length;if(length>MAX_IMAGE_BYTES){await reader.cancel();throw {code:'PT413',message:'Choose an image no larger than 8 MiB.'}}chunks.push(chunk.value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length}return bytes
}
