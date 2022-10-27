
const {ipcRenderer}=require('electron');
window.addEventListener('visibilitychange',(ele)=>{ipcRenderer.send('wsc-change','ameren-change')});
