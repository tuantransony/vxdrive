const originUrl = new URL(window.location.href);
let parentApp = {};

function sendMessage(message) {
  if (parentApp.source && parentApp.sid) {
    message.sid = parentApp.sid;
    parentApp.source.postMessage(message, '*');
  }
}

const messageHandlers = {
  '/menubar/setItem': (message)=>{
    console.log('QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ /menubar/setItem', message);
    if (message.data && message.data.id) {
      /*
      for (let i=0; i<20; i++) {
        let id = message.data.id + '-' + i;
        let item = {
          label: message.data.item.label + ' ' + i
        }
        rootComponent.setMenuItem(id, item);

      }
      */
      rootComponent.setMenuItem(message.data.id, message.data.item);

      console.log('QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ /menubar/setItem', menuItems);
    }
  },
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
    console.log('BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB message event', event.data);
    let message = event.data.message;
    if (message.route && messageHandlers[message.route]) {
      messageHandlers[message.route](message);
    }
  },
};

window.addEventListener("message", (event)=>{
  let data = event.data;
  if (event.origin===originUrl.origin && data.type && eventHandlers[data.type]) {
    eventHandlers[data.type](event);
  }
}, false);


function setItem(item, tabs) {
  tabs.push({
    id: item.id,
    label: item.label,
    icon: item.icon,
  });
}

function buildItems(tabs) {
  setItem({
    icon: "mdi-power",
    id: powerMenuId,
    label: "Exit",
  }, tabs);

  if (connectServerItem) {
    setItem(connectServerItem, tabs);
  }

  if (newServerItem) {
    setItem(newServerItem,tabs);
  }

  for (let i=0; i<menuItems.length; i++) {
    setItem(menuItems[i], tabs);
  }
}



let vueApp;

const template = `
<div style="opacity: 0.6;" :class="bgColor">
  <v-tabs
    class="pl-10"
    dark
    background-color="blue-grey darken-2"
    show-arrows
    v-model="activeItem"
  >
    <v-tabs-slider color="teal lighten-3"></v-tabs-slider>
    <v-tab
      v-for="(item, i) in items"
      :key="i"
      @click="selectMenuItem(item)"
    >
      <v-icon v-if="item.icon">{{item.icon}}</v-icon>
      {{ item.label }}
    </v-tab>
  </v-tabs>

  <v-btn
    style="position: fixed; top:8px; left:5px;"
    fab
    dark
    x-small
    color="blue-grey darken-2"
    @click="toggleMenu()"
  >
    <v-icon dark>{{menuIcon}}</v-icon>
  </v-btn>
</div>
`;

let rootComponent;
let menuItems = [];
const powerMenuId = "power-8eb9a3f4-32fa";
let connectServerItem;
let newServerItem;

setInterval(() => {
  if (rootComponent.bgColor != '' && rootComponent.updateTime+10000<Date.now()) {
    rootComponent.toggleMenu();
  }
}, 5000);

const rootCompDef = {
  template,
  components: {

  },
  data: function () {
    return {
      menuIcon: 'mdi-menu-open',
      bgColor: '',
      updateTime: Date.now(),
      items: [],
      activeItem: null,
    }
  },
  created() {
    console.log('menubar is created');
    rootComponent = this;
  },
  methods: {
    setMenuItem(id, item) {
      if (item.type == 'connect-server') {
        item.id = id;
        connectServerItem = item;
        this.activeItem = 1;
      }
      else if (item.type == 'new-server') {
        item.id = id;
        newServerItem = item;
        this.activeItem = 1;
      }
      else if (item.type == 'console') {
        let foundIndex = -1;
        for (let i=0; i<menuItems.length; i++) {
          if (menuItems[i].id == id) {
            foundIndex = i;
          }
        }
        if (foundIndex>=0) {
          if (item) {
            return; //duplicate item
          }
  
          //remove item
          let newMenuItems = [];
          for (let i=0; i<menuItems.length; i++) {
            if (foundIndex != i) {
              newMenuItems.push(menuItems[i]);
            }
          }
          menuItems = newMenuItems;
        }
        else {
          item.id = id;
          menuItems.push(item);
  
          setItem(item, this.items);
          return;
        }
      }
      let tabs = [];
      buildItems(tabs);
      this.items = tabs;



      let aaa = true;
      if (aaa) {
        return;
      }

      if (menuItems.length == 0) {
        setExitItem(menuItems, this.items);
      }
      //let foundIndex = -1;
      for (let i=0; i<menuItems.length; i++) {
        if (menuItems[i].id == id) {
          foundIndex = i;
        }
      }
      if (foundIndex>=0) {
        if (item) {
          return;
        }
        let newMenuItems = [];
        let newItems = [];
        setExitItem(newMenuItems, newItems);

        for (let i=0; i<menuItems.length; i++) {
          if (foundIndex != i) {
            let item = menuItems[i];
            newMenuItems.push(item);
            newItems.push({
              id: item.id,
              label: item.label,
              icon: item.icon,
            });
          }
        }
        menuItems = newMenuItems;
        this.items = newItems;
        if (foundIndex >= menuItems.length) {
          foundIndex = menuItems.length -1;
        }
        return;
      }
      item.id = id;
      menuItems.push(item);
      this.items.push({
        id,
        label: item.label,
        icon: item.icon,
      });

      if (menuItems.length == 2) {
        this.activeItem = 1;
      }
    },
    selectMenuItem(item) {
      this.updateTime = Date.now();
      if (item.id == powerMenuId) {
        return;
      }
      sendMessage({
        type: 'message',
        message: {
          route: '/menubar/selectItem',
          data: {item}
        }
      });
    },
    toggleMenu() {
      this.updateTime = Date.now();
      if (this.bgColor=='') {
        this.bgColor = 'blue-grey darken-2';
        this.menuIcon = 'mdi-chevron-down'
      }
      else {
        this.bgColor = '';
        this.menuIcon = 'mdi-menu-open';
      }

      sendMessage({
        type: 'message',
        message: {
          route: '/menubar/toggle',
        }
      });
    },
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
