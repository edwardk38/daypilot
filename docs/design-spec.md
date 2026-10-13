# Design spec

The app opens on one thing: the next step that fits your energy today. Ideas go into a no-questions Dump and get sorted later; deadlines get guaranteed room while interest decides the order of everything else; missed steps slide back to Later without penalty; and every step, on any day, moves you across the map. This spec turns Ed's requirements and the User research tab into concrete screens and rules.

## Screens

Five tabs, with Now as home. Mockups live on the [Key screens canvas](https://claude.ai/artifact/R9oMWHtUNJKBQNxoszvJTK).

| Tab | Job | What's on it |
| --- | --- | --- |
| Now (home) | Show the next step and where you are | Energy check-in; a "You're in Panama" map with a short Fly next board; one next-step card with its miles and Start; Not feeling it, Swap, Not now |
| Dump | Capture with zero effort, sort later | One box and voice; the app guesses type, size and due date; optional dread rating; habits tagged with how often; Clean-up mode for sorting on higher-energy days |
| Plan | See the day and the calendar | Everything due or planned today; fixed events like classes, dinners and tests; Day, Week and Month views. Events are added through Dump |
| Goals | Track long-term goals and habits | Goals as checkpoint routes with hours invested; Habits with weekly target, last 30 days, lifetime total and status tier |
| Journey | The reward | Map with real country shapes and a departure board; Passport stamp book by continent, with flags |

## Capture and clean-up

Capturing must never require a decision. Typing "bio essay due friday" is a complete entry.

- **At capture:** one box, optional voice. The app reads what it can (a date, "essay" as a task type) and makes a rough guess at size. Nothing else is asked.
- **Automatic sorting:** each item gets a suggested type (task, idea, goal, habit, event), a size estimate and a due date if one was mentioned. Suggestions are labeled as guesses and are easy to correct.
- **Elaboration only when needed:** if an item is too vague to plan ("fix my life"), the app saves it anyway and asks one or two short questions later, in Clean-up, never at capture.
- **Clean-up mode:** a stack of cards, one at a time, for days with more energy. Each card shows the app's guesses with three choices: looks right, tweak, set aside. A few minutes clears the pile.
- **Unsorted items are never lost.** Anything left unsorted still appears in Dump; it just doesn't get scheduled until it's clear enough.

## Now/Later and priority

The app runs on two lists, Now and Later, not a rigid timeline. Only true fixed events (a class, a dinner) have set times; everything else floats.

**When a step gets dropped.** If you leave a step half done or skip it, it moves back to Later with a "resume" marker showing where you stopped. No red text, no overdue count, no broken chain. The next time you open Now, the app simply offers the best step for that moment.

**How the app picks the next step.** Three signals, in this order:

1. **Must-dos get guaranteed room.** Anything with a real deadline gets a protected slot early enough to finish, sized to how long it should take.
2. **Energy fit.** On low days, the app offers small steps first (see Energy modes).
3. **Interest decides the rest.** Among steps that fit, the one you're most likely to enjoy comes first.

**Getting urgent-but-boring things done.** The app pairs them with something you want, a technique called temptation bundling. In the original study, people who could only listen to a gripping audiobook at the gym went 51% more often at first ([Milkman et al., 2014](https://siliconcanals.com/t-gym-audiobooks-temptation-bundling-trial/)). In the app, this takes two forms:

- **Pair it:** while doing the boring step, enjoy something you've set aside for that (a playlist, a podcast, a favorite study spot).
- **Earn it:** finishing the boring step unlocks the interesting one next, so interest becomes the reward rather than the distraction.

The study's effect faded after a holiday break disrupted routines ([Ness Labs](https://nesslabs.com/temptation-bundling)), so the app should suggest fresh pairings over time rather than assuming one will keep working.

**Deadline backstop.** Flexibility can't mean a real deadline slips forever. Within a set window before a deadline, the task is pinned to the top of Now: it can be shrunk but not swapped away. After a couple of "Not now"s, the app asks one question (too big, too unclear, or too intimidating?) and offers the matching fix: a smaller step, one clarifying question, or a script for a scary message. The step on screen keeps shrinking until it is almost too small to refuse.

## Energy modes

Once a day, Now asks one question: how's your energy? Three answers reshape the day. The names are placeholders.

| Mode | What the day looks like | Goal for the day |
| --- | --- | --- |
| Peak | Bigger, harder steps first; a Clean-up session offered; the planner fills more of the day | Make real progress on goals |
| Steady | The normal plan | Keep moving |
| Low | A "minimum day": 1 to 3 small steps, any truly urgent must-do shrunk to its smallest useful piece, plus a recharge block | End the day having done something |

**Low days still count.** Every step earns miles on any day, and the end-of-day recap lists what got done, so a low day reads as "you did 2 things" rather than "you missed 6." Everything that didn't fit moves to Later without comment.

**Recharge blocks.** On low and steady days, the planner offers a short recharge activity, chosen by the user from a menu. Two options have research behind them:

- **A short bout of exercise or a brisk walk.** A 2026 meta-analysis of adults with ADHD found single exercise sessions had a moderate positive effect on inhibitory control and a small benefit for core symptoms, while calling the evidence preliminary ([Meta-analysis, 2026](https://pubmed.ncbi.nlm.nih.gov/41638541/)).
- **Time outside in green space.** In a national study of children with ADHD, activities done in green outdoor settings reduced symptoms more than the same activities done indoors or in built settings ([Kuo & Faber Taylor, 2004](https://www.sciencedaily.com/releases/2004/08/040830082535.htm)). This evidence is mostly from children, so the app frames it as worth trying rather than proven for adults.

Other options on the menu, like a few minutes of meditation, music or a snack break, are offered as the user's own choices without claims attached. The app never presents any recharge activity as treatment.

## Mood starters

Waiting to feel like it rarely works; starting small usually comes first and the mood follows. Therapists call this principle "action precedes motivation" and use it in behavioral activation, a well-studied approach for low mood ([Simply Psychology](https://www.simplypsychology.com/articles/behavioral-activation-depression)). The app borrows the principle, not the therapy.

Every Now card has a **Not feeling it** button. It offers two or three starters, rotating so they stay fresh:

| Starter | What the app does | Why it might help |
| --- | --- | --- |
| Five-minute promise | Starts a 5-minute timer with permission to stop when it ends | Shrinks the commitment so starting is easy |
| Smaller step | Breaks the current step down one level further | The step was still too big (see User research) |
| Pair it | Suggests the user's chosen pairing: a playlist, podcast or favorite spot | Temptation bundling, above |
| Make it a game | Races a timer or sets a mini challenge ("3 paragraphs before the song ends") | Adds challenge and urgency |
| Change the scene | Suggests moving somewhere new for this step | Adds novelty |
| Why this matters | Shows the user's own worth-it answer for the goal | Reconnects the task to its value |
| Work alongside someone | Suggests messaging a friend or opening a study-with-me video | Accountability helped many adults in the 35-study review |
| Not today | Moves the step to Later, no penalty | Sometimes the right call |

The app learns which starters a user actually uses and offers those more often.

**Care note.** If a user reports low energy most days for several weeks, the app should gently mention that talking to a doctor or counselor can help, once, without pressure. A productivity app shouldn't stay silent if it's seeing a pattern that might need more than productivity tools.

## Kinds of low and recharges

Fatigue is common in adult ADHD: 62% of adults in one clinic sample met criteria for significant fatigue ([Rogers et al., 2017](https://bpspsychub.onlinelibrary.wiley.com/doi/abs/10.1111/bjc.12119)), and a late-running body clock affects an estimated 73–78% ([Bijlenga et al., 2019](https://link.springer.com/article/10.1007/s12402-018-0271-z)). Low energy is not one thing, so "Not feeling it" and low-energy mode both start with one tap: what kind of low is it?

| Kind of low | First suggestions | Why |
| --- | --- | --- |
| Sleepy | Walk outside, quick exercise, a 10–20 minute nap with an alarm | Movement and light wake you up; a 10-minute nap gave immediate gains with no grogginess ([Brooks & Lack, 2006](https://pubmed.ncbi.nlm.nih.gov/16796222/)) |
| Drained | The smallest possible step, then a real break; water and a real snack | Spends the least effort. Sugar raised fatigue within an hour across 31 studies ([Mantantzis et al., 2019](https://www.sciencedaily.com/releases/2019/04/190404104345.htm)), so candy is never suggested |
| Bored | Novelty, a challenge, music, a new spot | Adds interest instead of effort |
| Overwhelmed | Cyclic sighing for 5 minutes, or meditation | Calming: breathwork improved mood more than mindfulness meditation ([Balban et al., 2023](https://medicalxpress.com/news/2023-01-cyclic-technique-effective-stress-mindfulness.html)) |
| Low mood | Something gentle; reaching out to someone | Accountability from others helped many adults (User research); the care note still applies |

**Rules**

- **Timing.** Naps are offered only before mid-afternoon, so they don't push a late bedtime later. Caffeine gets a gentle "earlier is better" reminder, since a large dose 6 hours before bed cut sleep by over an hour ([Drake et al., 2013](https://jcsm.aasm.org/doi/abs/10.5664/jcsm.3170)).
- **Did that help?** After each recharge, one tap (yes, a little, not really). Over a few weeks, the app favors the recharges that work for this user.
- **Always optional.** Users can pin, hide or add their own recharges. Each one earns a few miles.
- **Energy pattern.** The planner learns when the user is sharpest and saves the hardest steps for those hours. After a peak day, it plans a lighter next day.
- **Optional sleep support.** A wind-down reminder, a steady wake time, and morning outdoor light as a recharge. Never framed as treatment.

## Progress and checkpoints

A far goal feels possible when the next checkpoint is close. Both the travel reward and real goals use the same structure: small sections, each with a visible count.

- **Travel sections.** Each continent shows a count like 7/23 countries, and each large country a count of its regions. Finishing a section triggers a checkpoint reward: a full-page stamp, a new map color, or unlocking the next continent's hidden gems.
- **Goal checkpoints.** A goal like "build the app in 7 days" becomes a journey of 4 to 6 checkpoints. The Goals screen shows only the current checkpoint in detail; later ones appear as stops on a route.
- **Lifetime totals.** Places visited and steps done only ever go up, shown beside any streak so a bad week never erases progress.
- **Near-miss nudges.** When a section is close ("2 countries left in Central America"), the app says so, turning "almost done" into a reason to start today.

## Miles

- **Earning.** Miles per step scale with the step's size and an optional dread rating (1 to 3), set at capture or in Clean-up. A small but intimidating task, like emailing a professor, pays well. Every step earns something on any day.
- **Spending.** A trip's cost comes from the real great-circle distance between each country's main international airport, compressed on a curve so short hops stay quick and long hauls stay reachable. The real distance is shown as a fact.
- **Pacing target.** A few steady days of work always reaches somewhere new. Remote places naturally cost more, which makes them aspirational.
- **Data.** Free airport datasets supply coordinates, so no distances are guessed.

## Journey

**Map.** Real country boundaries from free boundary data. Visited countries are filled, reachable ones tinted, hidden gems marked. A departure board lists destinations closest first: flag, name, region, cost and status ("Ready to fly" or "80 more"), with tags for the user's pick and hidden gems. Crossing an ocean is a long-haul flight. Antarctica could be a bonus expedition.

**Country page.** Opens on arrival and stays readable from the passport:

- A real photo with a credit line. Sources: Unsplash or Pexels, or Wikimedia Commons with the photographer and license named.
- The stamp, showing the flag and arrival date.
- Capital, population with its year (World Bank data), and languages.
- Known for, must-see places with photos, Did you know, a food to try and how to say hello.
- A link to the country's Wikipedia page, plus Add stamp to passport and See it on the map.

**Passport.** Continent tabs with counts that sum to 195: North America 23, South America 12, Europe 44, Africa 54, Asia 48, Oceania 14. Each continent has region pages. Stamps show the flag instead of a date, which turns the passport into a flag-learning tool; unvisited slots show a "?" flag and the miles needed. Hidden gems and Islands & territories have their own pages. Stats: countries out of 195, hours focused, miles earned.

## Habits

- **Created in Dump.** Typing "meditate every day" is tagged as a habit, and the app asks how often (daily, or a number of days a week).
- **Shown in Goals, under Habits.** The main number is this week against the target ("3 of 4"). Beside it: the last 30 days ("25 of 30"), a lifetime count, and a frequent-flyer status tier based on the last 30 days.
- **Every number heals.** Weekly counts reset, the 30-day window rolls past old misses, and the lifetime count only goes up. No all-time percentages and no headline streak, since those make one miss permanent.
- **Comeback bonus.** Returning after a gap is rewarded, so restarting feels like a win.

## Decisions from the click-through test

Ed's click-through test of the mockups produced these changes. Part A of the next design round covers the everyday flow; Part B covers the rest.

**Now**

- The map shows only where the user is. Trips live in Journey.
- One suggested step on top, then an "Or pick one" list of 3 or 4 compact rows, so the user can choose the step that pulls them most.
- The step card describes what the step involves and exactly where to start. Time and place shrink to a small line.

**Dump**

- An optional "Add details" row: type, a time slider, and a feelings slider from "Really scary" to "Excited."
- **Excited** marks a motivation window: the app schedules the task soon, after a rest if needed, before the spark fades.
- Times typed naturally ("work on bio paper 3 to 5 PM") are placed on Plan with a confirmation chip. No extra picker.
- Recurring events ("Bio class MW 10–11:50, F 3–3:50") get a confirmation card with days, times and an end date, and a repeat icon.
- Ideas for an existing task ("idea for the response paper: …") attach to that task as notes.
- A new type, **Someday**: a possibility with no date or plan, kept on an Ideas shelf and resurfaced now and then.

**Events and rest**

- Events get the same feelings slider. Excited moves work earlier in the day; meh changes nothing; dreading lightens the load before and leaves recovery room after; all-day fun events make the day light.
- **Rest days** are chosen at setup. Nothing is scheduled on them unless truly due. Now shows "Rest day" with an optional, opt-in list of easy things. The app can suggest a rest day after a long stretch without one.

**After the work**

- **I already did this:** any task can be logged after the fact, with roughly when and how long, for full miles.
- **Debrief:** after a session or anytime on a goal, the user says what they actually did. The AI checks off matching steps, adds extra work done, and re-plans the rest.
- **Missed days:** nothing piles up. The next day opens with "Yesterday was a rest day," the rules re-plan around deadlines, and the AI rebalances big assignments. If a deadline is at risk, it says so early and offers a lighter plan or an extension email draft.
- **Finished goals and habits** are never deleted automatically: goals move to a Completed shelf; habits can be paused or retired and keep their lifetime count.

**New in Part B**

- Plan week and month views, with quick add from any date.
- A Peak day, with a lighter day planned after it.
- The interactive map (pan, zoom, tap any country) and a locked preview for unvisited countries: blurred photo, region, miles needed, a teaser fact, and "Make it my next trip." The flag stays hidden until arrival.
- **Ask:** a chat with the app's AI, attached to a goal or task, for brainstorming, questions and outlines. It drafts and suggests; the user decides. Current facts need web search, with sources shown.
- **Assignment upload:** the AI reads an assignment PDF (requirements, rubric, due date) and proposes plan options. Planned for v1.0, with the privacy note.

## Final design round

The last set of decisions before the design was locked.

**Planning ahead**

- Every card on Now has **Later today**, with quick time chips and an optional place. The step lands on Plan.
- **On-time bonus:** about 1.5x miles for starting within 15 minutes of a time the user chose. It applies only to self-chosen times, and missing one never costs anything. This rewards following through on an if-then plan, one of the best-supported techniques in the research.
- At the chosen time, a reminder offers **Start**, **Swap** or **Push 30 min**. Swapping still counts as keeping the plan, since showing up was the hard part.

**Pausing and stopping**

- **Pause** keeps the session open; a Resume card sits at the top of Now.
- **Stop for today** opens a debrief: the user marks exactly what got done, earns miles for that work, and chooses (or lets the app choose) when the rest goes. The AI re-plans.
- Unplanned extra work is logged from the assignment's page.

**Projects: Assignments, Goals, Habits, Shelf**

- Assignments get their own section: due dates, classes and optional PDFs.
- **The assignment page** is the hub: the checkpoint route, hours invested, a Next step card with Do it now and Schedule, "What's after that?" for momentum, Log work, and a built-in chat for changing direction or reporting progress.
- **Habit pages** have the same chat. Rule: anything changed through chat appears as a **settings card to confirm**, so changes are always visible and editable.
- **Setup flows** for each type: type it in one line, the AI fills the form, the user adjusts. Habits ask what, minimum, how often, when, reminder and how strict. Assignments ask class, due date and instructions (PDF or pasted). Goals ask what and why, deadline, time per week, then propose checkpoints.
- **Clean-up moves to the Shelf.** The Shelf has three sections: Clean-up, Someday ideas and Completed. Everything dumped lands in Clean-up until it is planned. Every item's button says Plan it, which opens a planning page: pick a type (Task, Assignment, Event, Habit, Goal or Someday idea), see only the fields that fit, and chat with the app, which fills fields in as you answer. Someday ideas use the same page to think an idea through until it is ready to become a goal, habit or assignment. Weeks start on Sunday. Dump details stay optional; only the words are needed. Assignments use the same card style as goals.

**Design locked.** New ideas from here go to the Later list below, not into the v0.1 build.

## Dump and Clean-up, revised after testing v0.1

In v0.1, the AI split one dump ("start meditating consistently") into two items and another ("go to the gym consistently") into three, guessing types and inventing steps. Ed's verdict: the AI was doing too much. The rule now:

**Dump captures, Clean-up thinks.**

- **One dump is one ticket, always.** The box is a single line. The AI may fix an obvious typo; it never splits, labels or adds steps.
- **Every ticket lands in Clean-up** on the Shelf.
- **In Plan it, the user leads and the AI asks.** The user picks the type first; the AI asks only what that type needs, then offers useful extras.
- **Fast path:** a simple task takes three taps (Task, optional time, Add to Now). Chat is optional.

**By type**

- **Habit:** how often, which days, time of day, minimum that counts. Then a useful offer, such as a workout routine (goals, equipment, time available, a weekly split) or exploring meditation styles. On habit days only, Now shows a reminder at the chosen time with today's specifics ("Gym · Push day · 45 min" or "10 min · body scan"), with Start, Done and Skip today. The habit page holds stats and a chat to change the routine. Fitness suggestions are framed as general guidance, with a note to check with a professional if there is an injury or health condition.
- **Assignment:** due date and feeling, then the AI's first question: "Do you have the instructions? Attach the document or describe it." With details, it proposes an editable plan. Without them, the assignment moves to Horizon marked **No plan yet**: a due-date countdown and a Build the plan button instead of a checkpoint route. No guessed steps.

**Now and miles when details are missing**

- An unplanned assignment appears on Now as its own small step: "Set up the plan for your psych paper · 5 min." As the due date nears with no plan, the deadline backstop pins it.
- No time given: default estimates by type (about 20 minutes for a task step, 30 for an assignment step), updated once real time is logged.
- No feeling given: a neutral multiplier.
- Habits: fixed miles per completion based on the minimum, plus a bonus for hitting the weekly target.
- Finishing a Plan it earns about 10 miles, so planning never feels like unpaid work.

**Plan it, in detail**

- A fresh ticket shows only the user's words: no type, no minutes, never on Now. It can reach Now only after it is planned into Assignments, Goals or Habits.
- **Understanding first:** the AI opens with one line ("Sounds like you want to build a consistent gym habit") and a **Not quite** chip for correcting it in the user's own words.
- **Fixed fields need no AI:** how often, which days, time of day, due date, time estimate and feeling are plain form fields.
- **Starting points:** after the type is picked, 3 or 4 tappable starters tailored to the ticket (for the gym: build a routine, pick days and times, ideas to make showing up easier), plus a text box that is always visible ("Or start your own…"). One AI request generates the starters. Assignments open with a fixed prompt to attach the instructions or describe them.
- **Nothing silent:** anything the AI proposes (a name, a routine, a plan) appears as editable fields or a card to confirm. **Start over** resets a conversation that goes off track.
- **Naming:** the last step suggests a clear name in an editable field; items can be renamed anytime on their own page, which also keeps the original dump text.

## How the app thinks

The app's judgment comes from two layers, both written by us and adjustable anytime. No model is trained.

- **Rules:** plain logic for priority, urgency, scheduling, miles and habits. Predictable, instant, free, and explainable to the user.
- **AI with instructions and context:** language and judgment, such as reading a dump, asking questions, building plans and choosing tips. It always works from what the user has said, their notes and the item's details.

### Urgency: slack

Every dated assignment or goal has a **slack** value: free hours before the deadline minus the estimated hours of remaining steps. Free hours exclude fixed events, sleep and rest days.

| State | Meaning | What the user sees |
| --- | --- | --- |
| On track | Comfortable slack | Normal suggestions |
| Tight | Slack under about a day of normal work | A one-time heads-up with the hours per day needed |
| At risk | Remaining work no longer fits | Pinned to the top of Now; re-plan offered |

### Priority on Now

1. At-risk assignments
2. The user's own picks
3. Things due today or tomorrow
4. Energy fit: small steps on low days, big ones on peak days
5. Things marked Excited
6. Everything else, soonest due first

The ticket can show why something is first, such as "Due tomorrow" or "At risk."

### When a deadline closes in

Escalation is calm, step by step, and never silent:

1. **Heads-up:** "At this pace you'd need about 2 hours a day on the psych paper." Shown once.
2. **Re-plan:** remaining steps are spread over the remaining free time automatically.
3. **Leaner plan:** if it still doesn't fit, the AI proposes a tighter version (merged steps, trimmed nice-to-haves) for the user to approve.
4. **Last resort:** a draft email asking for an extension.

### Spontaneous changes

A new event reshuffles the rest of the day. Anything that no longer fits moves, with a one-line notice and Undo ("Moved photo edits to tomorrow 10 AM"). Feelings about the event shape how much work goes before it.

### Free time and deadlines

"Done for today" appears only when nothing is at risk. If something is tight or at risk, Now shows "One more step keeps you on track" instead. When on track, the optional list leads with "Get ahead on…" before rest options.

### Plan quality

- **Ask before planning:** two or three targeted questions first (length, required sections, sources, what's already done, the user's own process), unless an attached document already answers them.
- **Stronger model for plans;** the quick model only for short replies.
- **Every step meets a bar:** a concrete output ("about 400 words critiquing the sample, covering rubric point 3"), a "done when" line, a time estimate and an optional tip.
- With an assignment document, steps map to the rubric and the page count.

### No assumptions about personal processes

For personal workflows (editing photos, studying, training), the AI asks how the user does it before planning, then **remembers the process** for next time ("Ed's editing: cull, then color in Lightroom, then export"). The user can view and edit these remembered processes.

### Research-backed tips

Tips come from a small, vetted library written once from research, each with its source. The AI only chooses which tip fits the moment; it does not invent advice. First entry, for rest: rest refreshes more when people mentally detach from work rather than only stopping it; a meta-analysis of 86 publications links detachment to well-being ([Wendsche & Lohmann-Haislah, 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5233687)), and physical activity, relaxation and mastery experiences help ([Sonnentag, 2018](https://repository.gatech.edu/entities/publication/4d657d2e-9f75-4080-b462-c7638f01ef26)).

### Planning the day

Itinerary's day view lists what's to place today beside a timeline; the user drags items into time blocks, for today or future days. An optional "Fill my day" proposes a layout to rearrange.

## Design pass: Now (decided)

- **Layout:** an illustrated header, the next step as a ticket, a "Your day" strip, "Also on deck" cards, and a note for today's events.
- **Header art follows energy,** with characters and subtle motion (off when the phone asks for reduced motion): a beach with sunbathers for low, two joggers in a park for steady, two hikers climbing to a summit flag for peak. Placement of the energy control is still open: a chip on the header or a bar above the tabs.
- **Trip progress inside the ticket:** "+40 mi gets you to Costa Rica," with a bar showing current miles and what the step adds.
- **Ready to fly:** when miles cover the next destination, a banner with a Fly button appears at the top of Now.
- **In progress:** the ticket turns dark with a green outline, a countdown ring, and Open, Pause and Done.
- **"Your day" strip:** close plans merge into numbered groups with time ranges; tapping a group expands it. The swipeable time rail is reserved for the Itinerary day view.
- **Done for the day:** a recap (steps, habits, hours focused, miles), "This time is yours. Resting is part of the plan," then an optional list drawn from the user's own habits, Someday ideas and a 2-minute plan for tomorrow.
- **Hours focused** count the time actually spent on the timer, not the estimate.
- **Nav order:** Now · Itinerary · Dump · Horizon · Journey.

**Sleep, light version (v1.0):** a one-tap morning question ("How'd you sleep?" Rough, Okay or Good, or an hours slider). After a short night the app suggests Low energy without forcing it, protects real deadlines and adds a nap or a walk to the recharge options. Sleep tips are general guidance, not medical advice; the care note covers rough nights that continue for weeks.

## Design pass: Assignment page (decided)

- **Summary card on top:** status (On track, Tight or At risk), due date, hours of work left against free hours, steps done.
- **Tabs:** Plan · Notes · Chat, so the page never gets long.
- **Plan as a route:** a dotted travel path; finished stops are checked, a plane marks "You are here." Any stop expands on tap to show its output, done-when and tip. The current step offers Start and Add to Now; other steps offer "Do this one instead" and "Already did it."
- **Edit plan:** drag to reorder, tap to rename or retime, remove or add steps; finished steps are locked. An "ask for a change" box lets the AI rework the plan, previewed before anything changes.
- **Notes tab:** key points from chats, attached files, and the remembered personal process, all editable.
- **Chat tab:** full height, remembers everything about the item, with Clear chat.

## Design pass: Itinerary (decided)

- **Day view:** a "To place today" tray of chips above an hourly timeline. Drag a chip onto a time; a dashed outline shows where it lands and for how long. Fixed events are grey, work is coral, habits blue, with a line marking now.
- **Fill my day:** proposes a layout as dashed ghost blocks (hardest step in the user's focus window, evenings kept free around events they're excited about), with a one-line reason, Keep and Undo. Ghosts can be dragged before keeping.
- **Week view:** "To place this week" tray; each day is a row with event chips colored by feeling, planned work and a load meter; rest days marked. Drag onto a day; the drop target shows its free hours. Fill my week works the same way.
- **Month view:** Sunday-first calendar with deadline and event dots, rest days tinted, Tight deadlines outlined; a deadline list shows each status (On track, Tight, At risk, No plan yet).
- **Levels:** month for spotting crunches, week for spreading work across days, day for arranging hours.

## Design pass: Plan it (decided)

A short wizard, one decision per screen, with progress dots:

1. **What is it?** The dumped words, the AI's one-line understanding with Not quite, then six type cards with icons and one-line descriptions.
2. **Details:** only the fields that fit the type (days, time and minimum for habits; due date and feeling for assignments; and so on).
3. **Want help?** Optional: tailored starters plus "Ask your own," with a prominent Skip. Assignments ask for the instructions here. Chat-style answers live inside this step.
4. **Name it and send it:** a suggested, editable name, a summary, where it will show up, and the destination button with the planning reward.

Simple items stay fast: a task can finish on step 2 with "Add to Tasks."

## Design pass: Country page (decided)

- **Arrival is a postcard:** a photo on the front with the stamp (flag and date) and "Greetings from…"; flip it for a short note with the best facts and a hint at the next stop. Then "Read the travel guide."
- **The travel guide** is the reference page, opened on arrival and whenever a country is revisited: a full-bleed hero photo, key stats, then sections down the page, with Add stamp, See it on the map, Fly back here (when visited) and Wikipedia.
- **Locked preview:** blurred photo, hidden flag, a trip bar with miles and steps to go, one teaser fact, what unlocks on arrival, and Make it my next trip.

### Content standard for every country

Ed wants each country to feel rich: plenty of information and plenty of images. Every country meets this bar before it ships:

| Part | Minimum |
| --- | --- |
| Photos | A hero photo, 4 to 6 must-see places each with a photo, and a gallery of at least 8 images (landscapes, cities, food, culture, wildlife) |
| Key stats | Capital, population with year, languages, currency, area, and where it sits on the map |
| Known for | 4 to 6 short tags |
| Must-see places | 4 to 6, each with a one-line description |
| Nature and geography | 2 or 3 highlights (volcanoes, reefs, rivers, climate) |
| History snapshot | 3 to 5 key moments, one line each |
| Culture | Food to try, how to say hello, a festival or tradition, music or art |
| Wildlife | National animal or bird, plus one notable species |
| Did you know? | At least 5 surprising facts, rotated on revisits |

**Sourcing:** photos from Wikimedia Commons, Unsplash or Pexels with credits and licenses on each image; numbers from World Bank or UN data with the year shown; every fact checked against a reliable source before release. The AI can draft content, but nothing ships unchecked.

## Design pass: Plan it by type, Itinerary sync, and ideas (decided)

**Plan it, by type** (after step 1's type cards):

- **Task:** how long, when (today, tomorrow, this week, anytime, a date), and whether it needs a set time. "No time needed" keeps it a checklist item on Now, never on the timeline. Finishes on step 2 with Add to Tasks.
- **Assignment:** step 2 is class, due date and feeling. Step 3 offers Attach the file or Describe it, then two targeted follow-up questions with tap answers, a chat bar above Back, Skip and Next.
- **Goal:** step 2 asks why it matters, time available and a target date, with "Make it a Someday idea" as an exit. Step 3 proposes a route of checkpoints that can be changed by typing.
- **Event:** date, time, repeats and feeling; ends with Add to Itinerary.
- **Someday idea:** catch the spark (words, optional source link, optional first thought), then Start thinking it through or Save to Shelf. No reminders by default.

**Now and Itinerary stay in sync:** anything added to Now appears in Itinerary's To place today tray; once placed, Now shows its time. Unplaced items are never scheduled silently.

**Tray chip options** (press and hold): Not today (moves to tomorrow), No time needed, Leave out of auto-planning, Open.

**Auto-planning setting:** Off; Suggest each morning (default: a proposal waits for Keep); Automatic (placed for you, still draggable). Excluded items are never placed.

**Someday ideas are workspaces** for developing an idea over time:

- **The spark:** the original words, source link and first thought.
- **Taking shape:** "Your take so far," built by the AI from conversations and editable, plus an honest readiness list (angle, format, research, outline).
- **Think it through:** the AI asks sharp questions rather than handing over a plan, and updates Your take as ideas firm up.
- **Set aside thinking time** puts a 30-minute thinking block in Itinerary.
- **Turn it into…** a Goal, Assignment, Task or Habit; notes, links and a first route carry over.

## Later list

- [ ] Decided: the tabs are Now · Dump · Itinerary · Horizon · Journey.
- [ ] Pairing that starts a playlist automatically.
- [ ] Importing class schedules and events from a calendar.
- [ ] Social accountability and body doubling.
- [ ] Antarctica as a bonus expedition.
- [ ] Reward themes beyond travel.
- [ ] Header scenes set in the current country or region, starting with regional scenery.
- [ ] Sleep, medium level: wind-down reminder, steady wake time, and personal insights such as how sleep affects steps finished. Watch sleep data import much later; no sleep-stage tracking.

## Look and feel

Calm by default, delightful at the payoff moments. The chosen direction is a clean, airline-style base: one sans-serif typeface, calm neutrals, navy and coral. Personality comes from soft illustration (the mountains-and-sun header) and the travel visuals, with hand-drawn touches only in small moments like the route label.

- **One focus per screen.** Now shows one card. Lists stay collapsed until tapped.
- **Quiet base, rich rewards.** Task screens use a restrained palette and plenty of space; the Passport and stamp moments carry the color, motion and personality. Contrast between the two makes rewards feel special.
- **Small surprises.** Occasional variety (a rare stamp design, a new fact, a seasonal map) keeps the app from going stale, the top abandonment reason in the research.
- **Friendly, plain language.** "Later," not "Overdue"; "Not today," not "Skip." No red for missed items.
- **Reduced-motion and low-stimulation options** for days when animation is too much.

## Open design questions

- [ ] Names for the three energy modes.
- [ ] Decided: miles scale with step size and an optional dread rating, and every step earns something (see Miles).
- [ ] Should the daily energy check-in ever be skipped, or asked only when the app opens before noon?
- [ ] How many items can Later hold before it needs its own Clean-up prompt?
- [ ] Which mood starters are on by default for a new user?
- [ ] What appears on Now when there is genuinely nothing to do: free time, a recharge idea, or the Passport?

## Sources

- [Milkman, Minson & Volpp (2014), temptation bundling trial, summarized by Silicon Canals](https://siliconcanals.com/t-gym-audiobooks-temptation-bundling-trial/)
- [Temptation bundling and its fade after routine breaks, Ness Labs](https://nesslabs.com/temptation-bundling)
- [Effects of acute and chronic exercise in adults with ADHD: systematic review and meta-analysis (2026)](https://pubmed.ncbi.nlm.nih.gov/41638541/)
- [Kuo & Faber Taylor (2004), green outdoor activities and ADHD symptoms, ScienceDaily](https://www.sciencedaily.com/releases/2004/08/040830082535.htm)
- [Behavioral activation and "action precedes motivation", Simply Psychology](https://www.simplypsychology.com/articles/behavioral-activation-depression)
- [Ginapp et al. (2022), lived experiences of adults with ADHD](https://www.frontiersin.org/journals/psychiatry/articles/10.3389/fpsyt.2022.949321/full)
