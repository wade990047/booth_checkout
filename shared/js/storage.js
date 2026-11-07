// shared/js/storage.js

function fresh(){return {version:1,products:[],categories:[],coupons:[],transactions:[]}}

function persist(next=db){try{localStorage.setItem(KEY,JSON.stringify(next));db=next;return true}catch{toast(ui('儲存失敗，空間可能不足。請先匯出備份或減少圖片大小。'));return false}}
