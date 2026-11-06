global.structuredClone ??= value => require('node:v8').deserialize(require('node:v8').serialize(value));
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('../../shared/js/pricing.js');
const p={id:'p',name:'商品',sku:'01',category:'保留',price:100,initial:0,printed:0,offer:null,minQty:1,requires:[],image:''};
const d={version:1,products:[p],categories:['保留','空分類'],categoryIds:{'空分類':'E-'},transactions:[],coupons:[],promotions:[]};
assert.equal(L.availableStock(d,p),1,'legacy display policy');
p.sellDisplay=false;assert.equal(L.availableStock(d,p),0);
p.sellDisplay=true;assert.equal(L.availableStock(d,p),1);
p.initial=2;assert.equal(L.availableStock(d,p),3);p.sellDisplay=false;assert.equal(L.availableStock(d,p),2);
d.transactions=[{number:1,items:[{id:'p',qty:3}]}];assert.equal(L.stock(d,p),-1);assert.equal(L.availableStock(d,p),0);p.sellDisplay=true;assert.equal(L.availableStock(d,p),0);d.transactions=[];
assert.throws(()=>L.removeEmptyCategory(d,'保留'),/仍有商品/);
for(const r of [{type:'category'},{type:'order_category'},{type:'nth_price',scope:'category'},{type:'nth_percent',scope:'category'}]){
 d.promotions=[{id:'r',category:'空分類',...r}];assert.throws(()=>L.removeEmptyCategory(d,'空分類'),/優惠活動/);
}
d.promotions=[];const cleaned=L.removeEmptyCategory(d,'空分類');assert.deepEqual(cleaned.categories,['保留']);assert.equal(cleaned.categoryIds['空分類'],undefined);assert.equal(d.categories.length,2);assert.deepEqual(cleaned.products,d.products);assert.throws(()=>L.removeEmptyCategory(d,'不存在'),/找不到/);
const gift={...p,id:'g',sku:'02',initial:0,sellDisplay:false};d.products.push(gift);d.promotions=[{id:'r',type:'category',productId:'g',category:'保留',threshold:100,amount:100,minQty:1,requires:[]}];
assert.equal(L.resolveGiftCart(d,{p:1}).cart.g,undefined);assert.equal(L.resolveGiftCart(d,{p:1}).messages.length,1);gift.sellDisplay=true;assert.equal(L.resolveGiftCart(d,{p:1}).cart.g,1);
// Verify stock toggles trim an existing cart and do not alter transaction history.
const input={dataset:{display:'p'},checked:false},ctx={...L,db:d,manualCart:{p:3},document:{querySelectorAll:()=>[input]},structuredClone,render:()=>{},toast:()=>{}};
ctx.persist=next=>{ctx.db=next;return true};vm.createContext(ctx);vm.runInContext(fs.readFileSync('pages/inventory/inventory.js','utf8'),ctx);ctx.bindInventoryControls();input.onchange();assert.equal(ctx.db.products[0].sellDisplay,false);assert.equal(ctx.manualCart.p,2);
ctx.persist=()=>false;input.checked=true;ctx.bindInventoryControls();input.onchange();assert.equal(input.checked,false,'restore toggle after storage failure');
// Import accepts the optional boolean, rejects malformed values, and preserves old backups.
const backupCtx={...L,categorySku:()=>'',...ctx};vm.createContext(backupCtx);vm.runInContext(fs.readFileSync('features/backup/backup.js','utf8'),backupCtx);d.promotions=[];assert.equal(backupCtx.validateData(d),true);p.sellDisplay='false';assert.equal(backupCtx.validateData(d),false);delete p.sellDisplay;assert.equal(backupCtx.validateData(d),true);
console.log('PASS: display stock policy, historical -1, gift limits, cart trimming, storage failure, category safeguards, prefix removal and backup compatibility');

