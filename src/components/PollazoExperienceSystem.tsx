import { useEffect } from 'react';

const STYLE_ID = 'pollazo-experience-system-style';
const CART_COACH_CLASS = 'pollazo-cart-flow-coach';
const TRACKING_LINE_CLASS = 'pollazo-tracking-flow-line';

const canUseDOM = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const installStyles = () => {
  if (!canUseDOM() || document.getElementById(STYLE_ID)) return;

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .${CART_COACH_CLASS} {
      position: relative;
      overflow: hidden;
      border-radius: 28px;
      border: 1px solid rgba(249, 115, 22, 0.16);
      background: linear-gradient(135deg, rgba(255,255,255,0.98), rgba(255,247,237,0.98));
      box-shadow: 0 12px 32px rgba(251, 146, 60, 0.10);
      padding: 14px;
    }

    .${CART_COACH_CLASS}::before {
      content: '';
      position: absolute;
      width: 140px;
      height: 140px;
      right: -72px;
      top: -82px;
      border-radius: 999px;
      background: rgba(251, 191, 36, 0.22);
      filter: blur(18px);
      pointer-events: none;
    }

    .pollazo-flow-top {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }

    .pollazo-flow-kicker {
      margin: 0;
      color: rgb(249, 115, 22);
      font-size: 8px;
      font-weight: 900;
      line-height: 1;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }

    .pollazo-flow-title {
      margin: 4px 0 0;
      color: rgb(15, 23, 42);
      font-size: 13px;
      font-weight: 900;
      font-style: italic;
      line-height: 1.08;
      text-transform: uppercase;
    }

    .pollazo-flow-next {
      flex-shrink: 0;
      border-radius: 999px;
      border: 1px solid rgba(249, 115, 22, 0.14);
      background: rgba(255, 255, 255, 0.78);
      color: rgb(234, 88, 12);
      padding: 7px 9px;
      font-size: 8px;
      font-weight: 900;
      line-height: 1;
      text-transform: uppercase;
      box-shadow: 0 6px 18px rgba(249, 115, 22, 0.08);
    }

    .pollazo-flow-rail {
      position: relative;
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(226, 232, 240, 0.95);
      margin-bottom: 11px;
    }

    .pollazo-flow-fill {
      height: 100%;
      width: var(--pollazo-flow-progress, 25%);
      border-radius: inherit;
      background: linear-gradient(90deg, rgb(249, 115, 22), rgb(251, 191, 36));
      box-shadow: 0 0 18px rgba(249, 115, 22, 0.32);
      transition: width 260ms cubic-bezier(0.16, 1, 0.3, 1);
    }

    .pollazo-flow-steps {
      position: relative;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }

    .pollazo-flow-step {
      display: flex;
      min-width: 0;
      align-items: center;
      justify-content: center;
      gap: 4px;
      border-radius: 14px;
      border: 1px solid rgba(226, 232, 240, 0.9);
      background: rgba(255, 255, 255, 0.82);
      color: rgb(148, 163, 184);
      padding: 8px 4px;
      font-size: 7px;
      font-weight: 900;
      line-height: 1;
      text-align: center;
      text-transform: uppercase;
      transition: transform 180ms ease, color 180ms ease, border-color 180ms ease, background 180ms ease;
    }

    .pollazo-flow-step.is-ready {
      border-color: rgba(34, 197, 94, 0.22);
      background: rgba(240, 253, 244, 0.92);
      color: rgb(22, 101, 52);
    }

    .pollazo-flow-dot {
      width: 7px;
      height: 7px;
      flex-shrink: 0;
      border-radius: 999px;
      background: rgb(203, 213, 225);
    }

    .pollazo-flow-step.is-ready .pollazo-flow-dot {
      background: rgb(34, 197, 94);
      box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.10);
    }

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

    @media (prefers-reduced-motion: no-preference) {
      .pollazo-flow-step.is-ready {
        animation: pollazo-flow-pop 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes pollazo-flow-pop {
        0% { transform: scale(0.96); }
        100% { transform: scale(1); }
      }
    }
  `;

  document.head.appendChild(style);
};

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const includesAny = (text: string, values: string[]) => values.some(value => text.includes(value));

const readCartState = (root: HTMLElement) => {
  const text = normalize(root.textContent || '');
  const deliveryReady = includesAny(text, [
    'direccion lista',
    'address ready',
    'ubicacion en puerto ayora',
    'delivery address',
  ]);
  const paymentReady = includesAny(text, [
    'pago contra entrega',
    'datos de pago listos',
    'efectivo',
    'deuna',
    'transferencia',
    'payment details ready',
  ]);
  const orderReady = includesAny(text, [
    'pedido registrado',
    'order registered',
    'carrito bloqueado',
  ]);

  const ready = [true, deliveryReady, paymentReady, orderReady];
  const completed = ready.filter(Boolean).length;

  return {
    ready,
    completed,
    next:
      !deliveryReady
        ? 'Entrega'
        : !paymentReady
          ? 'Pago'
          : !orderReady
            ? 'Confirmar'
            : 'Listo',
  };
};

const buildCartCoach = () => {
  const wrapper = document.createElement('section');
  wrapper.className = CART_COACH_CLASS;
  wrapper.setAttribute('aria-label', 'Guía de compra');
  wrapper.innerHTML = `
    <div class="pollazo-flow-top">
      <div>
        <p class="pollazo-flow-kicker">Compra guiada</p>
        <p class="pollazo-flow-title">Completa tu pedido paso a paso</p>
      </div>
      <span class="pollazo-flow-next">Siguiente: Entrega</span>
    </div>
    <div class="pollazo-flow-rail"><div class="pollazo-flow-fill"></div></div>
    <div class="pollazo-flow-steps">
      <span class="pollazo-flow-step" data-step="0"><i class="pollazo-flow-dot"></i>Productos</span>
      <span class="pollazo-flow-step" data-step="1"><i class="pollazo-flow-dot"></i>Entrega</span>
      <span class="pollazo-flow-step" data-step="2"><i class="pollazo-flow-dot"></i>Pago</span>
      <span class="pollazo-flow-step" data-step="3"><i class="pollazo-flow-dot"></i>Confirmar</span>
    </div>
  `;

  return wrapper;
};

const updateCartCoach = (cartRoot: HTMLElement) => {
  const scrollContainer = cartRoot.querySelector<HTMLElement>('div.flex-1.overflow-y-auto');
  if (!scrollContainer) return;

  let coach = scrollContainer.querySelector<HTMLElement>(`.${CART_COACH_CLASS}`);
  if (!coach) {
    coach = buildCartCoach();
    scrollContainer.insertBefore(coach, scrollContainer.firstChild);
  }

  const state = readCartState(cartRoot);
  const progress = Math.max(25, Math.min(100, state.completed * 25));
  coach.style.setProperty('--pollazo-flow-progress', `${progress}%`);

  const next = coach.querySelector<HTMLElement>('.pollazo-flow-next');
  if (next) next.textContent = state.next === 'Listo' ? 'Pedido listo' : `Siguiente: ${state.next}`;

  coach.querySelectorAll<HTMLElement>('.pollazo-flow-step').forEach((step, index) => {
    step.classList.toggle('is-ready', Boolean(state.ready[index]));
  });
};

const findCartRoot = () => {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>('main .flex.flex-col.h-full.bg-slate-50.overflow-hidden.relative'));
  return candidates.find(candidate => Boolean(candidate.querySelector('div.flex-1.overflow-y-auto')));
};

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
      const cartRoot = findCartRoot();
      if (cartRoot) updateCartCoach(cartRoot);
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
