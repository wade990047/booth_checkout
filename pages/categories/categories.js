// Pure operations are shared by the page and regression tests.
function addManagedCategory(data,name,prefix=''){
 name=name.trim();prefix=prefix.trim();if(!name||name.length>30||prefix.length>30||name==='所有')throw Error('請輸入有效分類名稱與編號');if(data.categories.includes(name))throw Error('分類名稱已存在');
 const next=structuredClone(data);next.categories.push(name);next.categoryIds={...next.categoryIds,[name]:prefix};return next;
}
function deleteManagedCategories(data,names){let next=structuredClone(data);for(const name of new Set(names))next=removeEmptyCategory(next,name);return next}
function manageProductCategories(data,ids,mode,source,target,inherit=false){
 if(!['add','remove','move'].includes(mode))throw Error('請選擇分類操作');
 if(mode!=='add'&&!data.categories.includes(source))throw Error('請先選擇來源分類');
 if(mode!=='remove'&&!data.categories.includes(target))throw Error('請先選擇目標分類');
 if(mode==='move'&&source===target)throw Error('來源與目標分類不能相同');
 const next=structuredClone(data),selected=new Set(ids);
 for(const p of next.products.filter(p=>selected.has(p.id))){
  if(mode!=='add'&&!inCategory(p,source))throw Error('所選商品不屬於來源分類');
  const oldPrimary=p.category,oldPrefix=next.categoryIds?.[oldPrimary]||'',base=p.baseSku??(p.sku.startsWith(oldPrefix)?p.sku.slice(oldPrefix.length):p.sku);
  let groups=productCategories(p).filter(c=>mode==='add'||c!==source);
  if(mode!=='remove'&&!groups.includes(target))groups.push(target);
  if(!groups.length){groups=['無分類'];if(!next.categories.includes('無分類'))next.categories.push('無分類')}
  p.categories=groups;
  p.category=inherit&&mode!=='remove'?target:groups.includes(oldPrimary)?oldPrimary:mode==='move'?target:groups[0];
  if(p.category!==oldPrimary){p.baseSku=p.category==='無分類'?p.sku:base;p.sku=(next.categoryIds?.[p.category]||'')+p.baseSku}
 }
 if(new Set(next.products.map(p=>p.sku.toLowerCase())).size!==next.products.length)throw Error('分類變更後商品編號重複');
 syncTransactionSkus(next);return next;
}
if(typeof module!=='undefined')module.exports={addManagedCategory,deleteManagedCategories,manageProductCategories};
let managedCategorySelection=new Set(),managedProductSelection=new Set(),managedSource='',managedQuery='';
function managedProducts(){return sortProductItems(db.products.filter(p=>(!managedSource||inCategory(p,managedSource))&&(p.name+' '+p.sku).toLowerCase().includes(managedQuery.toLowerCase())))}
function categoriesHTML(){
 if(managedSource&&!db.categories.includes(managedSource))managedSource='';
 const products=managedProducts();managedProductSelection=new Set([...managedProductSelection].filter(id=>products.some(p=>p.id===id)));managedCategorySelection=new Set([...managedCategorySelection].filter(c=>db.categories.includes(c)));
 return uiTemplate`<section class="view"><h2>分類管理</h2><form id="managedCategoryForm" class="actions inventory-bulk"><input name="name" required maxlength="30" placeholder="新分類名稱" aria-label="新分類名稱"><input name="prefix" maxlength="30" placeholder="分類 ID（選填）" aria-label="分類 ID（選填）"><button class="primary">新增分類</button></form>
 <div class="actions"><label><input type="checkbox" id="managedAllCategories" ${db.categories.filter(c=>c!=='無分類').length&&db.categories.filter(c=>c!=='無分類').every(c=>managedCategorySelection.has(c))?'checked':''}>全選分類</label><button id="managedDeleteCategories" class="danger" ${managedCategorySelection.size?'':'disabled'}>刪除所選分類</button></div>
 <div class="tablewrap"><table><thead><tr><th>選取</th><th>商品分類</th><th>分類編號</th><th>商品數量</th><th>管理</th></tr></thead><tbody>${db.categories.map(c=>uiTemplate`<tr><td><input type="checkbox" data-managed-category="${esc(c)}" aria-label="${esc(c)}" ${c==='無分類'?'disabled':''} ${managedCategorySelection.has(c)?'checked':''}></td><td>${esc(c)}</td><td>${esc(db.categoryIds?.[c]||'—')}</td><td>${db.products.filter(p=>inCategory(p,c)).length}</td><td><button data-view-category="${esc(c)}">查看商品</button></td></tr>`).join('')}</tbody></table></div>
 <h3>分類內商品</h3><div class="actions inventory-bulk"><select id="managedSource" aria-label="來源分類"><option value="">所有分類</option>${db.categories.map(c=>`<option value="${esc(c)}" ${c===managedSource?'selected':''}>${esc(c)}</option>`).join('')}</select><input id="managedSearch" type="search" placeholder="搜尋商品名稱、編號" value="${esc(managedQuery)}"></div>
 <form id="managedProductsForm"><div class="actions inventory-bulk"><select name="mode" aria-label="分類操作"><option value="add">加入目標分類</option><option value="move">移動至目標分類</option><option value="remove">移出來源分類</option></select><select name="target" aria-label="目標分類"><option value="">選擇目標分類</option>${db.categories.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('')}</select><label><input type="checkbox" name="inherit">改為繼承目標分類 ID</label><button class="primary" ${managedProductSelection.size?'':'disabled'}>套用至所選商品</button></div><p class="sub">加入會保留原分類；移動僅取代來源分類，保留其他分類。移出最後一個分類時改為無分類。編號繼承變更會同步更新歷史交易；編號重複時整批不變更。</p></form>
 <div class="tablewrap"><table><thead><tr><th><input id="managedAllProducts" type="checkbox" aria-label="全選商品" ${products.length&&products.every(p=>managedProductSelection.has(p.id))?'checked':''}></th><th>商品編號</th><th>商品名稱</th><th>商品分類</th><th>編號繼承分類</th></tr></thead><tbody>${products.map(p=>uiTemplate`<tr><td><input type="checkbox" data-managed-product="${p.id}" aria-label="${esc(p.name)}" ${managedProductSelection.has(p.id)?'checked':''}></td><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc(productCategories(p).join('、')||ui('無分類'))}</td><td>${esc(p.category||ui("不套用分類 ID"))}</td></tr>`).join('')}</tbody></table></div><p class="sub">已選取 ${managedProductSelection.size} 件商品</p></section>`;
}
function bindCategories(){
 if(page!=='categories')return;
 const apply=(operation)=>{try{const next=operation();if(persist(next)){if(category!=='所有'&&!db.categories.includes(category))category='所有';managedProductSelection.clear();managedCategorySelection.clear();render();toast(ui('分類資料已更新'))}}catch(e){toast(ui(e.message))}};
 $('#managedCategoryForm').onsubmit=e=>{e.preventDefault();const f=e.currentTarget;apply(()=>addManagedCategory(db,f.elements.name.value,f.elements.prefix.value))};
 $('#managedAllCategories').onchange=e=>{managedCategorySelection=new Set(e.target.checked?db.categories.filter(c=>c!=='無分類'):[]);render()};
 document.querySelectorAll('[data-managed-category]').forEach(x=>x.onchange=()=>{if(x.checked)managedCategorySelection.add(x.dataset.managedCategory);else managedCategorySelection.delete(x.dataset.managedCategory);render()});
 $('#managedDeleteCategories').onclick=()=>{const names=[...managedCategorySelection];if(!names.length)return;confirmDialog(ui('刪除所選分類？'),esc(names.join('、'))+'<br>'+ui('商品保留其他分類，必要時改為無分類；相關分類優惠將移除，交易保留。'),()=>apply(()=>deleteManagedCategories(db,names)))};
 document.querySelectorAll('[data-view-category]').forEach(x=>x.onclick=()=>{managedSource=x.dataset.viewCategory;managedQuery='';managedProductSelection.clear();render();$('#managedSource').scrollIntoView({block:'start'})});
 $('#managedSource').onchange=e=>{managedSource=e.target.value;managedProductSelection.clear();render()};
 $('#managedSearch').oninput=e=>{managedQuery=e.target.value;managedProductSelection.clear();const pos=e.target.selectionStart;render();$('#managedSearch').focus();$('#managedSearch').setSelectionRange(pos,pos)};
 $('#managedAllProducts').onchange=e=>{managedProductSelection=new Set(e.target.checked?managedProducts().map(p=>p.id):[]);render()};
 document.querySelectorAll('[data-managed-product]').forEach(x=>x.onchange=()=>{if(x.checked)managedProductSelection.add(x.dataset.managedProduct);else managedProductSelection.delete(x.dataset.managedProduct);render()});
 const f=$('#managedProductsForm');f.elements.mode.onchange=()=>{const removing=f.elements.mode.value==='remove';f.elements.target.disabled=removing;f.elements.inherit.disabled=removing};
 f.onsubmit=e=>{e.preventDefault();const ids=[...managedProductSelection],mode=f.elements.mode.value,target=f.elements.target.value,source=managedSource,inherit=f.elements.inherit.checked;if(!ids.length)return;try{manageProductCategories(db,ids,mode,source,target,inherit)}catch(e){return toast(ui(e.message))}confirmDialog(ui('套用分類變更？'),uiTemplate`所選商品：${ids.length} 件<br>${esc(source||ui('所有分類'))} → ${esc(mode==='remove'?ui('移出來源分類'):target)}`,()=>apply(()=>manageProductCategories(db,ids,mode,source,target,inherit)))};
}
