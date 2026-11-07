const assert=require('node:assert/strict');const {stock,sold,priceCart,nextNumber}=require('../../shared/js/pricing.js');
const db={products:[{id:'a',name:'A',sku:'001',price:100,initial:2,offer:80,minQty:2,requires:[{id:'b',qty:1}]},{id:'b',name:'B',sku:'002',price:50,initial:0,offer:null}],transactions:[],coupons:[{code:'TEN',type:'percent',value:10},{code:'BIG',type:'fixed',value:999}]};
db.products[0].discountLimit=2;
let partial=priceCart(db,{a:5,b:1},'TEN');assert.equal(partial.items[0].discountQty,1);assert.equal(partial.items[0].regularQty,4);assert.equal(partial.items[0].total,480);assert.equal(partial.offers[0].saving,20);assert.equal(partial.total,477);
assert.equal(priceCart(db,{a:5}).items[0].discountQty,0);
db.products[0].discountLimit=10;assert.equal(priceCart(db,{a:2,b:1}).items[0].discountQty,1);
db.products[0].discountLimit=null;assert.equal(priceCart(db,{a:5,b:1}).items[0].total,480);
assert.equal(priceCart(db,{a:2}).total,200);assert.equal(priceCart(db,{a:1,b:1}).total,150);assert.equal(priceCart(db,{a:2,b:1},'ten').total,207);assert.equal(priceCart(db,{a:2,b:1},'BIG').total,0);assert.equal(priceCart(db,{a:2,b:1},'bad').total,230);
db.transactions.push({...priceCart(db,{a:3,b:1}),number:1});assert.equal(stock(db,db.products[0]),-1);assert.equal(stock(db,db.products[1]),-1);assert.equal(sold(db,'a'),3);assert.equal(nextNumber(db),2);db.transactions=[];assert.equal(stock(db,db.products[0]),2);assert.equal(nextNumber(db),1);db.transactions=[{number:1,items:[]},{number:3,items:[]}];assert.equal(nextNumber(db),4);db.transactions.pop();assert.equal(nextNumber(db),2);console.log('PASS: bundle conditions, coupons, price floor, display stock, transaction restoration and numbering');
