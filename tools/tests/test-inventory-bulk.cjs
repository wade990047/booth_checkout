global.structuredClone ??= value => require('node:v8').deserialize(require('node:v8').serialize(value));
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('../../shared/js/pricing.js');
const product=(id,sku,initial=5)=>({id,sku,name:id,category:'C',price:100,initial,printed:20,sellDisplay:true,offer:null,requires:[]});
const d={products:[product('a','10'),product('b','2'),product('c','1',0)],transactions:[{number:3,items:[{id:'a',qty:2},{id:'c',qty:1}]}],promotions:[],coupons:[],categories:['C']};
const original=JSON.stringify(d),zero=L.zeroInventory(d);
assert.deepEqual(zero.products.map(p=>L.stock(zero,p)),[0,0,0]);assert.equal(zero.products[0].initial,2);assert.equal(zero.products[0].printed,20);assert.deepEqual(zero.transactions,d.transactions);assert.equal(JSON.stringify(d),original);assert.equal(L.availableStock(zero,zero.products[0]),1);
const off=L.bulkDisplaySetting(zero,['a','b'],false);assert.equal(L.availableStock(off,off.products[0]),0);assert.equal(off.products[2].sellDisplay,true);assert.equal(zero.products[0].sellDisplay,true);
assert.throws(()=>L.deleteSelectedProducts(d,['b','a']),/交易/);assert.equal(d.products.length,3);assert.deepEqual(L.deleteSelectedProducts(d,['b']).products.map(p=>p.id),['a','c']);
for(const rule of [{id:'r',productId:'b'},{id:'r',requires:[{id:'b',qty:1}]},{id:'r',productIds:['b']}]){const bound={...d,promotions:[rule]};assert.throws(()=>L.deleteSelectedProducts(bound,['b']),/優惠/)}
assert.deepEqual(L.sortProductItems(d.products).map(p=>p.sku),['1','2','10']);assert.deepEqual(d.products.map(p=>p.sku),['10','2','1']);
const priced=L.priceCart({...d,transactions:[]},{a:1,b:1,c:1});assert.deepEqual(priced.items.map(p=>p.sku),['1','2','10']);
const csvData=structuredClone(d);csvData.products[0].name='=SUM(1,2)';csvData.products[2].name='line"one\nline2';
const csv=L.inventoryCsv(csvData,['a','c'],['sku','name','current'],{sku:'ID',name:'Name',current:'Stock'});
assert.equal(csv.charCodeAt(0),0xFEFF);assert.ok(csv.startsWith('\uFEFF"ID","Name","Stock"\r\n"1"'));assert.ok(csv.includes('"\'=SUM(1,2)"'));assert.ok(csv.includes('"line""one\nline2","-1"'));assert.ok(!csv.includes('"2","b"'));assert.equal(csv.includes('price'),false);
const callbacks=[],ctx={...L,db:structuredClone(d),structuredClone,ui:s=>s,uiTemplate:(strings,...values)=>strings.reduce((s,p,i)=>s+p+(values[i]??''),''),confirmDialog:(title,body,callback)=>callbacks.push(callback),render:()=>{},toast:()=>{},money:String,esc:String,dateText:String,itemPriceText:()=>''};let saves=0;ctx.persist=next=>{saves++;ctx.db=next;return true};vm.createContext(ctx);vm.runInContext(fs.readFileSync('pages/history/history.js','utf8'),ctx);
ctx.confirmDeleteAllTransactions();assert.equal(saves,0);assert.equal(callbacks.length,1);callbacks.shift()();assert.equal(callbacks.length,1);assert.equal(saves,0);assert.equal(ctx.db.transactions.length,1);callbacks.shift()();assert.equal(saves,1);assert.equal(ctx.db.transactions.length,0);assert.equal(L.stock(ctx.db,ctx.db.products[0]),5);assert.equal(L.nextNumber(ctx.db),1);
ctx.db={...d,transactions:[{number:1,id:'t',date:'2026-11-08',total:200,items:[{id:'a',sku:'10',name:'A',qty:1,total:100},{id:'b',sku:'2',name:'B',qty:1,total:100}],offers:[]}]};const html=ctx.historyHTML();assert.ok(html.indexOf('2　B')<html.indexOf('10　A'));
assert.ok(fs.readFileSync('features/products/product-editor.js','utf8').includes('sellDisplay:true'));
console.log('PASS: bulk zero stock, display limits, atomic guarded deletion, CSV escaping/selection, natural ordering and double-confirm deletion/restoration');
