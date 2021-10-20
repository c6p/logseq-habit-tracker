# Logseq Habit Tracker
![habit1](https://user-images.githubusercontent.com/80478/129489611-65f5fc2d-88e0-4479-85f1-1a49846a2491.jpg)
![habits2](https://user-images.githubusercontent.com/80478/129489612-2809f4c3-47f5-4070-8c18-ba830fc79c54.jpg)

Record your habits under `#habit` block in daily journal, then easily track your habits.

Habit format is `Habit text - 1,2,3` and you can add notes after a new line.  
Default pattern to match it is `^(?<habit>.*?)(?:| - (?<count>.*?))$` where:
* **habit** is the identifier for the habit and
* **count** is comma separated list of things (e.g. numbers, time).

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

### Running the Plugin

- `yarn && yarn build` in terminal to install dependencies.
- `Load unpacked plugin` in Logseq Desktop client.
