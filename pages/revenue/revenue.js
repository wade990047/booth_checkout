let revenueQuery='',revenueCategory='';
function revenueReport(data,query='',category=''){
 const rows=sortProductItems(data.products).filter(p=>(!category||inCategory(p,category))&&(p.name+' '+p.sku).toLowerCase().includes(query.trim().toLowerCase())).map(p=>({id:p.id,sku:p.sku,name:p.name,qty:0,price:p.price,discountQty:0,discount:0,revenue:0,cost:data.printCosts?.[p.id]||0,prices:new Set()}));
 const byId=new Map(rows.map(r=>[r.id,r]));let estimated=false;
 for(const t of data.transactions){if(t.items.some(i=>i.revenue===undefined)&&(t.orderDiscount||(t.offers||[]).some(o=>o.scope==='order')))estimated=true;
  for(const i of allocateTransactionRevenue(t,data)){const row=byId.get(i.id);if(!row)continue;row.qty+=i.qty;row.prices.add(i.original);row.revenue+=i.revenue;row.discount+=i.original*i.qty-i.revenue;row.discountQty+=(i.orderShare||i.couponShare)?i.qty:(i.discountQty??(i.unit<i.original?i.qty:0))}
 }
 const totals=rows.reduce((s,r)=>({revenue:s.revenue+r.revenue,discount:s.discount+r.discount,cost:s.cost+r.cost}),{revenue:0,discount:0,cost:0});totals.profit=totals.revenue-totals.cost;
 return {rows,totals,estimated};
}
function profitText(n){return (n>0?'+ ':n<0?'− ':'')+money(Math.abs(n))}
function revenueHTML(){
 if(revenueCategory&&!db.categories.includes(revenueCategory))revenueCategory='';
 const {rows,totals,estimated}=revenueReport(db,revenueQuery,revenueCategory);
 return uiTemplate`<section class="view revenue-view"><div class="stats revenue-stats"><div class="stat"><span class="sub">總營收</span><strong>${money(totals.revenue)}</strong></div><div class="stat"><span class="sub">總折扣</span><strong>${money(totals.discount)}</strong></div><div class="stat"><span class="sub">總成本</span><strong>${money(totals.cost)}</strong></div><div class="stat"><span class="sub">利潤</span><strong class="${totals.profit>0?'profit-positive':totals.profit<0?'profit-negative':''}">${profitText(totals.profit)}</strong></div></div>
 <div class="actions inventory-bulk"><input id="revenueSearch" type="search" aria-label="搜尋商品名稱、編號" placeholder="搜尋商品名稱、編號" value="${esc(revenueQuery)}"><label>商品分類 <select id="revenueCategory"><option value="">所有分類</option>${db.categories.map(c=>`<option value="${esc(c)}" ${c===revenueCategory?'selected':''}>${esc(c)}</option>`).join('')}</select></label><button id="exportRevenue">匯出 CSV</button></div>
 <p class="sub">統計所有交易，篩選會同步更新上方金額；多分類商品只計算一次。印製成本為整批總成本，修改後按儲存。販售單價列出歷史交易原價，未售出則顯示目前定價。</p>
 ${estimated?ui('<p class="notice">部分舊交易未保存訂單折扣分攤範圍，依現有活動重建；活動已移除時按全單分攤。交易總額保持不變。</p>'):''}
 <div class="tablewrap"><table><thead><tr><th>商品編號</th><th>商品名稱</th><th class="print-cost-column">整批印製成本</th><th>售出數量</th><th>販售單價</th><th>折扣數量</th><th>總折扣</th><th>營收金額</th></tr></thead><tbody>${rows.map(r=>uiTemplate`<tr><td>${esc(r.sku)}</td><td>${esc(r.name)}</td><td class="print-cost-column"><div class="print-cost-editor"><input data-print-cost="${r.id}" type="number" min="0" step="1" aria-label="${esc(r.name)}整批印製成本" value="${r.cost}"><button data-save-cost="${r.id}">儲存</button></div></td><td>${r.qty}</td><td>${[...(r.prices.size?r.prices:new Set([r.price]))].sort((a,b)=>a-b).map(money).join(' / ')}</td><td>${r.discountQty}</td><td>${money(r.discount)}</td><td><strong>${money(r.revenue)}</strong></td></tr>`).join('')}</tbody></table>${!rows.length?ui('<div class="empty">沒有符合的商品</div>'):''}</div><p class="sub">營收已扣除商品優惠、訂單折抵與優惠碼。訂單折扣按適用商品金額比例分配，整元餘數優先分給低價商品。折扣數量為有折扣的售出件數，同一件不重複計算。</p></section>`;
}
function revenueCsv(report){
 const cell=v=>'"'+String(typeof v==='string'&&/^[=+\-@\t\r]/.test(v)?"'"+v:v).replace(/"/g,'""')+'"';
 const rows=[[ui('總營收'),ui('總折扣'),ui('總成本'),ui('利潤')],[report.totals.revenue,report.totals.discount,report.totals.cost,report.totals.profit],[],[ui('商品編號'),ui('商品名稱'),ui('整批印製成本'),ui('售出數量'),ui('販售單價'),ui('折扣數量'),ui('總折扣'),ui('營收金額')],...report.rows.map(r=>[r.sku,r.name,r.cost,r.qty,[...(r.prices.size?r.prices:new Set([r.price]))].sort((a,b)=>a-b).join(' / '),r.discountQty,r.discount,r.revenue])];
 return '\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
function bindRevenue(){if(page!=='revenue')return;
 $('#revenueSearch').oninput=e=>{revenueQuery=e.target.value;render();$('#revenueSearch').focus()};$('#revenueCategory').onchange=e=>{revenueCategory=e.target.value;render()};
 document.querySelectorAll('[data-save-cost]').forEach(b=>b.onclick=()=>{const input=document.querySelector(`[data-print-cost="${b.dataset.saveCost}"]`),cost=Number(input.value);if(!input.value.trim()||!Number.isSafeInteger(cost)||cost<0)return toast(ui('成本請填 0 或正整數'));const next=structuredClone(db);next.printCosts={...next.printCosts,[b.dataset.saveCost]:cost};if(persist(next)){render();toast(ui('成本已儲存'))}});
 $('#exportRevenue').onclick=()=>{const blob=new Blob([revenueCsv(revenueReport(db,revenueQuery,revenueCategory))],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='revenue-'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
}
