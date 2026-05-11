import { useMemo, useState, useEffect } from 'react';
import { 
  Edit3, LogOut, Package, Plus, Save, Search, Send, 
  Settings, Star, Trash2, Users, Image, Trophy, 
  Calendar, Link, User, Crown, Medal, CheckCircle2, Eye, EyeOff, ClipboardList, Clock, PackageSearch 
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
    products = [], categories = [], overrides = {}, settings, updateSetting, setOverride, 
    addProduct, updateProduct, deleteProduct, customers = [], addCustomerPoints, 
    orders = [], updateOrderStatus, extraSettings, updateExtraSettings,
    seasons = [], finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners 
  } = useAdmin();
  
  const [tab, setTab] = useState<'products' | 'branding' | 'customers' | 'orders' | 'ranking_config'>('orders');
  const [search, setSearch] = useState('');
  const [custSearch, setCustSearch] = useState('');
  const [draft, setDraft] = useState(emptyProduct);
  const [editing, setEditing] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});

  const filteredProducts = useMemo(() => (products || []).filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const ranking = useMemo(() => Array.from(customers || []).sort((a,b) => (b.points || 0) - (a.points || 0)), [customers]);

  const handleFinalizeSeason = async () => {
    if (!confirm("¿Deseas finalizar el evento actual?")) return;
    const top3Winners = ranking.slice(0, 3).map((c, i) => ({
      name: c.name || 'Cliente',
      points: c.points,
      avatar_url: c.avatar_url,
      photo_url: '', 
      rank: i + 1,
      prize_won: i === 0 ? (extraSettings?.prize_1 || '') : i === 1 ? (extraSettings?.prize_2 || '') : (extraSettings?.prize_3 || '')
    }));
    await finalizeSeason(extraSettings?.ranking_title || 'Ranking VIP', "Premios VIP Entregados", top3Winners);
    alert("¡Temporada finalizada!");
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
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={extraSettings?.logo_url || '/logo-final.png'} className="w-10 h-10 object-contain rounded-lg" />
          <p className="font-black text-gray-900 leading-none text-xs uppercase italic tracking-tighter">Admin Panel VIP</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400 active:scale-75 transition-colors"><LogOut size={20}/></button>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-shrink-0 rounded-2xl px-5 py-3 text-xs font-black flex items-center gap-2 transition-all ${tab===t.id?'bg-orange-500 text-white shadow-lg shadow-orange-200':'bg-white text-gray-600 border border-gray-100'}`}>
              <t.Icon size={16}/>{t.label}
            </button>
          ))}
        </div>

        {tab === 'ranking_config' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <section className="bg-white rounded-[32px] border border-gray-100 p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><Trophy size={24}/></div>
                <h2 className="font-black text-xl uppercase italic">Evento en Vivo</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase italic ml-1">Título del Ranking</label>
                  <input value={extraSettings?.ranking_title || ''} onChange={e=>updateExtraSettings({ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase italic ml-1">Fecha de Finalización</label>
                  <input type="datetime-local" value={extraSettings?.ranking_end_date || ''} onChange={e=>updateExtraSettings({ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 gap-4 pt-4 border-t border-gray-50">
                  <div className="bg-yellow-50/50 p-3 rounded-2xl border border-yellow-100 shadow-sm flex items-center gap-3">
                    <Crown size={20} className="text-yellow-500" />
                    <input placeholder="Premio Oro" value={extraSettings?.prize_1 || ''} onChange={e=>updateExtraSettings({prize_1: e.target.value})} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <Medal size={20} className="text-slate-400" />
                    <input placeholder="Premio Plata" value={extraSettings?.prize_2 || ''} onChange={e=>updateExtraSettings({prize_2: e.target.value})} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                  </div>
                  <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100 shadow-sm flex items-center gap-3">
                    <Medal size={20} className="text-orange-500" />
                    <input placeholder="Premio Bronce" value={extraSettings?.prize_3 || ''} onChange={e=>updateExtraSettings({prize_3: e.target.value})} className="flex-1 bg-transparent text-sm font-bold outline-none" />
                  </div>
                </div>
              </div>
              <button onClick={handleFinalizeSeason} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all">Finalizar Temporada Actual</button>
            </section>

            <section className="space-y-4">
              <h2 className="font-black text-lg px-2 uppercase italic text-gray-900"><History size={18} className="inline mr-2 text-orange-500"/> Historial de Ganadores</h2>
              {(seasons || []).length === 0 ? <div className="text-center py-10 bg-white rounded-[32px] text-gray-300 font-bold uppercase text-xs">Historial Vacío</div> : (
                <div className="space-y-4">
                  {(seasons || []).map((s) => (
                    <div key={s.id} className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-center"><p className="font-black uppercase italic text-sm">{s.name}</p><button onClick={()=>deleteSeason(s.id)} className="text-red-400 p-2 active:scale-75"><Trash2 size={18}/></button></div>
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        {(s.winners || []).map((w: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${idx===0?'bg-yellow-400':idx===1?'bg-slate-300':'bg-orange-900 text-white'}`}>{idx+1}º</div>
                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black truncate">{w.name}</p><input placeholder="Link de foto..." className="w-full text-[9px] outline-none text-blue-500 italic" value={w.photo_url || ''} onChange={(e) => { const n = [...s.winners]; n[idx].photo_url = e.target.value; updateSeasonWinners(s.id, n); }} /></div>
                            {w.photo_url && <img src={w.photo_url} className="w-8 h-8 rounded-lg object-cover border border-gray-50" />}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => toggleSeasonVisibility(s.id, !s.is_published)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${s.is_published ? 'bg-green-500 text-white shadow-green-100' : 'bg-gray-100 text-gray-400'}`}>{s.is_published ? '✅ Visible en Ranking' : 'Publicar Ganadores'}</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {tab === 'orders' && (
           <section className="space-y-4 animate-in fade-in duration-500 pb-10">
             <h2 className="font-black text-lg px-2 uppercase italic text-gray-900"><Send size={18} className="inline mr-2 text-green-500"/> Pedidos Entrantes</h2>
             <div className="space-y-4">
                {(orders || []).length === 0 ? <p className="text-gray-400 text-center py-20 uppercase font-black text-xs">Sin pedidos hoy</p> : (orders || []).map(o => {
                  const customer = (customers || []).find(c => (c.phone || '').replace(/\D/g, '') === (o.customer_phone || '').replace(/\D/g, ''));
                  const time = o.created_at ? new Date(o.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                  
                  // ✅ LÓGICA DE PRECIO ULTRA-RESILIENTE
                  const displayTotal = parseFloat(o.total as any) || 0;

                  return (
                    <div key={o.id} className="bg-white rounded-[32px] border border-gray-100 p-5 space-y-4 shadow-sm animate-in fade-in">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                         <div className="flex items-center gap-3">
                            <img src={customer?.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${o.customer_phone}`} className="w-10 h-10 rounded-full object-cover border-2 border-orange-100" />
                            <div>
                               <div className="flex items-center gap-2">
                                  <p className="font-black text-gray-900 uppercase text-xs truncate leading-none">{customer?.name || o.customer_phone}</p>
                                  <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                     <Clock size={8} /><span className="text-[8px] font-black">{time}</span>
                                  </div>
                               </div>
                               <p className="text-[8px] text-gray-400 font-black mt-1 tracking-tighter uppercase">ID: {o.order_code}</p>
                            </div>
                         </div>
                         <div className="text-right leading-none">
                            <p className="font-black text-orange-600 text-sm italic">${displayTotal.toFixed(2)}</p>
                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-1">{o.status}</p>
                         </div>
                      </div>

                      <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/30 space-y-2.5">
                        <div className="flex items-center gap-2 mb-1 border-b border-orange-100/50 pb-1.5">
                          <PackageSearch size={14} className="text-orange-500" />
                          <p className="text-[9px] font-black text-orange-700 uppercase tracking-[0.1em]">Detalle de Compra</p>
                        </div>
                        {(o.items || []).length > 0 ? (o.items || []).map((item: any, idx: number) => {
                           const itemPrice = parseFloat(item.price || item.product?.price || '0') || 0;
                           const itemName = item.name || item.product?.name || `Producto #${item.id || idx}`;
                           return (
                             <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-gray-700 uppercase">
                                <span className="flex-1 truncate"><span className="text-orange-600 font-black mr-1">{item.quantity}x</span> {itemName}</span>
                                <span className="ml-2 text-gray-400 font-black shrink-0">${(itemPrice * item.quantity).toFixed(2)}</span>
                             </div>
                           );
                        }) : <p className="text-[9px] text-gray-400 font-bold italic">Pedido sin detalle (formato antiguo)</p>}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)} className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 text-[10px] font-black outline-none">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <a href={buildStatusWhatsAppUrl(o.customer_phone, o.order_code, o.status)} target="_blank" className="bg-[#25D366] text-white rounded-xl px-5 py-3 font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-md transition-all"><Send size={14}/> Notificar</a>
                      </div>
                    </div>
                  );
                })}
             </div>
           </section>
        )}

        {tab === 'customers' && (
          <section className="space-y-4 pb-10">
            <div className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm space-y-4">
              <h2 className="font-black text-lg text-gray-900 uppercase italic"><Users size={20} className="text-blue-500 inline mr-2"/> Gestión Clientes</h2>
              <input value={custSearch} onChange={e => setCustSearch(e.target.value)} placeholder="Buscar por nombre o celular..." className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 transition-all outline-none shadow-inner" />
            </div>
            <div className="grid grid-cols-1 gap-3">
              {ranking.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(custSearch.toLowerCase())).map((c, i) => (
                <div key={c.id} className="bg-white rounded-3xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm relative overflow-hidden">
                  <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-14 h-14 rounded-2xl object-cover border border-orange-100" />
                  <div className="flex-1 min-w-0"><p className="font-black text-gray-900 text-sm truncate uppercase italic">{i + 1}º {c.name || 'Guerrero'}</p><p className="text-[9px] font-black text-gray-400">{c.phone}</p><span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase mt-1 inline-block">{(c.points || 0)} Pts</span></div>
                  <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl"><input type="number" value={points[c.id] ?? ''} onChange={e=>setPoints({...points,[c.id]:e.target.value})} className="w-12 bg-white border border-gray-100 rounded-lg py-2 text-center text-xs font-black outline-none" placeholder="+5" /><button onClick={()=>{addCustomerPoints(c.id, Number(points[c.id]||0)); setPoints({...points,[c.id]:''});}} className="bg-black text-white rounded-lg p-2 active:scale-90"><Plus size={18}/></button></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'products' && (
          <section className="space-y-6 pb-10">
            <div className="bg-white rounded-[32px] border border-gray-100 p-5 space-y-4 shadow-sm">
              <h2 className="font-black text-gray-900 flex items-center gap-2 uppercase italic text-sm"><Plus size={18} className="text-orange-500"/> Editar Menú</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Nombre" className="bg-gray-50 rounded-xl px-4 py-4 text-[11px] font-bold outline-none" />
                 <select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as Category})} className="bg-gray-50 rounded-xl px-4 py-4 text-[11px] font-bold outline-none">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                 <input value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} placeholder="Precio" className="bg-gray-50 rounded-xl px-4 py-4 text-[11px] font-bold outline-none" />
                 <input value={draft.image} onChange={e=>setDraft({...draft,image:e.target.value})} placeholder="Link imagen" className="bg-gray-50 rounded-xl px-4 py-4 text-[11px] font-bold outline-none" />
                 <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descripción..." className="bg-gray-50 rounded-xl px-4 py-4 text-[11px] font-bold md:col-span-2 outline-none" rows={2} />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={saveProduct} className="flex-1 bg-orange-500 text-white rounded-2xl py-5 font-black uppercase text-[10px] active:scale-95 transition-all shadow-lg">Actualizar Menú</button>
                {editing && <button onClick={()=>{setEditing(null);setDraft(emptyProduct)}} className="bg-gray-100 text-gray-500 rounded-2xl px-6 py-5 font-bold text-[10px] active:scale-95 transition-all">Cancelar</button>}
              </div>
            </div>
            <div className="bg-white rounded-[32px] border border-gray-100 p-5 shadow-sm">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar platos..." className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-[11px] font-bold outline-none mb-6 border-2 border-transparent focus:border-orange-500 transition-all shadow-inner"/>
              <div className="space-y-4">
                {filteredProducts.map(p => { 
                  const available = overrides[p.id]?.available ?? p.available !== false; 
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-2 bg-gray-50 rounded-2xl border border-gray-50">
                      <img src={p.image || '/logo-final.png'} className="w-14 h-14 object-cover rounded-xl shadow-sm"/>
                      <div className="flex-1 min-w-0"><p className="font-black text-[11px] text-gray-900 truncate uppercase italic">{p.name}</p></div>
                      <div className="flex gap-1">
                        <button onClick={()=>setOverride(p.id,{available:!available})} className={`p-2.5 rounded-xl transition-all ${available?'text-green-500 bg-green-50':'text-red-500 bg-red-50'}`}><Package size={18}/></button>
                        <button onClick={()=>setEditing(p.id)} className="p-2.5 bg-white text-gray-400 border border-gray-100 rounded-xl active:scale-75 transition-all"><Edit3 size={18}/></button>
                        <button onClick={()=>deleteProduct(p.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl active:scale-75 transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {tab === 'branding' && (
          <section className="bg-white rounded-[32px] border border-gray-100 p-6 space-y-6 shadow-sm pb-10 animate-in fade-in">
            <h2 className="font-black text-lg text-gray-900 uppercase italic text-sm"><Image size={20} className="text-orange-500 inline mr-2"/> Marca</h2>
            <div className="space-y-4">
              <div className="flex flex-col items-center p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                 <img src={extraSettings?.logo_url || '/logo-final.png'} className="w-24 h-24 object-contain bg-white rounded-2xl shadow-sm mb-4 p-2" />
                 <p className="text-[10px] font-black text-gray-400 uppercase italic">Vista Previa Logo</p>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase italic ml-1">URL del Logo (.png)</label>
                <input type="text" value={extraSettings?.logo_url || ''} onChange={(e) => updateExtraSettings({logo_url: e.target.value})} className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-4 py-4 text-[11px] font-black outline-none transition-all shadow-inner" />
              </div>
            </div>
            <button onClick={() => alert("Identidad actualizada")} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase text-[10px] active:scale-95 shadow-xl">Guardar Cambios</button>
          </section>
        )}
      </main>
    </div>
  );
}
