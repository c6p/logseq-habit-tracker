<template>
  <div id="habit-wrapper" ref="wrap" @click="onClickOutside">
    <div id="habit-tracker" ref="div" v-if="visible" :style="style">
      <button id="gear" @click="toggleSettings">⚙️</button>
      <div id="settings" v-show="gear">
        <div>
          <label>Habit marker: <input type="text" :placeholder="defaults.habitText" :value="habitText" @change="(e)=>set('habitText', e.target.value)" /></label>
          <label>Habit pattern: <input type="text" :placeholder="defaults.habitPattern" :value="habitPattern" @change="(e)=>set('habitPattern', e.target.value)" /></label>
        </div>
        <div>
          <label>Date <a href="https://day.js.org/docs/en/display/format" target="_blank" title="'\n' adds a new line. View syntax ->">format</a>:
            <input type="text" :placeholder="defaults.dateFormat" :value="dateFormat" @change="(e)=>set('dateFormat', e.target.value)" />
          </label>
          <label>Date <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/width#syntax" target="_blank" title="CSS width property. View syntax ->">width</a>:
            <input type="text" :placeholder="defaults.dateWidth" :value="dateWidth" @change="(e)=>{style.left=0; set('dateWidth', e.target.value)}" />
          </label>
        </div>
      </div>
      <table>
        <tr>
          <th v-show="gear">Hidden</th>
          <th class="period">Frequency <br>/ Period</th>
          <th>Habits <button @click="prev">&lt;</button><button @click="next">&gt;</button></th>
          <th v-for="(d,i) in dates" :key="d" :style="{width: dateWidth || defaults.dateWidth}" :class="['track', ['0','6'].includes(d.format('d')) ? 'weekend' : '']" @click="openJournal(i)">
            {{ d.format((dateFormat || defaults.dateFormat).replaceAll('\\n', '\n')) }}
          </th>
        </tr>
        <tr v-show="gear || !h.hidden" v-for="h in habits" :key="h">
          <td v-show="gear" class="hidden"><input type="checkbox" :checked="h.hidden" @change="(e)=>setHabitProp(h, 'hidden', e.target.checked)"/></td>
          <td class="period"><input type="text" :value="h.periodText" @change="(e)=>setHabitProp(h, 'period', e.target.value)"/></td>
          <td class="habit">{{ h.habit }}</td>
          <td v-for="(v,i) in h.track" :key="v" :class="['track', 'result' in h ? h.result[i] : '']" @click="openJournal(i)">
            {{ v > 0 ? v : "" }}
          </td>
        </tr>
      </table>  
    </div>
  </div>  
</template>

<script>
import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import minMax from 'dayjs/plugin/minMax'
dayjs.extend(advancedFormat).extend(minMax);

function toYMD(fromDayjs) {
  return parseInt(fromDayjs.format('YYYYMMDD'));
}
function toDayjs(ymd) {
  const f = Math.floor;
  const [y, ym] = [f(ymd/10000), f(ymd/100)]
  return dayjs(new Date(y, ym-y*100-1, ymd-ym*100));
}
function getPeriodStart(lastDay, multi, period) {
  return lastDay.subtract(multi, period);
}
function toIndex(ymd, startDay) {
  return toDayjs(ymd).diff(startDay, 'day');
}
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&');
}

export default {
  name: 'App',
  components: {},
  data () {
    return {
      visible: false,
      gear: false,
      style: { left: '25px' },
      defaults:  {
        habitText: "#habit",
        habitPattern: String.raw`^(?<habit>.*?)(?:| - (?<count>.*?))$`,
        dateFormat: String.raw`D.M\ndd`,
        dateWidth: "2em",
      },
      habitText: "",
      habitPattern: "",
      dateFormat: "",
      dateWidth: "",
      habits: [],
      dates: [],
      dayRange: 14,
      endDay: dayjs()
    }
  },
  async mounted () {
    const appUserConfig = await logseq.App.getUserConfigs();
    this.setTheme({mode: appUserConfig.preferredThemeMode});
    logseq.App.onThemeModeChanged(this.setTheme);
    logseq.on('settings:changed', (_) => { this.update() })
    logseq.on('ui:visible:changed', ({ visible }) => {
      if (visible) {
        this.visible = visible;
        this.endDay = dayjs();
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
      let background = mode === 'dark' ? '#433f38' : 'rgb(255 255 255 / 90%)';
      let color = mode === 'dark' ? '#f8f8f8' : 'rgb(55, 60, 63)';
      let input = mode === 'dark' ? 'rgb(47, 52, 55)' : '#fff';
      try {
        const s = getComputedStyle(window.parent.document.documentElement);
        background = s.getPropertyValue('--ls-primary-background-color');
        color = s.getPropertyValue('--ls-primary-text-color');
        input = s.getPropertyValue('--ls-secondary-background-color');
      } catch (_) { }
      this.style = Object.assign(this.style, {
        '--background': background,
        '--color': color,
        '--input': input,
        '--shadow': mode === 'dark' ? 'black' : 'gray',
        '--red': mode === 'dark' ? '#500' : '#ffcccb',
        '--green': mode === 'dark' ? '#050' : '#d7ffd9',
      }) 
    },
    toggleSettings() {
      this.style.left = '25px';
      this.gear = !this.gear;
      this.$nextTick(this.setLeftPosition)
    },
    setLeftPosition() {
      const {width} = this.$refs.div.getBoundingClientRect();
      const {left} = this.$refs.wrap.dataset;
      this.style = Object.assign(this.style, { left: Math.max(25, Math.min(window.innerWidth - width, left - width/2)) + 'px' });
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
         :where [?p :block/journal-day ${toYMD(this.dates[i])}] ] `)
      try {
        logseq.App.pushState('page', { name: day[0][0].name });
        logseq.hideMainUI();
      } catch { }
    },
    async set(key,val) {
      await logseq.updateSettings({[key]: val})
    },
    async setHabitProp(h,prop,val) {
      await logseq.updateSettings({habits: {[h.habit]: {[prop]: val}} })
    },
    getPeriod(p) {
      const re = /(?<times>\d+)\s*\/\s*(?<multi>\d+)?(?<timeframe>[dwmy])/;
      const m = re.exec(p);
      if (m == null)
        return null;
      const {times, multi=1, timeframe} = m.groups;
      return {times, multi, timeframe: timeframe==='m' ? 'M' : timeframe};
    },
    getPeriodText(p) {
      return `${p.times} / ${p.multi > 1 ? p.multi : ''}${p.timeframe}`;
    },
    async getHabits(startDay, end) {
      const s = logseq.settings;
      const start = toYMD(startDay);
      const re = new RegExp(this.habitPattern || this.defaults.habitPattern, 'm');
      const habitText = this.habitText || this.defaults.habitText;
      const habitPattern = escapeRegExp(habitText);
      const habits = await logseq.DB.datascriptQuery(`
        [:find (pull ?b [:block/content {:block/page [:block/journal-day]}])
         :where
         (or-join [?b]
          (and [?b :block/parent ?p]
               [?p :block/content ?pc]
               [(re-pattern " *?${habitPattern} *?\\n?") ?pre]
               [(re-matches ?pre ?pc)])
          (and [?b :block/content ?c]
               [(re-pattern "(^| )${habitPattern}( |$)") ?re]
               [(re-find ?re ?c)]
               [(re-pattern " *?${habitPattern} *?\\n?") ?pre]
               (not [(re-matches ?pre ?c)])) )
         [?b :block/page ?page]
         [?page :block/journal?]
         [?page :block/journal-day ?d]
         [(> ?d ${start})]
         [(<= ?d ${end})]
        ]
      `);
      let H = {};
      for (const h of habits) {
        const match = re.exec(h[0].content);
        if (!match)
          continue
        let {habit,count} = match.groups;
        habit = habit.replace(habitText, '').trim();
        count = typeof count !== 'undefined' ? count.split(',').length : 1;
        const t = 'habits' in s ? s.habits[habit] : s[habit]; // backwards compatibility
        H[habit] = H[habit] || {
          habit,
          track: Array(this.dayRange).fill(0),
          period: t?.period ? this.getPeriod(t.period) : null,
          periodText: t ? t.period : "",
          hidden: t?.hidden,
        };
        H[habit].track[toIndex(h[0].page['journal-day'], startDay)] += count;
      } 
      return H;
    },
    async prev() {
      this.endDay = this.endDay.subtract(this.dayRange, 'day');
      this.update()
    },
    async next() {
      this.endDay = this.endDay.add(this.dayRange, 'day');
      this.update()
    },
    async update () {
      const s = logseq.settings;
      this.habitText = s.habitText;
      this.habitPattern = s.habitPattern;
      this.dateFormat = s.dateFormat;
      this.dateWidth = s.dateWidth;
      const startDay = this.endDay.subtract(this.dayRange, 'day');
      this.dates = [...Array(this.dayRange)].map((_,i) => startDay.add(i+1,'d'));

      const end = toYMD(this.endDay)
      let habits = await this.getHabits(startDay, end)

      const oldestDay = dayjs.min(Object.values(habits).map(function(h) {
        const p = h.period;
        return p != null ? getPeriodStart(startDay, p.multi, p.timeframe) : startDay;
      }));
      if (oldestDay !== null) {
        const offset = startDay.diff(oldestDay, 'day');
        const check = await this.getHabits(oldestDay, end);
        for (let h of Object.values(habits)) {
          const c = check[h.habit];
          if (h.period != null) {
            const {times, multi, timeframe} = h.period;
            // check previous habit performance
            h.result = h.track.map((_,i) => {
              return times <= c.track.slice(getPeriodStart(startDay.add(i+1, 'day'), multi, timeframe).diff(oldestDay, 'day'), offset+i+1).reduce((a, b) => a + b, 0)
                ? "success"
                : "failure";
              }
            );
          }
        }
      }
      
      this.habits = Object.values(habits);
      
      this.$nextTick(this.setLeftPosition)
    }
  },
}
</script>
