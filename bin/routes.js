/*  Routes
    File holds all the route names for communication
    between ipcMain and ipcRenderer.

    routes can be add and organized as needed with
    in the module.expoerts = {}
*/
var loginroutes ={
  submit:'SUBMIT-userlogin'
}

var navroutes = {
  gotologin:'goto-login'
}


module.exports = {
  loginroutes,
  navroutes
}
