// shared/js/dialogs.js

function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(window.tt);window.tt=setTimeout(()=>$('#toast').style.display='none',3500)}

function openModal(html){$('#modal').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}

function closeModal(){$('#modal').close()}

function confirmDialog(title,body,fn){openModal(uiTemplate`<h2>${title}</h2><p class="sub" style="line-height:2">${body}</p><div class="formactions"><button id="no">返回</button><button id="yes" class="primary">確認</button></div>`);$('#no').onclick=closeModal;$('#yes').onclick=()=>{closeModal();fn()}}
// Keep the active IME editor intact until its text is committed.
function installCompositionGuards(root=document){
 const composing=new Set(),pending=new WeakMap();
 const cancel=target=>{const timer=pending.get(target);if(timer!==undefined){clearTimeout(timer);pending.delete(target)}};
 root.addEventListener('compositionstart',e=>{cancel(e.target);composing.add(e.target)},true);
 root.addEventListener('input',e=>{
  if(e.isComposing||composing.has(e.target)){e.stopImmediatePropagation();return}
  cancel(e.target);
 },true);
 root.addEventListener('compositionend',e=>{
  const target=e.target;composing.delete(target);cancel(target);
  // Browsers normally emit a final input event; fall back only when none arrives.
  pending.set(target,setTimeout(()=>{pending.delete(target);if(target.isConnected&&!composing.has(target))target.dispatchEvent(new Event('input',{bubbles:true}))},0));
 },true);
 root.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&(e.isComposing||e.keyCode===229||composing.has(e.target))){
   e.stopImmediatePropagation();
   // Leave IME default handling intact, but block implicit form submission this turn.
   const form=e.target.form;if(form){const block=event=>{event.preventDefault();event.stopImmediatePropagation()};form.addEventListener('submit',block,true);setTimeout(()=>form.removeEventListener('submit',block,true),0)}
  }
 },true);
 root.addEventListener('submit',e=>{if([...composing].some(target=>target.form===e.target)){e.preventDefault();e.stopImmediatePropagation()}},true);
}
