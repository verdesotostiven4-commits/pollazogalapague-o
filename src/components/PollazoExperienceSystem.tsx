import { useEffect } from 'react';

const STYLE_ID = 'pollazo-experience-system-style';
const TRACKING_LINE_CLASS = 'pollazo-tracking-flow-line';

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const installStyles = () => {
  if (!canUseDOM() || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${TRACKING_LINE_CLASS} {
      position: relative;
      height: 8px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(255, 237, 213, 0.95);
      margin: 0 0 12px;
    }

    .${TRACKING_LINE_CLASS} > span {
      display: block;
      height: 100%;
      width: var(--pollazo-tracking-progress, 20%);
      border-radius: inherit;
      background: linear-gradient(90deg, rgb(249, 115, 22), rgb(251, 191, 36));
      box-shadow: 0 0 18px rgba(249, 115, 22, 0.28);
      transition: width 320ms cubic-bezier(0.16, 1, 0.3, 1);
    }
  `;

  document.head.appendChild(style);
};

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const updateTrackingLine = () => {
  const sections = Array.from(document.querySelectorAll<HTMLElement>('section'));
  const progressSection = sections.find(section => {
    const text = normalize(section.textContent || '');
    return text.includes('progreso') && text.includes('paso') && text.includes('de 5');
  });

  if (!progressSection) return;

  let line = progressSection.querySelector<HTMLElement>(`.${TRACKING_LINE_CLASS}`);
  if (!line) {
    line = document.createElement('div');
    line.className = TRACKING_LINE_CLASS;
    line.innerHTML = '<span></span>';
    const grid = progressSection.querySelector('.grid.grid-cols-5');
    progressSection.insertBefore(line, grid || progressSection.firstChild);
  }

  const match = (progressSection.textContent || '').match(/Paso\s+(\d)\s+de\s+5/i);
  const step = match ? Number(match[1]) : 1;
  const progress = Math.max(20, Math.min(100, step * 20));
  line.style.setProperty('--pollazo-tracking-progress', `${progress}%`);
};

export default function PollazoExperienceSystem() {
  useEffect(() => {
    if (!canUseDOM()) return undefined;

    installStyles();

    let frame = 0;
    const run = () => {
      frame = 0;
      updateTrackingLine();
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(run);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });

    schedule();
    window.addEventListener('click', schedule, true);
    window.addEventListener('popstate', schedule);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('click', schedule, true);
      window.removeEventListener('popstate', schedule);
    };
  }, []);

  return null;
}
