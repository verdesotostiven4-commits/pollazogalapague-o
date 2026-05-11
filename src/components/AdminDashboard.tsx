import { useMemo, useState, useEffect } from 'react';
import { 
  Edit3, LogOut, Package, Plus, Search, Send, Trash2, Users, Image, Trophy, 
  Crown, Medal, Eye, EyeOff, ClipboardList, Clock, PackageSearch, RefreshCw 
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Category, OrderStatus, Product } from '../types';
import { buildStatusWhatsAppUrl } from '../utils/whatsapp';

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
  const add = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      if (next === ADMIN_PIN) { sessionStorage.setItem(PIN_KEY, '1'); onAuth(); }
      else { setTimeout(() => setPin(''), 350); }
    }
  };
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6 text-white text-center">
      <div className="w-full max-w-xs space-y-8 animate-in fade-in zoom-in duration-500">
        <img src="/logo-final.png" className="w-24 h-24 mx-auto object-contain" />
        <h1 className="text-2xl font-black italic uppercase">Admin VIP</h1>
        <div className="flex justify-center gap-4">
          {[0,1,2,3].map(i => <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${i < pin.length ? 'bg-orange-500 scale-125 shadow-[0_0_10px_#f97316]' : 'bg-white/10'}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {PIN_PAD.map((d,i) => d ? (
            <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : add(d)} className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl font-bold active:scale-90 transition-all hover:bg-white/10">{d}</button>
          ) : <div key={i} />)}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(PIN_KEY) === '1');
  const context = useAdmin();
  const [tab, setTab] = useState<'products' | 'branding' | 'customers' | 'orders' | 'ranking_config'>('orders');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;
  
  // ✅ ESCUDO PROTECTOR: Si el contexto no ha cargado, evitamos pantalla blanca
  if (!context || context.loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-orange-500 font-black italic uppercase animate-pulse">Sincronizando Imperio...</div>;

  const { products = [], categories = [], overrides = {}, settings, updateSetting, setOverride, addProduct, updateProduct, deleteProduct, customers = [], addCustomerPoints, orders = [], updateOrderStatus, extraSettings, updateExtraSettings, seasons = [], finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners, refreshData } = context;

  const ranking = [...(customers || [])].sort((a,b) => (b.points || 0) - (a.points || 0));
  const filteredProducts = (products || []).filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={extraSettings?.logo_url || '/logo-final.png'} className="w-10 h-10 object-contain rounded-lg" />
          <p className="font-black text-gray-900 leading-none text-xs uppercase italic tracking-tighter leading-none">Admin Panel VIP</p>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={refreshData} className="p-2 bg-orange-50 text-orange-600 rounded-xl active:scale-75 transition-all"><RefreshCw size={18}/></button>
            <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400 active:scale-75 transition-colors"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-shrink-0 rounded-2xl px-5 py-3 text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest ${tab===t.id?'bg-orange-500 text-white shadow-lg shadow-orange-200':'bg-white text-gray-400 border border-gray-100'}`}>
              <t.Icon size={14}/>{t.label}
            </button>
          ))}
        </div>

        {tab === 'ranking_config' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <section className="bg-white rounded-[32px] border border-gray-100 p-6 space-y-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-gray-50 pb-4">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><Trophy size={22}/></div>
                <h2 className="font-black text-lg uppercase italic">Premios del Evento</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase italic ml-1">Título del Ranking</label>
                  <input value={extraSettings?.ranking_title || ''} onChange={e=>updateExtraSettings({ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase italic ml-1">Fecha de Finalización</label>
                  <input type="datetime-local" value={extraSettings?.ranking_end_date || ''} onChange={e=>updateExtraSettings({ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-2 border-transparent focus:border-orange-500 outline-none transition-all" />
                </div>
                <div className="md:col-span-2 grid grid-cols-1 gap-4 pt-4 border-t border-gray-50">
                  <div className="bg-yellow-50/50 p-3 rounded-2xl border border-yellow-100 shadow-sm flex items-center gap-3">
                    <Crown size={18} className="text-yellow-500" />
                    <div className="flex-1">
                       <p className="text-[8px] font-black text-yellow-600 uppercase mb-0.5">1er Lugar (Oro)</p>
                       <input placeholder="Escribe el premio..." value={extraSettings?.prize_1 || ''} onChange={e=>updateExtraSettings({prize_1: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none" />
                    </div>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
                    <Medal size={18} className="text-slate-400" />
                    <div className="flex-1">
                       <p className="text-[8px] font-black text-slate-500 uppercase mb-0.5">2do Lugar (Plata)</p>
                       <input placeholder="Escribe el premio..." value={extraSettings?.prize_2 || ''} onChange={e=>updateExtraSettings({prize_2: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none" />
                    </div>
                  </div>
                  <div className="bg-orange-50/50 p-3 rounded-2xl border border-orange-100 shadow-sm flex items-center gap-3">
                    <Medal size={18} className="text-orange-500" />
                    <div className="flex-1">
                       <p className="text-[8px] font-black text-orange-600 uppercase mb-0.5">3er Lugar (Bronce)</p>
                       <input placeholder="Escribe el premio..." value={extraSettings?.prize_3 || ''} onChange={e=>updateExtraSettings({prize_3: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none" />
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => finalizeSeason(extraSettings?.ranking_title || 'Ranking VIP', "Premios Entregados", ranking.slice(0, 3))} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all shadow-xl shadow-gray-200">Finalizar Temporada Actual</button>
            </section>

            <section className="space-y-4">
              <h2 className="font-black text-lg px-2 uppercase italic text-gray-900"><History size={18} className="inline mr-2 text-orange-500"/> Historial de Ganadores</h2>
              {(seasons || []).length === 0 ? <p className="text-gray-400 text-center py-10 italic text-sm uppercase font-bold bg-white rounded-[32px] border">No hay historial</p> : (
                <div className="space-y-4">
                  {(seasons || []).map((s) => (
                    <div key={s.id} className="bg-white rounded-[32px] p-5 border border-gray-100 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                         <p className="font-black uppercase italic text-sm">{s.name}</p>
                         <button onClick={()=>confirm("¿Borrar historial?") && deleteSeason(s.id)} className="text-red-400 p-2 active:scale-75"><Trash2 size={18}/></button>
                      </div>
                      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                        {(s.winners || []).map((w: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] shrink-0 ${idx===0?'bg-yellow-400 text-black':idx===1?'bg-slate-300 text-slate-700':'bg-orange-900 text-white'}`}>{idx+1}º</div>
                            <div className="flex-1 min-w-0"><p className="text-[10px] font-black truncate uppercase">{w.name}</p><input placeholder="Link foto..." className="w-full text-[9px] outline-none text-blue-500 italic" value={w.photo_url || ''} onChange={(e) => { const n = [...s.winners]; n[idx].photo_url = e.target.value; updateSeasonWinners(s.id, n); }} /></div>
                            {w.photo_url && <img src={w.photo_url} className="w-9 h-9 rounded-lg object-cover border border-gray-50 shadow-sm" />}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => toggleSeasonVisibility(s.id, !s.is_published)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase transition-all shadow-md ${s.is_published ? 'bg-green-500 text-white shadow-green-100' : 'bg-gray-100 text-gray-400'}`}>{s.is_published ? '✅ Visible en la App' : 'Publicar Ganadores'}</button>
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
                {(orders || []).length === 0 ? <p className="text-gray-400 text-center py-20 uppercase font-black text-xs italic bg-white rounded-[32px] border">Sin pedidos hoy</p> : (orders || []).map(o => {
                  const customer = (customers || []).find(c => (c.phone || '').replace(/\D/g, '') === (o.customer_phone || '').replace(/\D/g, ''));
                  const time = o.created_at ? new Date(o.created_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--:--';
                  
                  // ✅ LÓGICA DE PRECIO ULTRA-RESILIENTE (Adiós al NAN y al 0.00 injustificado)
                  const displayTotal = parseFloat(o.total as any) || 0;

                  return (
                    <div key={o.id} className="bg-white rounded-[32px] border border-gray-100 p-5 space-y-4 shadow-sm animate-in fade-in">
                      <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                         <div className="flex items-center gap-3">
                            <img src={customer?.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${o.customer_phone}`} className="w-11 h-11 rounded-full object-cover border-2 border-orange-100 shadow-sm" />
                            <div>
                               <div className="flex items-center gap-2">
                                  <p className="font-black text-gray-900 uppercase italic text-xs truncate leading-none">{customer?.name || o.customer_phone}</p>
                                  <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                     <Clock size={8} /><span className="text-[8px] font-black">{time}</span>
                                  </div>
                               </div>
                               <p className="text-[8px] text-gray-400 font-black mt-1.5 tracking-tighter uppercase">ORDEN: {o.order_code}</p>
                            </div>
                         </div>
                         <div className="text-right leading-none">
                            <p className="font-black text-orange-600 text-sm italic leading-none">${displayTotal.toFixed(2)}</p>
                            <p className="text-[7px] font-black text-slate-300 uppercase tracking-widest mt-1.5 leading-none">{o.status}</p>
                         </div>
                      </div>

                      <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/30 space-y-2.5">
                        <div className="flex items-center justify-between mb-1 border-b border-orange-100/50 pb-1.5">
                          <div className="flex items-center gap-2">
                            <PackageSearch size={14} className="text-orange-500" />
                            <p className="text-[9px] font-black text-orange-700 uppercase tracking-[0.1em]">Detalle de Compra</p>
                          </div>
                          <span className="text-[8px] font-black text-orange-300 uppercase italic">Verifica Productos</span>
                        </div>
                        {(o.items || []).length > 0 ? (o.items || []).map((item: any, idx: number) => {
                           // Normalizar datos para evitar NAN (buscar en todos los campos posibles)
                           const rawPrice = item.price || item.product?.price || '0';
                           const itemPrice = parseFloat(rawPrice as any) || 0;
                           const itemName = item.name || item.product?.name || `Producto #${item.id?.slice(-4) || idx}`;
                           const qty = parseInt(item.quantity as any) || 1;
                           
                           return (
                             <div key={idx} className="flex justify-between items-center text-[10px] font-bold text-gray-700 uppercase leading-none">
                                <span className="flex-1 truncate leading-none mr-2"><span className="text-orange-600 font-black mr-1">{qty}x</span> {itemName}</span>
                                <span className="text-gray-400 font-black shrink-0 leading-none">${(itemPrice * qty).toFixed(2)}</span>
                             </div>
                           );
                        }) : <p className="text-[9px] text-gray-400 font-bold italic text-center uppercase tracking-widest">Sin detalle (Pedido antiguo)</p>}
                      </div>

                      <div className="flex gap-2 pt-1">
                        <select value={o.status} onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)} className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-3 py-3 text-[10px] font-black outline-none active:bg-white">{statuses.map(s => <option key={s} value={s}>{s}</option>)}</select>
                        <a href={buildStatusWhatsAppUrl(o.customer_phone, o.order_code, o.status)} target="_blank" className="bg-[#25D366] text-white rounded-xl px-5 py-3 font-black text-[10px] flex items-center gap-2 active:scale-95 shadow-md shadow-green-100 transition-all"><Send size={14}/> Notificar</a>
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
                  <div className="flex-1 min-w-0"><p className="font-black text-gray-900 text-sm truncate uppercase italic">{i + 1}º {c.name || 'Guerrero'}</p><p className="text-[9px] font-black text-gray-400">{c.phone}</p><span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase mt-1 inline-block">{(c.points || 0).toLocaleString()} Pts</span></div>
                  <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl"><input type="number" value={points[c.id] ?? ''} onChange={e=>setPoints({...points,[c.id]:e.target.value})} className="w-12 bg-white border border-gray-100 rounded-lg py-2 text-center text-xs font-black outline-none" placeholder="+5" /><button onClick={()=>{addCustomerPoints(c.id, Number(points[c.id]||0)); setPoints({...points,[c.id]:''});}} className="bg-black text-white rounded-lg p-2 active:scale-90"><Plus size={18}/></button></div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
