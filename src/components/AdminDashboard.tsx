import { useMemo, useState, useEffect } from 'react';
import { Edit3, LogOut, Package, Plus, Search, Send, Trash2, Users, Image, Trophy, Crown, Medal, Eye, EyeOff, ClipboardList, Clock, PackageSearch, RefreshCw } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { buildStatusWhatsAppUrl } from '../utils/whatsapp';

const ADMIN_PIN = '1328';
const PIN_KEY = 'pollazo_admin_auth';
const TABS = [{ id: 'orders', label: 'Pedidos', Icon: Send }, { id: 'products', label: 'Menú', Icon: Package }, { id: 'customers', label: 'Clientes', Icon: Users }, { id: 'ranking_config', label: 'Concurso', Icon: Trophy }, { id: 'branding', label: 'Marca', Icon: Image }];

function PinScreen({ onAuth }: { onAuth: () => void }) {
  const [pin, setPin] = useState('');
  const add = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next === ADMIN_PIN) { sessionStorage.setItem(PIN_KEY, '1'); onAuth(); }
    else if (next.length === 4) setPin('');
  };
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 text-white text-center">
      <div className="w-full max-w-xs space-y-8">
        <h1 className="text-2xl font-black italic">PANEL VIP</h1>
        <div className="flex justify-center gap-4">{[0,1,2,3].map(i => <div key={i} className={`w-3 h-3 rounded-full ${i < pin.length ? 'bg-orange-500 scale-125' : 'bg-white/10'}`} />)}</div>
        <div className="grid grid-cols-3 gap-4">{['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d,i) => d ? <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : add(d)} className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl font-bold active:scale-90">{d}</button> : <div key={i}/>)}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(PIN_KEY) === '1');
  const context = useAdmin();
  const [tab, setTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [points, setPoints] = useState<Record<string, string>>({});

  // ✅ PROTECCIÓN: Si el contexto es null (no ha cargado), mostramos pantalla de carga
  if (!context || context.loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-orange-500 font-black animate-pulse">SINCRONIZANDO IMPERIO...</div>;

  const { products, customers, orders, seasons, extraSettings, updateExtraSettings, finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners, addCustomerPoints, updateOrderStatus, refreshData } = context;

  const ranking = [...(customers || [])].sort((a,b) => (b.points || 0) - (a.points || 0));

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900">
      <header className="sticky top-0 z-40 bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2"><img src={extraSettings?.logo_url} className="w-8 h-8 object-contain"/><p className="font-black text-xs uppercase">Admin VIP</p></div>
        <div className="flex gap-2">
            <button onClick={refreshData} className="p-2 bg-orange-50 text-orange-600 rounded-xl active:scale-75 transition-all"><RefreshCw size={18}/></button>
            <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400 active:scale-75"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all ${tab===t.id?'bg-orange-500 text-white shadow-lg':'bg-white text-gray-400 border'}`}><t.Icon size={14}/>{t.label}</button>)}
        </div>

        {tab === 'ranking_config' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Título</label><input value={extraSettings?.ranking_title || ''} onChange={e=>updateExtraSettings({ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Fecha Fin</label><input type="datetime-local" value={extraSettings?.ranking_end_date || ''} onChange={e=>updateExtraSettings({ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none"/></div>
                <div className="md:col-span-2 space-y-3 pt-4 border-t">
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex items-center gap-2"><Crown size={16} className="text-yellow-500"/><input placeholder="Premio Oro" value={extraSettings?.prize_1 || ''} onChange={e=>updateExtraSettings({prize_1: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2"><Medal size={16} className="text-slate-400"/><input placeholder="Premio Plata" value={extraSettings?.prize_2 || ''} onChange={e=>updateExtraSettings({prize_2: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-2"><Medal size={16} className="text-orange-500"/><input placeholder="Premio Bronce" value={extraSettings?.prize_3 || ''} onChange={e=>updateExtraSettings({prize_3: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                </div>
              </div>
              <button onClick={() => finalizeSeason(extraSettings?.ranking_title || 'Ranking', 'Premios VIP', ranking.slice(0,3))} className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">Finalizar Temporada</button>
            </section>
            
            <section className="space-y-4">
               <h2 className="font-black uppercase italic px-2">Historial</h2>
               {(seasons || []).map(s => (
                 <div key={s.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 space-y-4">
                   <div className="flex justify-between items-center"><p className="font-black text-sm uppercase">{s.name}</p><button onClick={() => deleteSeason(s.id)} className="text-red-400 p-2 active:scale-75"><Trash2 size={16}/></button></div>
                   <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                     {(s.winners || []).map((w: any, i: number) => (
                       <div key={i} className="bg-white p-2 rounded-xl flex items-center gap-2 shadow-sm">
                         <span className="font-black text-[10px] w-6">{i+1}º</span>
                         <input placeholder="Link foto..." className="flex-1 text-[9px] font-bold text-blue-500 outline-none" value={w.photo_url || ''} onChange={e => { const n = [...s.winners]; n[i].photo_url = e.target.value; updateSeasonWinners(s.id, n); }} />
                       </div>
                     ))}
                   </div>
                   <button onClick={() => toggleSeasonVisibility(s.id, !s.is_published)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase shadow-md ${s.is_published ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{s.is_published ? '✅ Publicado' : 'Publicar Ganadores'}</button>
                 </div>
               ))}
            </section>
          </div>
        )}

        {tab === 'orders' && (
          <section className="space-y-4 animate-in fade-in duration-500">
             {(orders || []).map(o => {
               const customer = (customers || []).find(c => (c.phone || '').replace(/\D/g, '') === (o.customer_phone || '').replace(/\D/g, ''));
               const displayTotal = Number(o.total || 0).toFixed(2);
               return (
                 <div key={o.id} className="bg-white rounded-[32px] border p-5 space-y-4 shadow-sm">
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3"><img src={customer?.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${o.customer_phone}`} className="w-10 h-10 rounded-full border-2 border-orange-100" /><div><p className="font-black text-xs uppercase leading-none">{customer?.name || o.customer_phone}</p><div className="flex items-center gap-1 text-[8px] font-black text-blue-500 mt-1"><Clock size={10}/>{o.created_at ? new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true}) : '--'}</div></div></div>
                       <div className="text-right leading-none"><p className="font-black text-orange-600 text-sm italic">${displayTotal}</p><p className="text-[7px] font-black text-gray-300 uppercase mt-1">{o.status}</p></div>
                    </div>
                    <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/30">
                       <p className="text-[9px] font-black text-orange-700 uppercase mb-2 flex items-center gap-2"><PackageSearch size={14}/> Detalle de Compra</p>
                       {(o.items || []).length > 0 ? (o.items || []).map((item: any, i: number) => (
                         <div key={i} className="flex justify-between text-[10px] font-bold uppercase py-1 border-b border-orange-100/30 last:border-0"><span className="flex-1 truncate mr-2"><span className="text-orange-600 font-black">{item.quantity}x</span> {item.name || 'Producto'}</span><span className="text-gray-400 font-black">${(Number(item.price || 0) * item.quantity).toFixed(2)}</span></div>
                       )) : <p className="text-[9px] text-gray-400 font-bold italic">Pedido sin detalle guardado</p>}
                    </div>
                    <div className="flex gap-2">
                       <select value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value as any)} className="flex-1 bg-gray-50 border rounded-xl p-3 text-[10px] font-black outline-none">{['Recibido', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                       <a href={buildStatusWhatsAppUrl(o.customer_phone, o.order_code, o.status)} target="_blank" className="bg-[#25D366] text-white px-5 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-md active:scale-95"><Send size={14}/> Notificar</a>
                    </div>
                 </div>
               );
             })}
          </section>
        )}

        {tab === 'customers' && (
           <section className="space-y-4 pb-10">
             <div className="bg-white rounded-[32px] p-5 shadow-sm border space-y-4">
               <h2 className="font-black text-lg uppercase italic"><Users size={18} className="inline mr-2 text-blue-500"/> Clientes</h2>
               <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar cliente..." className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none outline-none shadow-inner" />
             </div>
             <div className="space-y-3">
               {ranking.filter(c => `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
                 <div key={c.id} className="bg-white rounded-3xl border p-4 flex items-center gap-4 shadow-sm">
                   <img src={c.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c.name}`} className="w-12 h-12 rounded-2xl border" />
                   <div className="flex-1 min-w-0"><p className="font-black text-xs truncate uppercase">{i + 1}º {c.name || 'Guerrero'}</p><p className="text-[9px] font-black text-gray-400 leading-none mt-1">{c.phone}</p><span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase mt-1 inline-block">{(c.points || 0)} Pts</span></div>
                   <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-xl"><input type="number" value={points[c.id] ?? ''} onChange={e=>setPoints({...points,[c.id]:e.target.value})} className="w-10 bg-white rounded-lg py-2 text-center text-xs font-black outline-none" placeholder="+5" /><button onClick={()=>{addCustomerPoints(c.id, Number(points[c.id]||0)); setPoints({...points,[c.id]:''});}} className="bg-black text-white p-2 rounded-lg active:scale-90"><Plus size={16}/></button></div>
                 </div>
               ))}
             </div>
           </section>
        )}
      </main>
    </div>
  );
}
