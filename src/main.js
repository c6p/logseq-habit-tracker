import '@logseq/libs';
import { createApp } from 'vue';
import App from './App.vue';
import './index.css'
import Font from "./icomoon.woff";

function createModel() {
  return {
    show(_) {
      logseq.showMainUI()
    },
  }
}

function main() {
  logseq.setMainUIInlineStyle({
    zIndex: 11,
  })

  logseq.provideStyle(String.raw`
    @font-face {
      font-family: 'habit-tracker';
      src:  url(${Font}) format('woff');
      font-weight: normal;
      font-style: normal;
      font-display: block;
    }
    i.icon-habit-tracker {
      /* use !important to prevent issues with browser extensions that change fonts */
      font-family: 'habit-tracker' !important;
      speak: never;
      font-style: normal;
      font-weight: normal;
      font-variant: normal;
      text-transform: none;
      line-height: 1;
      font-size: 20px;
    }

    i.icon-habit-tracker:before {
      content: "\e900";
    }
  `)

  logseq.App.registerUIItem('toolbar', {
    key: 'show-habits',
    template: `<a data-on-click="show" title="Habits" class="button">
    <i class="icon-habit-tracker"></i>
    </a>`,
  })

  createApp(App).mount('#app');
}

// bootstrap
logseq.ready(createModel()).then(main);
