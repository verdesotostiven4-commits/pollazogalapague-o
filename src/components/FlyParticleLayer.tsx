import { useEffect, useRef, useState } from 'react';
import { useFlyToCart } from '../context/FlyToCartContext';

interface ParticleProps {
  id: number;
  startX: number;
  startY: number;
  cartX: number;
  cartY: number;
}

function Particle({ startX, startY, cartX, cartY }: ParticleProps) {
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const dx = cartX - startX;
  const dy = cartY - startY;

  const style: React.CSSProperties = active
    ? {
        transform: `translate(${dx}px, ${dy}px) scale(0.22)`,
        opacity: 0,
        transition: 'transform 0.54s cubic-bezier(0.2, 0.85, 0.16, 1), opacity 0.54s ease-out',
      }
    : {
        transform: 'translate(0px, 0px) scale(1)',
        opacity: 1,
        transition: 'none',
      };

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: startX - 14,
        top: startY - 14,
        width: 28,
        height: 28,
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      <div
        className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg shadow-orange-500/40 flex items-center justify-center border-2 border-white/80"
        style={{ backdropFilter: 'blur(2px)' }}
      >
        <div className="w-2 h-2 rounded-full bg-white/90" />
      </div>
    </div>
  );
}

export default function FlyParticleLayer() {
  const { particles, cartRef } = useFlyToCart();
  const [cartPos, setCartPos] = useState({ x: window.innerWidth - 60, y: 30 });

  useEffect(() => {
    let raf = 0;

    const update = () => {
      if (raf) return;

      raf = window.requestAnimationFrame(() => {
        raf = 0;

        if (cartRef?.current) {
          const rect = cartRef.current.getBoundingClientRect();
          setCartPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
        }
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
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
        />
      ))}
    </>
  );
}
