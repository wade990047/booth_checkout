// shared/js/format.js

function dateText(d){const p=new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(d));const f=t=>p.find(v=>v.type===t)?.value;return `${f('year')}/${f('month')}/${f('day')} ${f('hour')}:${f('minute')}`}

function itemPriceText(i){if(i.discountQty!==undefined&&i.discountQty>0&&i.regularQty>0)return '優惠 '+money(i.unit)+' × '+i.discountQty+' 件 ＋ 原價 '+money(i.original)+' × '+i.regularQty+' 件';return money(i.unit)+(i.unit<i.original?' <s>'+money(i.original)+'</s>':'')+' / 件'}

function validItemTotal(i){if(i.discountQty===undefined)return i.total===i.qty*i.unit;return Number.isSafeInteger(i.discountQty)&&i.discountQty>=0&&i.discountQty<=i.qty&&i.regularQty===i.qty-i.discountQty&&i.total===i.discountQty*i.unit+i.regularQty*i.original}
