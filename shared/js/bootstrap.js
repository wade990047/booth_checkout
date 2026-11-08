// 所有功能載入後才初始化，可直接開啟 HTML，無須建置。
try{db=JSON.parse(localStorage.getItem(KEY))||fresh()}catch{db=fresh()}
normalizeProducts(db);
const allowedPages=['shop','inventory','categories','history','promotions','design'];
const initialPage=document.body.dataset.initialPage;
page=allowedPages.includes(initialPage)?initialPage:'shop';
window.addEventListener('storage',e=>{if(e.key===KEY){try{const next=JSON.parse(e.newValue);if(validateData(next)){db=normalizeProducts(next);designDraft=null;resetCart();render();toast(ui('其他分頁已更新資料，購物袋已重設'))}}catch{}}});
render();
