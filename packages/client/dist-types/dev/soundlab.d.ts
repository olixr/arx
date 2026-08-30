/**
 * SOUND LAB — the audition bench for everything the world SOUNDS like
 * outside the streamed music library: the ambience system's beds and
 * one-shot voices (all synthesized in audio/ambience.ts), the world
 * SFX most often mistaken for them (footsteps, foraging — the usual
 * "what is that rustling?" suspects, audio/sfx.ts), and the recorded
 * shelf (/public/sfx samples).
 *
 * Beds (wind rustle, cave rumble, waterfall, riftgate drone, cricket
 * carriers) are continuous and gated by place/hour/field state, so
 * the lab drives the REAL AmbienceSystem.update() with scenario
 * presets instead of faking the graph — what you hear is exactly the
 * game's voice. One-shots are private methods on the system; the lab
 * reaches them through a structural cast (dev bench privilege).
 */
export {};
//# sourceMappingURL=soundlab.d.ts.map