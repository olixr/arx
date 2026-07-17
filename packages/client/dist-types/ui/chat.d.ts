import type { ChatLine } from '../game/clientGame.js';
export declare class ChatUI {
    private readonly isActive;
    private readonly log;
    private readonly input;
    constructor(onSend: (text: string) => void, isActive: () => boolean);
    get isTyping(): boolean;
    addLine(line: ChatLine): void;
}
//# sourceMappingURL=chat.d.ts.map