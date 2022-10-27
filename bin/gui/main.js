var fs = require('fs'),
    path = require('path');
var $=require('jquery');
var {ipcRenderer}=require('electron');

var RROOT='../bin/repo/';
var Titlebar = require('../bin/repo/gui/js/modules/vg-titlebar.js');
var {DropNote}=require('../bin/repo/gui/js/modules/vg-poppers.js');
var {usersls}=require('../bin/gui/storage/lstore.js');
var {navroutes}=require('../bin/routes.js');
var gentable = require('../bin/repo/gui/js/modules/vg-tables.js');
var gendis = require('../bin/repo/gui/js/tools/vg-displaytools.js');
var floatv = require('../bin/repo/gui/js/modules/vg-floatviews.js');
// add sold job tools
// add inprogress tools

//  TITLE BAR //
try{
  document.getElementById(Titlebar.tbdom.info.username).innerText = JSON.parse(localStorage.getItem(usersls.curruser)).uname;
}catch{}
document.getElementById(Titlebar.tbdom.title).innerText = 'Board Creator';
$(document.getElementById(Titlebar.tbdom.page.settings)).hide();

let qactions={
  refresh:{
    id:'refresh-jobs',
    src:'../bin/repo/assets/icons/refresh-icon.png',
    title:'Refresh Tables'
  }
}

let qalist=Titlebar.CREATEactionbuttons(qactions);

Titlebar.ADDqactions(qalist);

document.getElementById(Titlebar.tbdom.page.user).addEventListener('click',(ele)=>{//GOTO LOGIN
  ipcRenderer.send(navroutes.gotologin,'Opening Login Dash...');
});
document.getElementById(Titlebar.tbdom.page.print).addEventListener('dblclick',(ele)=>{
  ipcRenderer.send('print-screen');
  DropNote('tr','Printing Screen','green');
});
document.getElementById(qactions.refresh.id).addEventListener('click',(ele)=>{//GOTO LOGIN
  ipcRenderer.send('GET-jobs','OPEN');
});

//////////////////////////

var quotetablehead={
  sold:{
    customer:{
      name:'CUSTOMER',
      street:'ADDRESS'
    },
    cons:'CONSULTANT',
    solddate:'SOLD DATE'
  },
  inprog:{
    customer:{
      name:'CUSTOMER',
      street:'ADDRESS'
    },
    cons:'CONSULTANT',
    strtdate:'INSTALL DATE'
  }
}
var quotetablemap={
  sold:(r=null)=>{
      if(!r||r==undefined){r={}}
      return{
        customer:r.customer.name||'',
        street:r.customer.street||'',
        estimator:r.cons||'',
        sdate:r.solddate||''
      }
    },
  inprog:(r=null)=>{
      if(!r||r==undefined){r={}}
      return{
        customer:r.customer.name||'',
        street:r.customer.street||'',
        estimator:r.cons||'',
        idate:r.strtdate||''
      }
    }
}

var jobselected=null;

var BUILDtables=(data)=>{
  let tables = ['sold', 'inprog'];

  for(let i=0;i<tables.length;i++){
    let spot = document.getElementById(`bc-${tables[i]}-table`);
    spot.classList.add(gentable.gtdom.table);

    let list = [].concat(quotetablehead[`${tables[i]}`],data[`${tables[i]}`]);
    gentable.BUILDdistable(list,spot,true,"row-class",quotetablemap[`${tables[i]}`]);

    document.getElementById(`bc-${tables[i]}-table`).addEventListener('dblclick',(ele)=>{
      let lrow = gendis.FINDparentele(ele.target,"row-class");
      if(lrow){
        jobselected=list[gentable.FINDrowindex(lrow.parentNode.children,lrow)];
        BUILDpreview(tables[i]);
      }
    });
  }
}

var BUILDpreview=(table)=>{
  document.getElementById('preview-value-client').innerText = jobselected.customer.name;
  document.getElementById('preview-value-street').innerText = jobselected.customer.street;
  document.getElementById('preview-value-longcity').innerText = jobselected.customer.longcity;
  document.getElementById('preview-value-phone1').innerText = jobselected.customer.phone;
  document.getElementById('preview-value-email').innerText = jobselected.customer.email;

  let block = document.getElementsByClassName('preview-contract-list')[0];
  block.innerHTML = '';
  if(jobselected.contracts.length>0){
    for(let i=0;i<jobselected.contracts.length;i++){
      block.appendChild(document.createElement('div')).innerText = jobselected.contracts[i].system.name;
    }
  }else{
    block.appendChild(document.createElement('div')).innerText = "There are no contracts to create from!";
  }
  document.getElementById('job-value-jobnum').value = jobselected.jobnum!=undefined?jobselected.jobnum:'';
  document.getElementById('job-value-strtdate').value = jobselected.strtdate!=undefined?jobselected.strtdate:'';

  if(table == 'sold'){
    $(document.getElementById('board-job-submit')).show();
    $(document.getElementById('board-job-rebuild')).hide();
  }else{
    $(document.getElementById('board-job-submit')).hide();
    $(document.getElementById('board-job-rebuild')).show();
  }

  floatv.SELECTview(document.getElementById('preview-center'),'Job Preview');  //open Job Preview
}

document.getElementById('board-job-submit').addEventListener('dblclick',(ele)=>{
  let jobno = $(document.getElementById('job-value-jobnum')).val();
  let instdate = $(document.getElementById('job-value-strtdate')).val();
  if(jobno=='' || instdate==''){
      window.alert('Both Job Number and Start Date are required!');
  }else{
    ipcRenderer.send('submit-job',{jobno:jobno,instdate:instdate,job:jobselected});
    document.getElementById('vg-float-frame-close').dispatchEvent(new Event('click'));
  }
});

document.getElementById('board-job-rebuild').addEventListener('dblclick',(ele)=>{
  ipcRenderer.send('rebuild-job',{job:jobselected});
  document.getElementById('vg-float-frame-close').dispatchEvent(new Event('click'));
});


ipcRenderer.send('GET-jobs','OPEN');
ipcRenderer.on('GET-jobs',(eve,data)=>{
  console.log('Job List>',data);
  BUILDtables(data);
});

ipcRenderer.on('submit-job',(eve,data)=>{
  DropNote('tr','Board Created.');
  document.getElementById('vg-float-frame-close').click();
  ipcRenderer.send('GET-jobs','REFRESH');
});
