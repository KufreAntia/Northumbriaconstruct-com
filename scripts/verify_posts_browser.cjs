const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');const assert=require('assert');const path=require('path');process.chdir(path.resolve(__dirname,'..'));fs.mkdirSync('tmp/screenshots',{recursive:true});fs.mkdirSync('docs',{recursive:true});
(async()=>{
const browser=await chromium.launch({headless:true});const context=await browser.newContext({permissions:['clipboard-read','clipboard-write'],reducedMotion:'reduce'});const page=await context.newPage();
await context.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));const base=process.env.PREVIEW_URL || 'http://127.0.0.1:8767';const posts=JSON.parse(fs.readFileSync('content/posts.json','utf8'));const errors=[];const checks=[];
page.on('pageerror',e=>errors.push(e.message));
for(const width of [1440,390,320]){
 await page.setViewportSize({width,height:900});
 for(const route of ['activities.html','opportunities.html','projects.html','innovation-lab.html']){
  await page.goto(base+'/'+route,{waitUntil:'domcontentloaded'});await page.locator('.post-card').first().waitFor();
  await page.waitForFunction(()=>document.styleSheets.length>0); const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,over:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>[e.tagName,e.className,e.getBoundingClientRect().width])}));assert(metrics.scroll<=metrics.width,`Overflow ${width} ${route} ${JSON.stringify(metrics)}`);
  const card=page.locator('.post-card').first();const picture=await card.locator('.post-card-media').boundingBox();const text=await card.locator('.post-card-copy').boundingBox();
  assert(width>700?picture.x<text.x:picture.y<text.y,`Card layout ${width} ${route}`);
  const read=card.locator('.post-read-more');await read.focus();assert(await read.evaluate(el=>getComputedStyle(el).outlineStyle)!=='none','Visible focus');
  await Promise.all([page.waitForEvent('domcontentloaded'),read.press('Enter')]);assert(await page.locator('.post-article').count()===1);
  await page.reload({waitUntil:'domcontentloaded'});assert(await page.locator('.post-article').count()===1);
  await page.locator('.post-back a').click();await page.waitForURL('**/'+route,{waitUntil:'domcontentloaded'});
  if(width!==320){await page.evaluate(async()=>{await Promise.all([...document.images].map(async i=>{i.loading='eager';await i.decode()}))});await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'})});await page.screenshot({path:`tmp/screenshots/posts-${route}-${width}.png`,fullPage:true,animations:'disabled'});}
  checks.push({width,route,layout:true,keyboardLink:true,refresh:true,returnLink:true});
 }
}
for(const post of posts){
 await page.setViewportSize({width:390,height:844});await page.goto(`${base}/${post.category}/${post.slug}.html`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{await Promise.all([...document.images].map(async i=>{i.loading='eager';await i.decode()}))});
 assert(await page.evaluate(()=>[...document.images].every(i=>i.naturalWidth>0)),`Images ${post.slug}`);
 assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),`Detail overflow ${post.slug}`);
 assert((await page.locator('link[rel=canonical]').getAttribute('href')).endsWith(`/${post.category}/${post.slug}.html`));
 const url=await page.locator('.share-url').inputValue();await page.locator('[data-copy-link]').click();await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Link copied'));
 assert(await page.evaluate(()=>navigator.clipboard.readText())===url);
 const share=page.locator('[data-native-share]');
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:undefined}));await share.click();assert((await page.locator('[role=status]').textContent()).includes('Link copied'));
 await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.testShared=data}}));await share.click();assert(await page.evaluate(()=>window.testShared.url)===url);
 if(['careers-fair-2026','heritage-walk','gateshead-engagement','norcon-projects'].includes(post.legacy_ids[0]))await page.evaluate(()=>{document.activeElement?.blur();scrollTo({top:0,behavior:'instant'})});await page.screenshot({path:`tmp/screenshots/post-${post.category}-${post.slug}.png`,fullPage:true,animations:'disabled'});
 checks.push({detail:post.slug,images:true,noOverflow:true,copy:true,nativeShare:true,shareFallback:true});
}
// Permission-denied clipboard fallback: verify actual legacy copy and manual selection feedback.
await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw Error('Denied')}}});});
await page.locator('[data-copy-link]').click();await page.waitForFunction(()=>document.querySelector('[role=status]').textContent.includes('Link copied'));
await page.evaluate(()=>{document.execCommand=()=>false});await page.locator('[data-copy-link]').click();assert((await page.locator('[role=status]').textContent()).includes('Select and copy'));
await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError')}}));await page.locator('[data-native-share]').click();assert((await page.locator('[role=status]').textContent()).includes('cancelled'));
for(const [route,hash,expected] of [['activities.html','careers-fair-title','/activities/built-environment-careers-fair-2026.html'],['opportunities.html','bath-phd-heading','/opportunities/bath-built-heritage-digital-twins-phd.html'],['projects.html','ciob-site-visit','/activities/ciob-eastern-green-link-site-visit.html'],['innovation-lab.html','norcon-applications','/innovation/norcon-projects.html']]){
 await page.goto(`${base}/${route}#${hash}`,{waitUntil:'domcontentloaded'});await page.waitForURL('**'+expected+'#'+hash,{waitUntil:'domcontentloaded'});
}
const noJS=await browser.newContext({javaScriptEnabled:false,reducedMotion:'reduce'});const staticPage=await noJS.newPage();await staticPage.route('https://fonts.googleapis.com/**',r=>r.fulfill({contentType:'text/css',body:''}));await staticPage.goto(base+'/activities.html',{waitUntil:'domcontentloaded'});await staticPage.locator('.legacy-links summary').focus();await staticPage.keyboard.press('Enter');assert(await staticPage.locator('#careers-fair-title a').isVisible());await staticPage.locator('.post-read-more').first().focus();await Promise.all([staticPage.waitForEvent('domcontentloaded'),staticPage.keyboard.press('Enter')]);assert(await staticPage.locator('.post-body').isVisible());assert(await staticPage.locator('.share-url').isVisible());
assert.deepStrictEqual(errors,[]);fs.writeFileSync('docs/post-browser-results.json',JSON.stringify({checks,errors,legacyLinks:true,noJavaScript:true,clipboardDenied:true,manualFallback:true,shareCancelled:true},null,2));console.log(JSON.stringify({checks:checks.length,errors,legacyLinks:true,noJavaScript:true,clipboardFallbacks:true}));await browser.close();process.exit(0);
})().catch(e=>{console.error(e);process.exit(1)});
