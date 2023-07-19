<template>
  <div id="habit-wrapper" ref="wrap" @click="onClickOutside">
    <div id="habit-tracker" ref="div" v-if="visible" :style="style">
      <div id="toolbar">
        <button @click.stop="toggleSettings" title="Open Settings">⚙️</button>
        <button @click.stop="downloadAsCSV" title="Download habits as CSV">
          🔽
        </button>
      </div>
      <div id="settings" v-show="gear">
        <div>
          <label>Habit marker:
            <input class="m" type="text" :placeholder="defaults.habitText" :value="habitText" @change="(e) => {
              set('habitText', e.target.value);
              updateHabits();
              toLast();
            }
              " /></label>
          <label>Date
            <a href="https://day.js.org/docs/en/display/format" target="_blank"
              title="'\n' adds a new line. View syntax ->">format</a>:
            <input class="s" type="text" :placeholder="defaults.dateFormat" :value="dateFormat"
              @change="(e) => set('dateFormat', e.target.value)" />
          </label>
          <label>Date
            <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/width#syntax" target="_blank"
              title="CSS width property. View syntax ->">width</a>:
            <input type="text" :placeholder="defaults.dateWidth" :value="dateWidth"
              @change="(e) => set('dateWidth', e.target.value)" />
          </label>
        </div>
        <div>
          <label>Habit pattern:
            <input class="l" type="text" :placeholder="defaults.habitPattern" :value="habitPattern" @change="(e) => {
              set('habitPattern', e.target.value);
              updateHabits();
            }
              " /></label>
          <label>Ignore pattern:
            <input class="m" type="text" :placeholder="defaults.ignorePattern" :value="ignorePattern" @change="(e) => {
              set('ignorePattern', e.target.value);
              updateHabits();
            }
              " /></label>
        </div>
        <div>
          <div id="color-groups">
            <label>Color Groups:
              <button @click.stop="addColor()" title="Add Color">
                +
              </button></label>
            <span class="color-group" v-for="(c, i) in colors" :key="i">
              <input type="color" :value="c" title="Set Color" @change="(e) => modifyColor(i, e.target.value)" />
              <button @click.stop="deleteColor(i)" title="Delete Color">
                -
              </button>
            </span>
          </div>
          <label>
            <input type="checkbox" :checked="hideStreak" @change="(e) => set('hideStreak', e.target.checked)" />
            Hide streak
          </label>
        </div>
      </div>
      <table>
        <tr>
          <th v-show="gear">Color<br />Group</th>
          <th v-show="gear">Order</th>
          <th v-show="gear">Hidden</th>
          <th v-show="gear || !hideStreak" class="streak">
            Longest<br />Streak
          </th>
          <th v-show="gear || !hideStreak" class="streak">
            Current<br />Streak
          </th>
          <th v-show="gear">At<br />Most</th>
          <th class="period">Frequency <br />/ Period</th>
          <th>
            Habits <button @click="prev">&lt;</button><button @click="next">&gt;</button>
          </th>
          <th v-for="(d, i) in dates" :key="d" :style="{ width: dateWidth || defaults.dateWidth }" :class="[
            'track',
            ['0', '6'].includes(d.format('d')) ? 'weekend' : '',
          ]" @click="openJournal(i)">
            {{
              d.format(
                (dateFormat || defaults.dateFormat).replaceAll("\\n", "\n")
              )
            }}
          </th>
        </tr>
        <tr v-show="gear || !h.hidden" v-for="(h, idx) in habits" :key="h" :style="{ color: colors[h.color] }">
          <td v-show="gear">
            <select class="color" :value="h.color" @change="(e) => setHabitProp(h, 'color', e.target.value)">
              <option></option>
              <option v-for="(c, i) in colors" :key="i" :style="{ color: c }">
                {{ i }}
              </option>
            </select>
          </td>
          <td v-show="gear">
            <button class="up" @click="move(idx, -1)">&lt;</button>
            <button class="down" @click="move(idx, 1)">&lt;</button>
          </td>
          <td v-show="gear" class="hidden">
            <input type="checkbox" :checked="h.hidden" @change="(e) => setHabitProp(h, 'hidden', e.target.checked)" />
          </td>
          <td v-show="gear || !hideStreak" class="streak">
            {{ h.longestStreak }}
          </td>
          <td v-show="gear || !hideStreak" class="streak">{{ h.streak }}</td>
          <td v-show="gear" class="atmost">
            <input type="checkbox" :checked="h.atmost" @change="(e) => setHabitProp(h, 'atmost', e.target.checked)" />
          </td>
          <td class="period">
            <input type="text" :value="h.periodText" @change="(e) => {
              setHabitProp(h, 'period', e.target.value);
              updateHabits();
            }
              " />
          </td>
          <td class="habit">{{ h.habit }}</td>
          <td v-for="([t, s], i) in track[idx]" :key="i" :class="['track', s]" @click="openJournal(i)">
            {{ t > 0 ? t : "" }}
          </td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
import dayjs from "dayjs";
import advancedFormat from "dayjs/plugin/advancedFormat";
import minMax from "dayjs/plugin/minMax";
dayjs.extend(advancedFormat).extend(minMax);

function toYMD(fromDayjs) {
  return parseInt(fromDayjs.format("YYYYMMDD"));
}
function toDayjs(ymd) {
  const f = Math.floor;
  const [y, ym] = [f(ymd / 10000), f(ymd / 100)];
  return dayjs(new Date(y, ym - y * 100 - 1, ymd - ym * 100)).startOf("day");
}
function getPeriodStart(lastDay, multi, period) {
  return lastDay.subtract(multi, period);
}
function toIndex(day, startDay) {
  return day.diff(startDay, "day");
}
function escapeBackslashes(string) {
  return string.replaceAll("\\", String.raw`\\`);
}
function getPeriod(p) {
  const re = /(?<times>\d+)\s*\/\s*(?<multi>\d+)?(?<timeframe>[dwmy])/;
  const m = re.exec(p.toLowerCase());
  if (m == null) return null;
  const { times, multi = 1, timeframe } = m.groups;
  return { times, multi, timeframe: timeframe === "m" ? "M" : timeframe };
}
function habitSettings(s) {
  return "habits" in s ? s.habits : s; // backwards compatibility
}
function downloadBlob(
  content,
  filename,
  contentType = "text/csv;charset=utf-8;"
) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  a.click();
  a.remove();
}

const today = dayjs().startOf("day");
const days = 14;
const minDate = today.subtract(days - 1, "day");
const [SUCCESS, FAILURE] = ["success", "failure"];

export default {
  name: "App",
  components: {},
  data() {
    return {
      visible: false,
      gear: false,
      style: {},
      defaults: {
        habitText: String.raw`(#|#?(\[\[))habit(\]\])?`,
        habitPattern: String.raw`^([#*]*\s)?(TODO|DONE)?\s*?(?<habit>.*?)(?:| - (?:(?<int>\d*?) times|(?<count>.*?)))$`,
        ignorePattern: String.raw`TODO (.|\n)*`,
        dateFormat: String.raw`D.M\ndd`,
        dateWidth: "3em",
      },
      habitText: "",
      habitPattern: "",
      ignorePattern: "",
      dateFormat: "",
      dateWidth: "",
      hideStreak: false,
      habits: [],
      dates: [],
      dayRange: days,
      minDay: minDate,
      startDay: minDate,
      maxDay: today,
      startIndex: 0,
      colors: [],
    };
  },
  computed: {
    track() {
      const [si, dr] = [this.startIndex, this.dayRange];
      const zip = (a, b) => a.map((k, i) => [k, b[i]]);
      return this.habits.map((habit) => {
        if (si >= 0) {
          const track = habit.track?.slice(si, si + dr) ?? [];
          const result = habit?.result?.slice(si, si + dr) ?? [];
          return zip(
            track.concat(Array(dr - track.length).fill(0)),
            result.concat(Array(dr - result.length).fill(""))
          );
        } else {
          const track = habit.track ?? [];
          const result = habit?.result ?? [];
          return zip(
            Array(-si)
              .fill(0)
              .concat(track ?? Array(dr + si - track.length).fill(0)),
            Array(-si)
              .fill("")
              .concat(result ?? Array(dr + si - result.length).fill(""))
          );
        }
      });
    },
  },
  async mounted() {
    const appUserConfig = await logseq.App.getUserConfigs();
    this.setTheme({ mode: appUserConfig.preferredThemeMode });
    logseq.App.onThemeModeChanged(this.setTheme);

    Object.assign(
      this,
      Object.fromEntries(
        [
          "habitText",
          "habitPattern",
          "ignorePattern",
          "dateFormat",
          "dateWidth",
          "hideStreak",
          "colors",
        ].map((key) => [key, logseq.settings[key]])
      )
    );
    this.colors = this.colors ?? [];

    logseq.on("ui:visible:changed", async ({ visible }) => {
      if (visible) {
        this.visible = visible;
        this.endDay = dayjs().startOf("day");
        await this.updateHabits();
        this.toLast();
      }
    });
  },
  methods: {
    hideMainUI() {
      this.gear = false;
      logseq.hideMainUI();
    },
    setTheme({ mode }) {
      // read theme colors
      const background = mode === "dark" ? "#433f38" : "rgb(255 255 255 / 90%)";
      const color = mode === "dark" ? "#f8f8f8" : "rgb(55, 60, 63)";
      const input = mode === "dark" ? "rgb(47, 52, 55)" : "#fff";
      // try {
      //  const s = getComputedStyle(window.parent.document.documentElement);
      //  background = s.getPropertyValue('--ls-primary-background-color');
      //  color = s.getPropertyValue('--ls-primary-text-color');
      //  input = s.getPropertyValue('--ls-secondary-background-color');
      // } catch (_) { }
      this.style = Object.assign(this.style, {
        "--background": background,
        "--color": color,
        "--input": input,
        "--shadow": mode === "dark" ? "black" : "gray",
        "--red": mode === "dark" ? "#500" : "#ffcccb",
        "--green": mode === "dark" ? "#050" : "#d7ffd9",
      });
    },
    toggleSettings() {
      this.gear = !this.gear;
      if (!this.gear) this.updateHabits();
    },
    onClickOutside({ target }) {
      const inner = target.closest("#habit-tracker");
      if (!inner) {
        this.hideMainUI();
        this.gear = false;
      }
    },
    async openJournal(i) {
      const day = await logseq.DB.datascriptQuery(`
        [:find (pull ?p [:block/name])
         :where [?p :block/journal-day ${toYMD(this.dates[i])}] ] `);
      try {
        logseq.App.pushState("page", { name: day[0][0].name });
        logseq.hideMainUI();
      } catch { }
    },
    async set(key, val) {
      this[key] = val;
      await logseq.updateSettings({ [key]: val });
    },
    async setHabitProp(h, prop, val) {
      h[prop] = val;
      await logseq.updateSettings({ habits: { [h.habit]: { [prop]: val } } });
    },
    async getHabits() {
      const s = logseq.settings;
      const re = new RegExp(
        this.habitPattern || this.defaults.habitPattern,
        "m"
      );
      const habitText = this.habitText || this.defaults.habitText;
      const habitMarker = escapeBackslashes(habitText);
      const reText = new RegExp(habitText);
      const ignorePattern = this.ignorePattern || this.defaults.ignorePattern;
      const query =
        `:where
         [?b :block/page ?page]
         [?page :block/journal?]
         [?page :block/journal-day ?d]
         [(re-pattern "(?s) *?${habitMarker} *?\\n?(:PROPERTIES:.*?:END:\\n)?") ?pre]
         (or-join [?b ?pre]
          (and [?b :block/parent ?p]
               [?p :block/content ?pc]
               [(re-matches ?pre ?pc)])
          (and [?b :block/content ?c]
               [(re-pattern "(^| )${habitMarker}( |$)") ?re]
               [(re-find ?re ?c)]
               (not [(re-matches ?pre ?c)])
               ) )` +
        (ignorePattern
          ? `(not-join [?b]
          [?b :block/content ?c]
          [(re-pattern "${ignorePattern}\\n?") ?ire]
          [(re-matches ?ire ?c)] )`
          : "");
      const H = {};
      const start = await logseq.DB.datascriptQuery(
        `[:find (min ?d) ${query}]`
      );
      if (!start || start.length === 0) {
        this.minDay = minDate;
        return H;
      }
      this.minDay = toDayjs(start[0]);
      const habits = await logseq.DB.datascriptQuery(
        `[:find (pull ?b [:block/content {:block/page [:block/journal-day]}]) ${query} ]`
      );
      this.minDayToCheck = Object.values(habitSettings(s)).reduce((p, h) => {
        if (!h?.period) return this.minDay;
        const { multi, timeframe } = getPeriod(h.period);
        return dayjs.min(p, getPeriodStart(this.minDay, multi, timeframe));
      }, this.minDay);

      const dayRange = this.maxDay.diff(this.minDayToCheck, "day") + 1;
      for (const h of habits) {
        const match = re.exec(h[0].content);
        if (!match) continue;
        let { habit, count, int } = match.groups;
        habit = habit.replace(reText, "").trim();
        count =
          typeof count !== "undefined"
            ? count.split(",").length
            : typeof int !== "undefined"
              ? parseInt(int)
              : 1;
        const t = habitSettings(s)[habit];
        H[habit] = H[habit] || {
          habit,
          track: Array(dayRange).fill(0),
          period: t?.period ? getPeriod(t.period) : null,
          periodText: t ? t.period : "",
          hidden: t?.hidden,
          atmost: t?.atmost,
          order: t?.order,
          color: t?.color,
        };
        H[habit].track[
          toIndex(toDayjs(h[0].page["journal-day"]), this.minDayToCheck)
        ] += count;
      }

      return H;
    },
    async addColor() {
      this.colors.push("#cccccc");
      await this.setColors();
    },
    async deleteColor(i) {
      this.habits.map(async (h) => {
        if (h.color > i) await this.setHabitProp(h, "color", --h.color);
        else if (h.color === i) {
          await this.setHabitProp(h, "color", (h.color = undefined));
        }
      });
      this.colors.splice(i, 1);
      await this.setColors();
    },
    async modifyColor(i, color) {
      this.colors[i] = color;
      await this.setColors();
    },
    async setColors() {
      await logseq.updateSettings({ colors: null });
      await logseq.updateSettings({ colors: Array.from(this.colors) });
    },
    async move(from, delta) {
      const to = from + delta;
      if (to < 0) return;
      if (to > this.habits.length - 1) return;
      const tmp = this.habits[from];
      this.habits[from] = this.habits[to];
      this.habits[to] = tmp;
      await this.setHabitProp(this.habits[from], "order", from);
      await this.setHabitProp(this.habits[to], "order", to);
    },
    prev() {
      this.startDay = dayjs.min(
        this.startDay,
        dayjs.max(this.startDay.subtract(this.dayRange, "day"), this.minDay)
      );
      this.update();
    },
    next() {
      const endDay = dayjs.min(
        this.startDay.add(2 * this.dayRange - 1, "day"),
        this.maxDay
      );
      this.startDay = endDay.subtract(this.dayRange - 1, "day");
      this.update();
    },
    toLast() {
      this.startDay = dayjs.max(
        this.maxDay.subtract(this.dayRange - 1, "day"),
        this.minDay
      );
      this.update();
    },
    update() {
      this.startIndex = toIndex(this.startDay, this.minDayToCheck);
      this.dates = [...Array(this.dayRange)].map((_, i) =>
        this.startDay.add(i, "d")
      );
    },
    async updateHabits() {
      const habits = await this.getHabits();
      for (const h of Object.values(habits)) {
        if (h.period != null) {
          const { times, multi, timeframe } = h.period;
          // check previous habit performance
          h.result = h.track.map((_, i) => {
            const count = h.track
              .slice(
                getPeriodStart(
                  this.minDayToCheck.add(i + 1, "day"),
                  multi,
                  timeframe
                ).diff(this.minDayToCheck, "day"),
                i + 1
              )
              .reduce((a, b) => a + b, 0);
            return (h.atmost ? times >= count : times <= count)
              ? SUCCESS
              : FAILURE;
          });
          h.streak = h.longestStreak = 0;
          for (const v of h.result) {
            if (v === SUCCESS) h.streak++;
            else {
              h.longestStreak = Math.max(h.longestStreak, h.streak);
              h.streak = 0;
            }
          }
          h.longestStreak = Math.max(h.longestStreak, h.streak);
        }
      }
      this.habits = Object.values(habits).sort(
        (a, b) => a?.order - b?.order || 0
      );
      this.update();
    },
    async downloadAsCSV() {
      let csv = `\ufeffDate,${this.habits.map((h) => h.habit).join(",")}\r\n`; // utf-8 hack
      const end = toIndex(this.maxDay, this.minDayToCheck);
      for (let i = toIndex(this.minDay, this.minDayToCheck); i <= end; i++) {
        csv += `${this.minDayToCheck
          .add(i, "d")
          .format("YYYY-MM-DD")},${this.habits
            .map((h) => h.track[i])
            .join(",")}\r\n`;
      }
      downloadBlob(csv, "habits.csv", "text/csv;charset=utf-8;");
    },
  },
};
</script>
