/**
 * STUDIO2 KIT — the one place a studio control is born (ONE KIT, ONE
 * TOKEN FILE law). Small typed factories returning plain DOM, styled
 * by kit.css. No framework, no virtual anything — the studio's
 * existing idiom, matured.
 */
export declare function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K];
export interface BtnOpts {
    variant?: 'default' | 'primary' | 'ghost' | 'danger';
    dense?: boolean;
    title?: string;
    icon?: HTMLElement;
    onClick?: (e: MouseEvent) => void;
}
export declare function btn(label: string, opts?: BtnOpts): HTMLButtonElement;
export interface SegOption<T extends string> {
    id: T;
    label: string;
    title?: string;
}
export interface SegHandle<T extends string> {
    root: HTMLElement;
    set(active: T): void;
}
export declare function seg<T extends string>(options: ReadonlyArray<SegOption<T>>, active: T, onPick: (id: T) => void): SegHandle<T>;
/** A stateful toggle chip (lenses, view toggles). */
export declare function chip(label: string, active: boolean, onToggle: (on: boolean) => void, title?: string): HTMLButtonElement;
export interface SliderHandle {
    root: HTMLElement;
    set(v: number): void;
}
/** Label · track · live numeric readout. onInput fires while dragging. */
export declare function sliderRow(label: string, min: number, max: number, value: number, onInput: (v: number) => void): SliderHandle;
/** Key caps: kbd('⌘S') → ⌘ + S caps; kbd('B') → one cap. */
export declare function kbd(keys: string): HTMLElement;
export interface HourRingHandle {
    root: HTMLElement;
    set(win: {
        from: number;
        to: number;
    } | null): void;
}
/**
 * THE HOURS DIAL — a 24h ring with two draggable handles. The lit arc
 * is the active window (from → to clockwise, midnight at the top,
 * wrap supported); null = always. Drag a handle to move it (snaps to
 * half hours); the center reads the window; the small button clears
 * it back to "always".
 */
export declare function hourRing(win: {
    from: number;
    to: number;
} | null, onCommit: (win: {
    from: number;
    to: number;
} | null) => void): HourRingHandle;
export type ToastKind = 'info' | 'success' | 'error';
export declare function toast(text: string, ms?: number, kind?: ToastKind): void;
/**
 * Promise-based confirm dialog — the studio never window.confirm()s.
 * Returns true when the (optionally destructive) action is chosen.
 */
export declare function confirmDialog(message: string, opts?: {
    title?: string;
    action?: string;
    danger?: boolean;
}): Promise<boolean>;
//# sourceMappingURL=kit.d.ts.map