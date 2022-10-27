var fs = require('fs'),
    fsx = require('fs-extra'),
    path = require('path'),
    {PDFDocument} = require('pdf-lib'),  //https://github.com/Hopding/pdf-lib
    XlsxPop = require('xlsx-populate'); //https://github.com/dtjohnson/xlsx-populate
var generateDocx = require('generate-docx')  //https://github.com/telemark/generate-docx

var contractIO = require('../repo/apps/rrq/rrq-contractIO.js');
var {aappuser} = require('../repo/ds/users/vogel-users.js');
var auser = aappuser();


var boarddom ={
    savepath:'Vogel - IM/dev/SharePoint/Vogel - Res HVAC/Board Setup/Test Folder',
    temppath: path.join(auser.cuser.spdrive,'Vogel - Res HVAC/Documents & Protocol/Board Setup'),
    leavesheet:{
        folder:'01 - Equipment Leave Sheet',
        temp:'Equipment Leave Sheet.xlsx',
        final:'Leave Sheet.xlsx'
    },
    contract:{
        folder:'02 - Contracts',
        temp:'Project Details 2022.xlsx',
        final:'' //Includes Systems Name and Client Name
    },
    setups:{
        folder:'03 - Set Up Sheets'
    },
    checklist:{
        folder:'04 - Install Checklist',
        temp:'Install Checklist.xlsx',
        final:'Install Checklist.xlsx'
    },
    letter:{
        folder:'C0 - Client Letter',
        temp:'Client Letter.docx',
        final:'Client Letter.docx'
    },
    ameren:{
        folder:'C2 - Ameren Rebates',
        temp:'Ameren Full.pdf',
        final:'Ameren Full.pdf',
        AHRI:'C2 - Ameren Rebates/AHRI Certs'
    },
    rewards:{
        folder:'C3 - Maint Contract',
        temp:'Rewards Membership.pdf',
        final:'Rewards Membership.pdf'
    },
    spire:{
        folder:'C4 - Spire Rebates',
        temp:'Spire Rebate Form.pdf',
        final:'Spire Rebate.pdf',
        invoice:'Dummy Inv simple.xlsx',
        finalinv:'Spire Invoice.xlsx'
    }
}

var CREATEboard=(tempc,confile="",jobpath="")=>{
  return new Promise((res,rej)=>{
    var folderpath = path.join(jobpath,'Board Documents');
    var boardpath = path.join(jobpath,'Board Documents',tempc.system.name+"-"+tempc.jobnum);
    var boardreport = {
      contract:false,
      leavesheet:false,
      checklist:false,
      ameren:false,
      ahridocs:false,
      letter:false,
      rewards:false,
      spire:false
    }
    if(!fs.existsSync(folderpath)){ //check for
        fs.mkdirSync(folderpath);// make folder
    }
    if(!fs.existsSync(boardpath)){ //check for
       fs.mkdirSync(boardpath);// make folder
    }
    if(tempc){
      CREATEcontract(tempc,boardpath,confile);
      if(tempc.equipment.model[0][0]!=undefined){
          CREATEleavesheet(tempc,boardpath);
          CREATEchecklist(tempc,boardpath);
      }
      CREATEletter(tempc,boardpath);
      if(tempc.finance.ameren>0&&tempc.finance.ameren!=undefined){
          boardreport.ameren = CREATEameren(tempc,boardpath);
          boardreport.ahridocs = GETahridocs(tempc,boardpath);
      }
      CREATErewards(tempc,boardpath);
      if(tempc.finance.spire!=0&&tempc.finance.spire!=undefined){
          CREATEspire(tempc,boardpath);
      }
    }
    console.log(boardreport);
    return res(boardreport);
  });
}

var CREATEcontract=(tempc,boardpath,confile)=>{
  boardconpath = path.join(boardpath,confile);
  contractIO.WRITEexcel(tempc,path.join(boardpath,'../../contracts',confile)).then(
    stat=>{
      console.log(stat);
      fsx.copy(path.join(boardpath,'../../contracts',confile),boardconpath,err=>{
        if(err){console.log('CREATE CONTRACT ERROR>',err);}
      });
    }
  )
}

var CREATEleavesheet=(tempc,boardpath)=>{
    let day = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
    let strtday = day[new Date(tempc.strtdate+'Z12:00:00').getDay()];

    XlsxPop.fromFileAsync(path.join(boarddom.temppath,boarddom.leavesheet.folder,boarddom.leavesheet.temp)).then(workbook => {
            var datasheet = workbook.sheet("Sheet1");
            datasheet.cell("E7").value(tempc.jobnum);
            datasheet.cell("E8").value(tempc.cons);
            datasheet.cell("E9").value(tempc.customer.name);
            datasheet.cell("A3").value(strtday);
            datasheet.cell("A4").value(tempc.strtdate);

            for(let i=0;i<tempc.equipment.model.length;i++){
                datasheet.row(i*3+13).cell(1).value([tempc.equipment.label[i]]);
                datasheet.row(i*3+13).cell(4).value([tempc.equipment.model[i]]);
            }
            //ensure boardpath is valid
            return workbook.toFileAsync(path.join(boardpath,boarddom.leavesheet.final));
        });
}

var CREATEchecklist=(tempc,boardpath)=>{
    XlsxPop.fromFileAsync(path.join(boarddom.temppath,boarddom.checklist.folder,boarddom.checklist.temp)).then(workbook => {
            var datasheet = workbook.sheet("Sheet1");

            datasheet.cell("B4").value(tempc.jobnum);
            datasheet.cell("G5").value(tempc.sysname);
            datasheet.cell("B5").value(tempc.customer.name);
            datasheet.cell("G4").value(tempc.strtdate);

            //ensure valid boardpath
            return workbook.toFileAsync(path.join(boardpath,boarddom.checklist.final));
        });
}

var CREATEletter=(tempc,boardpath)=>{
    let options = {
        template: {
            filePath: path.join(boarddom.temppath,boarddom.letter.folder,boarddom.letter.temp),
            data: {
                Date: tempc.strtdate,
                JobNum: tempc.jobnum,
                Client: tempc.customer.name,
                Street: tempc.customer.street,
                LongCity: tempc.customer.longcity,
            }
          },
          save: {
            //ensure boardpath
            filePath: path.join(boardpath,boarddom.letter.final)
          }
        }
    generateDocx(options)
        .catch(console.error)
}

async function CREATEameren(tempc,boardpath){
    var pdfDoc = await PDFDocument.load(fs.readFileSync(path.join(boarddom.temppath,boarddom.ameren.folder,boarddom.ameren.temp)));
    var form = pdfDoc.getForm();

    form.getTextField('Customer Name').setText(tempc.account);
    form.getTextField('Phone').setText(tempc.customer.phone);
    form.getTextField('Account Number').setText(tempc.ratings.account);
    form.getTextField('Address').setText(tempc.customer.street);
    form.getTextField('City').setText(tempc.customer.city);
    form.getTextField('ZIP').setText(tempc.customer.zip);
    form.getTextField('SEER').setText(JSON.stringify(tempc.ratings.seer));
    form.getTextField('AHRI Cert No').setText(JSON.stringify(tempc.ratings.ahri));
    form.getTextField('RebTotal').setText(JSON.stringify(tempc.finance.ameren));

    for(let e=0;e<tempc.equipment.label.length;e++){
        switch(tempc.equipment.label[e]){
            case 'Air Conditioner':
            case 'Heat Pump':
                form.getTextField('Make').setText('');  //BRAND
                form.getTextField('Model').setText(tempc.equipment.model[e]);
                break;
            case 'Evaporator Coil':
                form.getTextField('Make_2').setText('');  //BRAND
                form.getTextField('Model_2').setText(tempc.equipment.model[e]);
                break;
            case 'Gas Furnace':
            case 'Air Handler':
                form.getTextField('Make_3').setText('');  //BRAND
                form.getTextField('Model_3').setText(tempc.equipment.model[e]);
                break;
            case 'Thermostat':
                form.getTextField('Make_5').setText(''); //BRAND
                form.getTextField('Model_5').setText(tempc.equipment.model[e]);
                break;
        }
    }
    // var newfile = await pdfDoc.save()
    // test newfile
    fs.writeFileSync(path.join(boardpath,boarddom.ameren.final),await pdfDoc.save());

    return 'Success';
}

var GETahridocs=(tempc,boardpath)=>{
  let ahriroot = path.join(boarddom.temppath,boarddom.ameren.AHRI);
  var status;
  fs.readdir(ahriroot,(err,files)=>{
    if(err){return false;}
    else{
      for(let x=0;x<files.length;x++){
        if(files[x].includes(String(tempc.ratings.ahri))){
          
          fsx.copy(path.join(ahriroot,files[x]),path.join(boardpath,files[x]),(err)=>{
            if(err){console.log(files[x],err);}
            else{console.log(files[x]);}
          });
          break;
        }
      }
    }
  });
}

async function CREATErewards(tempc,boardpath){
    var pdfDoc = await PDFDocument.load(fs.readFileSync(path.join(boarddom.temppath,boarddom.rewards.folder,boarddom.rewards.temp)));
    var form = pdfDoc.getForm();

    form.getTextField('Name').setText(tempc.customer.name);
    form.getTextField('Address').setText(tempc.customer.street);
    form.getTextField('City').setText(tempc.customer.city);
    form.getTextField('Zip').setText(tempc.customer.zip);
    form.getTextField('Phone').setText(tempc.customer.phone);

    form.getTextField('Payment').setText('Included with job number ' + tempc.jobnum);

    //ensure valid boardpath
    fs.writeFileSync(path.join(boardpath,boarddom.rewards.final),await pdfDoc.save());
}

async function CREATEspire(tempc,boardpath){
    let spireMin = 96;  //Current minimum Spire AFUE rating required to quailfy for furnace rebate

    XlsxPop.fromFileAsync(path.join(boarddom.temppath,boarddom.spire.folder,boarddom.spire.invoice)).then(workbook => {
        var datasheet = workbook.sheet("Invoice");

        datasheet.cell("B9").value(tempc.customer.name);
        datasheet.cell("B10").value(tempc.customer.street);
        datasheet.cell("B11").value(tempc.customer.longcity);

        datasheet.cell("E9").value(tempc.strtdate);
        datasheet.cell("E10").value('DUM' + tempc.jobnum.substring(1));
        datasheet.cell("E11").value(tempc.jobnum);

        for(let i=0;i<tempc.equipment.label.length;i++){
            switch(tempc.equipment.label[i]){
                case 'Gas Furnace':
                    if(tempc.ratings.afue>spireMin){
                        datasheet.cell("B22").value(tempc.equipment.model[i]);
                    }
                    break;
                case 'Thermostat':
                        datasheet.cell("B21").value(tempc.equipment.model[i]);
                    break;
            }
        }
        /* Why is this being returned in this way. I assume that it is because
            this point in the code will take longer that the following code
            (after XlsxPop). This may be true, but we can/should not assume that
            it would be the case (even if it may be true 100%). Better practise
            would be to ensure the entire function runs before a return us reached
        */
        //ensure valid boardpath
        return workbook.toFileAsync(path.join(boardpath,boarddom.spire.finalinv));//why is this being returned and where too?
    });

    var pdfDoc = await PDFDocument.load(fs.readFileSync(path.join(boarddom.temppath,boarddom.spire.folder,boarddom.spire.temp)));
    var form = pdfDoc.getForm();

    for(let i=0;i<tempc.equipment.label.length;i++){
        switch(tempc.equipment.label[i]){
            case 'Gas Furnace':
                if(tempc.ratings.afue>spireMin){
                    form.getTextField('New Equipment InstalledRow2').setText(tempc.equipment.label[i]);
                    form.getTextField('ManufacturerRow2').setText('');  //BRAND
                    form.getTextField('Model NumberRow2').setText(tempc.equipment.model[i]);
                    form.getTextField('QuantityRow2').setText('1');
                    form.getTextField('UEFAFUE RatingRow2').setText(JSON.stringify(tempc.ratings.afue));
                }
                break;
            case 'Thermostat':
                form.getTextField('New Equipment InstalledRow1').setText(tempc.equipment.label[i]);
                form.getTextField('ManufacturerRow1').setText('');  //BRAND
                form.getTextField('Model NumberRow1').setText(tempc.equipment.model[i]);
                form.getTextField('QuantityRow1').setText('1');
                form.getTextField('UEFAFUE RatingRow1').setText('');
                break;
        }
    }
    //ensure valid boardpath
    fs.writeFileSync(path.join(boardpath,boarddom.spire.final),await pdfDoc.save());
}

module.exports={CREATEboard}
