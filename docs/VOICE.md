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

### Dawnmead (THE DAWN REMADE cast — the village that raises wakers;
almost every adult here came out of the Ring themselves and stayed to
teach. Rowan retired east two winters back: he keeps Amberford's gate
registry with Aldis now, and is spoken of warmly, never mourned.)
- **Elder Wren** (Keeper of the Waking Ring): woke from the Ring fifty years
  ago, grown and nameless for a week; wants every waker to leave ready.
  Wound: a drawer of unsent letters to the ones who never wrote. Quirk:
  knits while she talks; measures time in wakings. Cadence: warm, unhurried,
  plain; calls you "child" or "waker"; the ONE elder allowed gentle wisdom,
  and hers is practical, never cosmic.
- **Halla** (Yardmaster): Wayward Watch, retired on a knee that predicts
  rain. Wants Dawnmead's wakers to outlive their first mistake. Counts
  things aloud. Cadence: imperatives, short, drill-clip. "Again." "Better."
  Never flowery.
- **Rill** (Fletcher): walked in off the hunters' trail at nine and never
  said from where; wants the bow respected, not feared. Whittles constantly.
  Cadence: fewest words in the village, all of them aimed; deflects her own
  story in one flat sentence.
- **Old Varn** (Sparkwright): woke mid-sentence and has spent forty years
  listening for the end of it. Wants one waker to finish the thought.
  Scorched sleeves, delighted by everything. Cadence: rambling wonder,
  interrupts himself; the drift and "..." belong to him.
- **Alder** (Forester): born here, the rarity; the copse was his mother's.
  Wants trees taken so the stand outlives him. Names his favorite oaks.
  Cadence: slow, seasonal, patient; talks in years; "told slow."
- **Berrit** (Hearthmother): fed the village out of one pot through a winter
  nobody names, and won't discuss it. Wants nobody leaving hungry. Bullies
  by feeding. Cadence: brisk, warm, food-first, "love"; no epigrams at all.
- **Ottery** (Wright): woke with clever hands and no patience; broke three
  benches learning. Wants you to make your first thing, whatever it is.
  Keeps every waker's first mangled craft on a shelf, his own two-legged
  stool foremost. Cadence: quick, practical, self-mocking.
- **Gilly** (Keeper of the Five Stones): walked the road as far as Saltmere
  and came home to hold the door for the ones just starting. Wants every
  waker to know the way back. Cadence: publican's warmth, road stories in
  miniature; wit granted, spent rarely.
- **Weir** (Angler): sat down at the brook forty years ago; broadly, still
  there. Wants the water listened to. Cadence: slow, short, opens with
  "..."; pauses that are waiting, not trailing off.
- **Brammel** (Farmer): third generation; the only man alive bored by the
  Waking Ring. Wants rain on Thursday. Cadence: short flat statements about
  immediate things; wisdom by accident, never on purpose.
- **Sorrel** (Drover): the Ring gave her a spooked cow to calm before it
  gave her a name, and she took that as instruction. Wants beasts treated
  as company. Quirk: half her words go to the animal, mid-sentence.
  Cadence: handler's murmur, short instructions, no hurry.
- **Tansy** (elder twin by a shout): runs everywhere, keeps score of
  everything. Cadence: fast, literal, victorious.
- **Wick** (younger twin): collects Ring facts; all wrong, all confident.
  Carries the Ring's mystery as a kid's guesses — the law: nobody explains
  it. Cadence: solemn nonsense, questions back.
- **Vale Wards** (pooled, Halla's rota): villagers with a season of drill,
  proud of the turn they walk and a little stiff in the leather. Cadence:
  plain village speech wearing a soldier's clip it hasn't fully earned;
  reports small things seriously (a fox, a loose rail); defers to Halla by
  name.

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
(THE FORD COMES HOME grew the town to its river: the quay, the tannery,
the stable, and the gate registry are new posts; every old throat kept its
voice and got its geography re-walked.)
- **Rowan** (Keeper of the Gate Book; Dawnmead's retired elder): wants every
  name in his book to come home through the gate at least once. Wren's warm
  measured plainness, aged on a bigger road; calls a Dawnmead graduate
  "waker" and everyone else "traveler". The one throat that KNOWS you if you
  carry Wren's mark. Cadence: unhurried, exact, kindness without softness.
- **Bray** (Hostler, the Ford Stable): wants every beast fed before every
  rider. Talks to animals mid-sentence, argues with them, loses. Cadence:
  easy, saddle-leather practical; prices in oats first, coin second.
- **Swale** (Tanner; Hask's old quartermaster off the Last Lamp run): wants
  leather that outlives its buyer. Blunt about smells, hers included;
  downstream is a courtesy she extends and expects. Cadence: dry, brisk,
  workshop-exact; measures everything in seasons cured.
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

### Pinewatch — the timber shore

(The tower predates the trade; the Wolfwinter is the town's one story and
the rota is its religion. NOTE: Reeve Halla is not Dawnmead's yardmaster
Halla — different woman, colder job.)
- **Reeve Halla**: wants the rota unbroken and the line respected; was
  nine the winter the water went quiet. Cadence: says a thing once,
  institutional clip, no wasted words; carries blame without ceremony.
- **Old Torvi** (of the Wolfwinter): eighty-one; wants her father's name
  said once and everyone to move on. Allergic to pity. Cadence: dry,
  complete sentences, tells a thing once and closes the drawer.
- **Groa** (sawmistress): half deaf on the saw side, hears wood better
  than people. Wants the floor's count beyond question. Cadence: loud,
  certain, short; praise is a nod.
- **Yannick** (spar-master): wants the one tree in a hundred and no
  argument about the other ninety-nine. Cadence: refusals as craft law.
- **Vigga** (axe-smith): reads the town by its edge wear; the boom chain
  is her fortnight of bad sleep. Cadence: verdicts, tool-first; affection
  delivered as maintenance advice.
- **Sunniva** (the Pine and Bell): the fire is up at half three for the
  watch coming down. Wants nobody cold at four. Cadence: publican
  warmth without Dunna's wit; house facts, plainly stated.
- **Rullo** (pitchmaster): three kiln fires, none his fault. Cadence:
  comic self-defense, honest about everything except the burns.
- **Bram** (tallyman): finds counting restful; was right for a year while
  the town patted his head. Cadence: mild, exact, the word is "missing".
- **Ebba** (Charter factor): sent north for a season eleven years ago;
  polite war with Ospren across a shared strongroom. Cadence: cost-first
  precision; homesickness rationed to one sentence.
- **Ospren** (Crown's buyer): deniability as a dialect. Cadence: never
  says a thing plainly that can be said carefully; "exact is safest."
- **Nial** (stores): two of everything, three of what people lose.
  Cadence: shelf-logic; watches which shelf you look at.
- **Kettil** (boomsman): twenty-one and immortal in his own head; walks
  the chain he shouldn't. Cadence: quick, cocky, accidentally wise about
  water and never about himself.
- **Odd** (nurseryman): plants for a sawyer not born yet. Cadence: slow,
  seasonal; talks to seedlings as colleagues; the crooked ice-year row
  is his one ghost story.
- **Sigrun** (waykeeper): the long road is longer, that is the point.
  Cadence: dry, road-formal, one warning per topic.
- **Ylva** (fisher steps): fishes the water nobody wants and is fed.
  Cadence: settled-argument calm; watches the winter edges and won't
  discuss the freeze with strangers.
- **Outrider Haldis** (Waykeeper, mounted): route facts first, then the
  understatement; trusts the garron's judgment over most people's.
- **Pinewatch Watch** (pooled): a sawyer or a carter on their night.
  Cadence: rota-flat pride; the tower watches the water.
- **Sawyers** (pooled): deck-noise clipped; fond of certain sticks and
  won't say so on the floor.

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

### Kingsdelf — the delf that made the crown

The town's ONE spice-carrier is **Mirena**; everyone else speaks plainly.
Trail-off "..." is granted to **Veyle** alone (the old blood drifts between
centuries mid-sentence). The town's shared registers: shift-talk (counted
out, counted back), road-talk (lit and unlit miles), and the careful way
everyone does NOT talk about the seal unless Annik is doing the talking.

- **Ruen** (Delfmaster). Want: the town outlasts her. Wound: three unanswered
  letters to a Crown that reads her surveyor's maps. Quirk: taps stone twice
  before trusting it. Cadence: work orders. "Count your crew before the burn,
  not after."
- **Venn** (Factor). Want: the venture pays and keeps paying. Wound: chose the
  ledger over a family; the ledger is the family now. Quirk: counts in threes,
  aloud. Cadence: precise, warm underneath, money-words. "Weighed, stamped,
  banked."
- **Annik** (Sealkeeper). Want: the names read aloud yearly until someone
  answers for them. Wound: counted 215 marks at age nine; no adult would
  explain. Quirk: touches the names-stone before answering about the past.
  Cadence: slow, exact, calls everyone child. "The names are never read in
  the dark."
- **Brekka** (Innkeep). Want: nobody unrecorded. Wound: a brother who went
  out unrecorded, up north, one spring. Quirk: no second cup till you sign
  the book. Cadence: brisk host warmth. "Names out, names in."
- **Orin** (Stablemaster). Want: no beast lost to the burn. Wound: the colt
  the Old Road took his first year. Quirk: talks to beasts mid-sentence with
  people. Cadence: unhurried, few words. "Easy now. Not you, traveler."
- **Ferrun** (Smith). Want: to work starfall before his hands give out.
  Wound: the masterwork that cracked at the quench, worn on a cord. Quirk:
  never names a blade before the water. Cadence: slow, fire-words.
- **Mirena** (Glasswright). THE SPICE. Want: a lens to look at the Brand
  without weeping. Wound: a master who said glass was a small craft. Quirk:
  holds everything up to the light. Cadence: quick, bright, earns her one
  aphorism per talk. "Starfall glass takes light the way a good listener
  takes bad news."
- **Veyle** (Enchanter, the old folk whole). Want: to read the seal's
  working. Wound: exiled for one question the Arcanum could not bear.
  Quirk: writes in the air while thinking. Cadence: soft, precise, drifts
  granted ("I watched the Processional built, child..."). Never frightened,
  which is itself unsettling.
- **Lorn** (Assayer). Want: a fair stamp on every load. Wound: the load he
  passed and the bridge that cracked; the word nobody. Quirk: weighs words
  like loads ("that claim is light"). Cadence: dry, exact.
- **Soren** (Lampwright). Want: the Old Road lit, lamp by lamp. Wound:
  forty one dark miles his feet still count. Quirk: trims every wick he
  passes. Cadence: patient road-faith. "The lamp holds."
- **Liv** (Waykeeper envoy). Want: to be wrong about the doctrine. Wound:
  the order's loneliest post; reports that answer slowly. Quirk: always
  positioned to see the gate. Cadence: formal, thawing by the month.
- **Hedda** (Crown surveyor). Want: the truth of the exodus for a king who
  cannot ask. Wound: paid to be doubted. Quirk: corrects distances
  mid-sentence. Cadence: clipped, measured. "Four thousand paces."
- **Etta** (Provisioner). Want: a full shelf in a town that grows nothing.
  Wound: being the villain of every hard winter's prices; eats last. Quirk:
  apologizes for prices unprompted. Cadence: soft, quick, generous.
- **Cass** (Outfitter). Want: nobody frozen for vanity. Wound: the thin
  coat and the polite frostbite. Quirk: sizes you on sight, says the
  number. Cadence: blunt, kind underneath. "Wool first, pride second."
- **Ida** (Salvewright). Want: a cure for ash-lung, not a comfort. Wound:
  the failure list, long and honest. Quirk: diagnoses in passing. Cadence:
  brisk bedside. "Breathe for me. In. Out."
- **Denna** (Fisher, the coast's old-blood ears). Want: to know what the
  mere holds, from a safe distance. Wound: what the net held once. Quirk:
  never turns her back to the water. Cadence: low weather-talk that stops
  at one particular subject.
- **Slate** (Dealer in sundries; the Company's counter, unstated). Want:
  the unwatched road to stay unwatched. Wound: the name he set down on the
  road. Quirk: answers questions with prices. Cadence: flat, amiable,
  frictionless. "Asking costs."
- **Orla** (Keywright). Want: no loved door ever truly lost. Wound:
  unstated; the bench faces away from the seal on purpose. Quirk: reads
  hands the way assayers read ore. Cadence: bench-quiet, file-rhythm
  sentences; mysticism delivered as pricing, never as wonder.
- **The Delfwatch** (pooled): a miner or glasshand in a Charter coat.
  Cadence: rota-flat. "The horn means in. The Overband does not knock
  first."
- **Delvers** (pooled): tally-string practical, basket-tired. "Knot going
  down, knot coming up."
- **Glasshands** (pooled): kiln-squint careful. "You never look straight
  into the kiln. You learn that once."

### Evenfall — the city the old folk kept

The first non-human town: every whole-blood throat speaks in THE PRESENT
TENSE OF CENTURIES — unhurried, exact, answering the question under the
question at least once per conversation. Elves never name-bomb; they
ground names with a touch of amusement, as if introducing children. They
do not explain the wood, do not give ages, and do not translate the old
tongue (a thing withheld is a thing the player found). The town's ONE
spice-carrier is **Elarin**; trail-off "..." is granted to **Aldaren**
alone (he loses decades mid-sentence and returns). Corwen is the bridge
throat: human rhythm, answers what elves answer slowly.

- **Aldaren, the Evenking**: wants the family whole again; carries every
  quiet year. Quirk: remembers your ancestors' era, misplaces which one.
  Cadence: long warm sentences that stop early when the weight arrives;
  drifts granted. Never frightened, never hurried.
- **Sylwen** (Warden of the Wood): wants the gate she opposed kept
  perfectly; the wound is being right about the cost and wrong about the
  choice. Quirk: counts while she listens. Cadence: sentinel's
  arithmetic, short declaratives, one dry edge per conversation.
- **Keeper Ilvane** (the Everflame): wants the light kept company.
  Cadence: still, kind, speaks of fire the way others speak of elders.
- **Loresinger Maelis** (the Songhouse): wants everything kept; will not
  sing one verse. Cadence: musical phrasing, refuses beautifully, "No."
  is a complete sentence she owns.
- **Aewyn** (the Bowyer's House): wants the staves treated as
  acquaintances. Cadence: workshop imperatives softened by sixty-year
  patience; the wood is always the subject of the sentence.
- **Myrren** (the Silk Hall): speaks in textures when words run short.
- **Selorne** (the Moonglass Hall): the patience register; measures
  everything in decades and finds days quaint.
- **Faelar** (the Mithril Forge): the loudest voice in the city, which
  is not very; proud of the one working fire.
- **Inscriber Vessa** (the Third Table): wants the right asker to walk
  in; keeps copies of other people's silences. Cadence: dry, precise,
  archival.
- **Elarin** (the Outward House): the ONE wit — collects human idioms
  and uses them wrong on purpose. Wants travelers talking. Cadence:
  bright, hosting, lands the idiom-joke once per conversation at most.
- **Corwen** (provisioner): thinned blood who knocked for three years.
  The wound is whose clock he chose to age by. Cadence: human-quick,
  plain, generous with the answers elves ration.
- **Serel** (the Evengate): polite as a drawn bow. Cadence: gate-watch
  clip, welcomes and warns in the same breath.
- **Naia** (the Stillroom): the "baby" at four human kingdoms old; the
  only whole-blood who jokes about age. Cadence: quick, warm, botanical.
- **Othiel** (the Keeping): does not count out loud. Fewest words in
  the city; each one load-bearing.
- **Evenguard** (pooled): "You are seen." Watch-speak pared to the
  bone; faces the way you came from.
- **Fair Court artisans** (pooled): courteous, absorbed, allergic to
  hurry.

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
