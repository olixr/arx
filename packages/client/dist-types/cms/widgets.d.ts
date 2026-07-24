/**
 * The Content Studio control library — rich, informative controls in
 * place of bare text inputs: searchable icon comboboxes, sliders that
 * show where a value sits in the whole registry, element-colored
 * status chips, and comparison bars. Every widget reports through a
 * plain onChange so editors stay simple.
 */
export declare const el: (tag: string, cls?: string, text?: string) => HTMLElement;
export interface ComboOption {
    id: string;
    label: string;
    sub?: string;
    icon?: string;
}
/**
 * A searchable picker with icons — the answer to 1000-option selects.
 * Click opens a filtered popover; type to narrow; Enter takes the top
 * hit; Esc closes. The trigger shows the current pick with its icon.
 */
export declare function combobox(options: () => ComboOption[], value: string | undefined, onPick: (id: string) => void, placeholder?: string): HTMLElement;
export interface StatDistribution {
    min: number;
    max: number;
    median: number;
}
/**
 * A slider + number pairing that also SHOWS the value: the fill bar
 * is the position inside the registry's real range, the tick is the
 * registry median — "is 36 hp a lot?" answers itself.
 */
export declare function statSlider(opts: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    note?: string;
    dist?: StatDistribution;
    onInput: (v: number) => void;
}): HTMLElement;
/** Element-colored multi-select chips (resistances, weaknesses). */
export declare function statusChips(active: readonly string[], onToggle: (id: string, on: boolean) => void): HTMLElement;
/** One on/off feature chip with an explanation tooltip. */
export declare function featureChip(label: string, on: boolean, title: string, onToggle: (on: boolean) => void): HTMLElement;
/** A labeled horizontal bar — comparisons at a glance. */
export declare function bar(label: string, value: number, max: number, color: string, meta?: string): HTMLElement;
/** A small stat pill for derived facts (DPS, temperament, reach). */
export declare function pill(text: string, title?: string, tone?: 'ink' | 'brass' | 'ok' | 'danger'): HTMLElement;
/** Distribution over a numeric field of a registry. */
export declare function distribution(values: number[]): StatDistribution;
//# sourceMappingURL=widgets.d.ts.map