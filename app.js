
const  path = require('path'),
       fs = require('fs'),
       os = require('os'),
       request = require('request'),
       {shell}=require('electron'),
       {exec} = require('child_process');
var $=require('jquery');

// REPO ////////////////////////////////////////////////////////////////////////
var {aappuser} = require('./bin/repo/ds/users/vogel-users.js');
var {app,ipcMain,BrowserWindow,viewtools} = require('./bin/repo/tools/box/electronviewtool.js');

var {loginroutes}=require('./bin/repo/gui/js/modules/login.js');
var {navroutes}=require('./bin/routes.js');
////////////////////////////////////////////////////////////////////////////////

//Midleware //////////////////////////
var controlsroot = path.join(__dirname,'/controllers/'); //dir path to views
var appset = require('./app/settings.json');//appset.dev.on = true;
var au = require('./bin/appuser.js'); //initialize the app user object
/////////////////////////////////////

var bflow = require('./bin/back/rrq-boardflow.js');
var {CREATEboard}=require('./bin/back/rrq-boardcreator.js');
var mainv; //holds the main BrowserWindow

require('dns').resolve('www.google.com',(err)=>{ //test for internet connection
  if(err){//is not connected
  }
  else{//is connected
  }
});

/* LANDING PAGE
    The landing page will more often be the login screen
    This login screen can be skipped by editing the
    appset.dev.on = true. This will default to main.html
    If the developer wants to skip to a page, the
    appset.dev.page = '' can have a desired page file
    name
*/
app.on('ready',(eve)=>{
  if(!appset.dev.on){
    console.log(au.auser);
    if(appset.users[au.auser.uname]==undefined){
      mainv = viewtools.loader(controlsroot + 'login.html',1080,750,false,false,'hidden');
    }else{
      try{//attempt to open users default page
        mainv = viewtools.loader(controlsroot + appset.groups[au.auser.config.group].main,1280,800,false,false,'hidden');
      }catch{mainv = viewtools.loader(controlsroot + 'login.html',1080,750,false,false,'hidden');}
    }
    mainv.on('close',(eve)=>{ //any app closing code below
    });
  }else{appset.dev.page==''?mainv = viewtools.loader(controlsroot+'main.html',1280,800,false,false,false):mainv=viewtools.loader(controlsroot+appset.dev.page,1280,800,false,false,'hidden')}
});


/* APP login
    data:{
      user:'',
      pswrd:''
    }

    Recieve a user name and password from login form AND
    attach the application auth code to it. The api is
    queried to check both the auth code and the user
    credentials.

    If the access/login to the api is a success, the
    appset.users is checked for a match to the user name.

    If the user is found in appset.users, that users group
    view (appset.groups.main) 'dash' is loaded
*/
ipcMain.on(loginroutes.submit,(eve,data)=>{
  if(au.SETUPappuser(appset.users,data.uname,data.pswrd)){ //check to see if username matches app settings
    viewtools.swapper(mainv,controlsroot + appset.groups[au.auser.config.group].main,1280,800);
  }else{eve.sender.send(loginroutes.submit,{status:false,msg:'Not an app user',user:null})}
});

// Request login screen
ipcMain.on(navroutes.gotologin,(eve,data)=>{
  au.RESETappuser();
  viewtools.swapper(mainv,controlsroot + 'login.html',1080,750);
});

// Titlebar Request
ipcMain.on('view-minimize',(eve,data)=>{
  BrowserWindow.getFocusedWindow().minimize();
});


// Board Request ///////////////////////////////////////////////////////////////
ipcMain.on('GET-jobs',(eve,data)=>{
  let jobs = {
    inprog:null,
    sold:null
  }
  bflow.GETsoldjobs().then(
    list=>{
      console.log('list')
      jobs.sold=list;
      console.log('done sold');
      if(jobs.inprog){eve.sender.send('GET-jobs',jobs);}
    }
  );
  bflow.GETjobsinprog().then(
    list=>{
      jobs.inprog=list;
      console.log('done inprog')
      if(jobs.sold){eve.sender.send('GET-jobs',jobs);}
    }
  )
});

// Board Creation ////////////////////////////////////
ipcMain.on('submit-job',(eve,data)=>{
  console.log(data);
  try{
    data.instdate=new Date(data.instdate).toISOString().split('T')[0];
  }catch{window.alert('Install Date did not take correctly');}
  BUILDjob(data).then(result=>{eve.sender.send('submit-job',result);})
});

ipcMain.on('rebuild-job',(eve,data)=>{
  console.log(data);
  if(data.job){
    let contracts = data.job.contracts;
    for(let x=0;x<contracts.length;x++){
      CREATEboard(contracts[x],data.job.contractfiles[x],data.job.folder);
    }
  }
});

var BUILDjob=(info=null)=>{
  return new Promise((res,rej)=>{
    if(info.job){
      let contracts = info.job.contracts;
      let toload = contracts.length;
      let loaded = 0;
      for(let x=0;x<contracts.length;x++){
        contracts[x].jobnum = info.jobno;
        contracts[x].strtdate = info.instdate;
        bflow.MOVEjob(info.job.folder).then(
          nf=>{
            if(nf){info.job.folder=nf} //excluded for testing
            CREATEboard(contracts[x],info.job.contractfiles[x],info.job.folder).then(
              breport=>{
                loaded++;
                if(toload==loaded){shell.openPath(info.job.folder);return res(breport)}
              }
            );
          }
        );
      }
      if(toload==loaded){return res(breport)}
    }
  });
}

/////////////////////////////////////////////////////
// Board Destruction ////////////////////////////////

var wpcwin=null;
var cururl = '';//"https://amerenhvac.icfwebservices.com/Traditional/App/Create"

/* Request a WebProcess be started
   data:{
      proccessid:'name of process'
    }
*/
ipcMain.on('wsc-open',(eve,data)=>{
  console.log(data);
  //open the request wpc (WebProccessController)
  wpcwin = new BrowserWindow({
          webPreferences:{
              nodeIntegration:false,
              contextIsolation:true,
              preload:path.join(__dirname,'/bin/back/webprocesscontroller.js') //load the control file
          },
          width:500,
          height:500,
          autoHideMenuBar:true,
          titleBarStyle: 'show'
      });
  wpcwin.loadURL("https://amerenhvac.icfwebservices.com/Traditional/App/Create"); //load the starting url
  cururl = "https://amerenhvac.icfwebservices.com/Traditional/App/Create"; //save the starting url
  wpcwin.webContents.executeJavaScript( //initialize the first step of process
    `console.log('running');

     document.getElementById('UserName').value = 'ryanm@vogelheating.com';
     document.getElementById('Password').value = 'Ameren6Vogel';

     document.getElementsByClassName('btn-primary')[0].click();

     window.addEventListener('visibilitychange', (eve)=>{
      localStorage.setItem('Atest', 'WhoCares');
      //ipcRenderer.send('Ameren-Test', '1: Done');
     });
    `);
});

/* Recieves Change notifications from WSCs
   data:{
      processid:'.eg ameren',
      url:'from requester' (possible to send url from wsccontroller)
    }
*/
ipcMain.on('wsc-change', (eve, data)=>{
  console.log('WPC Page >',data);
  console.log(wpcwin.webContents.getURL()); //the url that sent the message *NOT* the url loadings
  if(wpcwin.webContents.getURL()==cururl){
    //send a message back to see if url has change (page chagne/next form process) *may need to time delay request
  }else{
    cururl=wpcwin.webContents.getURL();
    //send different informatioon to webContents.executeJavaScript()
  }
  switch(data){
    case '1: Done':
      sidev.webContents.executeJavaScript(`
          const {ipcRenderer} = require('electron');

          document.getElementsByClassName('newApp')[0].getElementsByClassName('bigbutton')[0].click();

          window.addEventListener('visibilitychange', (eve)=>{
          ipcRenderer.send('Ameren-Test', '2: Done');
        });
      `);
    break;
    case '2: Done':
      sidev.webContents.executeJavaScript(`
          const {ipcRenderer} = require('electron');

          document.getElementById('continueButton').click();

          window.addEventListener('visibilitychange', (eve)=>{
          ipcRenderer.send('Ameren-Test', '3: Done');
        });
      `);
    break;
    case '3: Done':
    break;
  }

});

/////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////

var PRINTscreen = (win,fpath =os.tmpdir(),fname ='print',open = true)=>{
  if(fpath && (win && win!=undefined)){
    try{
      let fullpath = path.join(fpath,fname+'.pdf');
      win.printToPDF({printBackground:true}).then(data => {
        fs.writeFile(fullpath, data, (error) => {
          if (!error){
            console.log(`Wrote PDF successfully to ${fpath}`)
            if(open){exec(path.join(fullpath).replace(/ /g,'^ '));}
          }else{console.log(`Failed to write PDF to ${fpath}: `, error)}
        });
      }).catch(error => {console.log(`Failed to write PDF to ${fpath}: `, error);win.send('print-screen',{msg:'File Open'});})
    }catch{console.log('Can not print')} //File is open, bring file into view
  }
}

ipcMain.on('print-screen',(eve,data)=>{
  if(data!=undefined){
    PRINTscreen(eve.sender,data.path,data.file);
  }else{PRINTscreen(eve.sender);}
});
