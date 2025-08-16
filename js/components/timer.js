export function renderTimer(seconds) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 30;
  return `
    <div class="card">
      <h2>Rest</h2>
      <p aria-live="polite">Next set in <span id="timer-seconds">${safeSeconds}</span>s</p>
      <div class="progress" style="height: 8px; background: var(--muted, #eee); border-radius: 999px; overflow: hidden;">
        <div id="timer-progress" style="height: 100%; width: 0%; background: var(--primary, #007bff);"></div>
      </div>
    </div>
  `;
}

export function startTimer(seconds, { onTick, onComplete } = {}) {
  const total = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 30;
  let remaining = total;

  // Initial paint
  if (typeof onTick === 'function') onTick(remaining, total);

  const intervalId = setInterval(() => {
    remaining -= 1;
    if (typeof onTick === 'function') onTick(remaining, total);
    if (remaining <= 0) {
      clearInterval(intervalId);
      if (typeof onComplete === 'function') onComplete();
    }
  }, 1000);

  // Return a cancel function
  return () => clearInterval(intervalId);
}


