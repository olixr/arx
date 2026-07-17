import type { ChatLine } from '../game/clientGame.js';

const MAX_LINES = 80;

export class ChatUI {
  private readonly log = document.getElementById('chat-log') as HTMLDivElement;
  private readonly input = document.getElementById('chat-input') as HTMLInputElement;

  constructor(
    onSend: (text: string) => void,
    private readonly isActive: () => boolean,
  ) {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive()) return;
      if (e.code === 'Enter') {
        if (document.activeElement === this.input) {
          const text = this.input.value.trim();
          if (text.length > 0) onSend(text);
          this.input.value = '';
          this.input.blur();
        } else {
          this.input.focus();
          e.preventDefault();
        }
      } else if (e.code === 'Escape' && document.activeElement === this.input) {
        this.input.value = '';
        this.input.blur();
      }
    });
  }

  get isTyping(): boolean {
    return document.activeElement === this.input;
  }

  addLine(line: ChatLine): void {
    const el = document.createElement('div');
    el.className = `chat-line ${line.channel}`;
    if (line.channel === 'local' && line.from) {
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = `${line.from}: `;
      el.appendChild(who);
    }
    el.appendChild(document.createTextNode(line.text));
    this.log.appendChild(el);
    while (this.log.children.length > MAX_LINES) this.log.firstChild!.remove();
    this.log.scrollTop = this.log.scrollHeight;
  }
}
