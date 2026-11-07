global.structuredClone ??= value=>require('node:v8').deserialize(require('node:v8').serialize(value));
const assert=require('node:assert/strict'),L=require('../../shared/js/pricing.js'),fs=require('fs'),vm=require('vm');
const product=(id,price,category='C')=>({id,sku:id,name:id,category,price,initial:100,printed:100,offer:null,minQty:1,requires:[],image:'',sellDisplay:false});
const d={version:1,products:[product('a',150),product('b',120),product('c',90),product('g',80,'G')],categories:['C','G'],transactions:[],coupons:[],promotions:[]};
const nth={id:'n',name:'nth',type:'nth_price',scope:'products',productIds:['a','b','c'],nth:2,offer:30};d.promotions=[nth];
for(const count of [2,4,6,8]){const t=L.priceCart(d,{b:count});assert.equal(t.items[0].discountQty,count/2);assert.equal(t.total,count/2*(120+30))}
let t=L.priceCart(d,{a:2,b:1,c:1});assert.equal(t.total,360);assert.equal(t.offers.length,1);assert.equal(t.offers[0].qty,2);assert.equal(t.offers[0].saving,150);assert.deepEqual(t.items.map(i=>i.discountQty),[0,1,1]);assert.equal(L.priceCart(d,{a:2,b:1,c:1}).total,L.priceCart(d,{c:1,b:1,a:2}).total);
nth.type='nth_percent';nth.rate=6;assert.equal(L.priceCart(d,{a:2,b:2}).total,444);nth.nth=3;assert.equal(L.priceCart(d,{b:8}).items[0].discountQty,2);
const gift={id:'gift',name:'gift',type:'category',productId:'g',category:'C',threshold:500,discountLimit:2};d.promotions=[gift];d.products[0].price=100;assert.equal(L.validPromotions(d),true);
for(const [qty,expected] of [[4,0],[5,1],[9,1],[10,2],[15,2]]){const manual={a:qty},g=L.resolveGiftCart(d,manual);assert.equal(g.cart.g||0,expected);assert.equal(L.priceCart(d,g.cart,'',manual).total,qty*100)}
gift.discountLimit=null;let gifts=L.resolveGiftCart(d,{a:15});assert.equal(gifts.auto.g,3);assert.equal(L.priceCart(d,gifts.cart,'',{a:15}).items.find(i=>i.id==='g').unit,0);
gifts=L.resolveGiftCart(d,{a:10,g:1});assert.equal(gifts.auto.g,1);assert.equal(L.priceCart(d,{a:5,g:3},'',{a:5,g:3}).items.find(i=>i.id==='g').total,160);
d.products[3].initial=1;gifts=L.resolveGiftCart(d,{a:15});assert.equal(gifts.auto.g,1);assert.equal(gifts.messages.length,1);d.products[3].sellDisplay=true;assert.equal(L.resolveGiftCart(d,{a:15}).auto.g,2);
assert.equal(L.resolveGiftCart(d,{a:10},new Set(['g'])).cart.g,undefined);assert.equal(L.resolveGiftCart(d,{a:4},new Set(['g'])).declined.size,0);
// Old fields no longer affect free gifts; old transaction prices remain snapshots.
gift.amount=1;gift.minQty=5;gift.requires=[{id:'b',qty:99}];assert.equal(L.resolveGiftCart(d,{a:5}).auto.g,1);assert.equal(L.priceCart(d,{a:5,g:1},'',{a:5}).total,500);
const bundle={id:'bundle',name:'bundle',type:'bundle',productId:'a',offer:50,minQty:1,discountLimit:2,requires:[{id:'b',qty:2},{id:'c',qty:1}]};d.promotions=[bundle];
for(const [cart,expected] of [[{a:2,b:2,c:1},1],[{a:2,b:4,c:2},2],[{a:2,b:4,c:1},1],[{a:3,b:6,c:3},2],[{a:2,b:1,c:2},0]])assert.equal(L.priceCart(d,cart).items.find(i=>i.id==='a').discountQty,expected);
bundle.discountLimit=null;assert.equal(L.priceCart(d,{a:3,b:6,c:3}).items[0].discountQty,3);bundle.minQty=2;assert.equal(L.priceCart(d,{a:3,b:6,c:3}).items[0].discountQty,1);
const ctx={...L,categorySku:(d,c,b)=>(d.categoryIds?.[c]||'')+b,structuredClone};vm.createContext(ctx);vm.runInContext(fs.readFileSync('shared/js/format.js','utf8'),ctx);vm.runInContext(fs.readFileSync('features/backup/backup.js','utf8'),ctx);
d.promotions=[{...gift,requires:[],minQty:1}];delete d.promotions[0].amount;assert.equal(ctx.validateData(d),true);
const snapshot=L.priceCart(d,{a:1});snapshot.date=new Date().toISOString();snapshot.number=1;d.transactions=[snapshot];const before=JSON.stringify(d.transactions);L.priceCart(d,L.resolveGiftCart(d,{a:10}).cart,'',{a:10});assert.equal(JSON.stringify(d.transactions),before);assert.equal(ctx.validateData(d),true);
console.log('PASS: repeated nth discounts across products, gift multiples/caps/stock/old data, per-unit bundle requirements and backup/history compatibility');
