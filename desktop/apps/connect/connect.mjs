const originUrl = new URL(window.location.href);
let parentApp = {};
let scanApp;

function sendMessage(message) {
  if (parentApp.source && parentApp.sid) {
    message.sid = parentApp.sid;
    parentApp.source.postMessage(message, '*');
  }
}

function scanAppCreated(message) {
  console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP scanAppCreated', message);
  if (scanApp) {
    return;
  }
  scanApp = {
    appId: message.appId,
  };
  console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP scanAppCreated scanApp', scanApp);
}

function attachedAppOnready(message) {
  console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP attachedAppOnready', message, scanApp);
  if (message.appId == scanApp.appId) {
    scanApp.ready = true;
  }
}

function attachedScanAppClose(message) {
  console.log('PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP attachedScanAppClose', message);
  sendMessage({
    type: 'message',
    message: {
      route: '/attachment/display',
      attachment: {
        appId: scanApp.appId,
        visibility: 'hidden',
      }
    },
  });
}

const messageHandlers = {
  '/attachment/scan/created': scanAppCreated,
  '/attachment/onready': attachedAppOnready,
  '/scan/close': attachedScanAppClose,
};

const eventHandlers = {
  'invite': (event)=>{
    let data = event.data;
    if (data && data.sid && parentApp.source === undefined) {
      parentApp.sid = data.sid;
      parentApp.source = event.source;
      sendMessage({
        type: 'ack',
      });
    }
  },
  'message': (event)=>{
    if (event.source === parentApp.source) {
      let message = event.data.message;
      console.log('qqqqqqqqqqqqqqqqqqccccccccccccccccccccc message', event.data);
      if (message.route && messageHandlers[message.route]) {
        messageHandlers[message.route](message);
      }
    }
  },
};

window.addEventListener("message", (event)=>{
  let data = event.data;
  if (event.origin===originUrl.origin && data.type && eventHandlers[data.type]) {
    eventHandlers[data.type](event);
  }
}, false);


let vueApp;

const template = `
<div>

  <v-dialog
  v-model="connectRemote"
  persistent
  max-width="290"
  >
  <v-card>
    <v-card-title class="text-h5">
      Use Google's location service?
    </v-card-title>
    <v-card-text>Let Google help apps determine location. This means sending anonymous location data to Google, even when no apps are running.</v-card-text>
    <v-card-actions>
      <v-spacer></v-spacer>
      <v-btn
        color="green darken-1"
        text
        @click="dialog = false"
      >
        Disagree
      </v-btn>
      <v-btn
        color="green darken-1"
        text
        @click="connectRemote = false"
      >
        Agree
      </v-btn>
    </v-card-actions>
  </v-card>
  </v-dialog>

  <v-card
    outlined
  >
    <v-toolbar dense flat>
      <v-icon left>mdi-connection</v-icon>

      <v-spacer></v-spacer>

      <v-btn
      style="text-transform: none;"
      color="blue lighten-1"
      text
      @click="connectRemoteServer()"
      >
        <v-icon>mdi-qrcode</v-icon>
        Connect remote server
      </v-btn>

    </v-toolbar>

    <v-list rounded>
      <v-subheader>Available servers:</v-subheader>
      <v-list-item-group
        v-model="selectedItem"
        color="primary"
      >
        <v-list-item
          v-for="(item, i) in items"
          :key="i"
        >
          <v-list-item-icon>
            <img src="/vxdrive/resources/icon/peer_32.png">
          </v-list-item-icon>
          <v-list-item-content>
            <v-list-item-title v-text="item.text"></v-list-item-title>
          </v-list-item-content>
        </v-list-item>
      </v-list-item-group>
    </v-list>

  </v-card>




</div>
`;

let rootComponent;
let topLevelComp;

const rootCompDef = {
  template,
  components: {

  },
  data: function () {
    return {
      connectRemote: true,
      selectedItem: 0,
      items: [
        { text: 'Default', icon: 'mdi-server-network' },
      ],
    }
  },
  created() {
    console.log('connect app is created');
    rootComponent = this;

  },
  methods: {
    connectRemoteServer() {
      if (scanApp && scanApp.ready) {
        sendMessage({
          type: 'message',
          message: {
            route: '/attachment/display',
            attachment: {
              appId: scanApp.appId,
              visibility: 'visible',
            }
          },
        });
      }
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
