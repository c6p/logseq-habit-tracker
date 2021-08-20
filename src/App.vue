<template>
  <div id="wrapper" @click="onClickOutside" :style="colors">
    <div id="habit-tracker" v-if="visible" ref="div" :style="{left: left+'px'}">
      <button id="gear" @click="gear=!gear">⚙️</button>
      <div id="settings" v-show="gear">
        <label>Block content: <input type="text" :value="habitText" @change="setHabitText" /></label>
      </div>
      <table>
        <tr><th v-show="gear">Hidden</th><th>Frequency / Period</th><th>Habits</th><th v-for="d in dates" :key="d">{{ d }}</th></tr>
        <tr v-show="gear || !h.hidden" v-for="h in habits" :key="h">
          <td v-show="gear"><input type="checkbox" :checked="h.hidden" @change="(e)=>setHidden(h,e)"/></td>
          <td class="period"><input type="text" :value="h.periodText" @change="(e)=>setPeriod(h,e)"/></td>
          <td>{{ h.title }}</td>
          <td v-for="(v,i) in h.track" :key="v" :class="['habit', 'result' in h ? h.result[i] : '']" @click="openJournal(i)">{{ v > 0 ? v : "" }}</td>
        </tr>
      </table>  
    </div>
  </div>  
</template>

<script>
import dayjs from 'dayjs'

function toInt(fromDayjs) {
  return parseInt(fromDayjs.format('YYYYMMDD'));
}
function toDayjs(ymd) {
  const f = Math.floor;
  const [y, ym] = [f(ymd/10000), f(ymd/100)]
  return dayjs(new Date(y, ym-y*100-1, ymd-ym*100));
}
function getPeriodStart(last, multi, period) {
  return toInt(toDayjs(last).subtract(multi, period.toLowerCase()));
}

export default {
  name: 'App',
  components: {},
  data () {
    return {
      visible: false,
      gear: false,
      habitText: "Habits",
      habits: [],
      dayRange: 14,
      start: 0,
      dates: [],
      colors: {},
      left: 0,
    }
  },
  async mounted () {
    const appUserConfig = await logseq.App.getUserConfigs();
    console.warn(appUserConfig);
    this.setTheme({mode: appUserConfig.preferredThemeMode});
    logseq.App.onThemeModeChanged(this.setTheme);
    logseq.on('settings:changed', (_) => { this.update() })
    logseq.on('ui:visible:changed', ({ visible }) => {
      if (visible) {
        this.visible = visible;
        this.update();
      }
    })
  },
  methods: {
    hideMainUI() {
      this.gear = false;
      logseq.hideMainUI()
    },
    setTheme({mode}) {
      // read theme colors
      const s = getComputedStyle(window.parent.document.documentElement);
      this.colors = {
        '--background': s.getPropertyValue('--ls-primary-background-color'),
        '--color': s.getPropertyValue('--ls-primary-text-color'),
        '--input': s.getPropertyValue('--ls-secondary-background-color'),
        '--shadow': mode === 'dark' ? 'black' : 'gray',
        '--red': mode === 'dark' ? '#500' : '#ffcccb',
        '--green': mode === 'dark' ? '#050' : '#d7ffd9',
      } 
    },
    setLeftPosition() {
      const id = logseq.baseInfo.id;
      const el = top.document.querySelector(`div[data-injected-ui=show-habits-${id}]`);
      const {width} = this.$refs.div.getBoundingClientRect();
      const {left} = el.getBoundingClientRect();
      console.warn(window.innerWidth, width, left)
      this.left = Math.min(window.innerWidth - width, left - width/2);
    },
    onClickOutside ({ target }) {
      const inner = target.closest('#habit-tracker')
      if (!inner) {
        this.hideMainUI();
        this.gear = false;
      }
    },
    async openJournal(i) {
      const day = await logseq.DB.datascriptQuery(`
        [:find (pull ?p [:block/name])
         :where [?p :block/journal-day ${this.start + i + 1}] ] `)
      try {
        logseq.App.pushState('page', { name: day[0][0].name });
        logseq.hideMainUI();
      } catch { }
    },
    async setHabitText(e) {
      await logseq.updateSettings({"habitText": e.target.value})
    },
    async setHidden(h,e) {
      await logseq.updateSettings({[h.title]: {hidden: e.target.checked}})
    },
    async setPeriod(h,e) {
      await logseq.updateSettings({[h.title]: {period: e.target.value}})
    },
    getPeriod(p) {
      const re = /(?<times>\d+)\s*\/\s*(?<multi>\d+)?(?<timeframe>[dwmy])/;
      const m = re.exec(p);
      if (m == null)
        return null;
      const {times, multi=1, timeframe} = m.groups;
      return {times, multi, timeframe};
    },
    getPeriodText(p) {
      return `${p.times} / ${p.multi > 1 ? p.multi : ''}${p.timeframe}`;
    },
    async getHabits(start, end) {
      const s = logseq.settings;
      const habits = await logseq.DB.datascriptQuery(`
        [:find (pull ?b [:block/content {:block/page [:block/journal-day]}])
         :where
         [?b :block/parent ?p]
         [?p :block/content ?c]
         [(re-pattern "${this.habitText}\\n?") ?re]
         [(re-matches ?re ?c)]
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
        if (!title)
          continue
        const count = typeof times !== 'undefined' ? times.split(',').length : 1;
        const t = s[title];
        H[title] = H[title] || {
          title,
          track: Array(end-start).fill(0),
          period: t?.period ? this.getPeriod(t.period) : null,
          periodText: t ? t.period : "",
          hidden: t?.hidden,
        };
        H[title].track[h[0].page['journal-day']-start-1] = count;
      } 
      return H;
    },
    async update () {
      const s = logseq.settings;
      this.habitText = s.habitText;
      if (!this.habitText)
        return;
      const startDay = dayjs().subtract(this.dayRange, 'day');
      this.dates = [...Array(this.dayRange)].map((_,i) => startDay.add(i+1,'d').format('D.M'));

      const end = toInt(dayjs())
      const start = toInt(startDay);
      let habits = await this.getHabits(start, end)

      const oldest = Math.min.apply(Math, Object.values(habits).map(function(h) {
        const p = h.period;
        return p != null ? getPeriodStart(start, p.multi, p.timeframe) : start;
      }));
      const offset = start - oldest;
      const check = await this.getHabits(oldest, end);
      for (let h of Object.values(habits)) {
        const c = check[h.title];
        if (h.period != null) {
          const {times, multi, timeframe} = h.period;
          // check previous habit performance
          h.result = h.track.map((_,i) => {
            return times <= c.track.slice(getPeriodStart(start+i+1, multi, timeframe)-oldest, offset+i+1).reduce((a, b) => a + b, 0)
              ? "success"
              : "failure";
            }
          );
        }
      }
      
      this.start = start;
      this.habits = Object.values(habits);
      
      this.$nextTick(function() {
        this.setLeftPosition();
      })
    }
  },
}
</script>
