var path = require('path');
var fs = require('fs');
var fsx = require('fs-extra');

var {PARSEexcel}=require('../repo/apps/rrq/rrq-contractIO.js'); //bring in reader too
var auser = require('../repo/ds/users/vogel-users.js').aappuser();

var sjroot = path.join(auser.cuser.spdrive,'Vogel - Res HVAC/Residential Jobs/2-Sold Jobs');
var iproot = path.join(auser.cuser.spdrive,'Vogel - Res HVAC/Residential Jobs/3-Jobs in Progress');


var ipjobs = [];

var GETsoldjobs=()=>{
  return new Promise((res,rej)=>{
    let jlist =[];
    let jfolders = null;
    try{jfolders = fs.readdirSync(sjroot);}
    catch{console.log("fail");return res([]);}
    if(jfolders){ //extra test, probably do not need
      let jtoload = jfolders.length;
      let jloaded = 0;
      for(let x=0;x<jfolders.length;x++){//loop folders
        let cfiles = null;
        try{cfiles=fs.readdirSync(path.join(sjroot,jfolders[x],'contracts'));}
        catch{jloaded++;} //count the job
        if(cfiles){ //extra test, probably do not need
          let jobs = {
            contractfiles:[],
            contracts:[]
          };
          let toload = cfiles.length;
          let loaded = 0;
          if(cfiles.length<=0){jloaded++}
          for(let y=0;y<cfiles.length;y++){
            let conpath = path.join(sjroot,jfolders[x],'contracts',cfiles[y]);
            if(conpath.includes('.xlsx')||conpath.includes('.xlsm')){
              PARSEexcel(path.join(sjroot,jfolders[x],'contracts',cfiles[y])).then(
                (cntrct)=>{
                  jobs.folder = path.join(sjroot,jfolders[x])
                  jobs.cons = cntrct.cons;
                  jobs.customer = cntrct.customer;
                  jobs.contractfiles.push(cfiles[y]);
                  jobs.contracts.push(cntrct);
                  jobs.solddate = cntrct.solddate;   //jobs.solddate = jobs.contracts[0].solddate;
                  jlist.push(jobs);
                  loaded++;
                  if(toload==loaded){
                    jloaded++;
                    if(jtoload==jloaded){
                      return res(jlist);
                    }
                  }
                }
              );
            }else{
              loaded++;
              if(toload==loaded){
                jloaded++;
                if(jtoload==jloaded){
                  return res(jlist);
                }
              }
            }
          }
        }
      }
      if(jtoload==jloaded){return res(jlist);} //just in case something is missed
    }
  });
}

var GETjobsinprog=()=>{
  return new Promise((res,rej)=>{
    let jlist =[];
    let jfolders = null;
    try{jfolders = fs.readdirSync(iproot);}
    catch{return res([]);}
    if(jfolders){ //extra test, probably do not need
      let jtoload = jfolders.length;
      let jloaded = 0;
      for(let x=0;x<jfolders.length;x++){//loop folders
        let cfiles = null;
        try{cfiles=fs.readdirSync(path.join(iproot,jfolders[x],'contracts'));}
        catch{jloaded++;} //count the job
        if(cfiles){ //extra test, probably do not need
          let jobs = {
            contractfiles:[],
            contracts:[]
          };
          let toload = cfiles.length;
          let loaded = 0;
          if(cfiles.length<=0){jloaded++}
          for(let y=0;y<cfiles.length;y++){
            PARSEexcel(path.join(iproot,jfolders[x],'contracts',cfiles[y])).then(
              (cntrct)=>{
                jobs.folder = path.join(iproot,jfolders[x])
                jobs.cons = cntrct.cons;
                jobs.customer = cntrct.customer;
                jobs.contractfiles.push(cfiles[y]);
                jobs.contracts.push(cntrct);
                jobs.jobnum = cntrct.jobnum;
                jobs.strtdate = cntrct.strtdate;
                jlist.push(jobs);
                loaded++;
                if(toload==loaded){
                  jloaded++;
                  //console.log(jtoload,jloaded)
                  if(jtoload==jloaded){
                    //console.log(jlist);
                    return res(jlist);
                  }
                }
              }
            );
          }
        }
      }
      if(jtoload==jloaded){return res(jlist);} //just in case something is missed
    }
  });
}

var MOVEjob=(jobf)=>{
  return new Promise((res,rej)=>{
    let destfolder = jobf.split('\\');
    destfolder[destfolder.length-2] = "3-Jobs in Progress";
    destfolder = path.join(...destfolder);
    fsx.copy(jobf,destfolder,(err)=>{
      if(err){return res(false);}
      else{
        fs.rm(jobf,{recursive:true,force:true},err=>{
          if(err){console.log(err);}
          return res(destfolder);
        });
      }
    });
  });
}

module.exports={
  GETsoldjobs,
  GETjobsinprog,
  MOVEjob
}
