// shared/js/dialogs.js

function toast(t){$('#toast').textContent=t;$('#toast').style.display='block';clearTimeout(window.tt);window.tt=setTimeout(()=>$('#toast').style.display='none',3500)}

function openModal(html){$('#modal').innerHTML=html;if(!$('#modal').open)$('#modal').showModal()}

function closeModal(){$('#modal').close()}

function confirmDialog(title,body,fn){openModal(`<h2>${title}</h2><p class="sub" style="line-height:2">${body}</p><div class="formactions"><button id="no">返回</button><button id="yes" class="primary">確認</button></div>`);$('#no').onclick=closeModal;$('#yes').onclick=()=>{closeModal();fn()}}
