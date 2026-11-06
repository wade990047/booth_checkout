// 共用狀態與格式化工具；資料載入由 bootstrap.js 執行。
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),money=n=>'NT$ '+n.toLocaleString('zh-TW'),uid=()=>crypto.randomUUID();
const KEY='little-booth-v1';let db,cart={},manualCart={},autoGiftQty={},giftMessages=[],declinedGifts=new Set(),page='shop',category='所有',query='',code='',collapsed=innerWidth<801,editingImage='',editId=null;
const cols={sku:'商品編號',name:'商品名稱',category:'商品分類',price:'商品定價',printed:'印製庫存',initial:'起始庫存',current:'目前庫存',sold:'販售數量',sellDisplay:'販售展示品'};let visible=Object.keys(cols);
