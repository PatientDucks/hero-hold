export interface WaveClearedModalHandle {
  show: (wave: number, goldEarned: number) => void;
  hide: () => void;
  onContinue: (handler: () => void) => void;
}

export function createWaveClearedModal(): WaveClearedModalHandle {
  const overlay = document.createElement('div');
  overlay.className = 'wave-cleared-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="wave-cleared-panel">
      <h2 data-field="headline">Wave Cleared!</h2>
      <p class="wave-cleared-sub" data-field="sub"></p>
      <button type="button" class="btn primary" data-field="continue">Continue</button>
    </div>
  `;
  document.body.appendChild(overlay);

  const headlineEl = overlay.querySelector<HTMLHeadingElement>('[data-field="headline"]')!;
  const subEl = overlay.querySelector<HTMLParagraphElement>('[data-field="sub"]')!;
  const continueBtn = overlay.querySelector<HTMLButtonElement>('[data-field="continue"]')!;

  let continueHandler: (() => void) | null = null;
  continueBtn.addEventListener('click', () => continueHandler?.());

  return {
    show: (wave, goldEarned) => {
      headlineEl.textContent = `Wave ${wave} Cleared!`;
      subEl.textContent = `+${goldEarned} gold`;
      overlay.hidden = false;
    },
    hide: () => {
      overlay.hidden = true;
    },
    onContinue: (handler) => {
      continueHandler = handler;
    },
  };
}
