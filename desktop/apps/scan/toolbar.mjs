
let parentApp = {};

function sendMessage(message) {
  if (parentApp.source && parentApp.sid) {
    message.sid = parentApp.sid;
    console.log('ZZZZZZZZZZZZZZZZZZZZ BBBBBBBBBBBBBBBBBBBBB  send message', message);
    parentApp.source.postMessage(message, '*');
  }
}

const messageHandlers = {
  '/toolbar/startScan': (message)=>{
    rootComponent.startScan();
  },
  '/toolbar/stopScan': (message)=>{
    rootComponent.stopScan();
  },
  '/toolbar/scanNotFound': (message)=>{
    rootComponent.scanNotFound();
  },
  '/toolbar/listCameras': (message)=>{
    if (message.data && message.data.cameras) {
      let cameras = message.data.cameras;
      let list = [
        {
          id: 'environment',
          label: 'Rear Camera',
          icon: 'mdi-camera-rear-variant',
        },
        {
          id: 'user',
          label: 'Front Camera (selfies)',
          icon: 'mdi-camera-front-variant',
        },
      ];
      for (let i=0; i<cameras.length; i++) {
        cameras[i].icon = 'mdi-camera-outline';
        list.push(cameras[i]);
      }
      console.log('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB set cameras', list);
      rootComponent.setCameras(list);
    }
  },
  '/toolbar/setFlash': (message)=>{
    console.log('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB set flash', message);
    if (message.data) {
      rootComponent.setFlash(message.data.flashOn);
    }

  },
};

const eventHandlers = {
  'invite': (event)=>{
    let data = event.data;
    console.log('ZZZZZZZZZZZZZZZZZZZZ BBBBBBBBBBBBBBBBBBBBB invite', data);
    if (data && data.sid && parentApp.source === undefined) {
      console.log('ZZZZZZZZZZZZZZZZZZZZ BBBBBBBBBBBBBBBBBBBBB  set invite source', data);
      // need to claim parent session id to complete handshake session
      parentApp.sid = data.sid;
      parentApp.source = event.source;
      sendMessage({
        type: 'ack',
      });
    }
  },
  'message': (event)=>{
    console.log('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB message event', event.data);
    if (event.source === parentApp.source) {
      let message = event.data.message;
      if (message.route && messageHandlers[message.route]) {
        messageHandlers[message.route](message);
      }
    }
  },
};

window.addEventListener("message", receiveEvent, false);
function receiveEvent(event) {
  let data = event.data;
  console.log('ZZZZZZZZZZZZZZZZZZZZ BBBBBBBBBBBBBBBBBBBBB receiveEvent', event.origin, 'BBBBBBBBBB='+event.origin.indexOf('http://127.0.0.1'), data);
  if (data.type && eventHandlers[data.type] && event.origin.indexOf('http://127.0.0.1')==0) {
    eventHandlers[data.type](event);
  }
}

const errorCodeHandler = {
  '1': () => {
    rootComponent.exit();
  },
  '2': () => {
    rootComponent.errorDialog = false;
  },
};


let vueApp;

const template = `
<div>

  <v-dialog
    v-model="errorDialog"
    fullscreen
    hide-overlay
  >
    <v-card>
      <v-toolbar
        :color="errorColor"
        dark
      >Error</v-toolbar>
      <v-card-text>
        <div class="pa-6">{{errorMessage}}</div>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          outlined
          rounded
          text
          @click="closeError()"
        >
          Close
        </v-btn>
        <v-spacer></v-spacer>
    </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="cameraDialog"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
  >
    <v-card outlined style="border:0">
      <v-toolbar
        color="primary"
        dark
      >
        <v-icon left >mdi-qrcode</v-icon>
        Select Camera
      </v-toolbar>

      <v-list rounded>
        <v-list-item-group
          v-model="selectedCamera"
          color="primary"
        >
          <v-list-item
            v-for="(item, i) in cameras"
            :key="i"
            @click="selectCamera(item)"
          >
            <v-list-item-icon>
              <v-icon>{{item.icon}}</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              {{item.label}}
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-card>
  </v-dialog>

  <v-dialog
    v-model="inversionDialog"
    fullscreen
    hide-overlay
    transition="dialog-bottom-transition"
  >
    <v-card outlined style="border:0">
      <v-toolbar
        color="primary"
        dark
      >
        <v-icon left >mdi-qrcode</v-icon>
        Adjust scan color
      </v-toolbar>

      <v-list rounded>
        <v-list-item-group
          v-model="selectedBg"
          color="primary"
        >
          <v-list-item
            key="0"
            @click="selectBackground('original')"
          >
            <v-list-item-icon>
              <v-icon>mdi-brightness-7</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              Original (dark QR code)
            </v-list-item-content>
          </v-list-item>

          <v-list-item
            key="1"
            @click="selectBackground('invert')"
          >
            <v-list-item-icon>
              <v-icon>mdi-brightness-5</v-icon>
            </v-list-item-icon>
            <v-list-item-content>
              Inverted (bright QR code)
            </v-list-item-content>
          </v-list-item>
        </v-list-item-group>
      </v-list>
    </v-card>
  </v-dialog>

  <v-card outlined style="border:0">
    <v-toolbar
      color="primary"
      dark
    >
      <v-icon left >mdi-qrcode</v-icon>
      Scan Access Code
    </v-toolbar>

    <v-list rounded>
      <v-list-item-group
        v-model="toolSelectedItem"
        color="primary"
      >
        <v-list-item
          key="0"
          @click="toggleScan"
        >
          <v-list-item-icon>
            <v-icon v-text="scanIcon"></v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            {{scanLabel}}
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          key="1"
          @click="openCamDiaglog"
        >
          <v-list-item-icon>
            <v-icon>mdi-camera-outline</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Select camera
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          key="2"
          @click="openInversionDialog"
        >
          <v-list-item-icon>
            <v-icon>mdi-invert-colors</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Adjust color
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          v-if="flashSupport"
          key="3"
          @click="toggleFlash"
        >
          <v-list-item-icon>
            <v-icon v-text="flashIcon"></v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            {{flashState}}
          </v-list-item-content>
        </v-list-item>

        <v-list-item
          key="4"
          @click="exit"
        >
          <v-list-item-icon>
            <v-icon>mdi-close</v-icon>
          </v-list-item-icon>
          <v-list-item-content>
            Close
          </v-list-item-content>
        </v-list-item>


      </v-list-item-group>
    </v-list>
  </v-card>



</div>
`;

let rootComponent;


const rootCompDef = {
  template,
  components: {

  },
  data: function () {
    return {
      toolSelectedItem: null,
      scanOn: false,
      scanLabel: 'Start scanning',
      scanIcon: 'mdi-qrcode-scan',
      selectedCamera: 0,
      cameras: [],
      cameraDialog: false,
      selectedBg: 0,
      inversionDialog: false,
      flashState: 'NA',
      flashIcon: null,
      errorDialog: false,
      errorCode: '1',
      errorColor: 'red',
      errorMessage: 'No camera found',
    }
  },
  created() {
    console.log('toolbar is created');
    rootComponent = this;
  },
  computed: {
    flashSupport() {
      return this.flashState=='On' || this.flashState=='Off';
    },
  },
  methods: {
    toggleScan() {
      if (this.scanOn) {
        this.stopScan();
      }
      else {
        this.startScan();
      }
      sendMessage({
        type: 'message',
        message: {
          route: '/toolbar/scan/on',
          scanOn: this.scanOn,
        }
      });
    },
    startScan() {
      this.scanOn = true;
      this.scanLabel = 'Stop scanning';
      this.scanIcon = 'mdi-stop-circle-outline';
    },
    stopScan() {
      this.scanOn = false;
      this.scanLabel = 'Scan code';
      this.scanIcon = 'mdi-qrcode-scan';
    },
    openCamDiaglog() {
      this.cameraDialog = true;
    },
    openInversionDialog() {
      this.inversionDialog = true;
    },
    selectBackground(val) {
      this.inversionDialog = false;
      sendMessage({
        type: 'message',
        message: {
          route: '/toolbar/camera/inversion',
          val,
        }
      });
    },
    selectCamera(camera) {
      console.log('select camera', camera);
      this.cameraDialog = false;
      this.flashState = 'NA';

      sendMessage({
        type: 'message',
        message: {
          route: '/toolbar/camera/set',
          camera,
        }
      });
    },
    setCameras(cameras) {
      if (cameras && cameras.length > 0) {
        this.cameras = cameras;
        return;
      }
      this.errorDialog = true;
      this.errorMessage = 'No camera found';
    },
    setFlash(flashOn) {
      console.log('VVVVVVVVVVVVVVVVVVVVVVVVVVVVV setFlash', flashOn);
      if (flashOn === undefined) {
        this.flashState = 'NA';
        return;
      }
      this.flashState = flashOn?'On':'Off';
      if (this.flashState=='Off') {
        this.flashIcon = 'mdi-flash-off';
      }
      else if (this.flashState=='On') {
        this.flashIcon = 'mdi-flash';
      }
    },
    toggleFlash() {
      sendMessage({
        type: 'message',
        message: {
          route: '/toolbar/flash/toggle'
        }
      });
    },
    scanNotFound() {
      this.errorDialog = true;
      this.errorCode = 2;
      this.errorColor = 'primary';
      this.errorMessage = 'No code found';
    },
    closeError() {
      if (errorCodeHandler[this.errorCode]) {
        errorCodeHandler[this.errorCode]();
      }
    },
    exit() {
      sendMessage({
        type: 'message',
        message: {
          route: '/toolbar/exit',
        }
      });
    }
  },
};

export default {
  start: (elId)=> {
    return new Promise(function(resolve, reject) {
      let el = document.getElementById(elId);
      if (el === undefined) {
        reject('Not found app root element');
        return;
      }
      vueApp = new Vue({
        el: '#'+elId,
        components: {
          root: rootCompDef,
        },
        vuetify: new Vuetify(),
      })
      resolve();
    });
  }
}
