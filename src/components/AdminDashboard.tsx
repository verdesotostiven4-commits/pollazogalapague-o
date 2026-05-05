import { useMemo, useState, useEffect } from 'react';
import { Bell, Edit3, LogOut, Package, Plus, Save, Search, Send, Settings, Star, Trash2, Users, Image, Trophy, Calendar } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Category, OrderStatus, Product } from '../types';
import { WHATSAPP, buildStatusWhatsAppUrl } from '../utils/whatsapp';
import { supabase } from '../lib/supabase';

// LÍNEA 9: REVISA QUE TENGA LOS NÚMEROS
const BOLITAS_DEL_PIN =;

const ADMIN_PIN = '1328';
const PIN_KEY = 'pollazo_admin_auth';
const emptyProduct: Omit<Product, 'id'> & { id?: string } = { name: '', category: 'Pollos', price: '', description: '', image: '', badge: '', available: true };
const statuses: OrderStatus[] = ['Recibido', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];

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
      <div className="w-full max-w-xs text-center space-y-6">
        <img src="/logo-final.png" className="w-24 h-24 object-contain mx-auto" />
        <div><h1 className="text-white text-2xl font-black">Panel Omnipotente</h1><p className="text-white/50 text-sm">PIN de administrador</p></div>
        <div className="flex justify-center gap-3">
          {BOLITAS_DEL_PIN.map(i => (
            <span key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? 'bg-orange-500' : error ? 'bg-red-500' : 'bg-white/20'}`} />
          ))}
        </div>
        {error && <p className="text-red-400 text-sm font-bold">PIN incorrecto</p>}
        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d,i) => d ? (
            <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : add(d)} className="aspect-square rounded-2xl bg-white/10 text-white text-xl font-black active:scale-95 transition-transform">
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
  const [tab, setTab] = useState<'products' | 'branding' | 'customers' | 'orders' | 'ranking_config'>('products');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(emptyProduct);
  const [editing, setEditing] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  const [extraSettings, setExtraSettings] = useState({
    logo_url: '/logo-final.png',
    ranking_title: 'Ranking Mensual',
    prize_description: '¡Gana un Combo Familiar!',
    ranking_end_date: ''
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase.from('settings').select('*').single();
        if (data) setExtraSettings({
          logo_url: data.logo_url || '/logo-final.png',
          ranking_title: data.ranking_title || 'Ranking Mensual',
          prize_description: data.prize_description || '¡Gana un Combo Familiar!',
          ranking_end_date: data.ranking_end_date || ''
        });
      } catch (e) {
        console.error("Error loading settings");
      }
    };
    fetchSettings();
  }, []);

  const saveExtraSettings = async () => {
    try {
      await supabase.from('settings').upsert({ id: 'global', ...extraSettings });
      alert('¡Ajustes guardados!');
    } catch (err) {
      alert('Error al guardar ajustes');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.;
    if (!file) return;
    setUploading(true);
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data } = await supabase.storage.from('images').upload(fileName, file);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        setExtraSettings(prev => ({ ...prev, [field]: publicUrl }));
      }
    } catch (err) {
      alert('Error al subir imagen');
    }
    setUploading(false);
  };

  const filteredProducts = useMemo(() => products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const ranking = useMemo(() => [...customers].sort((a,b) => b.points - a.points), [customers]);

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
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={extraSettings.logo_url} className="w-10 h-10 object-contain rounded-lg" />
            <div><p className="font-black text-gray-900 leading-none text-sm">Panel Omnipotente</p><p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wider">Dashboard El Pollazo</p></div>
          </div>
          <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="p-2 text-gray-400"><LogOut size={20}/></button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-6">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {[
            ['products','Menú',Package], ['branding','Marca',Image], ['ranking_config','Concurso',Trophy], ['customers','Clientes',Users], ['orders','WhatsApp',Send]
          ].map(([id,label,Icon]) => (
            <button key={id as string} onClick={() => setTab(id as any)} 
              className={`flex-shrink-0 rounded-2xl px-5 py-3 text-xs font-black flex items-center gap-2 transition-all ${tab===id?'bg-orange-500 text-white shadow-lg shadow-orange-100':'bg-white text-gray-600 border border-gray-100'}`}>
              <Icon size={16}/>{label as string}
            </button>
          ))}
        </div>

        {tab === 'branding' && (
          <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-6">
            <h2 className="font-black text-lg flex items-center gap-2 text-gray-900"><Image size={20} className="text-orange-500"/> Identidad Visual</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                <img src={extraSettings.logo_url} className="w-16 h-16 object-contain bg-white rounded-xl shadow-sm" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-700">Logo del Local</p>
                  <label className="inline-block mt-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-xs font-black cursor-pointer active:scale-95 transition-transform">
                    {uploading ? 'Subiendo...' : 'Subir nuevo logo'}
                    <input type="file" className="hidden" accept="image/*" onChange={e => handleUpload(e, 'logo_url')} />
                  </label>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Color principal</label>
                <div className="flex gap-3 items-center">
                  <input type="color" value={settings.primary_color} onChange={e=>updateSetting('primary_color', e.target.value)} className="w-14 h-14 rounded-xl overflow-hidden border-none" />
                  <p className="text-xs text-gray-400 font-mono uppercase">{settings.primary_color}</p>
                </div>
              </div>
            </div>
            <button onClick={saveExtraSettings} className="w-full bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-2">Actualizar cambios</button>
          </section>
        )}

        {tab === 'ranking_config' && (
          <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-5">
            <h2 className="font-black text-lg flex items-center gap-2 text-gray-900"><Trophy size={20} className="text-yellow-500"/> Control de Premios</h2>
            <div className="space-y-4">
              <div><label className="text-[10px] font-black text-gray-400 uppercase">Título del Ranking</label><input value={extraSettings.ranking_title} onChange={e=>setExtraSettings({...extraSettings, ranking_title: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold mt-1" /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase">Premio del Mes</label><textarea value={extraSettings.prize_description} onChange={e=>setExtraSettings({...extraSettings, prize_description: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold mt-1" rows={2} /></div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1"><Calendar size={12}/> Fecha de Cierre</label><input type="datetime-local" value={extraSettings.ranking_end_date} onChange={e=>setExtraSettings({...extraSettings, ranking_end_date: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold mt-1" /></div>
            </div>
            <button onClick={saveExtraSettings} className="w-full bg-orange-500 text-white py-4 rounded-2xl font-black">Guardar Concurso</button>
          </section>
        )}

        {tab === 'customers' && (
          <section className="bg-white rounded-3xl border border-gray-100 p-5 space-y-5">
            <h2 className="font-black text-lg flex items-center gap-2 text-gray-900"><Users size={20} className="text-blue-500"/> Clientes Registrados</h2>
            <div className="divide-y divide-gray-100">
              {ranking.map((c, i) => (
                <div key={c.id} className="py-4 flex items-center gap-4">
                  <div className="relative">
                    {c.avatar_url ? <img src={c.avatar_url} className="w-12 h-12 rounded-full object-cover border-2 border-orange-100" /> : <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 font-black flex items-center justify-center text-lg uppercase">{c.full_name?.charAt(0) || 'C'}</div>}
                    <div className={`absolute -top-1 -left-1 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 border-white shadow-sm ${i===0?'bg-yellow-400 text-white':i===1?'bg-gray-300 text-white':i===2?'bg-amber-600 text-white':'bg-gray-100 text-gray-400'}`}>{i === 0 ? '👑' : i + 1}</div>
                  </div>
                  <div className="flex-1">
                    <p className="font-black text-gray-900 text-sm">{c.full_name || 'Cliente'}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{c.phone}</p>
                    <p className="text-[10px] font-black text-orange-500 mt-1 uppercase">{c.points} Puntos</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <input value={points[c.id] ?? ''} onChange={e=>setPoints({...points,[c.id]:e.target.value})} className="w-12 bg-gray-50 rounded-lg px-1 py-2 text-center text-[10px] font-black" placeholder="+5"/>
                    <button onClick={()=>{addCustomerPoints(c.id, Number(points[c.id]||0)); setPoints({...points,[c.id]:''});}} className="bg-black text-white rounded-lg p-2"><Plus size={14}/></button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {tab === 'products' && (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-100 p-5 space-y-4">
              <h2 className="font-black text-gray-900 flex items-center gap-2"><Plus size={20} className="text-orange-500"/> {editing ? 'Editar' : 'Nuevo'} Producto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Nombre" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold" />
                 <select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as Category})} className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold outline-none">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                 <input value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} placeholder="Precio" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold" />
                 <input value={draft.image} onChange={e=>setDraft({...draft,image:e.target.value})} placeholder="URL de imagen" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold" />
                 <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descripción" className="bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold md:col-span-2" rows={2} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProduct} className="flex-1 bg-orange-500 text-white rounded-2xl py-4 font-black shadow-lg shadow-orange-100 active:scale-95 transition-transform">Guardar</button>
                {editing && <button onClick={()=>{setEditing(null);setDraft(emptyProduct)}} className="bg-gray-100 text-gray-500 rounded-2xl px-6 py-4 font-bold">Cancelar</button>}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-5">
              <div className="relative mb-6"><Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full bg-gray-50 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold"/></div>
              <div className="space-y-4">
                {filteredProducts.map(p => { 
                  const available = overrides[p.id]?.available ?? p.available !== false; 
                  return (
                    <div key={p.id} className="flex items-center gap-4 p-2 bg-gray-50/50 rounded-2xl border border-gray-50">
                      <img src={p.image || '/logo-final.png'} className="w-14 h-14 object-cover rounded-xl shadow-sm"/>
                      <div className="flex-1 min-w-0"><p className="font-black text-sm text-gray-900 truncate">{p.name}</p><p className="text-[10px] text-gray-400 font-bold uppercase">{p.category} · {overrides[p.id]?.price ?? p.price ?? 'Consultar'}</p></div>
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
      </main>
    </div>
  );
}
