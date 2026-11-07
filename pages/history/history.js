// pages/history/history.js

function historyHTML(){return uiTemplate`<section class="view"><div class="stats"><div class="stat"><span class="sub">累計交易金額</span><strong>${money(db.transactions.reduce((s,t)=>s+t.total,0))}</strong></div><div class="stat"><span class="sub">交易筆數</span><strong>${db.transactions.length}</strong></div><div class="stat"><span class="sub">售出件數</span><strong>${db.transactions.reduce((s,t)=>s+t.items.reduce((a,i)=>a+i.qty,0),0)}</strong></div></div><div class="actions"><button class="danger" data-action="deleteAllTx" ${db.transactions.length?'':'disabled'}>刪除所有紀錄</button></div>${[...db.transactions].reverse().map(t=>uiTemplate`<article class="transaction"><div class="row"><div><strong>#${String(t.number).padStart(4,'0')}</strong>　<span class="sub">${dateText(t.date)}</span></div><div class="actions"><strong>${money(t.total)}</strong><button class="danger icon" data-action="deleteTx" data-id="${t.id}">刪除並返還庫存</button></div></div><div class="details">${sortProductItems(t.items).map(i=>`<div class="row"><span>${esc(i.sku)}　${esc(i.name)} × ${i.qty}</span><span>${itemPriceText(i)}　${money(i.total)}</span></div>`).join('')}${t.offers.map(o=>uiTemplate`<div>✦ ${esc(o.name)}：折抵 ${money(o.saving)}</div>`).join('')}${t.coupon?uiTemplate`<div>優惠碼 ${esc(t.coupon.code)}：折抵 ${money(t.discount)}</div>`:''}</div></article>`).join('')||ui('<div class="empty"><div class="empty-icon">◷</div>尚未有交易紀錄<br>完成第一筆結帳後，即可在這裡查看。</div>')}<p class="sub">刪除交易會返還庫存。下一筆編號為目前最大編號 + 1；既有交易編號保持不變。</p></section>`}

function confirmDeleteAllTransactions(){
 if(!db.transactions.length)return;
 confirmDialog(ui('刪除所有交易紀錄？（1/2）'),uiTemplate`目前共有 ${db.transactions.length} 筆交易。刪除後會返還所有商品庫存，建議先匯出備份。`,()=>{
  confirmDialog(ui('最後確認：永久刪除全部交易（2/2）'),ui('此操作無法直接復原。所有交易明細將移除、庫存返還，下一筆交易編號從 1 開始。'),()=>{
   const next=structuredClone(db);next.transactions=[];if(persist(next)){render();toast(ui('所有交易已刪除，庫存已返還'))}
  });
 });
}
