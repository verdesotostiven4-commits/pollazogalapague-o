import { useMemo, useState, useEffect, useCallback } from 'react';
import { 
  Edit3, LogOut, Package, Plus, Search, Send, Trash2, Users, Image, Trophy, 
  Crown, Medal, Eye, EyeOff, ClipboardList, Clock, PackageSearch, RefreshCw, Save, X 
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Category, OrderStatus, Product } from '../types';
import { buildStatusWhatsAppUrl } from '../utils/whatsapp';

const ADMIN_PIN = '1328';
const PIN_KEY = 'pollazo_admin_auth';
const TABS = [{ id: 'orders', label: 'Pedidos', Icon: Send }, { id: 'products', label: 'Menú', Icon: Package }, { id: 'customers', label: 'Clientes', Icon: Users }, { id: 'ranking_config', label: 'Concurso', Icon: Trophy }, { id: 'branding', label: 'Marca', Icon: Image }];

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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-xs space-y-8 animate-in fade-in zoom-in duration-500">
        <img src="/logo-final.png" className="w-24 h-24 mx-auto object-contain" />
        <h1 className="text-2xl font-black italic uppercase tracking-widest">Admin VIP</h1>
        <div className="flex justify-center gap-4">
          {[0,1,2,3].map(i => <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${i < pin.length ? 'bg-orange-500 scale-125 shadow-[0_0_10px_#f97316]' : 'bg-white/10'}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d,i) => d ? (
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
  const [tab, setTab] = useState('orders');
  const [search, setSearch] = useState('');
  
  const emptyDraft: any = { name: '', category: 'Pollos', price: '', description: '', image: '', available: true };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;
  if (!context || context.loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-orange-500 font-black animate-pulse">Sincronizando Imperio...</div>;

  const { products = [], categories = [], customers = [], orders = [], seasons = [], extraSettings = {}, updateExtraSettings, finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners, refreshData, updateOrderStatus, addCustomerPoints, addProduct, updateProduct, deleteProduct } = context;

  const ranking = [...(customers || [])].sort((a,b) => (b.points || 0) - (a.points || 0));

  // ✅ ORDEN DEL HISTORIAL: El más nuevo arriba siempre
  const sortedSeasons = useMemo(() => {
      return [...seasons].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [seasons]);

  // ✅ ORDEN INTELIGENTE DEL MENÚ
  const sortedProducts = useMemo(() => {
    return [...(products || [])]
      .filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const catA = a.category || 'Otros';
        const catB = b.category || 'Otros';
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [products, search]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2"><img src={extraSettings?.logo_url || '/logo-final.png'} className="w-8 h-8 object-contain"/><p className="font-black text-xs uppercase tracking-tighter italic leading-none">Admin VIP</p></div>
        <div className="flex gap-2">
            <button onClick={refreshData} className="p-2 bg-orange-50 text-orange-600 rounded-xl active:scale-75 transition-all"><RefreshCw size={18}/></button>
            <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400 active:scale-75"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6 leading-tight">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest ${tab===t.id?'bg-orange-500 text-white shadow-lg shadow-orange-200':'bg-white text-gray-400 border'}`}><t.Icon size={14}/>{t.label}</button>)}
        </div>

        {tab === 'ranking_config' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Título Ranking</label><input value={extraSettings?.ranking_title || ''} onChange={e=>updateExtraSettings({ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Fecha Fin</label><input type="datetime-local" value={extraSettings?.ranking_end_date || ''} onChange={e=>updateExtraSettings({ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"/></div>
                <div className="md:col-span-2 space-y-3 pt-4 border-t">
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex items-center gap-2 shadow-sm"><Crown size={16} className="text-yellow-500"/><input placeholder="Oro" value={extraSettings?.prize_1 || ''} onChange={e=>updateExtraSettings({prize_1: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm"><Medal size={16} className="text-slate-400"/><input placeholder="Plata" value={extraSettings?.prize_2 || ''} onChange={e=>updateExtraSettings({prize_2: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-2 shadow-sm"><Medal size={16} className="text-orange-500"/><input placeholder="Bronce" value={extraSettings?.prize_3 || ''} onChange={e=>updateExtraSettings({prize_3: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                </div>
              </div>
              <button onClick={() => finalizeSeason(extraSettings?.ranking_title || 'Ranking', 'Premios Entregados', ranking.slice(0,3))} className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all shadow-xl">Finalizar Temporada</button>
            </section>
            
            <section className="space-y-4">
               <h2 className="font-black uppercase italic px-2 text-gray-400 text-xs">Historial de Ganadores</h2>
               {sortedSeasons.map((s, idx) => (
                 <div key={s.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 space-y-4">
                   <div className="flex justify-between items-center border-b pb-3 border-gray-50"><p className="font-black text-sm uppercase italic">#{sortedSeasons.length - idx} {s.name}</p><button onClick={() => confirm("¿Borrar?") && deleteSeason(s.id)} className="text-red-400 p-2 active:scale-75 transition-all"><Trash2 size={16}/></button></div>
                   <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                     {(s.winners || []).map((w: any, i: number) => (
                       <div key={i} className="bg-white p-2.5 rounded-xl flex items-center gap-2 shadow-sm border border-gray-100">
                         <span className="font-black text-[10px] w-6 italic">{i+1}º</span>
                         <input placeholder="Link foto..." className="flex-1 text-[9px] font-bold text-blue-500 outline-none bg-transparent" value={w.photo_url || ''} onChange={e => { const n = [...s.winners]; n[i].photo_url = e.target.value; updateSeasonWinners(s.id, n); }} />
                       </div>
                     ))}
                   </div>
                   <button onClick={() => toggleSeasonVisibility(s.id, !s.is_published)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${s.is_published ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{s.is_published ? '✅ Publicado' : 'Publicar Ganadores'}</button>
                 </div>
               ))}
            </section>
          </div>
        )}

        {tab === 'products' && (
            <div className="space-y-6 animate-in fade-in duration-500 pb-20">
                <section className="bg-white rounded-[32px] p-6 shadow-xl border border-orange-100 space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input placeholder="Nombre..." value={draft.name} onChange={e=>setDraft({...draft, name: e.target.value})} className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none" />
                        <select value={draft.category} onChange={e=>setDraft({...draft, category: e.target.value})} className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none">
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input placeholder="Precio..." value={draft.price} onChange={e=>setDraft({...draft, price: e.target.value})} className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none" />
                        <input placeholder="Imagen..." value={draft.image} onChange={e=>setDraft({...draft, image: e.target.value})} className="bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none" />
                    </div>
                    <button onClick={async () => { if(editingId) await updateProduct(editingId, draft); else await addProduct(draft); setDraft(emptyDraft); setEditingId(null); }} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black shadow-lg uppercase text-[11px] tracking-widest">GUARDAR PLATO</button>
                    {editingId && <button onClick={()=>{setEditingId(null); setDraft(emptyDraft);}} className="w-full text-gray-400 font-bold text-[9px] uppercase">Cancelar</button>}
                </section>
                <div className="space-y-3">
                    {sortedProducts.map(p => (
                        <div key={p.id} className="bg-white p-3 rounded-[28px] border border-gray-100 flex items-center gap-4 shadow-sm group">
                            <img src={p.image || '/logo-final.png'} className="w-14 h-14 rounded-2xl object-cover border shadow-sm"/>
                            <div className="flex-1 min-w-0">
                               <p className="font-black text-[11px] truncate uppercase italic">{p.name}</p>
                               <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[7px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-full uppercase border border-orange-100">{p.category}</span>
                                  <span className="text-[10px] font-black text-gray-400">${parseFloat(p.price || '0').toFixed(2)}</span>
                               </div>
                            </div>
                            <div className="flex gap-1 pr-1">
                               <button onClick={() => updateProduct(p.id, { available: !p.available })} className={`p-2.5 rounded-xl ${p.available ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600 shadow-inner'}`}><Package size={16}/></button>
                               <button onClick={() => {setEditingId(p.id); setDraft({...p});}} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-75 transition-all"><Edit3 size={16}/></button>
                               <button onClick={() => confirm("¿Eliminar?") && deleteProduct(p.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl active:scale-75 transition-all"><Trash2 size={16}/></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {tab === 'orders' && (
          <div className="space-y-4 pb-10">
             {(orders || []).map(o => {
               const customer = (customers || []).find(c => (c.phone || '').replace(/\D/g, '') === (o.customer_phone || '').replace(/\D/g, ''));
               const displayTotal = parseFloat(o.total as any) || 0;
               return (
                 <div key={o.id} className="bg-white rounded-[32px] border p-5 space-y-4 shadow-sm border-gray-100 animate-in fade-in">
                    <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                       <div className="flex items-center gap-3"><img src={customer?.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${o.customer_phone}`} className="w-11 h-11 rounded-full border-2 border-orange-100 shadow-sm" /><div><p className="font-black text-xs uppercase leading-none">{customer?.name || o.customer_phone}</p><div className="flex items-center gap-1 text-[8px] font-black text-blue-500 mt-1"><Clock size={10}/>{o.created_at ? new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true}) : '--'}</div></div></div>
                       <div className="text-right leading-none"><p className="font-black text-orange-600 text-sm italic">${displayTotal.toFixed(2)}</p><p className="text-[7px] font-black text-slate-300 uppercase mt-1.5 leading-none">{o.status}</p></div>
                    </div>
                    <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/30">
                       <p className="text-[9px] font-black text-orange-700 uppercase mb-2 flex items-center gap-2 tracking-widest"><PackageSearch size={14}/> Detalle Compra</p>
                       {(o.items || []).length > 0 ? (o.items || []).map((item: any, i: number) => (
                         <div key={i} className="flex justify-between text-[10px] font-bold uppercase py-1 border-b border-orange-100/20 last:border-0"><span className="flex-1 truncate mr-2"><span className="text-orange-600 font-black">{item.quantity}x</span> {item.name || 'Producto'}</span><span className="text-gray-400 font-black">${(parseFloat(item.price || '0') * item.quantity).toFixed(2)}</span></div>
                       )) : <p className="text-[9px] text-gray-400 font-bold italic text-center uppercase tracking-widest">Pedido antiguo o sin detalle</p>}
                    </div>
                    <div className="flex gap-2">
                       <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value as any)} className="flex-1 bg-gray-50 border rounded-xl p-3 text-[10px] font-black outline-none">{['Recibido', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                       <a href={buildStatusWhatsAppUrl(o.customer_phone, o.order_code, o.status)} target="_blank" className="bg-[#25D366] text-white px-5 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-md active:scale-95 transition-all"><Send size={14}/> Notificar</a>
                    </div>
                 </div>
               );
             })}
          </div>
        )}
      </main>
    </div>
  );
}
