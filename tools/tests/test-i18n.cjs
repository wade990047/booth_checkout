const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const ctx={db:{design:{}},cleanIcons:s=>s||{}};vm.createContext(ctx);
for(const f of ['shared/js/i18n.js','pages/design/design.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);
assert.equal(ctx.currentLanguage(),'zh-Hant');assert.equal(ctx.ui('商品選購'),'商品選購');
for(const language of ['en','ja']){
 ctx.db.design={language};assert.equal(ctx.currentLanguage(),language);
 assert.notEqual(ctx.ui('商品選購'),'商品選購');
 const user='商品選購';assert.equal(ctx.uiTemplate(['商品名稱：',''],user),ctx.ui('商品名稱：')+user,'interpolated data must remain unchanged');
 const d=ctx.designSettings({language,brand:'My 店',shopName:'',footer:'我的文字',buttons:{checkout:'買單！'}});
 assert.equal(d.brand,'My 店');assert.equal(d.shopName,'');assert.equal(d.footer,'我的文字');assert.equal(d.buttons.checkout,'買單！');assert.equal(d.inventoryName,ctx.ui('庫存總覽'));
 const back=ctx.designSettings({...d,language:'zh-Hant'});assert.equal(back.inventoryName,'庫存總覽');assert.equal(back.buttons.checkout,'買單！');
}
assert.equal(ctx.designSettings({language:'xx'}).language,'zh-Hant');
vm.runInContext("for(const key of Object.keys(uiDictionary)){if(/[\\u3400-\\u9fff]/.test(ui(key,'en')))throw Error('Untranslated: '+key)}",ctx);
for(const file of ['index.html',...['shop','inventory','history','promotions','design'].map(p=>'pages/'+p+'/index.html')]){
 const html=fs.readFileSync(file,'utf8');assert(html.includes('shared/js/i18n.js'));assert(html.indexOf('shared/js/i18n.js')<html.indexOf('shared/js/bootstrap.js'));
}
console.log('PASS: language fallback, all English messages, protected user content, blank/custom design fields, default label migration and all page entries');
