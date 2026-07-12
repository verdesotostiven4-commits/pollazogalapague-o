import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface FlyParticle {
  id: number;
  startX: number;
  startY: number;
  image: string;
}

interface FlyToCartContextType {
  particles: FlyParticle[];
  triggerFly: (startX: number, startY: number, image: string) => void;
  cartPop: boolean;
  cartRef: React.RefObject<HTMLButtonElement> | null;
  setCartRef: (ref: React.RefObject<HTMLButtonElement>) => void;
}

const FlyToCartContext = createContext<FlyToCartContextType | null>(null);

let nextId = 0;

export function FlyToCartProvider({ children }: { children: ReactNode }) {
  const [particles, setParticles] = useState<FlyParticle[]>([]);
  const [cartPop, setCartPop] = useState(false);
  const [cartRef, setCartRefState] = useState<React.RefObject<HTMLButtonElement> | null>(null);

  const setCartRef = useCallback((ref: React.RefObject<HTMLButtonElement>) => {
    setCartRefState(ref);
  }, []);

  const triggerFly = useCallback((startX: number, startY: number, image: string) => {
    const id = nextId++;

    setParticles(previous => [...previous.slice(-2), { id, startX, startY, image }]);

    window.setTimeout(() => {
      setCartPop(true);
      window.setTimeout(() => setCartPop(false), 280);
    }, 640);

    window.setTimeout(() => {
      setParticles(previous => previous.filter(particle => particle.id !== id));
    }, 940);
  }, []);

  return (
    <FlyToCartContext.Provider value={{ particles, triggerFly, cartPop, cartRef, setCartRef }}>
      {children}
    </FlyToCartContext.Provider>
  );
}

export function useFlyToCart() {
  const context = useContext(FlyToCartContext);
  if (!context) throw new Error('useFlyToCart must be used within FlyToCartProvider');
  return context;
}
