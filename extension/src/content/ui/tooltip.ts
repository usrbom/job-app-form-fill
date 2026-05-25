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
    padding: 10px 12px 10px 12px;
    min-width: 180px;
    max-width: 340px;
    box-sizing: border-box;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-bottom: 5px;
  }

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

  .value {
    color: #111827;
    font-size: 13px;
    margin-bottom: 9px;
    word-break: break-word;
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
`;

export interface TooltipOptions {
  anchor: HTMLElement;
  value: string;
  source: string;
  onAccept: () => void;
  onDismiss: () => void;
}

export class Tooltip {
  private host: HTMLDivElement;

  constructor({ anchor, value, source, onAccept, onDismiss }: TooltipOptions) {
    this.host = document.createElement("div");
    this.host.style.cssText =
      "position:fixed;z-index:2147483647;pointer-events:auto;";

    const shadow = this.host.attachShadow({ mode: "closed" });

    // Styles
    const style = document.createElement("style");
    style.textContent = CSS;
    shadow.appendChild(style);

    // Tooltip container
    const wrap = document.createElement("div");
    wrap.className = "wrap";

    // Header row: badge + source
    const header = document.createElement("div");
    header.className = "header";

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "FormFill AI";

    const sourceEl = document.createElement("span");
    sourceEl.className = "source";
    sourceEl.textContent = source;

    header.appendChild(badge);
    header.appendChild(sourceEl);

    // Value
    const valueEl = document.createElement("div");
    valueEl.className = "value";
    valueEl.textContent = value; // textContent — no XSS risk

    // Actions
    const actions = document.createElement("div");
    actions.className = "actions";

    const acceptBtn = document.createElement("button");
    acceptBtn.className = "accept";
    acceptBtn.textContent = "Use this";
    acceptBtn.addEventListener("mousedown", (e) => {
      e.preventDefault(); // prevent input blur before click fires
      onAccept();
    });

    const dismissBtn = document.createElement("button");
    dismissBtn.className = "dismiss";
    dismissBtn.textContent = "Dismiss";
    dismissBtn.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onDismiss();
    });

    actions.appendChild(acceptBtn);
    actions.appendChild(dismissBtn);

    wrap.appendChild(header);
    wrap.appendChild(valueEl);
    wrap.appendChild(actions);
    shadow.appendChild(wrap);

    this.position(anchor);
    document.body.appendChild(this.host);
  }

  position(anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect();
    // Prefer below field; if off-screen, let it scroll
    this.host.style.top = `${rect.bottom + 6}px`;
    this.host.style.left = `${rect.left}px`;
  }

  remove(): void {
    this.host.remove();
  }
}
