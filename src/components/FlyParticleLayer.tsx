import { useCallback, useEffect, useRef, useState } from 'react';
import { useFlyToCart } from '../context/FlyToCartContext';

interface ParticleProps {
  id: number;
  startX: number;
  startY: number;
  cartX: number;
  cartY: number;
  image: string;
}

function Particle({ startX, startY, cartX, cartY, image }: ParticleProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const dx = cartX - startX;
    const dy = cartY - startY;
    const arcX = dx * 0.46;
    const arcY = Math.min(-88, dy * 0.2 - 72);

    const animation = element.animate(
      [
        { transform: 'translate3d(0, 0, 0) scale(0.72) rotate(0deg)', opacity: 0 },
        { transform: 'translate3d(0, -10px, 0) scale(1.14) rotate(-4deg)', opacity: 1, offset: 0.12 },
        { transform: `translate3d(${arcX}px, ${arcY}px, 0) scale(1.02) rotate(-12deg)`, opacity: 1, offset: 0.5 },
        { transform: `translate3d(${dx * 0.9}px, ${dy * 0.84}px, 0) scale(0.5) rotate(12deg)`, opacity: 0.9, offset: 0.84 },
        { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.08) rotate(22deg)`, opacity: 0 },
      ],
      {
        duration: 820,
        easing: 'cubic-bezier(0.22, 0.72, 0.2, 1)',
        fill: 'forwards',
      }
    );

    return () => animation.cancel();
  }, [cartX, cartY, startX, startY]);

  return (
    <div
      ref={ref}
      className="fixed pointer-events-none z-[9999]"
      style={{
        left: startX - 21,
        top: startY - 21,
        width: 42,
        height: 42,
        willChange: 'transform, opacity',
      }}
    >
      <div className="relative h-full w-full overflow-hidden rounded-full border-[3px] border-white bg-white shadow-[0_12px_28px_rgba(249,115,22,0.45)]">
        <img
          src={image || '/logo-final.png'}
          alt=""
          className="h-full w-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 rounded-full ring-2 ring-orange-300/60" />
      </div>
    </div>
  );
}

export default function FlyParticleLayer() {
  const { particles, cartRef } = useFlyToCart();
  const [cartPos, setCartPos] = useState({ x: window.innerWidth - 60, y: 30 });

  const updateCartPosition = useCallback(() => {
    if (!cartRef?.current) return;
    const rect = cartRef.current.getBoundingClientRect();
    setCartPos({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [cartRef]);

  useEffect(() => {
    updateCartPosition();
    window.addEventListener('resize', updateCartPosition);
    window.addEventListener('scroll', updateCartPosition, true);
    return () => {
      window.removeEventListener('resize', updateCartPosition);
      window.removeEventListener('scroll', updateCartPosition, true);
    };
  }, [particles.length, updateCartPosition]);

  return (
    <>
      {particles.map(particle => (
        <Particle
          key={particle.id}
          id={particle.id}
          startX={particle.startX}
          startY={particle.startY}
          cartX={cartPos.x}
          cartY={cartPos.y}
          image={particle.image}
        />
      ))}
    </>
  );
}
