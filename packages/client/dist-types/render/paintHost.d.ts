/**
 * THE PAINTER'S GRIP — the one slice of the Renderer every extracted
 * painter family holds (foundations F2). One shared type keeps
 * cross-family calls assignable; it only ever shrinks as machinery
 * moves out of the class.
 */
import type { Renderer } from './renderer.js';
export type PaintHost = Pick<Renderer, 'acquireSpriteCanvas' | 'admitSpriteBake' | 'bakeBleedE' | 'bakeBleedPx' | 'bakeBleedW' | 'bakeCostEma' | 'bakeVeilFull' | 'bakingMask' | 'bandGridPx' | 'beginContactFill' | 'beginHeightLayer' | 'beginStructOutline' | 'breezeAt' | 'buildGhost' | 'buildSite' | 'camera' | 'castEdgeQuad' | 'castOffset' | 'cineEid' | 'cliffMemo' | 'cliffSprites' | 'ctx' | 'demolishGhost' | 'doorOpenness' | 'doorShakeAt' | 'doorVeil' | 'dpr' | 'fallClipMemo' | 'fallClipVersion' | 'fallMemo' | 'fallMemoVersion' | 'fgElevAt' | 'fgGroundAt' | 'frameDt' | 'frameNo' | 'game' | 'garrisonHeightAt' | 'garrisonish' | 'ghostIcons' | 'h' | 'liftedWTS' | 'liveStats' | 'outlineOn' | 'ownBuiltTiles' | 'paintGarrisonLeaf' | 'particles' | 'pickWorld' | 'porchAt' | 'queueGlow' | 'renderLift' | 'sky' | 'spriteBakeMsLeft' | 'stageAssembling' | 'stageCastScratch' | 'stageItemAlpha' | 'stagePushPaintRaw' | 'stageSpriteTex' | 'stageWorld' | 'stageWorldItems' | 'stageWorldStats' | 'staticLayerOn' | 'trail' | 'treeBakeBudget' | 'visArrivalCount' | 'visSpriteMsLeft' | 'visibleTileBounds' | 'w' | 'wallish' | 'waterFxFull' | 'wornLitBodies' | 'wornMotion' | 'wornOrigin' | 'zoomGliding'>;
//# sourceMappingURL=paintHost.d.ts.map