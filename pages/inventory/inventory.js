let inventorySelection=new Set(),inventoryCategory='';
function filteredInventory(){return db.products.filter(p=>!inventoryCategory||inCategory(p,inventoryCategory))}
function inventoryFilterHTML(id){return uiTemplate`<label class="inventory-filter">顯示分類<select id="${id}"><option value="">所有分類</option>${db.categories.map(c=>`<option value="${esc(c)}" ${inventoryCategory===c?'selected':''}>${esc(c)}</option>`).join('')}</select></label>`}
function changeInventoryCategory(value){inventoryCategory=value;inventorySelection.clear()}
function selectedDisplayOn(){return inventorySelection.size>0&&db.products.filter(p=>inventorySelection.has(p.id)).every(sellsDisplay)}

// pages/inventory/inventory.js

function inventoryHTML(){if(inventoryCategory&&!db.categories.includes(inventoryCategory))changeInventoryCategory('');const all=filteredInventory();inventorySelection=new Set([...inventorySelection].filter(id=>all.some(p=>p.id===id)));return uiTemplate`<section class="view"><div class="stats"><div class="stat"><span class="sub">商品總數</span><strong>${all.length}<small class="sub"> 件</small></strong></div><div class="stat"><span class="sub">目前庫存合計</span><strong>${all.reduce((s,p)=>s+stock(db,p),0)}</strong></div><div class="stat"><span class="sub">累計售出</span><strong>${all.reduce((s,p)=>s+sold(db,p.id),0)}</strong></div></div><div class="row"><h3>商品庫存明細</h3><button data-action="categories">管理分類</button><div class="sub">目前庫存 = 起始庫存 − 販售數量</div></div><p class="sub">上方勾選控制顯示欄位；表格內「販售展示品」控制該商品能否額外販售 1 件，變更立即儲存。新商品預設開啟展示品販售。</p>${inventoryFilterHTML("inventoryCategory")}${inventoryBulkHTML()}<div class="columns">${Object.entries(cols).map(([k,v])=>`<label><input type="checkbox" data-col="${k}" ${visible.includes(k)?'checked':''}>${ui(v)}</label>`).join('')}</div><div class="tablewrap"><table><thead><tr><th><input type="checkbox" id="inventorySelectAll" aria-label="全選商品" ${all.length&&inventorySelection.size===all.length?'checked':''} ${!all.length?'disabled':''}></th>${Object.entries(cols).filter(([k])=>visible.includes(k)).map(([,v])=>`<th>${ui(v)}</th>`).join('')}<th>管理</th></tr></thead><tbody>${[...all].sort((a,b)=>a.sku.localeCompare(b.sku,undefined,{numeric:true})).map(p=>uiTemplate`<tr><td><input type="checkbox" data-inventory-select="${p.id}" aria-label="選取 ${esc(p.name)}" ${inventorySelection.has(p.id)?'checked':''}></td>${Object.keys(cols).filter(k=>visible.includes(k)).map(k=>`<td>${k==='sellDisplay'?uiTemplate`<input type="checkbox" data-display="${p.id}" aria-label="${esc(p.name)}：販售展示品" ${sellsDisplay(p)?'checked':''}>`:k==='current'?stock(db,p):k==='sold'?sold(db,p.id):k==='price'?money(p.price):k==='category'?esc(productCategories(p).join('、')):esc(p[k])}</td>`).join('')}<td><button class="icon" data-action="edit" data-id="${p.id}">編輯</button></td></tr>`).join('')}</tbody></table>${!all.length?ui('<div class="empty">新增商品後，庫存資料會自動出現在這裡。</div>'):''}</div><div class="actions" style="margin-top:20px"><button data-action="export">匯出備份</button><button data-action="import">匯入備份</button></div></section>`}

// Changing the allowance never rewrites completed transactions.
function bindInventoryControls(){
 const filter=$('#inventoryCategory');if(filter)filter.onchange=()=>{changeInventoryCategory(filter.value);render()};
 const selectAll=$('#inventorySelectAll');if(selectAll)selectAll.onchange=()=>{inventorySelection=new Set(selectAll.checked?filteredInventory().map(p=>p.id):[]);render()};
 document.querySelectorAll('[data-inventory-select]').forEach(input=>input.onchange=()=>{if(input.checked)inventorySelection.add(input.dataset.inventorySelect);else inventorySelection.delete(input.dataset.inventorySelect);render()});

 document.querySelectorAll('[data-display]').forEach(input=>input.onchange=()=>{
  const next=structuredClone(db),p=next.products.find(p=>p.id===input.dataset.display);if(!p)return;
  p.sellDisplay=input.checked;
  if(persist(next)){
   const limit=availableStock(db,p);
   if((manualCart[p.id]||0)>limit){if(limit)manualCart[p.id]=limit;else delete manualCart[p.id]}
   render();toast(p.sellDisplay?ui('已允許販售 1 件展示品'):ui('已停用展示品販售，購物袋已依庫存更新'));
  }else input.checked=sellsDisplay(db.products.find(x=>x.id===p.id));
 });
}
function categoryManager(){
 openModal(ui('<div class="row"><h2>管理分類</h2><button id="closeCategories" class="icon" aria-label="關閉分類管理">×</button></div><p class="sub">刪除分類會保留商品的其他分類；沒有其他分類時移至無分類。編號繼承分類被移除時改用剩餘分類，歷史交易同步改號；相關分類優惠一併移除。</p>')+db.categories.map(c=>{
  const reason=categoryRemovalReason(db,c);
  return '<article class="transaction"><div class="row"><strong>'+esc(c)+'</strong><button class="danger" data-remove-category="'+esc(c)+'" '+(reason?'disabled':'')+ui('>移除分類</button></div><p class="sub">分類編號：')+esc(db.categoryIds?.[c]||ui('未設定'))+' · '+db.products.filter(p=>inCategory(p,c)).length+ui(' 件商品</p>')+(reason?'<p class="sub">'+esc(ui(reason))+'</p>':'')+'</article>';
 }).join('')+(db.categories.length?'':ui('<p class="empty">尚無分類；可從新增商品建立。</p>')));
 $('#closeCategories').onclick=closeModal;
 document.querySelectorAll('[data-remove-category]').forEach(button=>button.onclick=()=>{
  const name=button.dataset.removeCategory,reason=categoryRemovalReason(db,name);if(reason)return toast(ui(reason));
  confirmDialog(ui('移除分類？'),ui('將移除「')+esc(name)+ui('」及其分類編號，商品保留其他分類，必要時移至無分類並更新編號；分類優惠移除，交易保留。'),()=>{
   const reason=categoryRemovalReason(db,name);if(reason)return toast(ui(reason));
   let next;try{next=removeEmptyCategory(db,name)}catch(e){return toast(ui(e.message))}if(persist(next)){if(category===name)category='所有';render();categoryManager();toast(ui('分類已移除'))}
  });
 });
}

function inventoryBulkHTML(){return uiTemplate`<div class="actions inventory-bulk"><button data-action="zeroInventory" class="danger" ${db.products.length?'':'disabled'}>所有商品庫存歸零</button><button data-action="manageProducts">商品管理</button><button data-action="displayToggle" ${inventorySelection.size?'':'disabled'}>${selectedDisplayOn()?ui("所選商品：關閉展示品"):ui("所選商品：開啟展示品")}</button><button data-action="inventoryCsv" ${inventorySelection.size&&visible.length?'':'disabled'}>匯出所選 CSV</button><span class="sub">已選取 ${inventorySelection.size} 件商品</span></div>`}
function trimInventoryCart(){for(const id of Object.keys(manualCart)){const p=db.products.find(p=>p.id===id),limit=p?availableStock(db,p):0;if(manualCart[id]>limit){if(limit)manualCart[id]=limit;else delete manualCart[id]}}}
function confirmZeroInventory(){if(!db.products.length)return;confirmDialog(ui('所有商品庫存歸零？'),ui('將所有商品的目前庫存調整為 0，保留交易紀錄。展示品開啟時仍可販售 1 件；刪除舊交易仍會返還庫存。'),()=>{if(persist(zeroInventory(db))){trimInventoryCart();render();toast(ui('所有商品目前庫存已歸零'))}})}
function setSelectedDisplay(enabled){if(!inventorySelection.size)return;const ids=[...inventorySelection];confirmDialog(ui(enabled?'開啟所選商品展示品販售？':'關閉所選商品展示品販售？'),uiTemplate`將更新 ${ids.length} 件商品，購物袋數量會依新上限調整。`,()=>{if(persist(bulkDisplaySetting(db,ids,enabled))){trimInventoryCart();render();toast(ui('展示品販售設定已更新'))}})}
function productManager(){
 openModal(uiTemplate`<div class="row"><h2>商品管理</h2><button id="closeProductManager" aria-label="關閉視窗">×</button></div><p class="sub">已有交易的商品不可刪除；其餘商品刪除時會自動清理優惠綁定與失效活動。</p>${inventoryFilterHTML("managerCategory")}<label><input type="checkbox" id="managerSelectAll" ${filteredInventory().length&&inventorySelection.size===filteredInventory().length?'checked':''}>全選商品</label><div class="tablewrap"><table><tbody>${sortProductItems(filteredInventory()).map(p=>uiTemplate`<tr><td><input type="checkbox" data-manager-select="${p.id}" aria-label="選取 ${esc(p.name)}" ${inventorySelection.has(p.id)?'checked':''}></td><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td class="sub">${esc(ui(productDeletionReason(db,p.id)))}</td></tr>`).join('')}</tbody></table></div><div class="formactions"><button id="deleteSelectedProducts" class="danger" ${inventorySelection.size?'':'disabled'}>刪除所選商品</button></div>`);
 $('#managerCategory').onchange=e=>{changeInventoryCategory(e.target.value);render();productManager()};
 $('#closeProductManager').onclick=()=>{closeModal();render()};$('#managerSelectAll').onchange=e=>{inventorySelection=new Set(e.target.checked?filteredInventory().map(p=>p.id):[]);render();productManager()};
 document.querySelectorAll('[data-manager-select]').forEach(input=>input.onchange=()=>{if(input.checked)inventorySelection.add(input.dataset.managerSelect);else inventorySelection.delete(input.dataset.managerSelect);render();productManager()});
 $('#deleteSelectedProducts').onclick=()=>{const ids=[...inventorySelection],blocked=db.products.filter(p=>inventorySelection.has(p.id)&&productDeletionReason(db,p.id));if(blocked.length)return toast(ui('所選商品仍有交易，尚未刪除任何商品'));
 confirmDialog(ui('刪除所選商品？'),uiTemplate`將永久刪除 ${ids.length} 件商品及其庫存資料，並清理優惠綁定與失效活動。建議先匯出備份。`,()=>{try{const next=deleteSelectedProducts(db,ids);if(persist(next)){inventorySelection.clear();trimInventoryCart();render();toast(ui('所選商品已刪除'))}}catch(e){toast(ui(e.message))}})};
}
function exportInventoryCsv(){if(!inventorySelection.size||!visible.length)return;const labels=Object.fromEntries(Object.entries(cols).map(([k,v])=>[k,ui(v)])),csv=inventoryCsv(db,[...inventorySelection],Object.keys(cols).filter(k=>visible.includes(k)),labels,ui('開啟'),ui('關閉'));
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='inventory-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
