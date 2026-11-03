import {chromium} from 'playwright'
import assert from 'node:assert/strict'
import {mkdir,writeFile} from 'node:fs/promises'
const origin=process.env.REALM_UI_ORIGIN??'http://127.0.0.1:5175'
const output='.impeccable/review/loading-screen'
await mkdir(output,{recursive:true})
const browser=await chromium.launch({headless:true,channel:'chrome'})
const results=[]
try{
 for(const [name,width,height,path] of [['desktop',1440,900,'/?settings'],['phone',390,844,'/?home=preview'],['narrow',320,700,'/?dm=preview'],['landscape',720,450,'/?settings']]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'})
  const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.route('https://**/*',r=>r.abort())
  let release;const hold=new Promise(resolve=>release=resolve)
  await page.route(/\/(Settings|SharedHome|DirectMessages)\.tsx(?:\?|$)/,async route=>{await hold;await route.continue()})
  await page.goto(origin+path,{waitUntil:'domcontentloaded'})
  const loading=page.locator('.realm-loading:visible')
  await loading.waitFor()
  await page.screenshot({path:output+'/'+name+'.png',fullPage:true})
  assert.equal(await loading.getAttribute('aria-busy'),'true')
  assert.equal(await loading.getByRole('status').count(),1)
  assert.equal(await page.locator('.realm-loading button,.realm-loading a,.realm-loading input').count(),0)
  assert.equal(await loading.locator('.skeleton-block').first().evaluate(el=>getComputedStyle(el).animationName),'none')
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow')
  assert.equal(errors.length,0,errors.join('\n'))
  if(name==='desktop'){await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await loading.locator('.skeleton-block').first().evaluate(el=>getComputedStyle(el).animationName),'realm-skeleton-breathe')}
  release()
  await page.locator('.realm-loading:visible').waitFor({state:'hidden'})
  if(name==='desktop')await page.getByRole('heading',{name:'Make Realm yours.',exact:true}).waitFor()
  results.push({name,width,height,loadingAndRecovery:'pass',errors})
  await page.close()
 }
 await writeFile(output+'/verification.json',JSON.stringify(results,null,2))
 console.log(JSON.stringify(results))
}finally{await browser.close()}
