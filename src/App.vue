<template>
  <div id="wrapper" @click="onClickOutside">
    <div id="habits-tracker" v-if="visible">
      <!--<Settings id="settings" v-show="settings" @hideSettings="settings=false"/>-->
      <div v-show="!settings">
        <!--<button id="gear" @click="settings=true">⚙️</button>-->
        <table>
          <!--<tr><th></th><th v-for="d in dates" :key="d">{{ d }}</th></tr>
          <tr><th></th><th v-for="d in days" :key="d">{{ d }}</th></tr>-->
          <tr v-for="h in habits" :key="h">
            <td>{{ h.title }}</td>
            <td v-for="v in h.track" :key="v">{{ v > 0 ? v : "." }}</td>
          </tr>
        </table>  
      </div>
    </div>
  </div>  
</template>

<script>
//import Settings from "./Settings.vue"

export default {
  name: 'App',
  components: {},
  data () {
    return {
      visible: false,
      settings: false,
      habits: []
    }
  },
  mounted () {
    logseq.on('settings:changed', (s) => { this.update() })
    logseq.once('ui:visible:changed', ({ visible }) => {
      visible && (this.visible = true)
      this.update()
    })
  },
  methods: {
    hideMainUI() {
      this.settings = false;
      logseq.hideMainUI()
    },
    onClickOutside ({ target }) {
      const inner = target.closest('#habit-tracker')
      !inner && this.hideMainUI()
    },
    async update () {
      //const s = logseq.settings;
      const anchor = "Habits_Test"
      const date = new Date();
      const today = date.getFullYear() * 10000 + (date.getMonth()+1) * 100 + date.getDate();
      const [start, end] = [today-14, today]; // TODO start-maxPeriod to check habit success, else first ever habit block
      const habits = await logseq.DB.datascriptQuery(`
        [:find (pull ?b [:block/content {:block/page [:block/journal-day]}])
         :where
         [?b :block/parent ?p]
         [?p :block/anchor "${anchor}"]
         [?p :block/page ?page]
         [?page :block/journal?]
         [?page :block/journal-day ?d]
         [(> ?d ${start})]
         [(<= ?d ${end})]
        ]
      `);
      let H = {};
      for (const h of habits) {
        const [title, times] = h[0].content.split('\n')[0].split(' - ').map(x => x.trim());
        const count = times.split(',').length;
        H[title] = H[title] || {title, track: Array(end-start).fill(0)};
        console.warn(title, h[0].page['journal-day']-start, count)
        H[title].track[h[0].page['journal-day']-start] = count;
      } 
      this.habits = Object.values(H);
      console.warn(H, this.habits)
    }
  },
}
</script>
