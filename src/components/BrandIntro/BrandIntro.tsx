import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, Leaf, Mountain, ShieldCheck } from 'lucide-react';
import { brandIntroAssets } from './sceneAssets';
import './BrandIntro.css';

type IntroProps = {
  /** Navegar a la tienda sin recargar y sin modificar el flujo de compras. */
  onContinue: () => void;
};

type Flight = {
  id: number;
  direction: 'left' | 'right';
  top: number;
  duration: number;
  scale: number;
};

const FEATURES = [
  { icon: Leaf, text: <>Frescura<br />garantizada</> },
  { icon: ShieldCheck, text: <>Calidad<br />en tu mesa</> },
  { icon: Mountain, text: <>De nuestras<br />islas</> },
];

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min);

/**
 * Pantalla de bienvenida cinematográfica, construida por capas.
 *
 * El panel izquierdo y la curva central son HTML/CSS/SVG. Las imágenes
 * solo se emplean para la foto/vegetación y pueden sustituirse después.
 */
export default function BrandIntro({ onContinue }: IntroProps) {
  const [entered, setEntered] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const [wingFrame, setWingFrame] = useState(0);
  const exitTimer = useRef<number | null>(null);
  const birdEnabled = brandIntroAssets.birdFrames.every(Boolean);

  useEffect(() => {
    const animationFrame = window.requestAnimationFrame(() => setEntered(true));
    return () => {
      window.cancelAnimationFrame(animationFrame);
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  // Las aves aparecen en momentos y trayectorias variables, NO en un ciclo fijo.
  useEffect(() => {
    if (!birdEnabled) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return undefined;

    let cancelled = false;
    let id = 0;
    const timers: number[] = [];

    const schedule = (delay: number, fn: () => void) => {
      const handle = window.setTimeout(fn, delay);
      timers.push(handle);
    };

    const nextFlight = () => {
      if (cancelled) return;
      if (document.hidden) {
        schedule(6000, nextFlight);
        return;
      }

      const duration = randomBetween(8500, 13200);
      id += 1;
      setFlight({
        id,
        direction: Math.random() < 0.5 ? 'left' : 'right',
        top: randomBetween(16, 52),
        duration,
        scale: randomBetween(0.6, 1.05),
      });

      schedule(duration + 300, () => {
        if (cancelled) return;
        setFlight(null);
        schedule(randomBetween(10000, 24000), nextFlight);
      });
    };

    schedule(randomBetween(5500, 10500), nextFlight);
    return () => {
      cancelled = true;
      timers.forEach(window.clearTimeout);
    };
  }, [birdEnabled]);

  useEffect(() => {
    if (!flight) return undefined;
    const timer = window.setInterval(() => {
      setWingFrame((current) => (current + 1) % 3);
    }, 175);
    return () => window.clearInterval(timer);
  }, [flight]);

  const enterStore = () => {
    if (exiting) return;
    setExiting(true);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    exitTimer.current = window.setTimeout(onContinue, reducedMotion ? 0 : 560);
  };

  return (
    <main
      className={`brandIntro ${entered ? 'brandIntro--entered' : ''} ${exiting ? 'brandIntro--exiting' : ''}`}
      aria-label="Bienvenidos a Pollazo Galapagueño"
    >
      <div className="brandIntro__scene" aria-hidden="true">
        <div className="brandIntro__scenery">
          {!brandIntroAssets.background && <div className="brandIntro__islands" />}
          {brandIntroAssets.background && (
            <img
              className="brandIntro__layer brandIntro__layer--background"
              src={brandIntroAssets.background}
              alt=""
              fetchPriority="high"
            />
          )}
        </div>

        {brandIntroAssets.leavesBack && (
          <img className="brandIntro__layer brandIntro__layer--leavesBack" src={brandIntroAssets.leavesBack} alt="" />
        )}

        {flight && birdEnabled && (
          <div
            key={flight.id}
            className={`brandIntro__bird brandIntro__bird--${flight.direction}`}
            style={{
              '--bird-top': `${flight.top}%`,
              '--bird-duration': `${flight.duration}ms`,
              '--bird-scale': flight.scale,
            } as CSSProperties}
          >
            <img src={brandIntroAssets.birdFrames[wingFrame]} alt="" />
          </div>
        )}

        {brandIntroAssets.productAndLog ? (
          <img
            className="brandIntro__layer brandIntro__layer--product"
            src={brandIntroAssets.productAndLog}
            alt=""
            fetchPriority="high"
          />
        ) : (
          <div className="brandIntro__productPlaceholder">
            <span>El pollo y el tronco aparecerán aquí</span>
            <small>Imagen transparente · próxima fase</small>
          </div>
        )}

        {brandIntroAssets.leavesTop && (
          <img className="brandIntro__layer brandIntro__layer--leavesTop" src={brandIntroAssets.leavesTop} alt="" />
        )}
        {brandIntroAssets.leavesFrontBlurred && (
          <img className="brandIntro__layer brandIntro__layer--leavesFront" src={brandIntroAssets.leavesFrontBlurred} alt="" />
        )}
      </div>

      {/* La curva es vectorial y se ajusta al tamaño de pantalla. */}
      <div className="brandIntro__panel" />
      <svg
        className="brandIntro__curve"
        viewBox="0 0 160 1000"
        preserveAspectRatio="none"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M0 0 H66 C171 174 115 299 84 459 C46 634 154 765 71 1000 H0 Z" />
      </svg>

      <section className="brandIntro__content">
        <div className="brandIntro__logoReveal">
          <img
            className="brandIntro__logo"
            src={brandIntroAssets.logo}
            alt="Pollazo Galapagueño"
            fetchPriority="high"
          />
        </div>

        <div className="brandIntro__copy">
          <div className="brandIntro__dash" aria-hidden="true" />
          <h1>
            <span>Bienvenidos a</span>
            <strong>Pollazo Galapagueño</strong>
          </h1>
          <p>Pollo fresco y de calidad, con el sabor de nuestras islas.</p>

          <div className="brandIntro__features" aria-label="Nuestros valores">
            {FEATURES.map(({ icon: Icon, text }, index) => (
              <div className="brandIntro__feature" key={index}>
                <Icon size={28} strokeWidth={1.8} aria-hidden="true" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <button className="brandIntro__cta" onClick={enterStore} type="button">
            <span>Comenzar</span>
            <span className="brandIntro__ctaArrow" aria-hidden="true">
              <ArrowRight size={23} strokeWidth={2.5} />
            </span>
          </button>
        </div>
      </section>
    </main>
  );
}
