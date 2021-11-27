import '@logseq/libs';
import { createApp } from 'vue';
import App from './App.vue';
import './index.css'

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

  logseq.provideStyle(`
    div[data-injected-ui=show-habits--${logseq.baseInfo.id}] {
      font-size: 20px;
      padding-top: 3px;
    }
  `)

  logseq.App.registerUIItem('toolbar', {
    key: 'show-habits',
    template: `<a data-on-click="show" title="Habits" class="button">🗹</a>`,
  })

  createApp(App).mount('#app');
}

// bootstrap
logseq.ready(createModel()).then(main);
