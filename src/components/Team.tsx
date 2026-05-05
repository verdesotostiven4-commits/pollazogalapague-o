import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const members = [
  { name: 'Edgar Verdesoto', role: 'Encargado', image: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=500' },
  { name: 'Mery Loyola', role: 'Encargada', image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=500' },
  { name: 'Josh Levin', role: 'Atención y apoyo operativo', image: 'https://blogger.googleusercontent.com/img/a/AVvXsEgIIAA_pU_FM3sioFKR8XiKHnyh2FwO-ib-vmZfDTZxMG-F7_-21zUU2haflPSdaT-XkPF-6z42QhVcFbPSCqggL1jvh8l-k1AErWhzjd_Vq62S0BgBfPYwS_jtM53Ij-8WGcUoaBiAtwWY1nMYUbeEFK__6L-AcVxTMGf9xVk8MShqcOha21yNw99ET9w' },
  { name: 'Stiven Verdesoto', role: 'Marketing y redes sociales', image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=500' },
];

export default function Team() {
  const { ref, visible } = useScrollReveal();
  const [index, setIndex] = useState(0);
  const current = members[index];
  const go = (dir: number) => setIndex(prev => (prev + dir + members.length) % members.length);

  useEffect(() => {
    const timer = setInterval(() => go(1), 3600);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="team" ref={ref as React.RefObject<HTMLElement>} className="py-20 bg-white/70 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.06),transparent_60%)]" />
      <div className="max-w-3xl mx-auto px-4 relative z-10">
        <div className={`text-center mb-10 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Las personas detrás</span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mt-3">Nuestro <span className="text-gradient-warm">equipo</span></h2>
          <p className="text-gray-500 text-base mt-3">Foto, nombre y rol con navegación manual y cambio automático.</p>
        </div>

        <div className={`relative bg-white rounded-[2rem] border border-orange-100 shadow-xl shadow-orange-100/50 p-6 transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <button onClick={() => go(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white border border-orange-100 shadow-lg flex items-center justify-center text-orange-500 active:scale-95 z-10" aria-label="Anterior"><ChevronLeft size={22} /></button>
          <button onClick={() => go(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white border border-orange-100 shadow-lg flex items-center justify-center text-orange-500 active:scale-95 z-10" aria-label="Siguiente"><ChevronRight size={22} /></button>

          <div className="flex flex-col items-center text-center px-10">
            <div className="w-44 h-44 rounded-full p-1.5 bg-gradient-to-br from-orange-400 via-amber-300 to-yellow-400 shadow-2xl shadow-orange-200/60 mb-5">
              <div className="w-full h-full rounded-full overflow-hidden border-4 border-white bg-gray-50">
                <img key={current.image} src={current.image} alt={current.name} className="w-full h-full object-cover animate-[fadeIn_0.45s_ease]" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900">{current.name}</h3>
            <p className="text-orange-600 font-bold text-sm mt-1">{current.role}</p>
            <div className="flex justify-center gap-2 mt-5">
              {members.map((m, i) => <button key={m.name} onClick={() => setIndex(i)} className={`h-2 rounded-full transition-all ${i === index ? 'w-8 bg-orange-500' : 'w-2 bg-gray-200'}`} />)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
