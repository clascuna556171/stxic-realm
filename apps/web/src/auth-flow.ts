export type Callback = {type:'invite'|'recovery';tokenHash?:string;accessToken?:string;refreshToken?:string;admission?:string}
export function parseAuthCallback(href:string):Callback|null {
 const url=new URL(href),hash=new URLSearchParams(url.hash.slice(1))
 if(url.searchParams.has('error')||hash.has('error'))throw new Error('This link has expired or is unavailable. Request a new link.')
 const type=url.searchParams.get('type')??hash.get('type')??url.searchParams.get('flow')
 if(type!=='invite'&&type!=='recovery')return null
 const tokenHash=url.searchParams.get('token_hash')??undefined,accessToken=hash.get('access_token')??undefined,refreshToken=hash.get('refresh_token')??undefined
 if(!tokenHash&&(!accessToken||!refreshToken))return null
 return {type,tokenHash,accessToken,refreshToken,admission:url.searchParams.get('admission')??undefined}
}
export function callbackUrl(origin:string,type:'invite'|'recovery',admission?:string){
 const url=new URL('/auth/callback',origin);url.searchParams.set('flow',type)
 if(admission)url.searchParams.set('admission',admission)
 return url.href
}
