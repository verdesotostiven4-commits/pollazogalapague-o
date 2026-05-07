import { useMemo, useState, useEffect } from 'react';
import { 
  Edit3, LogOut, Package, Plus, Save, Search, Send, 
  Settings, Star, Trash2, Users, Image, Trophy, 
  Calendar, Link, User, Crown, Medal, CheckCircle2 
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Category, OrderStatus, Product } from '../types';
import { buildStatusWhatsAppUrl } from '../utils/whatsapp';
import { supabase } from '../lib/supabase';

const BOLITAS_DEL_PIN = Array.of(0, 1, 2, 3);
const ADMIN_PIN = '1328';
const PIN_KEY = 'pollazo_admin_auth';
const emptyProduct: Omit<Product, 'id'> & { id?: string } = { name: '', category: 'Pollos', price: '', description: '', image: '', badge: '', available: true };
const statuses: OrderStatus[] = Array.of('Recibido', 'Preparando', 'Enviado', 'Entregado', 'Cancelado');
const PIN_PAD = Array.of('1','2','3','4','5','6','7','8','9','','0','⌫');

const TABS = Array.of(
  { id: 'orders', label: 'Pedidos', Icon: Send },
  { id: 'products', label: 'Menú', Icon: Package },
  { id: 'customers', label: 'Clientes', Icon: Users },
  { id: 'ranking_config', label: 'Concurso', Icon: Trophy },
  { id: 'branding', label: 'Marca', Icon: Image }
);

function PinScreen({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const add = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next); setError(false);
    if (next.length === 4) {
      if (next === ADMIN_PIN) { sessionStorage.setItem(PIN_KEY, '1'); onAuth(); }
      else { setError(true); setTimeout(() => setPin(''), 350); }
    }
  };
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
      <div className="w-full max-w-xs text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <img src="/logo-final.png" className="w-24 h-24 object-contain mx-auto" />
        <div><h1 className="text-white text-2xl font-black">Panel Admin</h1><p className="text-white/50 text-sm">PIN de acceso</p></div>
        <div className="flex justify-center gap-3">
          {BOLITAS_DEL_PIN.map(i => (
            <span key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${i < pin.length ? 'bg-orange-500 scale-125' : error ? 'bg-red-500 animate-shake' : 'bg-white/20'}`} />
          ))}
        </div>
        {error && <p className="text-red-400 text-sm font-bold animate-pulse">PIN incorrecto</p>}
        <div className="grid grid-cols-3 gap-3">
          {PIN_PAD.map((d,i) => d ? (
            <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : add(d)} className="aspect-square rounded-2xl bg-white/10 text-white text-xl font-black active:scale-90 transition-transform">
              {d}
            </button>
          ) : <div key={i} />)}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(PIN_KEY) === '1');
  const { products, categories, overrides, settings, updateSetting, setOverride, addProduct, updateProduct, deleteProduct, customers, addCustomerPoints, orders, updateOrderStatus } = useAdmin();
  const [tab, setTab] = useState<'products' | 'branding' | 'customers' | 'orders' | 'ranking_config'>('orders');
  const [search, setSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [draft, setDraft] = useState(emptyProduct);
  const [editing, setEditing] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});

  const [extraSettings, setExtraSettings] = useState({
    logo_url: '/logo-final.png',
    ranking_title: 'Ranking de Clientes',
    prize_description: '¡Gana un Combo Familiar!',
    ranking_end_date: '',
    winner_photo_url: '' // Nuevo campo para la foto del ganador
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').single();
        if (data) setExtraSettings({
          logo_url: data.logo_url || '/logo-final.png',
          ranking_title: data.ranking_title || 'Ranking de Clientes',
          prize_description: data.prize_description || '¡Gana un Combo Familiar!',
          ranking_end_date: data.ranking_end_date || '',
          winner_photo_url: data.winner_photo_url || ''
        });
      } catch (e) { console.error("Error cargando ajustes"); }
    };
    fetchSettings();
  }, []);

  const saveExtraSettings = async () => {
    try {
      await supabase.from('settings').upsert({ id: 'global', ...extraSettings });
      alert('¡Ajustes de temporada guardados!');
    } catch (err) { alert('Error al guardar ajustes'); }
  };

  const filteredProducts = useMemo(() => products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const ranking = useMemo(() => Array.from(customers).sort((a,b) => b.points - a.points), [customers]);

  const saveProduct = async () => {
    if (!draft.name.trim()) return;
    if (editing) await updateProduct(editing, draft);
    else await addProduct(draft);
    setDraft(emptyProduct); setEditing(null);
  };

  const edit = (p: Product) => {
    setEditing(p.id);
    setDraft({ id: p.id, name: p.name, category: p.category, price: p.price ?? '', description: p.description ?? '', image: p.image ?? '', badge: p.badge ?? '', available: p.available !== false });
    setTab('products');
  };

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={extraSettings.logo_url} className="w-10 h-10 object-contain rounded-lg" onError={(e) => (e.currentTarget.src = '/logo-final.png')} />
            <div><p className="font-black text-gray-900 leading-none text-sm uppercase italic">Admin Pollazo</p></div>
          </div>
          <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map((tabItem) => {
            const Icon = tabItem.Icon;
            return (
              <button key={tabItem.id} onClick={() => setTab(tabItem.id as any)} 
                className={`flex-shrink-0 rounded-2xl px-5 py-3 text-xs font-black flex items-center gap-2 transition-all ${tab===tabItem.id?'bg-orange-500 text-white shadow-lg shadow-orange-200':'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'}`}>
                <Icon size={16}/>{tabItem.label}
              </button>
            )
          })}
        </div>

        {/* 📋 CLIENTES (CON BUSCADOR Y PUNTOS MANUALES) */}
        {tab === 'customers' && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <h2 className="font-black text-lg flex items-center gap-2 text-gray-900"><Users size={20} className="text-blue-500"/> Gestión de Clientes</h2>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input 
                  value={custSearch} 
                  onChange={e => setCustSearch(e.target.value)} 
                  placeholder="Buscar por nombre o # de WhatsApp..." 
                  className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 focus:bg-white transition-all outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {ranking
                .filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(custSearch.toLowerCase()))
                .map((c, i) => (
                <div key={c.id} className="bg-white rounded-3xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm relative overflow-hidden">
                  {i < 3 && <div className="absolute top-0 right-0 p-2 opacity-10"><Trophy size={40}/></div>}
                  
                  <div className="relative">
                    <div className={`w-14 h-14 rounded-2xl overflow-hidden border-2 ${i === 0 ? 'border-yellow-400 ring-4 ring-yellow-50' : i === 1 ? 'border-gray-300' : i === 2 ? 'border-orange-300' : 'border-gray-100'}`}>
                       <img src={c.avatar_url || '/logo-final.png'} className="w-full h-full object-cover" />
                    </div>
                    {i === 0 && <Crown className="absolute -top-2 -left-2 text-yellow-500 drop-shadow-md" size={24}/>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate uppercase italic">{i + 1}º {c.name || 'Sin nombre'}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{c.phone}</p>
                    <div className="mt-1 flex items-center gap-2">
                       <span className="bg-orange-50 text-orange-600 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{c.points} Pts</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                    <input 
                      type="number"
                      value={points[c.id] ?? ''} 
                      onChange={e=>setPoints({...points,[c.id]:e.target.value})} 
                      className="w-12 bg-white border border-gray-100 rounded-lg py-2 text-center text-xs font-black" 
                      placeholder="+5"
                    />
                    <button 
                      onClick={()=>{addCustomerPoints(c.id, Number(points[c.id]||0)); setPoints({...points,[c.id]:''});}} 
                      className="bg-black text-white rounded-lg p-2 hover:bg-orange-500 transition-colors active:scale-90"
                    >
                      <Plus size={18}/>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 🏆 CONFIGURACIÓN DE CONCURSO (TEMPORADAS) */}
        {tab === 'ranking_config' && (
          <section className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
              <div className="p-3 bg-yellow-100 rounded-2xl text-yellow-600"><Trophy size={24}/></div>
              <div>
                <h2 className="font-black text-xl text-gray-900 uppercase italic">Temporada de Premios</h2>
                <p className="text-xs text-gray-400 font-bold uppercase">Configura el evento actual</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título del Evento</label>
                  <input value={extraSettings.ranking_title} onChange={e=>setExtraSettings({...extraSettings, ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold mt-1 border-2 border-transparent focus:border-orange-500 outline-none transition-all" placeholder="Ej: Ranking Pollazo Mayo" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Descripción del Gran Premio</label>
                  <textarea value={extraSettings.prize_description} onChange={e=>setExtraSettings({...extraSettings, prize_description: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold mt-1 border-2 border-transparent focus:border-orange-500 outline-none transition-all" rows={3} placeholder="Describe qué ganará el primer lugar..." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha y Hora de Cierre</label>
                    <input type="datetime-local" value={extraSettings.ranking_end_date} onChange={(e=>setExtraSettings({...extraSettings, ranking_end_date: e.target.value}))} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold mt-1 border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Link Foto del Ganador (Muro de Fama)</label>
                    <input value={extraSettings.winner_photo_url} onChange={e=>setExtraSettings({...extraSettings, winner_photo_url: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold mt-1 border-2 border-transparent focus:border-orange-500 outline-none transition-all" placeholder="URL de la foto entregando el premio" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={saveExtraSettings} className="w-full bg-orange-500 text-white py-5 rounded-[24px] font-black uppercase tracking-widest shadow-xl shadow-orange-100 hover:bg-orange-600 transition-all flex items-center justify-center gap-3">
              <Save size={20}/> Actualizar Concurso
            </button>
          </section>
        )}

        {/* RESTO DE PESTAÑAS (PEDIDOS, MENÚ, MARCA) MANTENIDAS */}
        {tab === 'orders' && (
          <section className="space-y-4">
            <h2 className="font-black text-lg flex items-center gap-2 text-gray-900 px-2"><Send size={20} className="text-green-500"/> Pedidos Recientes</h2>
            {orders.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
                  <p className="text-gray-400 font-bold">Aún no hay pedidos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map(o => {
                  const customer = customers.find(c => c.phone === o.customer_phone || c.id === o.customer_id);
                  return (
                    <div key={o.id} className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-sm animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                         <div className="flex items-center gap-3">
                            <img src={customer?.avatar_url || '/logo-final.png'} className="w-12 h-12 rounded-full object-cover border-2 border-orange-100" />
                            <div>
                              <p className="font-black text-gray-900 leading-tight">{customer?.name || o.customer_phone}</p>
                              <p className="text-[10px] text-gray-400 font-bold mt-0.5">Orden: {o.order_code}</p>
                            </div>
                         </div>
                         <div className="text-right">
                           <p className="font-black text-orange-500">${o.total}</p>
                           <p className="text-[9px] text-gray-400 font-bold uppercase">{o.status}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <select 
                          value={o.status} 
                          onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                          className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 text-sm font-bold text-gray-700 outline-none"
                        >
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <a href={buildStatusWhatsAppUrl(o.customer_phone, o.order_code, o.status)} target="_blank" className="bg-[#25D366] text-white rounded-xl px-4 py-3 font-black text-xs flex items-center gap-2">
                          <Send size={14}/> Notificar
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        {tab === 'products' && (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-sm animate-in fade-in">
              <h2 className="font-black text-gray-900 flex items-center gap-2 uppercase italic"><Plus size={20} className="text-orange-500"/> {editing ? 'Editar' : 'Nuevo'} Producto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Nombre" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold" />
                 <select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as Category})} className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                 <input value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} placeholder="Precio" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold" />
                 <input value={draft.image} onChange={e=>setDraft({...draft,image:e.target.value})} placeholder="URL imagen" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold" />
                 <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descripción" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold md:col-span-2" rows={2} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProduct} className="flex-1 bg-orange-500 text-white rounded-2xl py-4 font-black shadow-lg shadow-orange-100 active:scale-95 transition-transform uppercase tracking-widest">Guardar en Menú</button>
                {editing && <button onClick={()=>{setEditing(null);setDraft(emptyProduct)}} className="bg-gray-100 text-gray-500 rounded-2xl px-6 py-4 font-bold">Cancelar</button>}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
              <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full bg-gray-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all"/>
              </div>
              <div className="space-y-4">
                {filteredProducts.map(p => { 
                  const available = overrides[p.id]?.available ?? p.available !== false; 
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-2 bg-gray-50/50 rounded-2xl border border-gray-50">
                      <img src={p.image || '/logo-final.png'} className="w-14 h-14 object-cover rounded-xl shadow-sm border border-white"/>
                      <div className="flex-1 min-w-0"><p className="font-black text-sm text-gray-900 truncate uppercase italic">{p.name}</p></div>
                      <div className="flex gap-1">
                        <button onClick={()=>setOverride(p.id,{available:!available})} className={`p-2 rounded-xl ${available?'text-green-500 bg-green-50':'text-red-500 bg-red-50'}`}><Package size={18}/></button>
                        <button onClick={()=>edit(p)} className="p-2 bg-white text-gray-400 border border-gray-100 rounded-xl shadow-sm"><Edit3 size={18}/></button>
                        <button onClick={()=>deleteProduct(p.id)} className="p-2 bg-red-50 text-red-400 rounded-xl"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {tab === 'branding' && (
          <section className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 animate-in fade-in shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2 text-gray-900 uppercase italic"><Image size={20} className="text-orange-500"/> Marca de la App</h2>
            <div className="space-y-4">
              <div className="flex flex-col items-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                 <img src={extraSettings.logo_url} className="w-24 h-24 object-contain bg-white rounded-xl shadow-sm mb-4 p-2" onError={(e) => (e.currentTarget.src = '/logo-final.png')} />
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vista previa del logo actual</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">URL del Logo (.png recomendado)</label>
                <input 
                  type="text" 
                  value={extraSettings.logo_url} 
                  onChange={(e) => setExtraSettings({...extraSettings, logo_url: e.target.value})}
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-4 py-4 text-sm font-bold outline-none transition-all"
                  placeholder="https://imgur.com/tu-logo.png"
                />
              </div>
            </div>
            <button onClick={saveExtraSettings} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-2">Actualizar Identidad</button>
          </section>
        )}
      </main>
    </div>
  );
}
