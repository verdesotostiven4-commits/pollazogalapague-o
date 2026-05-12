import { useMemo, useState, Component } from 'react';
import { 
  Edit3, LogOut, Package, Plus, Search, Send, Trash2, Users, Image, Trophy, 
  Crown, Medal, Clock, PackageSearch, RefreshCw, Save, X, History, Zap
} from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Category } from '../types';
import { buildStatusWhatsAppUrl } from '../utils/whatsapp';

const ADMIN_PIN = '1328';
const PIN_KEY = 'pollazo_admin_auth';
const TABS = [
  { id: 'orders', label: 'Pedidos', Icon: Send }, 
  { id: 'products', label: 'Menú', Icon: Package }, 
  { id: 'customers', label: 'Clientes', Icon: Users }, 
  { id: 'ranking_config', label: 'Concurso', Icon: Trophy }, 
  { id: 'branding', label: 'Marca', Icon: Image }
];

// ==========================================
// 🛡️ ESCUDO ANTI-BLANCOS (ERROR BOUNDARY)
// ==========================================
class AdminErrorBoundary extends Component<{children: any}, {hasError: boolean, error: any, info: any}> {
  constructor(props: any) { super(props); this.state = { hasError: false, error: null, info: null }; }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) { this.setState({ info }); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white font-sans">
          <div className="bg-red-500/10 border border-red-500/50 p-8 rounded-[32px] max-w-2xl w-full shadow-[0_0_50px_rgba(239,68,68,0.2)]">
            <h1 className="text-3xl font-black text-red-500 uppercase italic tracking-widest mb-2 flex items-center gap-3"><Zap /> Cortocircuito Detectado</h1>
            <p className="text-gray-400 text-sm mb-6">Stiven, el código evitó la pantalla blanca. Tómale foto a este recuadro y pásamelo:</p>
            <div className="bg-black p-5 rounded-2xl text-xs font-mono text-red-300 overflow-x-auto shadow-inner border border-white/5">
              <p className="font-black text-white text-sm mb-2">{this.state.error?.toString()}</p>
              <pre className="opacity-70">{this.state.info?.componentStack}</pre>
            </div>
            <button onClick={() => window.location.reload()} className="mt-6 w-full bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] active:scale-95 transition-transform shadow-lg shadow-red-600/30">Reintentar Conexión</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
        <h1 className="text-2xl font-black italic uppercase tracking-widest leading-none">Admin VIP</h1>
        <div className="flex justify-center gap-4">
          {[0,1,2,3].map(i => <div key={i} className={`w-3.5 h-3.5 rounded-full transition-all ${i < pin.length ? 'bg-orange-500 scale-125 shadow-[0_0_10px_#f97316]' : 'bg-white/10'}`} />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d,i) => d ? <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : add(d)} className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-xl font-bold active:scale-90 transition-all hover:bg-white/10">{d}</button> : <div key={i} />)}
        </div>
      </div>
    </div>
  );
}

function AdminDashboardContent() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(PIN_KEY) === '1');
  const context = useAdmin();
  const [tab, setTab] = useState('orders');
  const [search, setSearch] = useState('');
  const [savingPrizes, setSavingPrizes] = useState(false);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState({ name: '', category: 'Pollos', price: '', description: '', image: '', available: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;
  if (!context || context.loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-orange-500 font-black animate-pulse uppercase italic tracking-widest">Sincronizando Imperio...</div>;

  // 🛡️ EXTRACCIÓN BLINDADA CONTRA NULOS
  const safeProducts = context.products || [];
  const safeCategories = context.categories || [];
  const safeCustomers = context.customers || [];
  const safeOrders = context.orders || [];
  const safeSeasons = context.seasons || [];
  const safeExtraSettings = context.extraSettings || {};

  const ranking = [...safeCustomers].sort((a,b) => (b?.points || 0) - (a?.points || 0));

  const sortedProducts = useMemo(() => {
    return [...safeProducts]
      .filter(p => `${p?.name || ''} ${p?.category || ''}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const catA = a?.category || 'Otros';
        const catB = b?.category || 'Otros';
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return (a?.name || '').localeCompare(b?.name || '');
      });
  }, [safeProducts, search]);

  const sortedSeasons = useMemo(() => {
    return [...safeSeasons].sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime());
  }, [safeSeasons]);

  const handleSaveProduct = async () => {
    if (!draft.name.trim()) return;
    try {
      if (editingId) await context.updateProduct(editingId, draft);
      else await context.addProduct(draft);
      setDraft({ name: '', category: 'Pollos', price: '', description: '', image: '', available: true });
      setEditingId(null);
      alert("¡Guardado en el Menú!");
    } catch (e) { alert("Error al guardar"); }
  };

  const startEdit = (p: any) => {
    setEditingId(p.id);
    setDraft({ ...p });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalizeSeason = async () => {
    const title = safeExtraSettings.ranking_title || 'Temporada Finalizada';
    if (!confirm(`¿Finalizar "${title}" y guardar Top 3 en el Historial?`)) return;
    
    const top3 = ranking.slice(0, 3).map((c, i) => ({
      name: c?.name || 'Guerrero',
      points: c?.points || 0,
      avatar_url: c?.avatar_url || '',
      rank: i + 1,
      prize_won: i === 0 ? safeExtraSettings.prize_1 : i === 1 ? safeExtraSettings.prize_2 : safeExtraSettings.prize_3
    }));

    try {
      await context.finalizeSeason(title, "Premios VIP", top3);
      alert("¡Temporada finalizada! Ya está arriba en el historial.");
    } catch (e) { alert("Error al finalizar temporada"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900 overflow-x-hidden leading-tight">
      <header className="sticky top-0 z-40 bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2">
          <img src={safeExtraSettings?.logo_url || '/logo-final.png'} className="w-8 h-8 object-contain"/>
          <p className="font-black text-xs uppercase italic">Admin Panel VIP</p>
        </div>
        <div className="flex gap-2">
            <button onClick={context.refreshData} className="p-2 bg-orange-50 text-orange-600 rounded-xl active:scale-75 transition-all"><RefreshCw size={18}/></button>
            <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400 active:scale-75"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(t => <button key={t.id} onClick={() => { setTab(t.id as any); setSearch(''); }} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all uppercase tracking-widest ${tab===t.id?'bg-orange-500 text-white shadow-lg':'bg-white text-gray-400 border'}`}><t.Icon size={14}/>{t.label}</button>)}
        </div>

        {/* ================= TAB: PEDIDOS ================= */}
        {tab === 'orders' && (
          <div className="space-y-4 pb-10 animate-in fade-in duration-500">
             {safeOrders.map(o => {
               const customer = safeCustomers.find(c => (c?.phone || '').replace(/\D/g, '') === (o?.customer_phone || '').replace(/\D/g, ''));
               return (
                 <div key={o?.id} className="bg-white rounded-[32px] border p-5 space-y-4 shadow-sm border-gray-100">
                    <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                       <div className="flex items-center gap-3"><img src={customer?.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${o?.customer_phone}`} className="w-11 h-11 rounded-full border-2 border-orange-100 shadow-sm object-cover" /><div><p className="font-black text-xs uppercase leading-none">{customer?.name || o?.customer_phone}</p><div className="flex items-center gap-1 text-[8px] font-black text-blue-500 mt-1"><Clock size={10}/>{o?.created_at ? new Date(o.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12:true}) : '--'}</div></div></div>
                       <div className="text-right leading-none"><p className="font-black text-orange-600 text-sm italic">${Number(o?.total || 0).toFixed(2)}</p><p className="text-[7px] font-black text-slate-300 uppercase mt-1">{o?.status}</p></div>
                    </div>
                    <div className="bg-orange-50/50 rounded-2xl p-4 border border-orange-100/30">
                       <p className="text-[9px] font-black text-orange-700 uppercase mb-2 flex items-center gap-2"><PackageSearch size={14}/> Detalle Compra</p>
                       {(o?.items || []).length > 0 ? (o?.items || []).map((item: any, i: number) => (
                         <div key={i} className="flex justify-between text-[10px] font-bold uppercase py-1 border-b border-orange-100/20 last:border-0"><span className="flex-1 truncate mr-2"><span className="text-orange-600 font-black">{item?.quantity || 1}x</span> {item?.name || 'Producto'}</span><span className="text-gray-400 font-black">${(parseFloat(item?.price || '0') * (item?.quantity || 1)).toFixed(2)}</span></div>
                       )) : <p className="text-[9px] text-gray-400 font-bold italic text-center uppercase">Pedido antiguo</p>}
                    </div>
                    <div className="flex gap-2">
                       <select value={o?.status} onChange={e => context.updateOrderStatus(o.id, e.target.value as any)} className="flex-1 bg-gray-50 border rounded-xl p-3 text-[10px] font-black outline-none">{['Recibido', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'].map(s => <option key={s} value={s}>{s}</option>)}</select>
                       <a href={buildStatusWhatsAppUrl(o?.customer_phone, o?.order_code, o?.status)} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-5 py-3 rounded-xl font-black text-[10px] flex items-center gap-2 shadow-md active:scale-95 transition-all"><Send size={14}/> Notificar</a>
                    </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* ================= TAB: MENÚ (PRODUCTOS) ================= */}
        {tab === 'products' && (
          <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <section className="bg-white rounded-[32px] p-6 shadow-xl border border-orange-100 space-y-5">
              <div className="flex items-center gap-3 border-b border-orange-50 pb-4"><div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg">{editingId ? <Edit3 size={20}/> : <Plus size={20}/>}</div><h2 className="font-black text-lg uppercase italic">{editingId ? 'Editar Plato' : 'Nuevo Producto'}</h2></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input placeholder="Nombre..." value={draft.name} onChange={e=>setDraft({...draft, name: e.target.value})} className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner" />
                <select value={draft.category} onChange={e=>setDraft({...draft, category: e.target.value as Category})} className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner">
                  {(safeCategories || []).map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input placeholder="Precio (Ej: 10.50)" value={draft.price} onChange={e=>setDraft({...draft, price: e.target.value})} className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner" />
                <input placeholder="Link imagen..." value={draft.image} onChange={e=>setDraft({...draft, image: e.target.value})} className="bg-gray-50 rounded-2xl px-4 py-4 text-sm font-bold border-none outline-none shadow-inner" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveProduct} className="flex-1 bg-black text-white py-5 rounded-[24px] font-black uppercase text-xs active:scale-95 shadow-xl flex items-center justify-center gap-2"><Save size={18}/> {editingId ? 'Actualizar' : 'Guardar en Catálogo'}</button>
                {editingId && <button onClick={()=>{setEditingId(null); setDraft({name:'',category:'Pollos',price:'',description:'',image:'',available:true});}} className="bg-gray-100 text-gray-500 px-6 rounded-[24px] active:scale-95"><X size={20}/></button>}
              </div>
            </section>

            <div className="space-y-4">
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Filtrar menú..." className="w-full bg-white rounded-2xl p-4 text-sm font-bold border border-gray-100 shadow-sm outline-none" />
              <div className="grid grid-cols-1 gap-3">
                {sortedProducts.map((p) => (
                  <div key={p?.id} className="bg-white rounded-[28px] border border-gray-100 p-3 flex items-center gap-4 shadow-sm relative overflow-hidden group">
                    <img src={p?.image || '/logo-final.png'} className="w-16 h-16 rounded-2xl object-cover border shadow-sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><p className="font-black text-[11px] text-gray-900 truncate uppercase italic">{p?.name}</p>{!p?.available && <span className="bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase animate-pulse">Agotado</span>}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100 uppercase">{p?.category}</span>
                        <span className="text-[10px] font-black text-gray-400">${parseFloat(p?.price || '0').toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-1 pr-1">
                      <button onClick={() => context.updateProduct(p.id, { available: !p.available })} className={`p-2.5 rounded-xl ${p?.available ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600 shadow-inner'}`}><Package size={16} /></button>
                      <button onClick={() => startEdit(p)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl active:scale-75"><Edit3 size={16} /></button>
                      <button onClick={() => confirm("¿Borrar?") && context.deleteProduct(p.id)} className="p-2.5 bg-red-50 text-red-400 rounded-xl active:scale-75"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB: CLIENTES (VIVA Y RESPIRANDO) ================= */}
        {tab === 'customers' && (
           <div className="space-y-4 pb-10 animate-in fade-in duration-500">
             <div className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 space-y-4">
               <div className="flex items-center gap-3">
                 <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><Users size={22}/></div>
                 <h2 className="font-black text-lg uppercase italic text-gray-900 leading-none">Clientes VIP</h2>
               </div>
               <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar guerrero por nombre o celular..." className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none outline-none shadow-inner" />
             </div>
             
             <div className="space-y-3">
               {ranking.filter(c => `${c?.name || ''} ${c?.phone || ''}`.toLowerCase().includes(search.toLowerCase())).map((c, i) => (
                 <div key={c?.id} className="bg-white rounded-[28px] border border-gray-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                   <img src={c?.avatar_url || `https://api.dicebear.com/8.x/adventurer/svg?seed=${c?.name}`} className="w-12 h-12 rounded-2xl border border-orange-50 shadow-sm object-cover" />
                   <div className="flex-1 min-w-0">
                     <p className="font-black text-xs truncate uppercase italic">{i + 1}º {c?.name || 'Guerrero'}</p>
                     <p className="text-[9px] font-black text-gray-400 mt-1 leading-none">{c?.phone}</p>
                     <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase mt-1.5 inline-block border border-orange-100">{(c?.points || 0).toLocaleString()} Pts</span>
                   </div>
                   <div className="flex items-center gap-1 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                     <input 
                       type="number" 
                       value={points[c?.id] ?? ''} 
                       onChange={e=>setPoints({...points, [c.id]: e.target.value})} 
                       className="w-12 bg-white rounded-xl py-2 text-center text-xs font-black outline-none shadow-sm" 
                       placeholder="+5" 
                     />
                     <button 
                       onClick={() => {
                         const pts = Number(points[c?.id] || 0);
                         if (pts !== 0) {
                           context.addCustomerPoints(c.id, pts);
                           setPoints({...points, [c.id]: ''});
                         }
                       }} 
                       className="bg-black text-white p-2.5 rounded-xl active:scale-90 shadow-lg transition-transform"
                     >
                       <Plus size={16}/>
                     </button>
                   </div>
                 </div>
               ))}
               {ranking.length === 0 && (
                 <p className="text-center text-xs font-bold text-gray-400 italic mt-8">No hay clientes registrados aún.</p>
               )}
             </div>
           </div>
        )}

        {/* ================= TAB: CONCURSO ================= */}
        {tab === 'ranking_config' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 leading-tight">
            <section className="bg-white rounded-[32px] p-6 shadow-xl border border-orange-100 space-y-6">
              <div className="flex items-center gap-3 border-b pb-4 border-gray-50">
                <div className="p-3 bg-orange-100 rounded-2xl text-orange-600"><Trophy size={22}/></div>
                <h2 className="font-black text-lg uppercase italic">Control de Concurso</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Título Actual</label><input value={safeExtraSettings.ranking_title || ''} onChange={e=>context.updateExtraSettings({ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Fecha Límite</label><input type="datetime-local" value={safeExtraSettings.ranking_end_date || ''} onChange={e=>context.updateExtraSettings({ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"/></div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <button onClick={handleFinalizeSeason} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest active:scale-95 transition-all shadow-xl mt-2">Finalizar y Crear Historial</button>
                <p className="text-[9px] text-gray-400 italic text-center mt-3">Al finalizar, los top 3 actuales bajarán al historial.</p>
              </div>
            </section>
            
            <section className="space-y-4">
               <h2 className="font-black uppercase italic px-2 text-gray-400 text-xs flex items-center gap-2"><History size={16}/> Historial Cronológico</h2>
               {sortedSeasons.map((s, idx) => (
                 <div key={s?.id} className="bg-white rounded-[32px] p-5 shadow-sm border border-gray-100 space-y-4">
                   <div className="flex justify-between items-center border-b pb-3 border-gray-50">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center font-black text-[10px]">#{sortedSeasons.length - idx}</div>
                         <p className="font-black text-sm uppercase italic">{s?.name}</p>
                      </div>
                      <button onClick={() => confirm("¿Borrar?") && context.deleteSeason(s.id)} className="text-red-400 p-2"><Trash2 size={16}/></button>
                   </div>
                   <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                     {(s?.winners || []).map((w: any, i: number) => (
                       <div key={i} className="bg-white p-2.5 rounded-xl flex items-center gap-3 shadow-sm border border-gray-100">
                         <span className="font-black text-[10px] w-6 italic text-gray-400">{i+1}º</span>
                         <div className="flex-1 min-w-0 leading-none">
                            <p className="text-[10px] font-black uppercase truncate">{w?.name}</p>
                            <input placeholder="Pegar link de foto..." className="w-full text-[9px] font-bold text-blue-500 outline-none bg-transparent mt-2 italic" value={w?.photo_url || ''} onChange={e => { const n = [...(s?.winners || [])]; n[i].photo_url = e.target.value; context.updateSeasonWinners(s.id, n); }} />
                         </div>
                       </div>
                     ))}
                   </div>
                   <button onClick={() => context.toggleSeasonVisibility(s.id, !s.is_published)} className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase shadow-md transition-all ${s?.is_published ? 'bg-green-500 text-white shadow-green-100' : 'bg-gray-100 text-gray-400'}`}>{s?.is_published ? '✅ Visible en Ranking' : 'Publicar Ganadores'}</button>
                 </div>
               ))}
            </section>
          </div>
        )}

      </main>
    </div>
  );
}

// Envolvemos el componente final para protegerlo
export default function AdminDashboard() {
  return (
    <AdminErrorBoundary>
      <AdminDashboardContent />
    </AdminErrorBoundary>
  );
}
