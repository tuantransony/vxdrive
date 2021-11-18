
import libs from '/desktop/resource/js/common/service/libs.mjs';

let QrScanner;
let uuidv4;

let appElement;

function ToolbarWidget(scannerApp) {
  let iframe;
  let contentWindow;
  let channelId;
  let ack;
  let container;

  function sendMessage(route, message) {
    contentWindow.postMessage({
      type: 'message',
      message: {
        route,
        data: message,
      }
    }, '*');
  }
  
  const messageHandlers = {
    '/toolbar/scan/on': (message)=>{
      console.log('/toolbar/scan/on', message);
      if (message.scanOn) {
        scannerApp.startScan();
      }
      else {
        scannerApp.stopScan();
      }
    },
    '/toolbar/camera/set': (message)=>{
      console.log('/toolbar/camera/set', message);
      scannerApp.scanTime = Date.now();
      scannerApp.scanCount = scannerApp.maxScanCount;
      scannerApp.setCamera(message.camera.id).then(() => {
        scannerApp.hasFlash().then(hasFlash => {
          let flash = {}
          if (hasFlash) {
            flash.flashOn = false;
          }
          sendMessage('/toolbar/setFlash', flash);
        });
      });
    },
    '/toolbar/camera/inversion': (message)=>{
      scannerApp.scanTime = Date.now();
      scannerApp.scanCount = scannerApp.maxScanCount;
      qrScanner.setInversionMode(message.val);
    },
    '/toolbar/flash/toggle': (message)=>{
      scannerApp.scanTime = Date.now();
      scannerApp.scanCount = qrScanner.maxScanCount;
      qrScanner.hasFlash().then(hasFlash => {
        if (hasFlash) {
          qrScanner.toggleFlash().then(() => {
            let flash = {}
            if (hasFlash) {
              flash.flashOn = false;
            }
            sendMessage('/toolbar/setFlash', {flashOn:qrScanner.isFlashOn()});
          });
        }
      });
    },
    '/toolbar/exit': (message)=>{
      console.log('QQQQQQQQQQQQQQQQQQQ ZZZZZZZZZZZZZZZZZZZZZZZZZ /toolbar/exit');
      scannerApp.exit();
    },
  };
  
  const eventHandlers = {
    'ack': (event)=>{
      let data = event.data;
      if (data.sid == channelId) {
        if (ack) {
          return;
        }
        ack = true;
        QrScanner.hasCamera()
        .then((hasCamera) => {
          if (hasCamera) {
            QrScanner.listCameras(true)
            .then(cameras => {
              sendMessage('/toolbar/listCameras', {cameras});
            });
          }
          else {
            sendMessage('/toolbar/listCameras', {cameras:[]});
          }
        })
        .catch(function(error) {
          //console.log(...logger.error(error));
        });
      }
    },
    'message': (event)=>{
      let message = event.data.message;
      if (message.route && messageHandlers[message.route]) {
        messageHandlers[message.route](message);
      }
    },
  };
  
  function invite(interval, count) {
    let timer;
    let idx = 0;
  
    function send() {
      if (idx >= count || ack) {
        clearInterval(timer);
        return;
      }
      idx++;
      contentWindow.postMessage({
        sid: channelId,
        type: 'invite',
      }, '*');
    }
    timer = setInterval(send, interval);
  }
  
  function toolbarAppOnload() {
    let iframeWin = iframe;
    let content = (iframeWin.contentWindow || iframeWin.contentDocument);
    contentWindow = content;
    invite(200, 10);
    console.log(`toolbar ui ${channelId} is loaded`);
  }
  
  function createToolbarApp() {
    channelId = 'a' + uuidv4();
    iframe = document.createElement('iframe');
    iframe.src = './toolbar.html';
    iframe.id = channelId;
    //iframe.sandbox = 'allow-forms allow-scripts allow-same-origin';
    iframe.sandbox = 'allow-forms allow-scripts';
    iframe.allowtransparency = 'true';
    iframe.style = 'width:100%;height:100%;border:none;';
    iframe.onload = toolbarAppOnload;
  
    let div = document.createElement('div');
    div.style['position'] = 'absolute';
    div.style['width'] = '100%';
    div.style['height'] = '100%';
    div.appendChild(iframe);
    container = div;
    appElement.appendChild(div);
  }
  
  window.addEventListener("message", (event)=>{
    let data = event.data;
    if (data.sid && data.sid == channelId && data.type && eventHandlers[data.type] ) {
      console.log('ssssssssssssssssssssssssssssssssssssssssss eeeeeeeeeeeeeeeeee ToolbarWidget receiveEvent', data);
      if (event.origin === "null" && event.source === contentWindow) {
        console.log('ssssssssssssssssssssssssssssssssssssssssss eeeeeeeeeeeeeeeeee origin', data, event.origin);
        eventHandlers[data.type](event);
      }
    }
  }, false);
  
  this.init = ()=>{
    createToolbarApp();
  };

  this.sendMessage = sendMessage;
}


export default {
  init: (elId, scanner)=> {
    return new Promise(function(resolve, reject) {
      appElement = document.getElementById(elId);
      if (appElement === undefined) {
        reject('Not found app element');
        return;
      }

      let promises = [
        import(libs.get('uuid')),
        import(libs.get('qrscanner')),
      ];
      Promise.all(promises)
      .then(values => {
        console.log('yyyyyyyyyy ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', values);
        uuidv4 = values[0].v4;
        QrScanner = values[1].default;
        QrScanner.WORKER_PATH = './qr-scanner-worker.min.js';

        let toolbarWidget = new ToolbarWidget(scanner);
        toolbarWidget.init();
        resolve(toolbarWidget);
      })
      .catch(error => {
        console.error(error)
        reject(error);
      });

    });
  }
}
