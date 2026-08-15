import type { RoutineDef } from './types.js';
import { validateRoutine } from './validate.js';

import efKing from './defs/ef_king.json';
import efWarden from './defs/ef_warden.json';
import efKeeper from './defs/ef_keeper.json';
import efSinger from './defs/ef_singer.json';
import efBowyer from './defs/ef_bowyer.json';
import efWeaver from './defs/ef_weaver.json';
import efGlasswright from './defs/ef_glasswright.json';
import efSmith from './defs/ef_smith.json';
import efInscriber from './defs/ef_inscriber.json';
import efInnkeep from './defs/ef_innkeep.json';
import efProvisioner from './defs/ef_provisioner.json';
import efGate from './defs/ef_gate.json';
import efStillkeeper from './defs/ef_stillkeeper.json';
import croftReeve from './defs/croft_reeve.json';
import croftTrader from './defs/croft_trader.json';
import croftVeteran from './defs/croft_veteran.json';
import fallBursar from './defs/fall_bursar.json';
import fallCook from './defs/fall_cook.json';
import fallEnchantress from './defs/fall_enchantress.json';
import fallForeman from './defs/fall_foreman.json';
import fallForgemistress from './defs/fall_forgemistress.json';
import fallGardener from './defs/fall_gardener.json';
import fallHerbalist from './defs/fall_herbalist.json';
import fallHostler from './defs/fall_hostler.json';
import fallOutrider from './defs/fall_outrider.json';
import fallMarshal from './defs/fall_marshal.json';
import fallMason from './defs/fall_mason.json';
import fallShrinekeeper from './defs/fall_shrinekeeper.json';
import fallTrader from './defs/fall_trader.json';
import fallWarden from './defs/fall_warden.json';
import pineReeve from './defs/pine_reeve.json';
import pineSawmistress from './defs/pine_sawmistress.json';
import pineSparmaster from './defs/pine_sparmaster.json';
import pineSmith from './defs/pine_smith.json';
import pineInnkeep from './defs/pine_innkeep.json';
import pinePitchmaster from './defs/pine_pitchmaster.json';
import pineFactor from './defs/pine_factor.json';
import pineBuyer from './defs/pine_buyer.json';
import pineStorekeep from './defs/pine_storekeep.json';
import pineTallyman from './defs/pine_tallyman.json';
import pineBoomsman from './defs/pine_boomsman.json';
import pineNurseryman from './defs/pine_nurseryman.json';
import pineWarden from './defs/pine_warden.json';
import pineElder from './defs/pine_elder.json';
import pineFisher from './defs/pine_fisher.json';
import pineOutrider from './defs/pine_outrider.json';
import pineWatch from './defs/pine_watch.json';
import pineSawyer from './defs/pine_sawyer.json';
import fallWatch from './defs/fall_watch.json';
import fallWatchPostern from './defs/fall_watch_postern.json';
import fallWatchMuster from './defs/fall_watch_muster.json';
import fallWatchMusterNight from './defs/fall_watch_muster_night.json';
import fallWatchGateDay from './defs/fall_watch_gate_day.json';
import fallWatchGateNight from './defs/fall_watch_gate_night.json';
import fallWatchRoundDay from './defs/fall_watch_round_day.json';
import fallWatchRoundNight from './defs/fall_watch_round_night.json';
import fallWeaver from './defs/fall_weaver.json';
import fallKing from './defs/fall_king.json';
import fallQueen from './defs/fall_queen.json';
import fallCastleGuard from './defs/fall_castle_guard.json';
import fallCastleGuardDrillDay from './defs/fall_castle_guard_drill_day.json';
import fallCastleGuardDrillNight from './defs/fall_castle_guard_drill_night.json';
import fallDrillmaster from './defs/fall_drillmaster.json';
import fallSteward from './defs/fall_steward.json';
import fallHerald from './defs/fall_herald.json';
import fallServant from './defs/fall_servant.json';
import fallWatchMarket from './defs/fall_watch_market.json';
import fallWatchRow from './defs/fall_watch_row.json';
import lowCaptain from './defs/low_captain.json';
import lowTallyman from './defs/low_tallyman.json';
import lowQuartermaster from './defs/low_quartermaster.json';
import lowBlade from './defs/low_blade.json';
import lowRunner from './defs/low_runner.json';
import fallSmeltmaster from './defs/fall_smeltmaster.json';
import fallAssayer from './defs/fall_assayer.json';
import fallCarpenter from './defs/fall_carpenter.json';
import fallCooper from './defs/fall_cooper.json';
import fallFletcher from './defs/fall_fletcher.json';
import fallSilversmith from './defs/fall_silversmith.json';
import fallScrivener from './defs/fall_scrivener.json';
import fallInnkeep from './defs/fall_innkeep.json';
import fallMagpie from './defs/fall_magpie.json';
import fallFence from './defs/fall_fence.json';
import fallLookout from './defs/fall_lookout.json';
import amberArtisan from './defs/amber_artisan.json';
import amberBanker from './defs/amber_banker.json';
import amberCaptain from './defs/amber_captain.json';
import amberWatch from './defs/amber_watch.json';
import amberWatchFordDay from './defs/amber_watch_ford_day.json';
import amberWatchFordNight from './defs/amber_watch_ford_night.json';
import amberWatchNorthDay from './defs/amber_watch_north_day.json';
import amberWatchNorthNight from './defs/amber_watch_north_night.json';
import amberWatchEastDay from './defs/amber_watch_east_day.json';
import amberWatchEastNight from './defs/amber_watch_east_night.json';
import amberWatchSaltDay from './defs/amber_watch_salt_day.json';
import amberWatchSaltNight from './defs/amber_watch_salt_night.json';
import amberWatchRoundDay from './defs/amber_watch_round_day.json';
import amberWatchRoundNight from './defs/amber_watch_round_night.json';
import amberCourier from './defs/amber_courier.json';
import amberFarmer from './defs/amber_farmer.json';
import amberFarmwife from './defs/amber_farmwife.json';
import amberFerryman from './defs/amber_ferryman.json';
import amberGrocer from './defs/amber_grocer.json';
import amberInnkeep from './defs/amber_innkeep.json';
import amberKeeper from './defs/amber_keeper.json';
import amberMiller from './defs/amber_miller.json';
import amberOrchardist from './defs/amber_orchardist.json';
import amberOutfitter from './defs/amber_outfitter.json';
import amberSage from './defs/amber_sage.json';
import amberSmith from './defs/amber_smith.json';
import amberTraderA from './defs/amber_trader_a.json';
import amberTraderB from './defs/amber_trader_b.json';
import dawnWardDay from './defs/dawn_ward_day.json';
import dawnWardNight from './defs/dawn_ward_night.json';
import dawnWardDusk from './defs/dawn_ward_dusk.json';
import wrenHours from './defs/wren_hours.json';
import hallaRounds from './defs/halla_rounds.json';
import rillHours from './defs/rill_hours.json';
import varnHours from './defs/varn_hours.json';
import alderHours from './defs/alder_hours.json';
import berritHours from './defs/berrit_hours.json';
import otteryHours from './defs/ottery_hours.json';
import gillyHours from './defs/gilly_hours.json';
import weirHours from './defs/weir_hours.json';
import brammelHours from './defs/brammel_hours.json';
import sorrelHours from './defs/sorrel_hours.json';
import tansyScamp from './defs/tansy_scamp.json';
import wickScamp from './defs/wick_scamp.json';
import saltPortreeve from './defs/salt_portreeve.json';
import saltFactor from './defs/salt_factor.json';
import saltInnkeep from './defs/salt_innkeep.json';
import saltChandler from './defs/salt_chandler.json';
import saltSalter from './defs/salt_salter.json';
import saltSmoke from './defs/salt_smoke.json';
import saltAngler from './defs/salt_angler.json';
import saltBoatwright from './defs/salt_boatwright.json';
import saltRoper from './defs/salt_roper.json';
import saltBeacon from './defs/salt_beacon.json';
import saltPilot from './defs/salt_pilot.json';
import saltWatchGate from './defs/salt_watch_gate.json';
import saltWatchGateNight from './defs/salt_watch_gate_night.json';
import saltWatchSquare from './defs/salt_watch_square.json';
import saltWatchQuay from './defs/salt_watch_quay.json';
import saltFisherPiers from './defs/salt_fisher_piers.json';
import saltFisherYard from './defs/salt_fisher_yard.json';
import saltFisherEast from './defs/salt_fisher_east.json';
import waystationKeeper from './defs/waystation_keeper.json';

/**
 * Every authored routine JSON, registered here. A def that isn't
 * listed doesn't exist — routines.test.ts walks the defs/ directory
 * and fails if a file is missing from this roster, so forgetting the
 * import is a test failure, not a silent hole in someone's day.
 */
import hartSpeaker from './defs/hart_speaker.json';
// Kingsdelf — the town keeps hours (the Kingsdelf epic).
import kdDelfmaster from './defs/kd_delfmaster.json';
import kdFactor from './defs/kd_factor.json';
import kdSealkeeper from './defs/kd_sealkeeper.json';
import kdInnkeep from './defs/kd_innkeep.json';
import kdStablemaster from './defs/kd_stablemaster.json';
import kdSmith from './defs/kd_smith.json';
import kdGlasswright from './defs/kd_glasswright.json';
import kdEnchanter from './defs/kd_enchanter.json';
import kdAssayer from './defs/kd_assayer.json';
import kdLampwright from './defs/kd_lampwright.json';
import kdWaykeeper from './defs/kd_waykeeper.json';
import kdSurveyor from './defs/kd_surveyor.json';
import kdProvisioner from './defs/kd_provisioner.json';
import kdOutfitter from './defs/kd_outfitter.json';
import kdSalvewright from './defs/kd_salvewright.json';
import kdFisher from './defs/kd_fisher.json';
import kdBroker from './defs/kd_broker.json';
import kdWatchEastDay from './defs/kd_watch_east_day.json';
import kdWatchEastNight from './defs/kd_watch_east_night.json';
import kdWatchWicketDay from './defs/kd_watch_wicket_day.json';
import kdWatchWicketNight from './defs/kd_watch_wicket_night.json';
import kdDelverA from './defs/kd_delver_a.json';
import kdDelverB from './defs/kd_delver_b.json';
import kdDelverC from './defs/kd_delver_c.json';
import kdGlasshandA from './defs/kd_glasshand_a.json';
import kdGlasshandB from './defs/kd_glasshand_b.json';
import hartSpringkeeper from './defs/hart_springkeeper.json';
import hartHuntmaster from './defs/hart_huntmaster.json';
import hartGuide from './defs/hart_guide.json';
import hartFurrier from './defs/hart_furrier.json';
import hartTallywife from './defs/hart_tallywife.json';
import hartChandler from './defs/hart_chandler.json';
import hartSmokemaster from './defs/hart_smokemaster.json';
import hartBonecarver from './defs/hart_bonecarver.json';
import hartSmith from './defs/hart_smith.json';
import hartInnkeep from './defs/hart_innkeep.json';
import hartHerdmaster from './defs/hart_herdmaster.json';
import hartTithekeeper from './defs/hart_tithekeeper.json';
import hartElder from './defs/hart_elder.json';
import hartNetkeeper from './defs/hart_netkeeper.json';
import hartWaykeeper from './defs/hart_waykeeper.json';
import hartBuyer from './defs/hart_buyer.json';
import hartPedlar from './defs/hart_pedlar.json';
import hartWatch from './defs/hart_watch.json';
import hartWatchBeacon from './defs/hart_watch_beacon.json';
import hartHerder from './defs/hart_herder.json';

const SOURCES: readonly unknown[] = [
  efKing,
  efWarden,
  efKeeper,
  efSinger,
  efBowyer,
  efWeaver,
  efGlasswright,
  efSmith,
  efInscriber,
  efInnkeep,
  efProvisioner,
  efGate,
  efStillkeeper,
  croftReeve,
  croftTrader,
  croftVeteran,
  fallBursar,
  fallCook,
  fallEnchantress,
  fallForeman,
  fallForgemistress,
  fallGardener,
  fallHerbalist,
  fallHostler,
  fallOutrider,
  fallMarshal,
  fallMason,
  fallShrinekeeper,
  fallTrader,
  fallWarden,
  pineReeve,
  pineSawmistress,
  pineSparmaster,
  pineSmith,
  pineInnkeep,
  pinePitchmaster,
  pineFactor,
  pineBuyer,
  pineStorekeep,
  pineTallyman,
  pineBoomsman,
  pineNurseryman,
  pineWarden,
  pineElder,
  pineFisher,
  pineOutrider,
  pineWatch,
  pineSawyer,
  fallWatch,
  fallWatchPostern,
  fallWatchMuster,
  fallWatchMusterNight,
  fallWatchGateDay,
  fallWatchGateNight,
  fallWatchRoundDay,
  fallWatchRoundNight,
  fallCastleGuardDrillDay,
  fallCastleGuardDrillNight,
  fallDrillmaster,
  fallSteward,
  fallHerald,
  fallServant,
  fallWatchMarket,
  fallWatchRow,
  lowCaptain,
  lowTallyman,
  lowQuartermaster,
  lowBlade,
  lowRunner,
  fallWeaver,
  fallKing,
  fallQueen,
  fallCastleGuard,
  fallSmeltmaster,
  fallAssayer,
  fallCarpenter,
  fallCooper,
  fallFletcher,
  fallSilversmith,
  fallScrivener,
  fallInnkeep,
  fallMagpie,
  fallFence,
  fallLookout,
  amberArtisan,
  amberBanker,
  amberCaptain,
  amberWatch,
  amberWatchFordDay,
  amberWatchFordNight,
  amberWatchNorthDay,
  amberWatchNorthNight,
  amberWatchEastDay,
  amberWatchEastNight,
  amberWatchSaltDay,
  amberWatchSaltNight,
  amberWatchRoundDay,
  amberWatchRoundNight,
  amberCourier,
  amberFarmer,
  amberFarmwife,
  amberFerryman,
  amberGrocer,
  amberInnkeep,
  amberKeeper,
  amberMiller,
  amberOrchardist,
  amberOutfitter,
  amberSage,
  amberSmith,
  amberTraderA,
  amberTraderB,
  dawnWardDay,
  dawnWardNight,
  dawnWardDusk,
  wrenHours,
  hallaRounds,
  rillHours,
  varnHours,
  alderHours,
  berritHours,
  otteryHours,
  gillyHours,
  weirHours,
  brammelHours,
  sorrelHours,
  tansyScamp,
  wickScamp,
  saltPortreeve,
  saltFactor,
  saltInnkeep,
  saltChandler,
  saltSalter,
  saltSmoke,
  saltAngler,
  saltBoatwright,
  saltRoper,
  saltBeacon,
  saltPilot,
  saltWatchGate,
  saltWatchGateNight,
  saltWatchSquare,
  saltWatchQuay,
  saltFisherPiers,
  saltFisherYard,
  saltFisherEast,
  waystationKeeper,
  hartSpeaker,
  kdDelfmaster,
  kdFactor,
  kdSealkeeper,
  kdInnkeep,
  kdStablemaster,
  kdSmith,
  kdGlasswright,
  kdEnchanter,
  kdAssayer,
  kdLampwright,
  kdWaykeeper,
  kdSurveyor,
  kdProvisioner,
  kdOutfitter,
  kdSalvewright,
  kdFisher,
  kdBroker,
  kdWatchEastDay,
  kdWatchEastNight,
  kdWatchWicketDay,
  kdWatchWicketNight,
  kdDelverA,
  kdDelverB,
  kdDelverC,
  kdGlasshandA,
  kdGlasshandB,
  hartSpringkeeper,
  hartHuntmaster,
  hartGuide,
  hartFurrier,
  hartTallywife,
  hartChandler,
  hartSmokemaster,
  hartBonecarver,
  hartSmith,
  hartInnkeep,
  hartHerdmaster,
  hartTithekeeper,
  hartElder,
  hartNetkeeper,
  hartWaykeeper,
  hartBuyer,
  hartPedlar,
  hartWatch,
  hartWatchBeacon,
  hartHerder,
];

function buildRegistry(): ReadonlyMap<string, RoutineDef> {
  const map = new Map<string, RoutineDef>();
  const errors: string[] = [];
  for (const raw of SOURCES) {
    const res = validateRoutine(raw);
    if (!res.ok) {
      errors.push(...res.errors);
      continue;
    }
    if (map.has(res.routine.id)) errors.push(`${res.routine.id}: duplicate routine id`);
    else map.set(res.routine.id, res.routine);
  }
  // Authored content is code: a bad def fails the build, loudly.
  if (errors.length > 0) throw new Error(`invalid routine defs:\n  ${errors.join('\n  ')}`);
  return map;
}

export const ROUTINES: ReadonlyMap<string, RoutineDef> = buildRegistry();

export function routineDef(id: string): RoutineDef | undefined {
  return ROUTINES.get(id);
}
