# The Arx voice pool — 17 clone-source voices

Chatterbox generates every line from a ~20s conditioning sample. The pool
lives in `~/code/voicelab/voices/` (one WAV per voice id; full provenance
and license notes in `voices/SOURCES.md` there). Every sample is cut from a
**public-domain LibriVox solo recording**, so generations are legally clean
to ship. Auditions of each voice speaking an Arx line sit in
`~/code/voicelab/arx_auditions/` — listen there before trusting any casting.

Casting is set per character as `ttsVoice` in `characters.json`. The current
full-roster assignment is PROVISIONAL (picked by direction fit, not by ear);
recast freely, then `npx tsx tools/voice/generate.mts <actor> --force`.

## The voices

| id | sound | born to play |
|---|---|---|
| gran_ruth | mature British, warm, unhurried | Perl |
| hearth_kara | warm American, homely, kind | Iona, Senna, Signy |
| bright_karen | light, quick, bright | Dunna, Tamsin, Pip, Dagny, Nib, Varga |
| clear_liz | precise, calm, cool-headed | Kayri, Elowen, Runa, Odele, Ragna, Nix |
| steel_cori | rich British, firm, command | Bryn, Aldis, Maren, Kestrel, Edda |
| stage_mil | grand, theatrical, huge character range | Ottilie, Balla, Mab, Solvei, Osa |
| matron_michele | plain mature American, level | Bretta, Merra, Sella |
| king_bob | deep, grave, measured; a fairy-tale elder's warmth when slowed | Elder Rowan, King Aeriex, Grettir, Garton, castle guard |
| wry_peter | dry British, antiquarian wit | Ferrick, Ansel, Pike |
| hale_andy | hale British, money-wry | Cormund |
| plain_mark | steady American narrator, dependable | Hask, Stig, Haki, the watches |
| showman_martin | theatrical, relishing | Ninebrass, Tove, criers |
| gentle_simon | soft-spoken British, gentle | Fen, Tilo, Ivo |
| ember_tadhg | Irish, quick ember energy | Koll, Nib, Brant, Tam |
| folksy_phil | folksy, cheery patter | Coppin, Dray, Coff, round traders |
| slow_john | slow, dry, deadpan | Hobb, Skarn, Peld, Jorel |
| sly_adrian | sly, storyteller's glint | Calder |

Legacy personal samples (david, edd, stanley, farnsworth) remain in the
voices folder but are no longer cast.

## Adding a voice

Drop a clean 10–20s mono WAV at `~/code/voicelab/voices/<id>.wav` (speech
only, no music, level room tone) and cast it by id. First generation with a
new voice pays a few seconds of conditioning; it caches after that. Keep
SOURCES.md honest: only public-domain or self-recorded/consented voices —
never rip a commercial performance or clone a real person without consent.
