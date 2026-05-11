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
        <img src="/logo-final.png" className="w-20 h-20 mx-auto object-contain" />
        <h1 className="text-2xl font-black italic uppercase">Admin VIP</h1>
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
  const [draft, setDraft] = useState({ name: '', category: 'Pollos', price: '', description: '', image: '', available: true });
  const [editingId, setEditingId] = useState<string | null>(null);

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;
  if (!context || context.loading) return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-orange-500 font-black animate-pulse">Sincronizando Imperio...</div>;

  const { products = [], categories = [], customers = [], orders = [], seasons = [], extraSettings = {}, updateExtraSettings, finalizeSeason, deleteSeason, toggleSeasonVisibility, updateSeasonWinners, refreshData, updateOrderStatus, addCustomerPoints, addProduct, updateProduct, deleteProduct } = context;

  const ranking = [...(customers || [])].sort((a,b) => (b.points || 0) - (a.points || 0));

  const sortedProducts = [...(products || [])]
    .filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
        const catA = a.category || 'Otros';
        const catB = b.category || 'Otros';
        if (catA < catB) return -1;
        if (catA > catB) return 1;
        return a.name.localeCompare(b.name);
    });

  return (
    <div className="min-h-screen bg-gray-50 pb-20 font-sans text-slate-900 overflow-x-hidden">
      <header className="sticky top-0 z-40 bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2"><img src={extraSettings?.logo_url || '/logo-final.png'} className="w-8 h-8 object-contain"/><p className="font-black text-xs uppercase tracking-tighter">Admin VIP</p></div>
        <div className="flex gap-2">
            <button onClick={refreshData} className="p-2 bg-orange-50 text-orange-600 rounded-xl active:scale-75 transition-all"><RefreshCw size={18}/></button>
            <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400 active:scale-75"><LogOut size={18}/></button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {TABS.map(t => <button key={t.id} onClick={() => setTab(t.id as any)} className={`flex-shrink-0 px-5 py-3 rounded-2xl text-[10px] font-black flex items-center gap-2 transition-all ${tab===t.id?'bg-orange-500 text-white shadow-lg':'bg-white text-gray-400 border'}`}><t.Icon size={14}/>{t.label}</button>)}
        </div>

        {tab === 'ranking_config' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <section className="bg-white rounded-[32px] p-6 shadow-sm border border-gray-100 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Título</label><input value={extraSettings?.ranking_title || ''} onChange={e=>updateExtraSettings({ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"/></div>
                <div className="space-y-1"><label className="text-[9px] font-black uppercase text-gray-400">Fecha Fin</label><input type="datetime-local" value={extraSettings?.ranking_end_date || ''} onChange={e=>updateExtraSettings({ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-xl p-4 text-sm font-bold border-none outline-none shadow-inner"/></div>
                <div className="md:col-span-2 space-y-3 pt-4 border-t">
                  <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100 flex items-center gap-2"><Crown size={16} className="text-yellow-500"/><input placeholder="Premio Oro" value={extraSettings?.prize_1 || ''} onChange={e=>updateExtraSettings({prize_1: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-2"><Medal size={16} className="text-slate-400"/><input placeholder="Premio Plata" value={extraSettings?.prize_2 || ''} onChange={e=>updateExtraSettings({prize_2: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                  <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-center gap-2"><Medal size={16} className="text-orange-500"/><input placeholder="Premio Bronce" value={extraSettings?.prize_3 || ''} onChange={e=>updateExtraSettings({prize_3: e.target.value})} className="w-full bg-transparent text-sm font-bold outline-none"/></div>
                </div>
              </div>
              <button onClick={() => finalizeSeason(extraSettings?.ranking_title || 'Ranking', 'Premios VIP', ranking.slice(0,3))} className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase active:scale-95 transition-all">Finalizar Temporada</button>
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
                    <button onClick={async () => { if(editingId) await updateProduct(editingId, draft); else await addProduct(draft); setDraft({name:'',category:'Pollos',price:'',description:'',image:'',available:true}); setEditingId(null); }} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black">GUARDAR PLATO</button>
                </section>
                <div className="space-y-3">
                    {sortedProducts.map(p => (
                        <div key={p.id} className="bg-white p-3 rounded-2xl border flex items-center gap-3">
                            <img src={p.image} className="w-12 h-12 rounded-xl object-cover"/>
                            <div className="flex-1"><p className="font-black text-xs">{p.name}</p><p className="text-[10px] text-gray-400 uppercase">{p.category}</p></div>
                            <button onClick={() => {setEditingId(p.id); setDraft({...p});}} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit3 size={16}/></button>
                            <button onClick={() => deleteProduct(p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* ... (Orders y Clientes simplificados para el ZIP) ... */}
      </main>
    </div>
  );
}
