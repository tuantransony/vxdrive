import libs from '/desktop/resource/js/common/service/libs.mjs';

let uuidv4;
let QrScanner;
let UIToolbar;

const originUrl = new URL(window.location.href);

const parentApp = {};

let appElement;

let connectScanner;
let toolbarWidget;

function sendMessage(message) {
  if (parentApp.source && parentApp.sid) {
    let msg = {
      type: 'message',
      sid: parentApp.sid,
      attachment: {
        route: '/attachment/io/out',
      },
      message,
    }
    parentApp.source.postMessage(msg, '*');
  }
}

const eventHandlers = {
  'invite': (event)=>{
    let data = event.data;
    if (data && data.sid && parentApp.source === undefined) {
      parentApp.sid = data.sid;
      parentApp.source = event.source;
      console.log('AAAAAAAAAAAAAAAAAAAAA send ack', data);
      parentApp.source.postMessage({
        type: 'ack',
        sid: parentApp.sid,
      }, '*');
    }
  },
  'message': (event)=>{

  },
};

window.addEventListener("message", (event)=>{
  let data = event.data;
  console.log('AAAAAAAAAAAAAAAAAAAAA addEventListener', event.origin, originUrl.origin, data);
  if (event.origin===originUrl.origin && data.type && eventHandlers[data.type]) {
    eventHandlers[data.type](event);
  }
}, false);



function ConnectScanner() {
  let _scanner = this;
  _scanner.maxScanCount = 20;
  _scanner.scanTime = Date.now();
  _scanner.scanCount = 0;

  let scanBoxElement = document.getElementById('scan-box');
  let scanBoxHeader = document.getElementById('scan-box-header');
  scanBoxHeader.textContent = '';

  let scanCounting;

  let isScanning = false;
  const video = document.getElementById('qr-video');

  let skipErrorCount = 0;
  const qrScanner = new QrScanner(video, 
    (result)=>{
      console.log('JJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJJ result', result);
    }, 
    (error)=>{
      skipErrorCount++;
      if (skipErrorCount > 100) {
        skipErrorCount = 0;
        if (Date.now()-_scanner.scanTime > _scanner.maxScanCount*1000) {
          stopScan();
          scanNotFound();
        }
      }
    }
  );

  function startScan() {
    isScanning = true;
    _scanner.scanTime = Date.now();
    _scanner.scanCount = _scanner.maxScanCount;
    qrScanner.start().then(() => {
      scanCounting = setInterval(() => {
        console.log('VVVVVVVVVVVVVVVVVVVV scan count:' + _scanner.scanCount);
        if (_scanner.scanCount <= 0) {
          return;
        }
        _scanner.scanCount = _scanner.scanCount - 1;
        scanBoxHeader.textContent = String(_scanner.scanCount);
      }, 1000);
  
      scanBoxElement.className = "show-scanbox-area";
      qrScanner.hasFlash().then(hasFlash => {
        let flash = {}
        if (hasFlash) {
          flash.flashOn = false;
        }
        toolbarWidget.sendMessage('/toolbar/setFlash', flash);
      });
    });
  }
  
  function stopScan() {
    isScanning = false;
    if (scanCounting) {
      _scanner.scanCount = 0;
      clearInterval(scanCounting);
    }
    toolbarWidget.sendMessage('/toolbar/stopScan', {});
    scanBoxElement.className = "hide-scanbox";
    qrScanner.stop();
  }

  function scanNotFound() {
    toolbarWidget.sendMessage('/toolbar/scanNotFound', {});
  }
  
  this.startScan = startScan;
  this.stopScan = stopScan;
  this.setCamera = (id)=>{
    return qrScanner.setCamera(id);
  };
  this.hasFlash = ()=>{
    return qrScanner.hasFlash();
  };
  this.exit = ()=>{
    sendMessage({
      route: '/scan/close',
    })
  };
}

export default {
  start: (elId)=> {
    return new Promise(function(resolve, reject) {
      appElement = document.getElementById(elId);
      if (appElement === undefined) {
        reject('Not found app element');
        return;
      }

      let promises = [
        import(libs.get('uuid')),
        import(libs.get('qrscanner')),
        import('./ui.mjs'),
      ];
      Promise.all(promises)
      .then(values => {
        console.log('ZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ', values);
        uuidv4 = values[0].v4;
        QrScanner = values[1].default;
        UIToolbar = values[2].default;
        QrScanner.WORKER_PATH = libs.get('qrscanworker');
        connectScanner = new ConnectScanner();
        return UIToolbar.init(elId, connectScanner, uuidv4);
      })
      .then(toolbar => {
        toolbarWidget = toolbar;
        resolve();
      })
      .catch(error => {
        console.error(error)
        reject(error);
      });
    });
  }
}
