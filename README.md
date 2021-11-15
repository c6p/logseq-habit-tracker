# Logseq Habit Tracker
![image](https://user-images.githubusercontent.com/80478/141788606-44566dfe-bbf7-4272-a3ea-5a9a48eba313.png)
![image](https://user-images.githubusercontent.com/80478/141792679-3c164eab-be20-4c2f-a4fe-757676c3b4c7.png)

Record your habits under `#habit` block in daily journal, then easily track your habits.

Click on gear (⚙️) icon to edit settings.
* **Habit marker** is a keyword to match habits: `#habit`, it was `Habits` before v0.2.0
* **Habit pattern** is the [regex](https://regex101.com/) to parse habits. See [Customization](#customization) for more examples.  
  Default format is `Habit text - 1,2,3` and you can add notes after a new line. 
  `^(?<habit>.*?)(?:| - (?<count>.*?))$`  
  * **habit** is the identifier for the habit and
  * **count** is comma separated list of things (e.g. numbers, time)
* **Date [format](https://day.js.org/docs/en/display/format)**: `D.M\ndd` where `\n` is new line.
* **Date [width](https://developer.mozilla.org/en-US/docs/Web/CSS/width#syntax)**: `2em`


For `Frequency / Period`, period is one of `d` (day), `w` (week), `m` (month), `y` (year).
- `3/d` means 3 times per day
- `4/2w` means 4 times in 2 weeks

### Customization

Instead of nesting under `#habit` tag you can also use it in every line and change the format to suit your needs.

#### Example 1

```
14:10 pushups #habit
14:11 #habit drink water
```
Habit Pattern: `\d{2}:\d{2} (?<habit>.*)`

##### Example 1a
With optional time and notes. Thanks @someinternetguy
```
pushups #habit
pushups #habit did 10 more than usual today, go me!
14:17 pushups #habit
14:17 pushups #habit yay, I remembered to work out today!
```
Habit pattern: `((\d{2}:\d{2})|())(?<habit>.*#habit(\s|\b))`


### Running the Plugin

- `yarn && yarn build` in terminal to install dependencies.
- `Load unpacked plugin` in Logseq Desktop client.
