import { Camera } from 'lucide-react';
import { useScrollReveal } from '../hooks/useScrollReveal';

const galleryItems = [
  {
    label: 'Exterior de la tienda',
    image: 'https://images.pexels.com/photos/1005058/pexels-photo-1005058.jpeg?auto=compress&cs=tinysrgb&w=600',
    span: 'col-span-2 row-span-2',
  },
  {
    label: 'Exhibición de pollos',
    image: 'https://images.pexels.com/photos/6210876/pexels-photo-6210876.jpeg?auto=compress&cs=tinysrgb&w=400',
    span: '',
  },
  {
    label: 'Interior de la tienda',
    image: 'https://images.pexels.com/photos/1414235/pexels-photo-1414235.jpeg?auto=compress&cs=tinysrgb&w=400',
    span: '',
  },
  {
    label: 'Productos frescos',
    image: 'https://images.pexels.com/photos/1508666/pexels-photo-1508666.jpeg?auto=compress&cs=tinysrgb&w=400',
    span: '',
  },
  {
    label: 'Nuestro equipo',
    image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=400',
    span: 'col-span-2',
  },
];

export default function Gallery() {
  const { ref, visible } = useScrollReveal();

  return (
    <section id="gallery" ref={ref as React.RefObject<HTMLElement>} className="py-24 bg-amber-50/50 backdrop-blur-sm relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(251,146,60,0.06),transparent_50%)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className={`text-center mb-16 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <span className="text-orange-500 font-bold text-sm tracking-widest uppercase">Nuestra tienda</span>
          <h2 className="text-4xl sm:text-5xl font-black text-gray-900 mt-3 mb-4">
            Galería{' '}
            <span className="text-gradient-warm">fotográfica</span>
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">
            Conoce nuestras instalaciones y productos.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[180px] md:auto-rows-[200px]">
          {galleryItems.map((item, i) => (
            <div
              key={item.label}
              className={`group relative rounded-2xl overflow-hidden border border-orange-200/60 ${item.span} transition-all duration-500 hover:scale-[1.02] hover:z-10 hover:shadow-2xl hover:shadow-orange-200/60 ${
                visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
              style={{ transitionDelay: visible ? `${i * 100}ms` : '0ms' }}
            >
              <img
                src={item.image}
                alt={item.label}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute inset-0 bg-orange-500/0 group-hover:bg-orange-500/10 transition-colors duration-300" />
              <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-2">
                  <Camera size={13} className="text-orange-300" />
                  <span className="text-white text-xs font-semibold">{item.label}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
