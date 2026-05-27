const CSS = `
  :host { all: initial; }

  .wrap {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 13px;
    line-height: 1.4;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    padding: 10px 12px;
    min-width: 200px;
    max-width: 420px;
    box-sizing: border-box;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 6px;
    cursor: grab;
    user-select: none;
  }

  .header:active { cursor: grabbing; }

  .badge {
    font-size: 10px;
    font-weight: 700;
    color: #2563eb;
    background: #eff6ff;
    border-radius: 4px;
    padding: 1px 6px;
    letter-spacing: 0.02em;
  }

  .source {
    font-size: 11px;
    color: #9ca3af;
  }

  .loading {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #6b7280;
    font-size: 12px;
    margin-bottom: 9px;
  }

  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid #e5e7eb;
    border-top-color: #2563eb;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .answer-label {
    font-size: 10px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: 3px;
  }

  .value {
    color: #111827;
    font-size: 13px;
    margin-bottom: 8px;
    word-break: break-word;
    white-space: pre-wrap;
    max-height: 180px;
    overflow-y: auto;
  }

  .actions {
    display: flex;
    gap: 6px;
  }

  button {
    border: none;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 12px;
    transition: opacity 0.1s;
  }

  button:hover { opacity: 0.85; }

  .accept {
    background: #2563eb;
    color: #ffffff;
  }

  .dismiss {
    background: transparent;
    color: #6b7280;
    border: 1px solid #e5e7eb !important;
  }

  .regenerate {
    background: transparent;
    color: #6b7280;
    border: none !important;
    padding: 4px 6px;
    font-size: 11px;
    display: none;
  }

  .context-row {
    display: none;
    gap: 6px;
    margin-top: 8px;
    align-items: center;
  }

  .context-input {
    flex: 1;
    font-size: 12px;
    padding: 4px 8px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    outline: none;
    font-family: inherit;
    color: #111827;
    min-width: 0;
  }

  .context-input:focus { border-color: #2563eb; }

  .context-submit {
    background: #2563eb;
    color: #fff;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 10px;
    cursor: pointer;
    border: none !important;
    white-space: nowrap;
  }

  .context-cancel {
    font-size: 11px;
    color: #9ca3af;
    cursor: pointer;
    background: none;
    border: none !important;
    padding: 0 2px;
    font-weight: 500;
  }

  .toggle {
    display: none;
    align-items: center;
    gap: 5px;
    margin-top: 8px;
    cursor: pointer;
    font-size: 11px;
    color: #6b7280;
    user-select: none;
    background: none;
    border: none !important;
    padding: 0;
    font-weight: 500;
  }

  .toggle:hover { color: #374151; opacity: 1; }

  .chevron {
    font-size: 9px;
    transition: transform 0.15s;
    display: inline-block;
  }

  .chevron.open { transform: rotate(90deg); }

  .error-msg {
    font-size: 12px;
    color: #dc2626;
    background: #fef2f2;
    border-radius: 6px;
    padding: 6px 8px;
    margin-bottom: 6px;
  }

  .reasoning {
    display: none;
    font-size: 11px;
    color: #6b7280;
    line-height: 1.5;
    max-height: 140px;
    overflow-y: auto;
    margin-top: 6px;
    padding: 6px 8px;
    background: #f9fafb;
    border-radius: 6px;
  }
`;

export interface TooltipOptions {
  anchor: HTMLElement;
  value: string;
  source: string;
  onAccept: () => void;
  onDismiss: () => void;
  onRegenerate?: (context: string) => void;
  loading?: boolean;
}

export class Tooltip {
  private host: HTMLDivElement;
  private valueEl: HTMLDivElement;
  private reasoningEl: HTMLDivElement;
  private answerLabelEl: HTMLDivElement;
  private loadingEl: HTMLDivElement;
  private acceptBtn: HTMLButtonElement;
  private regenerateBtn: HTMLButtonElement;
  private toggleBtn: HTMLButtonElement;
  private chevronEl: HTMLSpanElement;
  private sourceEl: HTMLSpanElement;
  private onAccept: () => void;
  private onRegenerate: ((context: string) => void) | undefined;
  private contextRowEl: HTMLDivElement;
  private contextInputEl: HTMLInputElement;
  private actionsEl: HTMLDivElement;

  constructor({ anchor, value, source, onAccept, onDismiss, onRegenerate, loading = false }: TooltipOptions) {
    this.onAccept = onAccept;
    this.onRegenerate = onRegenerate;
    this.host = document.createElement("div");
    this.host.style.cssText =
      "position:fixed;z-index:2147483647;pointer-events:auto;";

    const shadow = this.host.attachShadow({ mode: "closed" });

    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);

    const wrap = document.createElement("div");
    wrap.className = "wrap";

    // Header
    const header = document.createElement("div");
    header.className = "header";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "FormFill AI";
    this.sourceEl = document.createElement("span");
    this.sourceEl.className = "source";
    this.sourceEl.textContent = source;
    header.appendChild(badge);
    header.appendChild(this.sourceEl);

    // Loading spinner
    this.loadingEl = document.createElement("div");
    this.loadingEl.className = "loading";
    const spinner = document.createElement("div");
    spinner.className = "spinner";
    const loadingText = document.createElement("span");
    loadingText.textContent = "Generating suggestion…";
    this.loadingEl.appendChild(spinner);
    this.loadingEl.appendChild(loadingText);
    this.loadingEl.style.display = loading ? "flex" : "none";

    // Answer label
    this.answerLabelEl = document.createElement("div");
    this.answerLabelEl.className = "answer-label";
    this.answerLabelEl.textContent = "Suggested answer →";
    this.answerLabelEl.style.display = "none";

    // Value
    this.valueEl = document.createElement("div");
    this.valueEl.className = "value";
    this.valueEl.textContent = value;
    this.valueEl.style.display = loading ? "none" : "block";

    // Actions
    this.actionsEl = document.createElement("div");
    this.actionsEl.className = "actions";
    this.acceptBtn = document.createElement("button");
    this.acceptBtn.className = "accept";
    this.acceptBtn.textContent = "Use this";
    this.acceptBtn.style.display = loading ? "none" : "inline-block";
    this.acceptBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.onAccept();
    });
    const dismissBtn = document.createElement("button");
    dismissBtn.className = "dismiss";
    dismissBtn.textContent = "Dismiss";
    dismissBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onDismiss();
    });

    this.regenerateBtn = document.createElement("button");
    this.regenerateBtn.className = "regenerate";
    this.regenerateBtn.textContent = "↺ Regenerate";
    this.regenerateBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.showContextInput();
    });

    this.actionsEl.appendChild(this.acceptBtn);
    this.actionsEl.appendChild(dismissBtn);
    this.actionsEl.appendChild(this.regenerateBtn);

    // Context input row (shown after clicking Regenerate)
    this.contextRowEl = document.createElement("div");
    this.contextRowEl.className = "context-row";
    this.contextInputEl = document.createElement("input");
    this.contextInputEl.className = "context-input";
    this.contextInputEl.placeholder = "Add context to improve this… (optional)";
    this.contextInputEl.type = "text";
    const contextSubmitBtn = document.createElement("button");
    contextSubmitBtn.className = "context-submit";
    contextSubmitBtn.textContent = "Generate →";
    const contextCancelBtn = document.createElement("button");
    contextCancelBtn.className = "context-cancel";
    contextCancelBtn.textContent = "Cancel";

    const submitContext = (e: MouseEvent | KeyboardEvent) => {
      e.preventDefault();
      const ctx = this.contextInputEl.value.trim();
      this.hideContextInput();
      this.onRegenerate?.(ctx);
    };

    contextSubmitBtn.addEventListener("mousedown", submitContext);
    this.contextInputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submitContext(e as unknown as KeyboardEvent);
      if (e.key === "Escape") { e.preventDefault(); this.hideContextInput(); }
    });
    contextCancelBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.hideContextInput();
    });

    this.contextRowEl.appendChild(this.contextInputEl);
    this.contextRowEl.appendChild(contextSubmitBtn);
    this.contextRowEl.appendChild(contextCancelBtn);

    // Collapsible "Why this answer?" toggle
    this.toggleBtn = document.createElement("button");
    this.toggleBtn.className = "toggle";
    this.chevronEl = document.createElement("span");
    this.chevronEl.className = "chevron";
    this.chevronEl.textContent = "▶";
    const toggleLabel = document.createElement("span");
    toggleLabel.textContent = "Why this answer?";
    this.toggleBtn.appendChild(this.chevronEl);
    this.toggleBtn.appendChild(toggleLabel);

    // Reasoning box (hidden until toggle clicked)
    this.reasoningEl = document.createElement("div");
    this.reasoningEl.className = "reasoning";

    this.toggleBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const isOpen = this.reasoningEl.style.display === "block";
      this.reasoningEl.style.display = isOpen ? "none" : "block";
      this.chevronEl.classList.toggle("open", !isOpen);
    });

    // Drag-to-move via the header
    header.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const startX = e.clientX - this.host.offsetLeft;
      const startY = e.clientY - this.host.offsetTop;

      const onMove = (mv: MouseEvent) => {
        const x = Math.max(0, Math.min(mv.clientX - startX, window.innerWidth - this.host.offsetWidth));
        const y = Math.max(0, Math.min(mv.clientY - startY, window.innerHeight - this.host.offsetHeight));
        this.host.style.left = `${x}px`;
        this.host.style.top = `${y}px`;
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });

    wrap.appendChild(header);
    wrap.appendChild(this.loadingEl);
    wrap.appendChild(this.answerLabelEl);
    wrap.appendChild(this.valueEl);
    wrap.appendChild(this.actionsEl);
    wrap.appendChild(this.contextRowEl);
    wrap.appendChild(this.toggleBtn);
    wrap.appendChild(this.reasoningEl);
    shadow.appendChild(wrap);

    this.position(anchor);
    document.body.appendChild(this.host);
  }

  showError(message: string): void {
    this.loadingEl.style.display = "none";
    const errEl = document.createElement("div");
    errEl.className = "error-msg";
    errEl.textContent = message;
    this.loadingEl.insertAdjacentElement("afterend", errEl);
  }

  get isContextInputOpen(): boolean {
    return this.contextRowEl.style.display === "flex";
  }

  private showContextInput(): void {
    this.actionsEl.style.display = "none";
    this.contextRowEl.style.display = "flex";
    this.contextInputEl.value = "";
    this.contextInputEl.focus();
  }

  private hideContextInput(): void {
    this.contextRowEl.style.display = "none";
    this.actionsEl.style.display = "flex";
  }

  showLoading(): void {
    this.contextRowEl.style.display = "none";
    this.actionsEl.style.display = "flex";
    this.answerLabelEl.style.display = "none";
    this.valueEl.style.display = "none";
    this.acceptBtn.style.display = "none";
    this.regenerateBtn.style.display = "none";
    this.toggleBtn.style.display = "none";
    this.reasoningEl.style.display = "none";
    this.chevronEl.classList.remove("open");
    this.sourceEl.textContent = "generating…";
    this.loadingEl.style.display = "flex";
  }

  resolve(reasoning: string, answer: string, source: string, newOnAccept: () => void, newOnRegenerate?: (ctx: string) => void): void {
    this.onAccept = newOnAccept;
    if (newOnRegenerate) this.onRegenerate = newOnRegenerate;
    this.sourceEl.textContent = source;
    this.answerLabelEl.style.display = "block";
    this.valueEl.textContent = answer;
    this.loadingEl.style.display = "none";
    this.valueEl.style.display = "block";
    this.acceptBtn.style.display = "inline-block";
    this.regenerateBtn.style.display = "inline-block";

    if (reasoning) {
      this.reasoningEl.textContent = reasoning;
      this.toggleBtn.style.display = "flex";
    }
  }

  position(anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect();
    const maxWidth = 420;
    const left = Math.min(rect.left, window.innerWidth - maxWidth - 8);
    this.host.style.top = `${rect.bottom + 6}px`;
    this.host.style.left = `${Math.max(8, left)}px`;
  }

  remove(): void {
    this.host.remove();
  }
}
