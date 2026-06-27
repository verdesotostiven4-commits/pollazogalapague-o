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
        transform: `translate(${dx}px, ${dy}px) scale(0.2)`,
        opacity: 0,
        transition: 'transform 0.38s cubic-bezier(0.18, 0.9, 0.2, 1), opacity 0.38s ease-out',
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
      <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg shadow-orange-500/40 flex items-center justify-center border-2 border-white/80">
        <div className="w-2 h-2 rounded-full bg-white/90" />
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
        />
      ))}
    </>
  );
}
