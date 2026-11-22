// Behaviour of SegToggle.astro: a radiogroup of buttons. segInit wires clicks and arrow keys; segSet updates the
// checked button when the mode changes some other way (e.g. the visitor typed into the other field).

export function segSet(root: ParentNode, name: string, value: string): void {
  for (const b of root.querySelectorAll<HTMLButtonElement>(`[data-seg="${name}"] [data-value]`)) {
    const on = b.dataset.value === value;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  }
}

export function segInit(root: ParentNode, name: string, onPick: (value: string) => void): void {
  const group = root.querySelector<HTMLElement>(`[data-seg="${name}"]`);
  if (!group) return;
  const buttons = [...group.querySelectorAll<HTMLButtonElement>('[data-value]')];
  const pick = (b: HTMLButtonElement) => { segSet(root, name, b.dataset.value!); onPick(b.dataset.value!); };
  for (const b of buttons) b.addEventListener('click', () => pick(b));
  group.addEventListener('keydown', (e) => {
    const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (i < 0) return;
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const b = buttons[(i + step + buttons.length) % buttons.length];
    b.focus(); pick(b);
  });
}
