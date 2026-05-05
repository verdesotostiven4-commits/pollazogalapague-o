import { MapPin, Clock, MessageCircle, Heart } from 'lucide-react';

const WHATSAPP = '+593989795628';
const MAPS_URL = 'https://maps.app.goo.gl/uM7jPvwGxzyUeeJYA';

const navLinks = [
  { label: 'Inicio', href: '#hero' },
  { label: 'Catálogo', href: '#catalog' },
  { label: 'Delivery', href: '#delivery' },
  { label: 'Galería', href: '#gallery' },
  { label: 'Nosotros', href: '#team' },
  { label: 'Contacto', href: '#location' },
];

const zones = ['Puerto Ayora'];

export default function Footer() {
  return (
    <footer className="bg-amber-950 border-t border-amber-800/50 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="lg:col-span-1">
            <div className="mb-4">
              <img
                src="/logo-final.png"
                alt="Pollazo Galapagueño"
                className="w-28 h-auto"
                style={{ objectFit: 'contain' }}
              />
              <div className="text-orange-400 font-bold text-xs tracking-widest uppercase mt-1">El Mirador</div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed mb-5">
              Pollo fresco y productos para tu hogar en Puerto Ayora, Santa Cruz Island, Galápagos.
            </p>
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 text-green-400 font-semibold px-4 py-2.5 rounded-xl text-sm hover:bg-green-500/30 transition-all"
            >
              <MessageCircle size={16} />
              +593 989 795 628
            </a>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Navegación</h4>
            <ul className="space-y-2">
              {navLinks.map(link => (
                <li key={link.href}>
                  <a href={link.href} className="text-white/50 hover:text-orange-400 text-sm transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Zonas de delivery</h4>
            <ul className="space-y-2">
              {zones.map(zone => (
                <li key={zone} className="flex items-center gap-2 text-white/50 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                  {zone}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wide">Información</h4>
            <div className="space-y-3">
              <div className="flex gap-2">
                <MapPin size={15} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white/50 hover:text-orange-400 text-sm transition-colors leading-relaxed"
                  >
                    El Mirador, Calle Delfín<br />Puerto Ayora, Galápagos
                  </a>
                </div>
              </div>
              <div className="flex gap-2">
                <Clock size={15} className="text-orange-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-white/50 text-sm">Todos los días</p>
                  <p className="text-white/70 text-sm font-semibold">7:00 AM – 8/9 PM</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-amber-800/50 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} Pollazo Galapagueño El Mirador. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-3">
            <p className="text-white/25 text-xs flex items-center gap-1">
              Hecho con <Heart size={11} className="text-orange-400" /> en Galápagos
            </p>
            <span className="text-white/15 text-xs">·</span>
            <a
              href="https://wa.me/+593968257817?text=Hola%20Stiven%2C%20vi%20la%20p%C3%A1gina%20web%20de%20Pollazo%20Galapagueno%20El%20Mirador%20y%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20una%20p%C3%A1gina%20web%20para%20mi%20negocio."
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/20 hover:text-white/50 text-xs transition-colors duration-300"
            >
              Hecho por Stiven Verdesoto
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
