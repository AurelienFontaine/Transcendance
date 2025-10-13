// requirement/frontend/handlers/notify.ts
export type NoticeType = 'success' | 'error' | 'warning' | 'info';

let container: HTMLDivElement | null = null;

function ensureContainer(): HTMLDivElement {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.id = 'toast-root';
  container.className = 'toast toast-end toast-bottom fixed right-4 bottom-4 z-[10000] flex flex-col gap-3 pointer-events-none';
  document.body.appendChild(container);
  return container;
}

function typeClass(type: NoticeType): string {
  switch (type) {
    case 'success': return 'alert-success';
    case 'error':   return 'alert-error';
    case 'warning': return 'alert-warning';
    default:        return 'alert-info';
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;', "'":'&#39;'})[ch]!
  );
}

export function notify(
  message: string,
  opts: { type?: NoticeType; title?: string; timeout?: number; persist?: boolean } = {}
) {
  const { type = 'info', title, timeout = 3500, persist = false } = opts;
  const root = ensureContainer();

  const wrapper = document.createElement('div');
  wrapper.className = `alert ${typeClass(type)} shadow-lg rounded-xl border pointer-events-auto opacity-0 translate-y-2 transition-all duration-200`;

  // Icônes minimalistes (SVG inline)
  const icon =
    type === 'success' ? '✓' :
    type === 'error'   ? '⚠️' :
    type === 'warning' ? '!'  : 'ℹ️';

  wrapper.innerHTML = `
    <div class="flex items-start gap-3 w-full">
      <div class="text-base leading-none mt-0.5 select-none">${icon}</div>
      <div class="min-w-0">
        ${title ? `<div class="font-semibold mb-0.5">${escapeHtml(title)}</div>` : ''}
        <div class="text-sm leading-snug break-words">${escapeHtml(message)}</div>
      </div>
      <button type="button" class="btn btn-ghost btn-xs ml-2 shrink-0" aria-label="Fermer">×</button>
    </div>
  `;

  const closeBtn = wrapper.querySelector('button') as HTMLButtonElement;
  let hideTimer: number | null = null;

  const remove = () => {
    wrapper.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => wrapper.remove(), 200);
  };

  // Pause au survol
  const startTimer = () => {
    if (persist) return;
    hideTimer = window.setTimeout(remove, timeout);
  };
  const clearTimer = () => {
    if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null; }
  };

  closeBtn.addEventListener('click', () => { clearTimer(); remove(); });
  wrapper.addEventListener('mouseenter', clearTimer);
  wrapper.addEventListener('mouseleave', startTimer);

  root.appendChild(wrapper);
  // petite apparition animée
  requestAnimationFrame(() => wrapper.classList.remove('opacity-0', 'translate-y-2'));
  startTimer();
}
