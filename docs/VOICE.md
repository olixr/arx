# THE VOICE OF THE DAWNLANDS — Arx writing bible

This is the standing law for every word the game says: dialogue trees, bark lines,
signs, plaques, item flavor, UI prose, system messages. It exists because the
2026-07 text audit found the writing *competent and dead* — every throat in the
world spoke with one voice, and that voice was a machine's idea of clever.

Read this before authoring or editing ANY player-facing text.

---

## 1. The audit findings (what was wrong)

**One voice, sixty mouths.** Rowan, Bryn, Koll, Sella, the King, a kobold-war
veteran, and a curio barker all spoke in the identical register: wry, balanced,
aphoristic. Every node ended on a polished zinger. Every second sentence was an
inversion ("You learn patience here or you learn burns"). Every list came in
threes. That uniform cleverness IS the AI fingerprint — no real town sounds
like one person doing sixty impressions.

**Too heavy.** Every answer was 4–5 crafted sentences. Lore arrived as a wall.
Players skim, drown, and retain nothing. Wit at that density stops landing —
it reads as noise.

**Name-bombing.** "Grettir's crews", "Runa's scales", "Odele's reports" —
dropped at strangers with no footing. A new player hears static.

**Nobody is ordinary.** Every character was smart, self-aware, and quotable.
Nobody was boring, shy, wrong, petty, tired, or simple. Real texture comes from
difference, and the difference was missing.

**Everything explains.** Every question got a complete, generous essay. Nothing
was withheld, nothing contradicted, no door stayed shut. A world with no
subtext and no gaps feels like a wiki, not a place.

**Modern leak.** "Vertically integrated", "supply chain", "hydrology",
"fifth-column reports", "rift-mathematics" — words no ford-town or mountain
hold would ever hold in its mouth.

---

## 2. The laws

### One voice per throat
Every named character has a voice card (§4). The card wins over the writer's
taste. If a line could be moved to another character's mouth without anyone
noticing, it is written wrong.

### The one-spice rule
An aphorism, a zinger, a balanced epigram is a SPICE. At most one per whole
conversation — and only for characters whose card grants wit at all (Kayri,
Cormund, Dunna, Ninebrass own most of the wit in the world; that scarcity is
what makes them shine). Everyone else speaks plainly, in their own rhythm.

### The breath budget
- Greeting and hub nodes: 1–2 short sentences.
- Answer nodes: aim under 55 words. The 480-char validator cap is a wall,
  not a target. One idea per node. If a topic needs more, split it into a
  follow-up choice — the player pulling the thread is the immersion.
- Barks: one short sentence, present tense, said in passing.

### Ground every name
First mention of an off-screen person carries its handle: "Ask Balla. She
keeps the big forge up the stair." Second mention onward, bare name. A player who
has met no one must still follow every sentence.

### Let them be people
Characters may be wrong, boring, unfair, evasive, or dull. Two NPCs may
contradict each other about the same fact — leave the contradiction standing;
players who notice have found gameplay, not a bug. Some questions get "ask me
again when I know you", or a shrug, or a lie. The world owes no one an essay.

### Choices are speech
Player choices are things a person would actually say, in plain words, ≤90
chars but usually ≤40: "Who's Balla?", "What happened down there?", "Never
mind." Never literary prompts ("A hard call, cleanly made"), never summaries
of the answer you're about to get.

### The dash ban
No em dashes (—), en dashes (–), or double hyphens (--) in ANY player-facing
text: dialogue, choices, barks, examine lines, signs, item flavor, UI prose.
The dash is the loudest machine-writing tell there is, and nobody speaks one.
Where a dash wants to go, do what a speaker does: end the sentence and start
another, or use a comma, or a colon before a list. A trail-off or held pause
is written "..." (ASCII, never the … character) and belongs ONLY to throats
whose cards grant it: Fen and Solvei's drifts, Pike's unfinished warnings,
Skarn's long pauses, Grettir near the subject he avoids. Everyone else just
stops. Hyphens inside compound words are words, not dashes — mountain-born,
feast-day, two-handed all stay.

### Diction of the Dawnlands
Work-words, weather-words, stone and rope and lamp and ford. Say "count",
"wages", "seam", "wick", "thaw". Ban: modern trade/office/science vocabulary,
meta-irony, anything a game manual would say inside a character's mouth
("your abilities sit on your bar" — the TEACHING is fine, the UI words are
not; teach through the world: "the trick will come to your hand when you've
earned it").

### Lore is crumbs, not plates
The spine (§3) is delivered across dozens of small mouths, each holding a
corner of it, some corners disagreeing. No single NPC recites history. The
player assembles the story — that assembly is the "drawn in" feeling.

### Standing content boundary
No witches/witchcraft, no demons/devils/infernal/occult vocabulary, ever.
Skeletons, goblins, kobolds, grudges, gloom, the grave: fine.

### Markup discipline
`*em*` for a name or phrase the SPEAKER stresses (≤2 per node). `_grim_` only
for genuinely cold lines — dread loses meaning if it's furniture. `{item:x}`
when an item changes hands or is being pointed at. Never decorate for texture.

---

## 3. The lore spine (canon — extend, never break)

- The **Waking Ring**: five stones at Dawnmead; folk arrive through them with
  no memory of before. Nobody knows why. NOBODY EXPLAINS IT — every theory in
  the world is somebody's guess, and the guesses disagree.
- The **Masons' Guild** sealed the Undercroft ~20 years ago after kobolds
  broke into the deep galleries. Grettir's brother's crew was the one count
  that never came back matched; Skarn was last man out, on a bad leg.
- Miners came down-mountain; Bretta Ironhewn settled at the ford.
- The roads went feral; Marshal Kestrel's grandmother founded the
  **Waykeepers** — "the lamp stays lit."
- The **Toll War**: the Redmask brigands chained the ford. It built
  Amberford's bank (Cormund), made Captain Aldis, and left names on a plaque
  the town still reads at dusk.
- The **road-faith**: the Silver Shrine's mother-flame (keeper Sella) is the
  source of every road lamp. Edda of the Last Lamp is Sella's elder sister.
- **Warden Maren** ordered the seal broken; Petra swung the pick through her
  own grandfather's stonework. The Deep Market floor was found SWEPT —
  unexplained in public; the Rookery kept it swept all twenty years (Mab's
  secret, paid off only through the coppin_reeve → mab_rookery flag web).
- The **Silver Line**: five kings named Aeriex, descended from a quarry
  foreman who paid the shepherds' debts. Queen Kayri is ford-born and audited
  the king's own arithmetic. The Crown and the Rookery keep an arrangement.
- Osa (Silverfall hostler) is Dunna's mother. Signy lodges at the Flagon.
  Koll and Balla have feuded fondly for thirty years.

---

## 4. Voice cards

Format — **want / wound / quirk / cadence**. The cadence line is binding:
it dictates sentence shape. (Pooled actors share one card.)

### Dawnmead
- **Elder Rowan** (Keeper of the Waking Ring): wants every waker to leave
  ready; carries the weight of all the ones who didn't come back. Grandfatherly,
  unhurried. Cadence: full warm sentences, old-fashioned turns, calls you
  "child" or "waker". The ONE elder allowed gentle wisdom — but his is
  practical, never cosmic.
- **Warden Bryn**: wants Dawnmead never to need her; misses real soldiering.
  Drill-yard bark softened by real fondness. Cadence: imperatives, short.
  Counts things. "Again." "Good." Never flowery.
- **Iona** (Hearthkeeper): wants nobody to go hungry; lost someone to the road
  (never says who). Cadence: plain, kind, food-first. Homely comparisons only
  — bread, weather, the pot. No epigrams at all.
- **Tinker Fen**: wants to see what you'll make; a little lonely. Talks to
  tools and objects mid-sentence ("hold still, you..."). Cadence: distracted,
  parenthetical, trails off, restarts.
- **Farmer Hobb**: wants rain at the right time. The most gloriously boring
  man alive — and content. Cadence: short flat statements about immediate
  things. Weather, hens, fence posts. Wisdom by accident, never on purpose.
- **Pip**: a kid. Wants to be sent on errands like Nib. Cadence: fast, literal,
  too honest, questions back.
- **Drover Maren** (keeps the stalls): wants animals treated as company, not
  stock. Forty years on the droves; the wound is every beast she handed over
  and heard counted like sacks. Quirk: half her words go to the animal, not
  to you. Cadence: short handler's instructions, plain and unhurried; warmer
  to beasts than to people; no wit, no hurry.
- **Vale Wards** (pooled, Bryn's rota): villagers with a season of drill, proud
  of the turn they walk and a little stiff in the leather. Cadence: plain
  village speech wearing a soldier's clip it hasn't fully earned; reports
  small things seriously (a fox, a loose gate); defers to Bryn by name.

### The roads
- **Wayfarer Senna / Dray / Petch** (waystations): each keeps a stretch of
  road alive. Senna: steady, motherly to travelers, weather-wise. Dray: peddler
  patter, prices everything including opinions. Petch: ex-quartermaster,
  inventory brain, lists things in pairs.
- **Sergeants Hale / Odessa / Brant, Wayward Watch** (Waykeepers): soldiers
  far from relief. Cadence: report-speak, understatement, dark road humor kept
  short. They say "the lamp stays lit" like a password, not a poem.
- **Outriders Joss / Haldis** (Waykeepers, mounted): the order's riders, the
  road report on four legs. Want the whole route seen every day; each trusts
  the horse's judgement over most people's. Cadence: route facts first, then
  the understatement. Fond of the beast, never sentimental out loud.
- **Edda** (Last Lamp, Sella's sister): wants the worst mile of road to stay
  survivable. Cadence: BLUNT. Shortest sentences in the game. Kindness shown
  in deeds (fire, stew, warnings), never in words.
- **Ferrick** (the Tollhouse, the Company's Tongue): wants the road to pay
  what it owes — and believes it owes the Company. Courteous menace; never
  raises his voice, never threatens twice. Cadence: ledger-of-the-road —
  columns, tolls, debts, rent; everything an entry, everyone an amount.
  Wit granted, spent dry (a clerk's wit, not a jester's).
- **Toll guards** (pooled, the Tollhouse): red cloth at the arm, spears in
  reach. Cadence: counted words — three-to-six per line, arithmetic diction
  ("Ferrick talks. I count."). Never explain; the bar explains.

### The Low Hall — the Red Company's sanctuary
- **Captain Ravna** (the chair): wants the Company too useful to hang and
  too quiet to hunt. Deposed the old Redmask captain by AUDIT, not blade —
  terror invites armies, ledgers don't. Cadence: board-meeting calm about
  criminal logistics; the mask is a clerk's seal; three rules, recited
  exactly ("the nursery, what pays twice, and we do not forget").
- **Tallyman Brusk** (the counting room): wants books that BALANCE, whatever
  the goods weighed. Cadence: fence-warm, double-entry metaphors, proud of
  the docket's posted rate; "provenance is a story, I pay by weight."
- **Quartermaster Yeva** (the kit cage): wants nobody dying of wet boots.
  Cadence: kit-inspection clipped; rust is a moral failing; affection shown
  by checking your gloves. "Dry boots, sharp steel, shut mouth."
- **Company blades / runners** (pooled): paid-on-time steel and mud-to-the-
  knee errand legs. Blades: house-rule brevity, brazier warnings. Runners:
  route pride, cheerful non-answers.

### Amberford — the ford town
- **Bretta Ironhewn** (Master Smith, came down-mountain after the seal):
  wants the forge honest and the past unmentioned. Cadence: terse, metalwork
  imperatives, drops sentence subjects ("Forge's hot. Speak."). Goes quiet
  when the mountain comes up — the silence IS the story.
- **Captain Aldis** (North Gate, made by the Toll War): wants to never lose a
  gate again. Cadence: watch-report clip; names the dead plainly; no glory
  talk. Remembers whether you listened to her (aldis_heeded/shrugged).
- **Keeper Ansel** (Waykeepers' Hall): wants every name in the registry
  remembered. Reverent, precise, a little dusty. Cadence: formal, archival;
  speaks in entries and dates; softens only at the memorial.
- **Cormund** (Banker, built the bank out of the Toll War): wants the town
  never caught poor again. Owns real dry wit (granted). Cadence: measured,
  ledger-metaphors, one good line per talk.
- **Dunna** (Wanderer's Rest; Osa's daughter): wants a full common room; her
  mam's shadow on the bar. Wit granted — publican's timing. Cadence: quick,
  hospitable, gossip in threes, mothers the roadworn.
- **Merra** (Grocer): wants everyone fed and everyone's news. Warm, nosy,
  kind. Cadence: runs sentences together, asks after people by name.
- **Old Garton** (Miller): wants quiet; contradicts everyone on principle,
  especially Peld. Cadence: grumbles, short, "in my day", secretly generous.
- **Peld** (Ferryman): wants the river respected. Cadence: three-to-six-word
  answers. Long pauses written as short nodes. When he does say a full
  sentence, it matters.
- **Hask** (Outfitter): wants nobody dying of a cheap strap. Ex-roads himself.
  Cadence: practical, checks your gear with his eyes mid-sentence, blunt about
  danger, no drama.
- **Tilo** (Master Artisan): wants one perfect chair before he dies; his own
  house chair is half-finished on purpose. Cadence: soft-spoken, hands-first,
  apologizes for talking too long, then does.
- **Elowen** (Sage of the Dispensary): wants ailments boring and books exciting.
  Cadence: precise, faintly amused, corrects herself for accuracy ("well,
  three days. Two and a half.").
- **Jorel & Tamsin Furrowfield**: married farmers who finish and contradict
  each other's sentences. Jorel: slow, deliberate. Tamsin: quick, teasing.
  Neither complete without the other's version.
- **Goodwife Perl** (Orchardist): wants her trees outlived by nothing. Chatty
  gran; feeds everyone; suspects the cows of genius. Cadence: rambling,
  affectionate, digressions that circle back.
- **Nib** (Courier): wants to be everywhere already. Cadence: breathless,
  arrives mid-thought, leaves before finishing, knows everyone's business a
  day early.
- **Round traders** (pooled): market patter, short and bright.

### Silverfall — the capital
- **King Aeriex** (fifth of the Line): wants the bargain kept — Crown pays
  first, roads stay lit. A foreman's grandson who knows it. Cadence: PLAIN.
  Shorter and simpler than visitors expect from a king; that plainness is the
  character. No royal ornament.
- **Queen Kayri** (ford-born): wants the sums honest. Owns the sharpest wit
  in the game (granted, liberally). Cadence: quick, precise, auditor's eye;
  affection expressed as correction.
- **High Warden Maren** (Castellan; broke the seal): wants to be right about
  the one decision that can't be taken back. Cadence: measured, weighed words,
  never defends herself twice. Carries the cost visibly but silently.
- **Marshal Kestrel** (Waykeepers): wants the roads held with too few people.
  Cadence: muster-roll clip, tired, dry. Grandmother's words quoted only once,
  reluctantly.
- **Forgemistress Balla**: wants steel with no lies in it. Cadence: loud,
  certain, generous with praise for WORK (never people directly). The Koll
  feud is theatre both maintain.
- **Smeltmaster Koll**: wants the pour clean. Quirk: numbers everything —
  minutes, bars, grudges. Cadence: workmanlike, superstitions about the
  furnaces held completely deadpan.
- **Assayer Runa**: wants the scales beyond question. Cadence: few words,
  exact ones. States weights and facts; declines adjectives.
- **Foreman Grettir** (brother in the lost count): wants the yard safe and the
  subject closed. Cadence: NEAR-SILENT. Two-line answers. The brother is
  approached only through the grettir_word flag web, and even then sideways.
- **Mason Petra** (broke her grandfather's seal): wants the stone to forgive
  her — says it as engineering. Cadence: technical, defensive-precise, over-
  explains joints and loads when the real subject gets close.
- **Master Weaver Ottilie**: wants beauty taken seriously as labor. Grand
  manner, earned. Cadence: declarative, slightly imperious, kind underneath.
- **Herbalist Wyn**: wants people to stop being stupid about mushrooms.
  Cadence: brisk, clinical, unexpectedly funny about symptoms.
- **Cook Signy**: wants the working terrace fed on time. Cadence: kitchen
  clatter — short, warm, orders disguised as offers. Lodges at the Flagon.
- **Hostler Osa** (Dunna's mam): wants word from the ford more than she'll
  admit. Cadence: horse-first, people-second; gruff; melts at Dunna's name
  and pretends she didn't.
- **Gardener Ivo** (Greenstair): wants things growing at altitude to be seen.
  Talks to plants more easily than people. Cadence: quiet, halting with
  strangers, fluent about green things.
- **Shrinekeeper Sella**: wants the flame passed on. Cadence: gentle, few
  words, no sermons — the ONE line of faith she'll say is "the dark is large,
  and we pass the light along," and she says it like housekeeping.
- **Carpenter Stig / Cooper Dagny / Fletcher Haki** (Timberway): Stig:
  patient teacher, grain-metaphors, measured. Dagny: fast, practical,
  loudly competitive about the Timberway's pecking order. Haki: Waykeeper
  veteran invalided off the road (the knee); careful, oath-driven — every
  arrow is somebody's life; understates the ten years.
- **Silversmith Vigdis**: wants her mark to mean something in three hundred
  years. Cadence: exacting, aesthetic, one commandment: Runa's stamp settles
  everything.
- **Scrivener Tove** (Inks & Charts): wants the world written down before it
  changes. Cadence: enthusiastic pedant; distances in days-walked; corrects
  maps mid-conversation.
- **Innkeep Ragna** (Silver Flagon): wants a quieter room than Dunna's and
  pretends not to compete. Cadence: composed, discreet, hears everything,
  repeats little.
- **Bursar Odele**: wants the vault's arithmetic unquestionable. Cadence:
  polite, exact, immovable. Numbers as courtesy.
- **Enchantress Solvei** (Arcanum): wants to know what the rift already knows.
  Quirk: drifts mid-sentence when a thought catches her, returns without
  apology. Cadence: abstracted, precise about the imprecise.
- **The Magpie (Mab)** (Rookery): wants the city's shadows orderly. Never
  answers a question first — asks one back. Cadence: soft, unhurried,
  everything a trade. The swept floor is hers to reveal, on her terms.
- **Calder** (fence, "Purveyor of Provenance"): wants no questions asked,
  politely. Cadence: euphemism as art form; everything "found", "orphaned",
  "previously appreciated".
- **Pike** (lookout): wants to see everything, say nothing. Cadence: minimal,
  sardonic, roof-slang, rarely finishes a warning — expects you to catch up.
- **Drillmaster Jorunn** (the yard's voice; broke Kestrel in as a recruit,
  never mentioned by either): wants nobody to die of something drillable.
  Cadence: parade-count bark, numbers as verdicts, praise delivered as
  "again, faster." Knees, elbows, eyes.
- **Steward Ansgar** (the household's ledger): wants the castle to run so
  smoothly nobody knows it runs. Cadence: soft arithmetic; meals, candles,
  and cartloads as the units of history. Leaves the Queen one seeded error
  a month; she writes SEEN beside it.
- **Herald Ossian** (the Crown's word): reads the Line's decrees in a hall
  voice and hoards his own small one. Cadence: formal at the lectern,
  clipped off duty; the bell schedule is sacred. "Hear the word and mind
  the edge" — the second part is his.
- **Castle guard / Silverfall watch / castle servants / galleria traders /
  gate mongers** (pooled): steel courtesy / gate-watch weather talk /
  below-stairs practicality / stall patter / pool-market cries. Short,
  functional, alive.

### The Undercroft
- **Mine-Reeve Coppin**: wants the Deep Market to outlive its novelty.
  Cadence: brisk administrator underground — tallies, permits, lamp-oil;
  refuses to find the dark romantic.
- **Old Skarn** (last man out): wants someone from the count present when the
  rubble line moves. Cadence: slow, long pauses (write them), plain words.
  Never dramatizes the fall — understates it, which is worse.
- **Varga** (ore broker): wants every rumor priced. Cadence: quick, numeric,
  friendly the way scales are friendly.
- **Ninebrass** (curio barker): wants an audience. The ONE licensed showman
  below ground — patter, invented provenance, self-mythology he may not
  believe either. Cadence: exclamatory, list-happy, but keep each bark short.

### Saltmere — the town at the water's end
- **Portreeve Brack**: wants the port to outlive him; the year the mere took
  four boats, he was the one who said go out. Cadence: harbormaster's economy
  — headings, tallies, weather read off the water; kindness shown as dock
  room granted, never as words.
- **Factor Neave** (Counting House; clerked under Cormund at the ford):
  wants the ledger to balance to the grain, and the damp kept off the paper.
  Cadence: precise, self-correcting mid-figure, disclaims what she can't
  vouch. Sleeps at the Gull because the bank is nearer the water than she'd
  like.
- **Innkeep Dorrit** (the Painted Gull): wants every chair full and every
  story finished properly. Wit granted (the Dunna class, salt edition).
  Cadence: warm, quick, feeds you mid-sentence, names the weather like a
  regular.
- **Chandler Swale** (Saltmere Stores): wants never once to be caught
  without. Cadence: inventory triplets — "rope, tar, biscuit" — everything
  in threes, prices remembered to the coin.
- **Master Salter Ondra** (the pans): wants the pans respected like fields,
  because they are fields. Cadence: slow, seasonal, speaks of salt as a crop
  and the sun as a workman. Never hurries; salt doesn't.
- **Smokemistress Alba** (the smokehouses; the world's first cooking
  trainer): wants cooking treated as a trade, not a chore; fed the town
  through a winter she won't name. Cadence: kitchen imperatives, timing
  words, zero waste in food or speech.
- **Master Angler Voss**: wants the one fish; counts everything he has ever
  caught and a few he hasn't yet. Cadence: patient understatement, measures
  time in waits, lets silences do the bragging.
- **Boatwright Seff** (the slipway): wants hulls back in one piece; will not
  launch a boat blind — the eyes go on last, always last. Cadence: careful,
  short, plain; ends conversations by picking the tool back up.
- **Roper Jessa** (the ropewalk): wants unbroken lines. Cadence: long
  steady sentences laid out like strands, counts in fathoms, walks while
  she talks because the walk is the work.
- **Lightkeeper Lund** (the Mere Light): wants the light fed before anything
  else, including this conversation. Road-faith literal: the flame came from
  the mother flame and that is not a figure of speech. Cadence: short,
  watchful, calls the light "she".
- **Old Pilot Fane**: wants the mere read right by somebody after him;
  remembers half the coast as children, including Peld ("bell-shy little
  thing"). Cadence: weather-eye recollections kept short, names people by
  what they feared.
- **Saltmere Watch** (pooled, Waykeepers): harbor soldiers a long way from
  relief. Cadence: report-speak with salt in it; "the lamp stays lit" said
  like a password, same as the road sergeants.
- **Saltmere fishers** (pooled): the crews. Catch-talk, plain, generous
  with advice about exactly one subject.

### Hartfell — the town past the treeline

- **Speaker Ashild**: wants the moot to outlive her; the wound is every
  quarter the Crown's letter gets longer. Quirk: "the moot decided, I only
  say it aloud." Cadence: measured, complete, no wasted words; answers
  questions with the decision, never the argument.
- **Maeva** (springkeeper): wants the water respected; something down in it
  she has never explained. Quirk: speaks of the Kettle as "it", like a
  patient elder relative. Cadence: unhurried short sentences, faintly
  uncanny calm, zero wit.
- **Kolgrim** (huntmaster): wants the fold fed before anyone brags; the
  wound is the winters the count came short. Quirk: counts everything
  aloud. Cadence: clipped field-orders. "Wind first. Ground second. Shot
  last."
- **Sunn** (fell guide): wants to be already outside; walls bore her in
  minutes. Quirk: swallows half her sentences moving. Cadence: fast,
  clipped, present tense, no pleasantries. Repeats the important word.
- **Ranna** (furrier): wants first quality and knows on sight; grades
  people the same way. The town's ONE spice-carrier with Brandulf.
  Cadence: trade-brisk verdicts. "The grade is the grade."
- **Inga** (tallywife): wants the book square; one error thirty years ago,
  hers, never again. Cadence: shortest lines in the north. "Counted."
- **Ulfa** (chandler): wants every dark mile lit; kind gossip, trims every
  story a little brighter. Cadence: warm, running-on, endearments ("my
  love"), practical economics of light.
- **Geir** (smokemaster): wants the winter lost before it starts. Cadence:
  slow single-direction sentences, long pauses written as short replies.
  "Mm."
- **Tuli** (bone carver): wants the work looked at, not him. Quirk: one
  piece is never for sale, no explanation. Cadence: small quiet sentences,
  apologizes for existing, precise about craft.
- **Eirik** (smith): wants to be exactly as good as he is and no better on
  paper; open admiration for Silverfall masterwork. Cadence: honest,
  self-measuring, workmanlike.
- **Brandulf** (the Horn and Hearth): wants no quiet nights, ever; a quiet
  inn past the treeline is a cold thought. Cadence: LOUD warmth, house
  laws, bad at secrets and knows it.
- **Swein** (herdmaster): wants them counted out and counted in; will not
  say the number of the lost aloud (named misfortune returns). Cadence:
  worried arithmetic, superstitious ellipses of the number, never of words.
- **Orvar** (tithekeeper): wants the bargain kept on the town's side first;
  thirty years walking the sledge out alone. Quirk: wolves are "neighbors",
  never beasts; fear "would be rude". Cadence: sparse, exact, ceremonial
  plainness.
- **Elder Gunvor**: wants the true count told once, properly; came north
  over the ice and stays outside the wall on purpose. Cadence: dry,
  unsentimental precision; long stories only when seated; "some stories
  sit before they speak."
- **Eyvor** (netkeeper): wants the shelf ice respected and the Darkwater
  left alone. Quirk: her knee forecasts weather and is always right.
  Cadence: practical shore-talk, one superstition held absolutely.
- **Signe** (waykeeper): wants both lists square, who went up and who came
  back. Cadence: road-formal ledger speech warmed underneath; "the lamp is
  the safety, it always was."
- **Hallward** (the Charter's buyer): wants the contract the moot declines
  quarterly; a year north has started to charm him and he resents it
  fondly. Cadence: polished southern courtesy, self-aware irony, never
  mockery.
- **Grimm** (pedlar): wants old things cheap and questions expensive.
  Cadence: affable evasion; answers with offers; calls everyone "friend"
  and means the coin.
- **The Fellwatch** (pooled): a herder or a smoker taking a turn at the
  gate. Cadence: plain fell speech with the horn-law recited flat. "The
  horn means in. Not soon. In."
- **Herders** (pooled): wind-cracked, count-stick practical. Beast-first
  talk, short.

---

## 5. Surface rules

- **Signs**: name + one line at most, in the sign-raiser's voice, not the
  narrator's. A town sign is civic ("AMBERFORD. The ford is free. The
  Redmasks made sure we'd never forget to say so."). A worksite sign is
  practical. A warning sign warns.
- **Plaques/memorials**: names first. Restraint. No poetry longer than a
  breath.
- **Item flavor**: one sentence, concrete, in the world's diction — who makes
  it, who carries it, what it's for. No jokes that break the world.
- **System/UI messages**: the game's narrator is a QUIET QUARTERMASTER —
  brief, warm, never cute. "Your pack is full." not "Whoa there, packrat!"
- **Death/level/discovery ceremonies**: gravity without melodrama. Few words,
  well chosen — these fire a thousand times.

## 6. Review checklist (run before committing any text)

1. Could this line move to another mouth unnoticed? → rewrite.
2. More than one zinger in the conversation? → cut to the best.
3. Any node over ~55 words without earning it? → split or trim.
4. Any ungrounded proper noun on first mention? → ground it.
5. Any modern/office/manual vocabulary? → translate to work-words.
6. Do all NPCs agree about everything? → let two disagree.
7. grep the diff for witch|hex|demon|devil|infernal|occult|coven|warlock.
8. grep the diff for em/en dashes and "--" — any hit in player-facing text
   is a failure (the dash ban).
9. Validator: node ≤480 chars, choice ≤90, 1–4 choices, markup balanced.
