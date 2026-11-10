global.structuredClone ??= value=>require('node:v8').deserialize(require('node:v8').serialize(value));
const assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm'),L=require('../../shared/js/pricing.js');
const d=JSON.parse(fs.readFileSync('data/examples/booth-example.json','utf8')),input={value:'500',validity:{badInput:false}};let resets=0;const ctx={...L,structuredClone,db:d,cart:{'sample-bundle-a':2},manualCart:{'sample-bundle-a':2},code:'',refreshGiftCart:()=>{},$:()=>input,uid:()=> 'tx',ui:s=>s,uiTemplate:(s,...v)=>s.reduce((a,b,i)=>a+b+(v[i]??''),''),money:String,esc:String,toast:()=>{},resetCart:()=>{resets++},categorySku:(d,c,b)=>(d.categoryIds?.[c]||'')+b};ctx.persist=next=>{ctx.db=next;return true};vm.createContext(ctx);for(const f of ['shared/js/format.js','shared/js/shell.js','pages/history/history.js','features/backup/backup.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx);ctx.render=()=>{};

ctx.action('checkout');
assert.equal(ctx.db.transactions[0].total,200);
assert.equal('received' in ctx.db.transactions[0],false);
assert.equal('change' in ctx.db.transactions[0],false);
assert.equal(resets,1);
assert.equal(ctx.validateData(JSON.parse(JSON.stringify(ctx.db))),true);
// Existing backups remain readable without displaying retired cash fields.
const legacy=structuredClone(ctx.db);legacy.transactions[0].received=500;legacy.transactions[0].change=300;
assert.equal(ctx.validateData(legacy),true);ctx.db=legacy;
assert.equal(ctx.historyHTML().includes('transaction-payment'),false);
assert.equal(ctx.historyHTML().includes('實收：'),false);
assert.equal(ctx.historyHTML().includes('找零：'),false);
input.value='0';ctx.action('checkout');assert.equal(ctx.db.transactions.length,2);
console.log('PASS: checkout saves total without cash fields; existing cash backups remain compatible');
