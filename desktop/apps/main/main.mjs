import libs from '/vxdrive/desktop/resource/js/common/service/libs.mjs';

let uuidv4;

const apps = {};
const attachedApps = {};
const attachedOwners = {};

let connectAppId;
let newServerAppId;

const menubarApp = {
  minimize: true,
};

const qrCodeScanApp = {};


function toggleMenubar(event) {
  if (menubarApp.minimize) {
    menubarApp.minimize = false;
    menubarApp.container.style['width'] = '100%';
    return;
  }
  menubarApp.minimize = true;
  menubarApp.container.style['width'] = '40px';
}

function selectMenubarItem(event) {
  let message = event.data.message;
  if (message.data && message.data.item) {
    let item = message.data.item;
    console.log('wwwwwwwwwwwwwww XXXXXXXXXXXXXXXXXXX selectMenubarItem', item);
    displayApp(item.id);
  }
}

function displayApp(appId) {
  let app = apps[appId];
  if (app) {
    clearDisplay();
    let viewId = app.viewId;
    if (viewId === undefined) {
      viewId = appId;
    }
    let el = document.getElementById('c'+viewId);
    if (el) {
      el.style['visibility'] = 'visible';
    }
  }
}

function clearDisplay() {
  for (let appId in apps) {
    let app = apps[appId];
    if (app) {
      app.selected = false;
      let el = document.getElementById('c'+appId);
      if (el) {
        el.style['visibility'] = 'hidden';
      }
    }
  }
  for (let appId in attachedApps) {
    let app = attachedApps[appId];
    if (app) {
      let el = document.getElementById('c'+appId);
      if (el) {
        el.style['visibility'] = 'hidden';
      }
    }
  }
}

function attachAppIn(event) {
  let message = event.data.message;
  console.log('wwwwwwwwwwwwwww XXXXXXXXXXXXXXXXXXX attachAppRelayIn', event.data);
  if (event.data && message.data.aaid && message) {

  }
}

function attachAppOut(event) {
  let app = attachedApps[event.data.sid];
  let owner = apps[app.ownerId];
  console.log('EEEEEEEEEEEEEEEEE vvvvvvvvvvvvvvvvvvvvvvvvvvv attachAppOut to owner', owner, event.data.message);
  if (owner && owner.contentWindow) {
    console.log('IIIIIIIIIIIIIIIIIIIIIIIIIIII to owner', owner, event.data.message);
    owner.contentWindow.postMessage({
      type: 'message',
      message: event.data.message,
    }, '*');
  }
}

function displayAttachApp(event) {
  let message = event.data.message;
  console.log('wwwwwwwwwwwwwww XXXXXXXXXXXXXXXXXXX displayAttachApp', event.data);
  if (message.attachment) {
    let attachApp = attachedApps[message.attachment.appId];
    if (attachApp) {
      console.log('wwwwwwwwwwwwwww XXXXXXXXXXXXXXXXXXX displayAttachApp', attachApp);
      let owner = apps[attachApp.ownerId];
      if (owner) {
        if (message.attachment.visibility == 'visible') {
          owner.viewId = message.attachment.appId;
        }
        else {
          owner.viewId = undefined;
        }
        displayApp(owner.id);
      }
    }
  }
}

const messageHandler = {
  '/menubar/toggle': toggleMenubar,
  '/menubar/selectItem': selectMenubarItem,
  '/attachment/display': displayAttachApp,
  '/attachment/io/in': attachAppIn,
  '/attachment/io/out': attachAppOut,
};

function attachedAppAck(event) {
  let data = event.data;
  let app = attachedApps[data.sid];
  app.ack = true;
  console.log('aaaaaaaaaaaaaaaaaa fffffffffffffffffffffff  attachedAppAck', app);
  if (app.ownerId && apps[app.ownerId]) {
    let owner = apps[app.ownerId];
    owner.contentWindow.postMessage({
      type: 'message',
      message: {
        route: '/attachment/onready',
        appId: app.id,
      }
    }, '*');
  }
}

function attachAppOnload(appId) {
  let app = attachedApps[appId];
  if (app) {
    let iframeWin = app.iframe;
    let content = (iframeWin.contentWindow || iframeWin.contentDocument);
    app.contentWindow = content;
    console.log('gggggggggggggggg qqqqqqqqqqqqqqqq attachAppOnload', app);
    invite(app, 200, 10);
    console.log(`attachApp ${app.id} is loaded`);
  }
}

function attachApp(ownerId, path, iframe) {
  let appId = 'aa' + uuidv4();
  if (iframe === undefined) {
    iframe = document.createElement('iframe');
    //iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
    iframe.sandbox = 'allow-forms allow-scripts';
    iframe.allowtransparency = 'true';
    iframe.style = 'width:100%;height:100%;border:none;';
  }
  iframe.src = path;
  iframe.id = appId;
  iframe.onload = ()=>{attachAppOnload(appId)};

  let div = document.createElement('div');
  div.id = 'c' + iframe.id;
  div.style['visibility'] = 'hidden';
  div.style['position'] = 'absolute';
  div.style['width'] = '100%';
  div.style['height'] = '100%';
  div.appendChild(iframe);
  document.body.appendChild(div);
  let app = {
    ownerId,
    id: appId,
    iframe,
  };
  let owner = attachedOwners[ownerId];
  if (owner === undefined) {
    owner = {
      id: ownerId,
      attachments: [],
    }
    attachedOwners[ownerId] = owner;
  }
  owner.attachments.push(app);
  attachedApps[appId] = app;
  return appId;
}



function setMenubarItem(id, item) {
  if (menubarApp.contentWindow) {
    menubarApp.contentWindow.postMessage({
      type: 'message',
      message: {
        route: '/menubar/setItem',
        data: {id,item},
      }
    }, '*');
  }
}


function menubarAck() {
  console.log('jfffffffffffffffffffffffff menubarAck');
  if (menubarApp.ack) {
    return;
  }
  menubarApp.ack = true;
  createConnectApp();
}

function connectAppAck() {
  let connectApp = apps[connectAppId];
  if (connectApp) {
    if (connectApp.ack) {
      return;
    }

    setMenubarItem(connectAppId, {
      label: connectApp.label,
      icon: 'mdi-login',
      type: connectApp.type,
    });

    //createQRCodeScanApp();


    let iframe = document.createElement('iframe');
    iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
    iframe.allowtransparency = 'true';
    iframe.style = 'width:100%;height:100%;border:none;';

    let qrScanAppId = attachApp(connectAppId, '/desktop/apps/scan/scan.html', iframe);

    connectApp.ack = true;
    connectApp.qrScanAppId = qrScanAppId;

    connectApp.contentWindow.postMessage({
      type: 'message',
      message: {
        route: '/attachment/scan/created',
        appId: qrScanAppId,
      }
    }, '*');

  }
}

function newServerAppAck() {
  console.log('jfffffffffffffffffffffffff newServerAppAck');
  let newServerApp = apps[newServerAppId];
  if (newServerApp) {
    if (newServerApp.ack) {
      return;
    }

    setMenubarItem(newServerAppId, {
      label: newServerApp.label,
      icon: 'mdi-server-plus',
      type: newServerApp.type,
    });
    newServerApp.ack = true;
  }
}

const eventHandler = {
  'ack': (event)=>{
    let data = event.data;
    if (data.sid == menubarApp.id) {
      menubarAck();
      return;
    }
    if (data.sid == connectAppId) {
      connectAppAck();
      return;
    }
    if (data.sid == newServerAppId) {
      newServerAppAck();
      return;
    }
    if (attachedApps[data.sid]) {
      attachedAppAck(event);
      return;
    }
  },
  'message': (event)=>{
    let app = attachedApps[event.data.sid];
    if (app && event.data.attachment) {
      console.log('PPPPPPPPPPPPPPPPPPPP gggggggggggggggg eventHandler attachedApp', app);
      messageHandler[event.data.attachment.route](event);
      return;
    }
    let message = event.data.message;
    if (message.route && messageHandler[message.route]) {
      messageHandler[message.route](event);
    }
  },
};

window.addEventListener("message", (event)=>{
  let data = event.data;
  console.log('DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD', event.origin, data, event.source, menubarApp.contentWindow, apps);
  if (data.sid && data.type && eventHandler[data.type]) {
    if (data.sid == menubarApp.id) {
      if (event.source === menubarApp.contentWindow) {
        eventHandler[data.type](event);
      }
    }
    else if (apps[data.sid]) {
      let app = apps[data.sid];
      if (event.source == app.contentWindow) {
        eventHandler[data.type](event);
      }
    }
    else if (attachedApps[data.sid]) {
      let app = attachedApps[data.sid];
      console.log('DDDDDDDDDDDDDDDDDDDDDDDDDDDDDD attachedApps', app);
  
      if (event.source == app.contentWindow) {
        eventHandler[data.type](event);
      }
    }
  }
}, false);

function receiveEvent(event) {
  //if (data.type && data.id && eventHandler[data.type] && (data.id == menubarApp.id || apps[data.id])) {
  //  eventHandlers[data.type](event);
  //}
}

function invite(app, interval, count) {
  let timer;
  let idx = 0;

  function send() {
    if (idx >= count || app.ack) {
      clearInterval(timer);
      return;
    }
    idx++;
    app.contentWindow.postMessage({
      sid: app.id,
      type: 'invite',
    }, '*');
  }
  timer = setInterval(send, interval);
}

function menubarAppOnload() {
  let iframeWin = menubarApp.iframe;
  let content = (iframeWin.contentWindow || iframeWin.contentDocument);
  menubarApp.contentWindow = content;
  invite(menubarApp, 200, 10);
  console.log(`menubarApp ${menubarApp.id} is loaded`);
}

function createMenubarApp() {
  menubarApp.id = 'pna' + uuidv4();
  let iframe = document.createElement('iframe');
  menubarApp.iframe = iframe;
  iframe.src = '/vxdrive/desktop/apps/menubar/menubar.html';
  iframe.id = menubarApp.id;
  //iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
  iframe.sandbox = 'allow-forms allow-scripts';
  iframe.allowtransparency = 'true';
  iframe.style = 'width:100%;height:100%;border:none;';
  iframe.onload = menubarAppOnload;

  let div = document.createElement('div');
  div.style['position'] = 'fixed';
  div.style['bottom'] = '0';
  div.style['left'] = '0';
  div.style['z-index'] = '1000';
  div.style['width'] = '40px';
  div.style['height'] = '48px';
  div.appendChild(iframe);
  menubarApp.container = div;
  document.body.appendChild(div);
}

function qrCodeScanAppOnload() {
  let iframeWin = qrCodeScanApp.iframe;
  let content = (iframeWin.contentWindow || iframeWin.contentDocument);
  qrCodeScanApp.contentWindow = content;
  invite(qrCodeScanApp, 200, 10);
  console.log(`qrCodeScanApp ${qrCodeScanApp.id} is loaded`);
}

function createQRCodeScanApp() {
  qrCodeScanApp.id = 'pna' + uuidv4();
  let iframe = document.createElement('iframe');
  qrCodeScanApp.iframe = iframe;
  iframe.src = '/vxdrive/desktop/apps/scan/scan.html';
  iframe.id = qrCodeScanApp.id;
  //iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
  iframe.sandbox = 'allow-forms allow-scripts';
  iframe.allowtransparency = 'true';
  iframe.style = 'width:100%;height:100%;border:none;';
  iframe.onload = qrCodeScanAppOnload;

  let div = document.createElement('div');
  div.id = 'c' + iframe.id;
  div.style['visibility'] = 'hidden';
  div.style['position'] = 'absolute';
  div.style['width'] = '100%';
  div.style['height'] = '100%';
  div.appendChild(iframe);
  document.body.appendChild(div);
}

function connectAppOnload() {
  let connectApp = apps[connectAppId];
  let iframeWin = connectApp.iframe;
  let content = (iframeWin.contentWindow || iframeWin.contentDocument);
  connectApp.contentWindow = content;
  invite(connectApp, 200, 10);
  console.log(`connectApp ${connectAppId} is loaded`);
}

function createConnectApp() {
  connectAppId = 'pna' + uuidv4();
  let iframe = document.createElement('iframe');
  iframe.src = '/vxdrive/desktop/apps/connect/connect.html';
  iframe.id = connectAppId;
  //iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
  iframe.sandbox = 'allow-forms allow-scripts';
  iframe.style = 'width:100%;height:100%;border:none;';
  iframe.onload = connectAppOnload;

  let div = document.createElement('div');
  div.id = 'c' + iframe.id;
  div.style['position'] = 'absolute';
  div.style['width'] = '100%';
  div.style['height'] = '100%';
  div.appendChild(iframe);
  document.body.appendChild(div);
  apps[connectAppId] = {
    id: connectAppId,
    label: 'Sign In',
    type: 'connect-server',
    selected: true,
    iframe,
  };
}

function newServerAppOnload() {
  let newServerApp = apps[newServerAppId];
  let iframeWin = newServerApp.iframe;
  let content = (iframeWin.contentWindow || iframeWin.contentDocument);
  newServerApp.contentWindow = content;
  invite(newServerApp, 200, 10);
  console.log(`newServerApp ${newServerAppId} is loaded`);
}


export default {
  start: ()=> {
    return new Promise(function(resolve, reject) {
      import(libs.get('uuid'))
      .then(module => {
        uuidv4 = module.v4;
        return getACode();
      })
      .then((acode) => {
        console.log('MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', acode);
        createMenubarApp();
        resolve();
      });
    });
  }
}
