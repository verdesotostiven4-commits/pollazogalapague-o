import { useMemo, useState, useEffect } from 'react';
import { 
  Edit3, LogOut, Package, Plus, Save, Search, Send, 
  Settings, Star, Trash2, Users, Image, Trophy, 
  Calendar, Link, User, Crown, Medal, CheckCircle2, Eye, EyeOff 
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
  const { 
    products, categories, overrides, settings, updateSetting, setOverride, 
    addProduct, updateProduct, deleteProduct, customers, addCustomerPoints, 
    orders, updateOrderStatus, extraSettings, updateExtraSettings,
    seasons, finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners 
  } = useAdmin();
  
  const [tab, setTab] = useState<'products' | 'branding' | 'customers' | 'orders' | 'ranking_config'>('orders');
  const [search, setSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [draft, setDraft] = useState(emptyProduct);
  const [editing, setEditing] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});

  const filteredProducts = useMemo(() => products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const ranking = useMemo(() => Array.from(customers).sort((a,b) => b.points - a.points), [customers]);

  // ✅ FUNCIÓN PARA CERRAR TEMPORADA Y GUARDAR TOP 3
  const handleFinalizeSeason = async () => {
    if (!confirm("¿Deseas finalizar el evento actual y guardar a los 3 mejores en el historial?")) return;
    
    // Tomamos los 3 mejores del ranking actual
    const top3Winners = ranking.slice(0, 3).map((c, i) => ({
      name: c.name || 'Cliente',
      points: c.points,
      avatar_url: c.avatar_url,
      photo_url: '', // Se llenará después con la foto de entrega
      rank: i + 1
    }));

    await finalizeSeason(
      extraSettings.ranking_title, 
      extraSettings.prize_description, 
      top3Winners
    );
    
    alert("¡Temporada finalizada! Ahora puedes gestionar las fotos en el historial.");
  };

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

        {/* 🏆 CONFIGURACIÓN DE CONCURSO (TEMPORADA ACTUAL + HISTORIAL) */}
        {tab === 'ranking_config' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* EVENTO EN VIVO */}
            <section className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-orange-100 rounded-2xl text-orange-600 animate-pulse"><Trophy size={24}/></div>
                  <div>
                    <h2 className="font-black text-xl text-gray-900 uppercase italic">Evento en Vivo</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Lo que ven los clientes ahora</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Título del Ranking</label>
                    <input value={extraSettings.ranking_title} onChange={e=>updateExtraSettings({ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha de Finalización</label>
                    <input type="datetime-local" value={extraSettings.ranking_end_date} onChange={e=>updateExtraSettings({ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Premio de Temporada</label>
                    <textarea value={extraSettings.prize_description} onChange={e=>updateExtraSettings({prize_description: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all" rows={2} />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex gap-3">
                  <button onClick={handleFinalizeSeason} className="flex-1 bg-black text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all shadow-xl shadow-gray-200 active:scale-95">
                    Finalizar Temporada Actual
                  </button>
                </div>
              </div>
            </section>

            {/* 🕰️ SALÓN DE LA FAMA (GESTIÓN DE HISTORIAL) */}
            <section className="space-y-4">
              <h2 className="font-black text-lg flex items-center gap-2 text-gray-900 px-2 uppercase italic">
                <CheckCircle2 size={20} className="text-green-500"/> Historial de Temporadas
              </h2>
              
              {seasons.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
                  <Trophy size={40} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-gray-400 font-bold text-sm uppercase">No hay temporadas guardadas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {seasons.map((s) => (
                    <div key={s.id} className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm space-y-4 relative overflow-hidden group">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-xl ${s.is_published ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                            {s.is_published ? <Eye size={18}/> : <EyeOff size={18}/>}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 uppercase italic leading-none">{s.name}</p>
                            <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase">{s.prize}</p>
                          </div>
                        </div>
                        <button onClick={() => confirm("¿Borrar esta temporada del historial?") && deleteSeason(s.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18}/>
                        </button>
                      </div>

                      {/* EDITOR DE FOTOS DE GANADORES */}
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        <p className="text-[10px] font-black text-orange-500 uppercase italic tracking-widest mb-1 flex items-center gap-1">
                          <Image size={12}/> Fotos de Entrega (URL)
                        </p>
                        {s.winners.map((w: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] ${idx===0?'bg-yellow-400 text-black':idx===1?'bg-slate-200 text-slate-600':'bg-orange-100 text-orange-600'}`}>
                              {idx+1}º
                            </div>
                            <input 
                              placeholder="Pegar link de la foto aquí..." 
                              className="flex-1 bg-transparent text-[10px] font-bold outline-none"
                              value={w.photo_url || ''}
                              onChange={(e) => {
                                const newWinners = [...s.winners];
                                newWinners[idx].photo_url = e.target.value;
                                updateSeasonWinners(s.id, newWinners);
                              }}
                            />
                            {w.photo_url && <div className="w-6 h-6 rounded-md overflow-hidden"><img src={w.photo_url} className="w-full h-full object-cover"/></div>}
                          </div>
                        ))}
                      </div>

                      {/* BOTÓN PUBLICAR */}
                      <button 
                        onClick={() => toggleSeasonVisibility(s.id, !s.is_published)}
                        className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${
                          s.is_published 
                            ? 'bg-green-500 text-white shadow-green-100' 
                            : 'bg-white border-2 border-gray-100 text-gray-400 hover:border-orange-500 hover:text-orange-500'
                        }`}
                      >
                        {s.is_published ? '✅ Visible en la App' : 'Publicar Resultados'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* 📋 CLIENTES (MANTENIDO) */}
        {tab === 'customers' && (
          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm space-y-4">
              <h2 className="font-black text-lg flex items-center gap-2 text-gray-900"><Users size={20} className="text-blue-500"/> Gestión de Clientes</h2>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Buscar por nombre o # de WhatsApp..." className="w-full bg-gray-50 rounded-2xl pl-11 pr-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 focus:bg-white transition-all outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {ranking.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(custSearch.toLowerCase())).map((c, i) => (
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
                    <input type="number" value={points[c.id] ?? ''} onChange={e=>setPoints({...points,[c.id]:e.target.value})} className="w-12 bg-white border border-gray-100 rounded-lg py-2 text-center text-xs font-black" placeholder="+5" />
                    <button onClick={()=>{addCustomerPoints(c.id, Number(points[c.id]||0)); setPoints({...points,[c.id]:''});}} className="bg-black text-white rounded-lg p-2 hover:bg-orange-500 transition-colors active:scale-90"><Plus size={18}/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 📦 PEDIDOS (MANTENIDO) */}
        {tab === 'orders' && (
          <section className="space-y-4">
            <h2 className="font-black text-lg flex items-center gap-2 text-gray-900 px-2"><Send size={20} className="text-green-500"/> Pedidos Recientes</h2>
            {orders.length === 0 ? (
              <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
                  <p className="text-gray-400 font-bold text-sm uppercase italic">No hay pedidos registrados</p>
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
                              <p className="font-black text-gray-900 leading-tight italic uppercase text-xs">{customer?.name || o.customer_phone}</p>
                              <p className="text-[9px] text-gray-400 font-bold mt-0.5 tracking-tighter">ORDEN: {o.order_code}</p>
                            </div>
                         </div>
                         <div className="text-right">
                           <p className="font-black text-orange-500 text-sm italic">${o.total}</p>
                           <p className="text-[8px] font-black text-gray-400 uppercase italic">{o.status}</p>
                         </div>
                      </div>
                      <div className="flex gap-2">
                        <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)} className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 text-[10px] font-black text-gray-700 outline-none">
                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <a href={buildStatusWhatsAppUrl(o.customer_phone, o.order_code, o.status)} target="_blank" className="bg-[#25D366] text-white rounded-xl px-4 py-3 font-black text-[10px] flex items-center gap-2 active:scale-95 transition-all">
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

        {/* 🍗 PRODUCTOS (MANTENIDO) */}
        {tab === 'products' && (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4 shadow-sm animate-in fade-in">
              <h2 className="font-black text-gray-900 flex items-center gap-2 uppercase italic text-sm"><Plus size={18} className="text-orange-500"/> {editing ? 'Editar' : 'Nuevo'} Producto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Nombre" className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] font-bold" />
                 <select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as Category})} className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] font-bold outline-none">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                 <input value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} placeholder="Precio" className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] font-bold" />
                 <input value={draft.image} onChange={e=>setDraft({...draft,image:e.target.value})} placeholder="URL imagen" className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] font-bold" />
                 <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descripción" className="bg-gray-50 rounded-xl px-4 py-3 text-[11px] font-bold md:col-span-2" rows={2} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProduct} className="flex-1 bg-orange-500 text-white rounded-2xl py-4 font-black shadow-lg shadow-orange-100 active:scale-95 transition-transform uppercase tracking-widest text-[10px]">Guardar en Menú</button>
                {editing && <button onClick={()=>{setEditing(null);setDraft(emptyProduct)}} className="bg-gray-100 text-gray-500 rounded-2xl px-6 py-4 font-bold text-[10px]">Cancelar</button>}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm">
              <div className="relative mb-6"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full bg-gray-50 rounded-2xl pl-12 pr-4 py-4 text-[11px] font-bold outline-none border-2 border-transparent focus:border-orange-500 transition-all"/></div>
              <div className="space-y-4">
                {filteredProducts.map(p => { 
                  const available = overrides[p.id]?.available ?? p.available !== false; 
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-2 bg-gray-50/50 rounded-2xl border border-gray-50">
                      <img src={p.image || '/logo-final.png'} className="w-14 h-14 object-cover rounded-xl shadow-sm border border-white"/>
                      <div className="flex-1 min-w-0"><p className="font-black text-[11px] text-gray-900 truncate uppercase italic">{p.name}</p></div>
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

        {/* 🎨 MARCA (MANTENIDO) */}
        {tab === 'branding' && (
          <section className="bg-white rounded-3xl border border-gray-100 p-6 space-y-6 animate-in fade-in shadow-sm">
            <h2 className="font-black text-lg flex items-center gap-2 text-gray-900 uppercase italic text-sm"><Image size={20} className="text-orange-500"/> Marca de la App</h2>
            <div className="space-y-4">
              <div className="flex flex-col items-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                 <img src={extraSettings.logo_url} className="w-24 h-24 object-contain bg-white rounded-xl shadow-sm mb-4 p-2" onError={(e) => (e.currentTarget.src = '/logo-final.png')} />
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest italic">Logo Actual</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase ml-1 italic">URL del Logo (.png)</label>
                <input type="text" value={extraSettings.logo_url} onChange={(e) => updateExtraSettings({logo_url: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-4 py-4 text-[11px] font-black outline-none transition-all" placeholder="Link de imagen..." />
              </div>
            </div>
            <button onClick={saveExtraSettings} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase tracking-widest flex items-center justify-center gap-2 text-[11px] active:scale-95 shadow-xl shadow-gray-200">Actualizar Identidad</button>
          </section>
        )}
      </main>
    </div>
  );
}
