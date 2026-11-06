// pages/inventory/inventory.js

function inventoryHTML(){const all=db.products;return `<section class="view"><div class="stats"><div class="stat"><span class="sub">商品總數</span><strong>${all.length}<small class="sub"> 件</small></strong></div><div class="stat"><span class="sub">目前庫存合計</span><strong>${all.reduce((s,p)=>s+stock(db,p),0)}</strong></div><div class="stat"><span class="sub">累計售出</span><strong>${all.reduce((s,p)=>s+sold(db,p.id),0)}</strong></div></div><div class="row"><h3>商品庫存明細</h3><button data-action="categories">管理分類</button><div class="sub">目前庫存 = 起始庫存 − 販售數量</div></div><p class="sub">上方勾選控制顯示欄位；表格內「販售展示品」控制該商品能否額外販售 1 件，變更立即儲存。新商品預設不販售展示品。</p><div class="columns">${Object.entries(cols).map(([k,v])=>`<label><input type="checkbox" data-col="${k}" ${visible.includes(k)?'checked':''}>${v}</label>`).join('')}</div><div class="tablewrap"><table><thead><tr>${Object.entries(cols).filter(([k])=>visible.includes(k)).map(([,v])=>`<th>${v}</th>`).join('')}<th>管理</th></tr></thead><tbody>${[...all].sort((a,b)=>a.sku.localeCompare(b.sku,undefined,{numeric:true})).map(p=>`<tr>${Object.keys(cols).filter(k=>visible.includes(k)).map(k=>`<td>${k==='sellDisplay'?`<input type="checkbox" data-display="${p.id}" aria-label="${esc(p.name)}：販售展示品" ${sellsDisplay(p)?'checked':''}>`:k==='current'?stock(db,p):k==='sold'?sold(db,p.id):k==='price'?money(p.price):esc(p[k])}</td>`).join('')}<td><button class="icon" data-action="edit" data-id="${p.id}">編輯</button></td></tr>`).join('')}</tbody></table>${!all.length?'<div class="empty">新增商品後，庫存資料會自動出現在這裡。</div>':''}</div><div class="actions" style="margin-top:20px"><button data-action="export">匯出備份</button><button data-action="import">匯入備份</button></div></section>`}

// Changing the allowance never rewrites completed transactions.
function bindInventoryControls(){
 document.querySelectorAll('[data-display]').forEach(input=>input.onchange=()=>{
  const next=structuredClone(db),p=next.products.find(p=>p.id===input.dataset.display);if(!p)return;
  p.sellDisplay=input.checked;
  if(persist(next)){
   const limit=availableStock(db,p);
   if((manualCart[p.id]||0)>limit){if(limit)manualCart[p.id]=limit;else delete manualCart[p.id]}
   render();toast(p.sellDisplay?'已允許販售 1 件展示品':'已停用展示品販售，購物袋已依庫存更新');
  }else input.checked=sellsDisplay(db.products.find(x=>x.id===p.id));
 });
}
function categoryManager(){
 openModal('<div class="row"><h2>管理分類</h2><button id="closeCategories" class="icon" aria-label="關閉分類管理">×</button></div><p class="sub">僅可移除沒有商品、也未被分類優惠使用的分類。請先從商品編輯移轉商品，並調整相關優惠活動。</p>'+db.categories.map(c=>{
  const reason=categoryRemovalReason(db,c);
  return '<article class="transaction"><div class="row"><strong>'+esc(c)+'</strong><button class="danger" data-remove-category="'+esc(c)+'" '+(reason?'disabled':'')+'>移除分類</button></div><p class="sub">分類編號：'+esc(db.categoryIds?.[c]||'未設定')+' · '+db.products.filter(p=>p.category===c).length+' 件商品</p>'+(reason?'<p class="sub">'+esc(reason)+'</p>':'')+'</article>';
 }).join('')+(db.categories.length?'':'<p class="empty">尚無分類；可從新增商品建立。</p>'));
 $('#closeCategories').onclick=closeModal;
 document.querySelectorAll('[data-remove-category]').forEach(button=>button.onclick=()=>{
  const name=button.dataset.removeCategory,reason=categoryRemovalReason(db,name);if(reason)return toast(reason);
  confirmDialog('移除分類？','將移除「'+esc(name)+'」及其分類編號，不會刪除商品或交易。',()=>{
   const reason=categoryRemovalReason(db,name);if(reason)return toast(reason);
   if(persist(removeEmptyCategory(db,name))){if(category===name)category='所有';render();categoryManager();toast('分類已移除')}
  });
 });
}
