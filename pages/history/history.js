// pages/history/history.js

function historyHTML(){return uiTemplate`<section class="view"><div class="stats"><div class="stat"><span class="sub">累計交易金額</span><strong>${money(db.transactions.reduce((s,t)=>s+t.total,0))}</strong></div><div class="stat"><span class="sub">交易筆數</span><strong>${db.transactions.length}</strong></div><div class="stat"><span class="sub">售出件數</span><strong>${db.transactions.reduce((s,t)=>s+t.items.reduce((a,i)=>a+i.qty,0),0)}</strong></div></div><div class="actions"><button class="danger" data-action="deleteAllTx" ${db.transactions.length?'':'disabled'}>刪除所有紀錄</button></div>${[...db.transactions].reverse().map(t=>uiTemplate`<article class="transaction"><div class="row"><div><strong>#${String(t.number).padStart(4,'0')}</strong>　<span class="sub">${dateText(t.date)}</span></div><div class="actions"><strong>${money(t.total)}</strong><button data-action="editTxNote" data-id="${esc(t.id)}">編輯備註</button><button class="danger icon" data-action="deleteTx" data-id="${t.id}">刪除並返還庫存</button></div></div><div class="details">${sortProductItems(t.items).map(i=>`<div class="row"><span>${esc(i.sku)}　${esc(i.name)} × ${i.qty}</span><span>${itemPriceText(i)}　${money(i.total)}</span></div>`).join('')}${t.offers.map(o=>uiTemplate`<div>✦ ${esc(o.name)}：折抵 ${money(o.saving)}</div>`).join('')}${t.coupon?uiTemplate`<div>優惠碼 ${esc(t.coupon.code)}：折抵 ${money(t.discount)}</div>`:''}</div><div class="transaction-note"><strong>訂單備註</strong><div class="note-text">${t.note?esc(t.note):ui('尚未填寫備註')}</div></div></article>`).join('')||ui('<div class="empty"><div class="empty-icon">◷</div>尚未有交易紀錄<br>完成第一筆結帳後，即可在這裡查看。</div>')}<p class="sub">刪除交易會返還庫存。下一筆編號為目前最大編號 + 1；既有交易編號保持不變。</p></section>`}

function confirmDeleteAllTransactions(){
 if(!db.transactions.length)return;
 confirmDialog(ui('刪除所有交易紀錄？（1/2）'),uiTemplate`目前共有 ${db.transactions.length} 筆交易。刪除後會返還所有商品庫存，建議先匯出備份。`,()=>{
  confirmDialog(ui('最後確認：永久刪除全部交易（2/2）'),ui('此操作無法直接復原。所有交易明細將移除、庫存返還，下一筆交易編號從 1 開始。'),()=>{
   const next=structuredClone(db);next.transactions=[];if(persist(next)){render();toast(ui('所有交易已刪除，庫存已返還'))}
  });
 });
}

function updateTransactionNote(data,id,note){
 if(typeof note!=='string'||note.length>2000)throw Error('備註最多 2000 字');
 const next=structuredClone(data),transaction=next.transactions.find(t=>t.id===id);if(!transaction)throw Error('找不到此交易紀錄');transaction.note=note;return next;
}
function editTransactionNote(id){
 const transaction=db.transactions.find(t=>t.id===id);if(!transaction)return toast(ui('找不到此交易紀錄'));
 openModal(uiTemplate`<h2>編輯訂單備註 #${String(transaction.number).padStart(4,'0')}</h2><form id="transactionNoteForm"><label class="field">訂單備註<textarea id="transactionNote" rows="5" maxlength="2000" placeholder="可填寫付款方式、取貨安排或其他事項；可留白。">${esc(transaction.note||'')}</textarea></label><p class="sub">最多 2000 字，儲存後會隨備份保留。</p><div class="formactions"><button type="button" id="cancelTransactionNote">取消</button><button class="primary" type="submit">儲存備註</button></div></form>`);
 $('#cancelTransactionNote').onclick=closeModal;
 $('#transactionNoteForm').onsubmit=e=>{e.preventDefault();try{const next=updateTransactionNote(db,id,$('#transactionNote').value);if(persist(next)){closeModal();render();toast(ui('訂單備註已儲存'))}}catch(error){toast(ui(error.message))}};
 $('#transactionNote').focus();
}
