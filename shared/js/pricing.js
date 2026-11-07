/* Pure checkout rules. Legacy offers are adapted without changing saved data. */
function sold(db,id){return db.transactions.reduce((s,t)=>s+t.items.filter(i=>i.id===id).reduce((a,i)=>a+i.qty,0),0)}
function stock(db,p){return p.initial-sold(db,p.id)}
// Display items are allowed by default; explicit opt-out is preserved.
function sellsDisplay(p){return p.sellDisplay!==false}
function availableStock(db,p){return Math.max(0,stock(db,p)+(sellsDisplay(p)?1:0))}
function categoryRemovalReason(db,name){
 if(!db.categories.includes(name))return '找不到此分類';
 if(db.products.some(p=>p.category===name))return '此分類仍有商品，請先編輯商品並移至其他分類';
 if(allPromotions(db).some(r=>(r.type==='category'||r.type==='order_category'||isNthRule(r)&&r.scope==='category')&&r.category===name))return '此分類仍有優惠活動，請先修改或移除相關活動';
 return '';
}
function removeEmptyCategory(db,name){
 const reason=categoryRemovalReason(db,name);if(reason)throw Error(reason);
 const next=structuredClone(db);next.categories=next.categories.filter(c=>c!==name);
 if(next.categoryIds)delete next.categoryIds[name];return next;
}
function allPromotions(db){return [...db.products.filter(p=>p.offer!=null).map(p=>({id:'legacy:'+p.id,productId:p.id,name:p.offerName||p.name+'優惠',type:'bundle',offer:p.offer,minQty:p.minQty||1,discountLimit:p.discountLimit??null,requires:p.requires||[]})),...(db.promotions||[])]}
function isOrderRule(r){return r.type==='order_all'||r.type==='order_category'}
function isNthRule(r){return r.type==='nth_price'||r.type==='nth_percent'}
function scopeProducts(db,r){return db.products.filter(p=>r.type==='order_all'||(r.type==='order_category'||r.scope==='category'?p.category===r.category:(r.productIds||[]).includes(p.id)))}
function relatedPromotion(db,r,p){if(isOrderRule(r)||isNthRule(r))return scopeProducts(db,r).some(x=>x.id===p.id);return r.productId===p.id||(r.requires||[]).some(x=>x.id===p.id)||(r.type==='category'&&p.category===r.category)}
function productHasDiscount(db,r,p){if(isOrderRule(r))return false;if(isNthRule(r))return relatedPromotion(db,r,p)&&(r.type==='nth_price'?r.offer<p.price:r.rate<10&&p.price>0);return r.productId===p.id&&(r.type==='category'?r.amount>0&&p.price>0:r.offer<p.price)}
function promotionState(db,cart,r,pricedItems,qualificationCart=cart){
 if(isOrderRule(r)){
  const scope=scopeProducts(db,r),ids=new Set(scope.map(p=>p.id));const items=pricedItems||priceItems(db,cart,qualificationCart).items;
  const basis=items.filter(i=>ids.has(i.id)).reduce((s,i)=>s+i.total,0),eligible=basis>=r.threshold;
  return {eligible,relevant:scope.some(p=>cart[p.id]>0),basis,saving:eligible?Math.min(basis,r.amount):0};
 }
 if(isNthRule(r)){
  const list=scopeProducts(db,r).filter(p=>cart[p.id]>0).sort((a,b)=>a.price-b.price||a.sku.localeCompare(b.sku,'zh-TW',{numeric:true})||a.id.localeCompare(b.id));
  const count=list.reduce((s,p)=>s+cart[p.id],0),eligible=count>=r.nth,p=list[0];
  const unit=p?Math.min(p.price,r.type==='nth_price'?r.offer:Math.round(p.price*r.rate/10)):0;
  return {eligible,relevant:count>0,count,productId:p?.id,discountQty:eligible?1:0,unit,saving:eligible?p.price-unit:0};
 }
 const p=db.products.find(p=>p.id===r.productId);if(!p)return {eligible:false,relevant:false,saving:0};
 const basis=r.type==='category'?qualificationCart:cart;
 const qty=cart[p.id]||0,categoryTotal=db.products.filter(p=>p.category===r.category).reduce((s,p)=>s+p.price*(basis[p.id]||0),0);
 const eligible=qty>=(r.minQty||1)&&(r.requires||[]).every(x=>(basis[x.id]||0)>=x.qty)&&(r.type!=='category'||categoryTotal>=r.threshold);
 const discountQty=eligible?Math.min(qty,r.discountLimit??qty):0,unit=Math.min(p.price,r.type==='category'?Math.max(0,p.price-r.amount):r.offer);
 return {eligible,relevant:qty>0||(r.requires||[]).some(x=>cart[x.id]>0)||(r.type==='category'&&categoryTotal>0),categoryTotal,productId:p.id,discountQty,unit,saving:(p.price-unit)*discountQty};
}
function priceItems(db,cart,qualificationCart=cart){
 const offers=[],candidates=allPromotions(db).filter(r=>!isOrderRule(r)).map(r=>({r,...promotionState(db,cart,r,undefined,qualificationCart)}));
 const items=Object.entries(cart).filter(([,q])=>q>0).map(([id,qty])=>{
  const p=db.products.find(x=>x.id===id);if(!p)return null;
  const best=candidates.filter(x=>x.productId===id&&x.eligible&&x.saving>0).sort((a,b)=>b.saving-a.saving)[0];
  const discountQty=best?.discountQty||0,unit=best?.unit??p.price,regularQty=qty-discountQty;
  if(best)offers.push({id:best.r.id,name:best.r.name,saving:best.saving,qty:discountQty,scope:'item'});
  return {id,name:p.name,sku:p.sku,qty,original:p.price,unit,discountQty,regularQty,total:unit*discountQty+p.price*regularQty};
 }).filter(Boolean);return {items,offers};
}
function priceCart(db,cart,code='',qualificationCart=cart){
 const {items,offers}=priceItems(db,cart,qualificationCart),original=items.reduce((s,i)=>s+i.original*i.qty,0),itemSubtotal=items.reduce((s,i)=>s+i.total,0);
 const order=allPromotions(db).filter(isOrderRule).map(r=>({r,...promotionState(db,cart,r,items)})).filter(x=>x.eligible&&x.saving>0).sort((a,b)=>b.saving-a.saving)[0];
 const orderDiscount=order?.saving||0,subtotal=itemSubtotal-orderDiscount;
 if(order)offers.push({id:order.r.id,name:order.r.name,saving:orderDiscount,scope:'order'});
 const coupon=db.coupons.find(c=>c.code.toUpperCase()===code.trim().toUpperCase());
 const discount=coupon?Math.min(subtotal,coupon.type==='percent'?Math.round(subtotal*coupon.value/100):coupon.value):0;
 return {items:sortProductItems(items),offers,original,itemSubtotal,orderDiscount,subtotal,discount,total:Math.max(0,subtotal-discount),coupon};
}
function nextNumber(db){return Math.max(0,...db.transactions.map(t=>t.number))+1}
function validPromotions(d){
 if(d.promotions===undefined)return true;if(!Array.isArray(d.promotions))return false;
 const ids=new Set(),positive=n=>Number.isSafeInteger(n)&&n>0,nonnegative=n=>Number.isSafeInteger(n)&&n>=0;
 return d.promotions.every(r=>{
  if(!r||typeof r.id!=='string'||r.id.startsWith('legacy:')||ids.has(r.id)||typeof r.name!=='string'||!r.name.trim())return false;ids.add(r.id);
  if(isOrderRule(r))return positive(r.threshold)&&positive(r.amount)&&(r.type==='order_all'||d.categories.includes(r.category));
  if(isNthRule(r))return positive(r.nth)&&r.nth>=2&&(r.scope==='category'?d.categories.includes(r.category):r.scope==='products'&&Array.isArray(r.productIds)&&r.productIds.length>0&&new Set(r.productIds).size===r.productIds.length&&r.productIds.every(id=>d.products.some(p=>p.id===id)))&&(r.type==='nth_price'?nonnegative(r.offer):typeof r.rate==='number'&&Number.isFinite(r.rate)&&r.rate>0&&r.rate<10);
  const p=d.products.find(p=>p.id===r.productId);if(!p||!['bundle','category'].includes(r.type))return false;
  return positive(r.minQty)&&(r.discountLimit==null||positive(r.discountLimit))&&Array.isArray(r.requires)&&r.requires.every(x=>x.id!==p.id&&d.products.some(p=>p.id===x.id)&&positive(x.qty))&&(r.type==='bundle'?nonnegative(r.offer)&&r.offer<=p.price:d.categories.includes(r.category)&&positive(r.threshold)&&positive(r.amount));
 });
}
if(typeof module!=='undefined')module.exports={sortProductItems,zeroInventory,bulkDisplaySetting,productDeletionReason,deleteSelectedProducts,inventoryCsv,sellsDisplay,availableStock,categoryRemovalReason,removeEmptyCategory,sold,stock,priceCart,priceItems,nextNumber,allPromotions,promotionState,validPromotions,isOrderRule,isNthRule,scopeProducts,relatedPromotion,productHasDiscount,resolveGiftCart};

// Auto-added quantities never contribute to gift thresholds or required-item conditions.
function resolveGiftCart(db,manual,declined=new Set()){
 const cart={...manual},auto={},messages=[],eligibleIds=new Set(),needed={};
 for(const r of allPromotions(db).filter(r=>r.type==='category')){
  const p=db.products.find(p=>p.id===r.productId);if(!p)continue;
  const sum=db.products.filter(p=>p.category===r.category).reduce((s,p)=>s+p.price*(manual[p.id]||0),0);
  if(sum<r.threshold||!(r.requires||[]).every(x=>(manual[x.id]||0)>=x.qty))continue;
  eligibleIds.add(p.id);if(declined.has(p.id))continue;
  if((manual[p.id]||0)>=(r.minQty||1))continue;
  if(availableStock(db,p)<(r.minQty||1)){messages.push(p.name+'：滿額贈已達標，但庫存不足，未自動加入');continue}
  needed[p.id]=Math.max(needed[p.id]||0,(r.minQty||1)-(manual[p.id]||0));
 }
 for(const [id,qty] of Object.entries(needed)){auto[id]=qty;cart[id]=(manual[id]||0)+qty}
 return {cart,auto,messages,declined:new Set([...declined].filter(id=>eligibleIds.has(id)))};
}

function sortProductItems(items){return [...items].sort((a,b)=>String(a.sku).localeCompare(String(b.sku),'zh-TW',{numeric:true})||String(a.id).localeCompare(String(b.id)))}
function zeroInventory(data){const next=structuredClone(data);for(const p of next.products)p.initial=sold(next,p.id);return next}
function bulkDisplaySetting(data,ids,enabled){const chosen=new Set(ids),next=structuredClone(data);for(const p of next.products)if(chosen.has(p.id))p.sellDisplay=enabled;return next}
function productDeletionReason(data,id){
 if(data.transactions.some(t=>t.items.some(i=>i.id===id)))return '此商品已有交易，請先刪除相關交易再刪除商品';
 if(allPromotions(data).some(r=>r.productId===id&&!r.id.startsWith('legacy:')||r.requires?.some(x=>x.id===id)||r.productIds?.includes(id)))return '此商品已綁定優惠，請先解除其他商品的綁定';
 return '';
}
function deleteSelectedProducts(data,ids){
 const chosen=new Set(ids);for(const p of data.products)if(chosen.has(p.id)){const reason=productDeletionReason(data,p.id);if(reason)throw Error(reason)}
 const next=structuredClone(data);next.products=next.products.filter(p=>!chosen.has(p.id));return next;
}
function inventoryCsv(data,ids,columns,labels,yes='Yes',no='No'){
 const chosen=new Set(ids),keys=columns.filter(k=>Object.prototype.hasOwnProperty.call(labels,k));
 const cell=(value,text=false)=>{let s=String(value??'');if(text&&/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"'};
 const rows=[keys.map(k=>cell(labels[k],true)).join(',')];
 for(const p of sortProductItems(data.products).filter(p=>chosen.has(p.id)))rows.push(keys.map(k=>{const v=k==='current'?stock(data,p):k==='sold'?sold(data,p.id):k==='sellDisplay'?(sellsDisplay(p)?yes:no):p[k];return cell(v,['sku','name','category','sellDisplay'].includes(k))}).join(','));
 return '\uFEFF'+rows.join('\r\n')+'\r\n';
}
