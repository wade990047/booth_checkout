const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),L=require('../../shared/js/pricing.js');
const products=['A-10','B-1','A-2','A-1'].map((sku,i)=>({id:'p'+i,sku,name:sku+'商品',category:sku[0],categories:[sku[0]],price:100,initial:10,offer:null,requires:[]}));
let html='';const stop=new Error('captured');const ctx={...L,db:{products,categories:['A','B'],promotions:[],transactions:[]},cart:{},manualCart:{},ui:x=>x,uiTemplate:(s,...v)=>s.reduce((a,b,i)=>a+b+(v[i]??''),''),esc:String,money:String,openModal:s=>{html=s;throw stop}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('pages/promotions/promotions.js','utf8'),ctx);
const before=JSON.stringify(products);try{ctx.promotionForm()}catch(e){assert.equal(e,stop)}
const select=html.match(/<select name="productId">([\s\S]*?)<\/select>/)[1];assert.deepEqual([...select.matchAll(/value="(p\d)"/g)].map(x=>x[1]),['p3','p2','p0','p1']);assert.match(select,/value="p3" selected/);
ctx.db.promotions=[{id:'edit',productId:'p0',type:'bundle',requires:[],minQty:1,offer:50}];try{ctx.promotionForm('edit')}catch(e){assert.equal(e,stop)}assert.match(html, /value="p0" selected/);
let desc=ctx.promotionDescription({type:'nth_price',scope:'products',productIds:products.map(p=>p.id),nth:2,offer:30});assert.ok(desc.indexOf('A-2商品')<desc.indexOf('A-10商品'));
desc=ctx.promotionDescription({type:'bundle',productId:'p0',minQty:1,offer:50,requires:[{id:'p1',qty:1},{id:'p2',qty:2},{id:'p3',qty:1}]});assert.ok(desc.indexOf('A-1商品')<desc.indexOf('A-2商品'));assert.ok(desc.indexOf('A-2商品')<desc.indexOf('A-10商品'));
assert.deepEqual(Array.from(ctx.sortedBindings('p1'),p=>p.sku),['A-1','A-2','A-10']);assert.equal(JSON.stringify(products),before);
console.log('PASS: promotion product dropdown numeric ID order, default/edit selection, descriptions, nonmutating display sorting');
