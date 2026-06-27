import { useEffect, useRef, useState } from 'react';
import { useFlyToCart } from '../context/FlyToCartContext';

interface ParticleProps {
  id: number;
  startX: number;
  startY: number;
  cartX: number;
  cartY: number;
  image: string;
}

const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

function Particle({ startX, startY, cartX, cartY, image }: ParticleProps) {
  const [active, setActive] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = prefersReducedMotion();

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const dx = cartX - startX;
  const dy = cartY - startY;
  const lift = Math.max(-118, Math.min(-42, dy * 0.18 - 72));
  const duration = reducedMotion ? 180 : 620;
  const productImage = !imageFailed && image ? image : '/logo-final.png';

  const style: React.CSSProperties = active
    ? {
        transform: `translate(${dx}px, ${dy}px) scale(0.22) rotate(10deg)`,
        opacity: 0,
        transition: `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${duration}ms ease-out`,
      }
    : {
        transform: 'translate(0px, 0px) scale(1) rotate(0deg)',
        opacity: 1,
        transition: 'none',
      };

  const innerStyle: React.CSSProperties = active && !reducedMotion
    ? {
        transform: `translateY(${lift}px) scale(0.92) rotate(-12deg)`,
        transition: `transform ${Math.round(duration * 0.62)}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
      }
    : {
        transform: 'translateY(0px) scale(1) rotate(0deg)',
        transition: 'none',
      };

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: startX - 18,
        top: startY - 18,
        width: 36,
        height: 36,
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      <div style={innerStyle} className="relative w-full h-full">
        <span className="absolute inset-0 rounded-full bg-orange-300/35 blur-md scale-125" />
        <div className="relative w-full h-full rounded-full bg-white shadow-xl shadow-orange-500/35 flex items-center justify-center border-2 border-white overflow-hidden">
          <img
            src={productImage}
            alt="Producto agregado"
            className="w-full h-full object-contain p-1 bg-gradient-to-br from-orange-50 to-yellow-50"
            loading="eager"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        </div>
        <span className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-yellow-300 shadow-sm" />
      </div>
    </div>
  );
}

export default function FlyParticleLayer() {
  const { particles, cartRef } = useFlyToCart();
  const [cartPos, setCartPos] = useState({ x: window.innerWidth - 60, y: 30 });

  useEffect(() => {
    if (cartRef?.current) {
      const rect = cartRef.current.getBoundingClientRect();
      setCartPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
  }, [cartRef, particles.length]);

  return (
    <>
      {particles.map(p => (
        <Particle
          key={p.id}
          id={p.id}
          startX={p.startX}
          startY={p.startY}
          cartX={cartPos.x}
          cartY={cartPos.y}
          image={p.image}
        />
      ))}
    </>
  );
}
