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
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setActive(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const dx = cartX - startX;
  const dy = cartY - startY;

  const style: React.CSSProperties = active
    ? {
        transform: `translate(${dx}px, ${dy}px) scale(0.3)`,
        opacity: 0,
        transition: 'transform 0.9s cubic-bezier(0.22, 0.68, 0, 1.2), opacity 0.9s ease-in',
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
        left: startX - 18,
        top: startY - 18,
        width: 36,
        height: 36,
        ...style,
      }}
    >
      <div className="w-full h-full rounded-full bg-gradient-to-br from-orange-400 to-yellow-400 shadow-lg shadow-orange-500/50 flex items-center justify-center border-2 border-orange-300/60"
        style={{ backdropFilter: 'blur(2px)' }}
      >
        <div className="w-2 h-2 rounded-full bg-white/80" />
      </div>
      <div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-300/60 to-yellow-300/30 animate-ping"
        style={{ animationDuration: '0.8s', animationIterationCount: 1 }}
      />
    </div>
  );
}

export default function FlyParticleLayer() {
  const { particles, cartRef } = useFlyToCart();
  const [cartPos, setCartPos] = useState({ x: window.innerWidth - 60, y: 30 });

  useEffect(() => {
    const update = () => {
      if (cartRef?.current) {
        const rect = cartRef.current.getBoundingClientRect();
        setCartPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, { passive: true });
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update);
    };
  }, [cartRef]);

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
