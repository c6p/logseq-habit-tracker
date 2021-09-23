import '@logseq/libs';
import { createApp } from 'vue';
import App from './App.vue';
import './index.css'

function createModel() {
  return {
    show() {
      logseq.showMainUI()
    },
  }
}

function main() {
  logseq.setMainUIInlineStyle({
    zIndex: 11,
  })

  const key = logseq.baseInfo.id

  logseq.provideStyle(`
    div[data-injected-ui=show-habits-${key}] {
      font-size: 20px;
      padding: 0.25rem;
      margin: 0 0.25rem;
      border-radius: 3px;
    }
  `)

  logseq.App.registerUIItem('toolbar', {
    key: 'show-habits',
    template: `<a data-on-click="show" title="Habits" class="opacity-60 hover:opacity-100">🗹</a>`,
  })

  createApp(App).mount('#app');
}

// bootstrap
logseq.ready(createModel()).then(main);
