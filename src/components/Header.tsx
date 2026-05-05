import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFlyToCart } from '../context/FlyToCartContext';

const navLinks = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Catálogo', href: '#catalog' },
  { label: 'Delivery', href: '#delivery' },
  { label: 'Galería', href: '#gallery' },
  { label: 'Nosotros', href: '#team' },
  { label: 'Contacto', href: '#location' },
];

export default function Header() {
  const { total, setIsOpen } = useCart();
  const { cartPop, setCartRef } = useFlyToCart();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');
  const cartBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setCartRef(cartBtnRef as React.RefObject<HTMLButtonElement>);
  }, [setCartRef]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sectionIds = navLinks.map(l => l.href.replace('#', ''));

    const getActiveId = () => {
      const viewportMid = window.innerHeight / 2;
      let closest: string = sectionIds[0];
      let closestDist = Infinity;

      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue;
        const sectionMid = rect.top + rect.height / 2;
        const dist = Math.abs(sectionMid - viewportMid);
        if (dist < closestDist) {
          closestDist = dist;
          closest = id;
        }
      }
      return closest;
    };

    const onScroll = () => {
      setActiveSection(getActiveId());
    };

    setActiveSection(getActiveId());
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-white/90 backdrop-blur-md shadow-md shadow-orange-100/60 border-b border-orange-100/60'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <a href="#hero" className="flex items-center gap-2 group">
            <img
              src="/logo-final.png"
              alt="Pollazo Galapagueño"
              className="h-10 w-auto group-hover:scale-105 transition-transform duration-300"
              style={{ objectFit: 'contain' }}
            />
            <div className="hidden sm:block">
              <div className={`font-black text-sm leading-tight tracking-wide transition-colors duration-300 ${scrolled ? 'text-gray-900' : 'text-white'}`}
                style={!scrolled ? { textShadow: '0 1px 4px rgba(0,0,0,0.55)' } : {}}>
                Pollazo Galapagueño
              </div>
              <div className={`font-bold text-xs tracking-widest uppercase transition-colors duration-300 ${scrolled ? 'text-orange-500' : 'text-amber-200'}`}
                style={!scrolled ? { textShadow: '0 1px 4px rgba(0,0,0,0.55)' } : {}}>
                El Mirador
              </div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const id = link.href.replace('#', '');
              const isActive = activeSection === id;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                    isActive
                      ? scrolled
                        ? 'text-orange-500'
                        : 'text-white'
                      : scrolled
                        ? 'text-gray-700 hover:text-orange-500 hover:bg-orange-50'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link.label}
                  <span
                    className={`absolute bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-orange-400 transition-all duration-300 ${
                      isActive ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'
                    }`}
                    style={{ transformOrigin: 'center' }}
                  />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <button
              ref={cartBtnRef}
              onClick={() => setIsOpen(true)}
              className={`relative flex items-center gap-2 bg-gradient-to-r from-orange-500 to-yellow-400 hover:from-orange-400 hover:to-yellow-300 text-black font-bold px-4 py-2.5 rounded-xl transition-all duration-300 shadow-md shadow-orange-500/30 hover:scale-105 hover:shadow-lg hover:shadow-orange-400/40 ${cartPop ? 'scale-125 shadow-orange-400/70 shadow-lg' : ''}`}
              style={{ transition: cartPop ? 'transform 0.15s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.15s ease' : undefined }}
            >
              <ShoppingCart size={18} className={cartPop ? 'animate-spin-once' : ''} />
              <span className="hidden sm:block text-sm">Carrito</span>
              {total > 0 && (
                <span className={`absolute -top-2 -right-2 bg-red-500 text-white text-xs font-black w-5 h-5 rounded-full flex items-center justify-center ${cartPop ? 'scale-150' : 'animate-bounce'}`}
                  style={{ transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)' }}>
                  {total}
                </span>
              )}
            </button>
            <button
              className={`md:hidden p-2 rounded-xl transition-colors ${scrolled ? 'text-gray-700 hover:bg-orange-50' : 'text-white/80 hover:bg-white/10'}`}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-t border-orange-100 px-4 pb-6 pt-2">
          {navLinks.map(link => {
            const id = link.href.replace('#', '');
            const isActive = activeSection === id;
            return (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block py-3 text-base font-semibold border-b border-orange-50 transition-colors ${
                  isActive ? 'text-orange-500' : 'text-gray-700 hover:text-orange-500'
                }`}
              >
                {link.label}
              </a>
            );
          })}
        </div>
      )}
    </header>
  );
}
