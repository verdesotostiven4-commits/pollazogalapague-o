import { useMemo, useState } from 'react';
import { Bell, Edit3, LogOut, Package, Plus, Save, Search, Send, Settings, Star, Trash2, Users } from 'lucide-react';
import { useAdmin } from '../context/AdminContext';
import { Category, OrderStatus, Product } from '../types';
import { WHATSAPP, buildStatusWhatsAppUrl } from '../utils/whatsapp';

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
  return <div className="min-h-screen bg-gray-950 flex items-center justify-center px-6">
    <div className="w-full max-w-xs text-center space-y-6">
      <img src="/logo-final.png" className="w-24 h-24 object-contain mx-auto" />
      <div><h1 className="text-white text-2xl font-black">Panel Omnipotente</h1><p className="text-white/50 text-sm">PIN de administrador</p></div>
      <div className="flex justify-center gap-3">{[0,1,2,3].map(i => <span key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? 'bg-orange-500' : error ? 'bg-red-500' : 'bg-white/20'}`} />)}</div>
      {error && <p className="text-red-400 text-sm font-bold">PIN incorrecto</p>}
      <div className="grid grid-cols-3 gap-3">{['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d,i) => d ? <button key={i} onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : add(d)} className="aspect-square rounded-2xl bg-white/10 text-white text-xl font-black active:scale-95">{d}</button> : <div key={i} />)}</div>
    </div>
  </div>;
}

export default function AdminDashboard() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(PIN_KEY) === '1');
  const { products, categories, overrides, settings, updateSetting, setOverride, addProduct, updateProduct, deleteProduct, customers, addCustomerPoints, orders, updateOrderStatus } = useAdmin();
  const [tab, setTab] = useState<'products' | 'settings' | 'customers' | 'orders'>('products');
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState(emptyProduct);
  const [editing, setEditing] = useState<string | null>(null);
  const [points, setPoints] = useState<Record<string, string>>({});

  const filteredProducts = useMemo(() => products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase())), [products, search]);
  const ranking = useMemo(() => [...customers].sort((a,b) => b.points - a.points), [customers]);

  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;

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

  const handleStatus = async (orderId: string, status: OrderStatus) => {
    await updateOrderStatus(orderId, status);
  };

  return <div className="min-h-screen bg-gray-50">
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3"><img src="/logo-final.png" className="w-10 h-10 object-contain" /><div><p className="font-black text-gray-900">Panel Admin</p><p className="text-xs text-gray-400">La Casa del Pollazo</p></div></div>
        <button onClick={() => { sessionStorage.removeItem(PIN_KEY); setAuthed(false); }} className="flex items-center gap-2 text-sm font-bold text-gray-500"><LogOut size={16}/>Salir</button>
      </div>
    </header>

    <main className="max-w-6xl mx-auto px-4 py-5 space-y-5">
      <div className="grid grid-cols-4 gap-2">
        {[
          ['products','Productos',Package], ['settings','Personalización',Settings], ['customers','Clientes y puntos',Users], ['orders','Pedidos WhatsApp',Send]
        ].map(([id,label,Icon]) => <button key={id as string} onClick={() => setTab(id as typeof tab)} className={`rounded-2xl p-3 text-xs font-black flex flex-col items-center gap-1 ${tab===id?'bg-orange-500 text-white':'bg-white text-gray-600 border border-gray-100'}`}><Icon size={18}/>{label as string}</button>)}
      </div>

      {tab === 'products' && <section className="space-y-4">
        <div className="bg-white rounded-3xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 flex items-center gap-2"><Plus size={18}/> {editing ? 'Editar producto' : 'Agregar producto'}</h2>
          <div className="grid md:grid-cols-3 gap-2">
            <input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Nombre" className="bg-gray-50 rounded-xl px-3 py-2 text-sm outline-orange-300" />
            <select value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value as Category})} className="bg-gray-50 rounded-xl px-3 py-2 text-sm">{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <input value={draft.price} onChange={e=>setDraft({...draft,price:e.target.value})} placeholder="Precio: $1.50 o Consultar" className="bg-gray-50 rounded-xl px-3 py-2 text-sm outline-orange-300" />
            <input value={draft.image} onChange={e=>setDraft({...draft,image:e.target.value})} placeholder="URL de imagen" className="bg-gray-50 rounded-xl px-3 py-2 text-sm outline-orange-300 md:col-span-2" />
            <input value={draft.badge} onChange={e=>setDraft({...draft,badge:e.target.value})} placeholder="Etiqueta: Popular" className="bg-gray-50 rounded-xl px-3 py-2 text-sm outline-orange-300" />
            <textarea value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})} placeholder="Descripción" className="bg-gray-50 rounded-xl px-3 py-2 text-sm outline-orange-300 md:col-span-3" />
          </div>
          <div className="flex gap-2"><button onClick={saveProduct} className="bg-orange-500 text-white rounded-xl px-4 py-2 font-black text-sm flex items-center gap-2"><Save size={16}/>Guardar</button>{editing && <button onClick={()=>{setEditing(null);setDraft(emptyProduct)}} className="bg-gray-100 rounded-xl px-4 py-2 font-bold text-sm">Cancelar</button>}</div>
        </div>
        <div className="bg-white rounded-3xl border border-gray-100 p-4">
          <div className="relative mb-4"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar productos..." className="w-full bg-gray-50 rounded-xl pl-9 pr-3 py-3 text-sm"/></div>
          <div className="divide-y divide-gray-100">{filteredProducts.map(p => { const available = overrides[p.id]?.available ?? p.available !== false; return <div key={p.id} className="py-3 flex items-center gap-3"><img src={p.image || '/logo-final.png'} className="w-12 h-12 object-contain rounded-xl bg-gray-50"/><div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{p.name}</p><p className="text-xs text-gray-400">{p.category} · {overrides[p.id]?.price ?? p.price ?? 'Consultar'}</p></div><button onClick={()=>setOverride(p.id,{available:!available})} className={`px-3 py-2 rounded-xl text-xs font-black ${available?'bg-green-100 text-green-700':'bg-red-100 text-red-600'}`}>{available?'Disponible':'Agotado'}</button><button onClick={()=>edit(p)} className="p-2 bg-gray-100 rounded-xl"><Edit3 size={16}/></button><button onClick={()=>deleteProduct(p.id)} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={16}/></button></div>})}</div>
        </div>
      </section>}

      {tab === 'settings' && <section className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4">
        <h2 className="font-black text-gray-900 flex items-center gap-2"><Bell size={18}/> Personalización de la app</h2>
        <label className="block text-sm font-bold text-gray-700">Color principal</label><input type="color" value={settings.primary_color} onChange={e=>updateSetting('primary_color', e.target.value)} className="w-20 h-12 rounded-xl" />
        <label className="block text-sm font-bold text-gray-700">Texto de anuncio/aviso</label><textarea value={settings.announcement} onChange={e=>updateSetting('announcement', e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm" placeholder="Ej: Hoy promo especial..." />
        <label className="block text-sm font-bold text-gray-700">Link del banner principal</label><input value={settings.banner_link} onChange={e=>updateSetting('banner_link', e.target.value)} className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm" placeholder="https://wa.me/..." />
      </section>}

      {tab === 'customers' && <section className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4">
        <h2 className="font-black text-gray-900 flex items-center gap-2"><Star size={18}/> Ranking de clientes</h2>
        <p className="text-xs text-gray-500">Regla: $1 = 1 punto. Puedes sumar o restar puntos manualmente.</p>
        <div className="divide-y divide-gray-100">{ranking.map((c,i) => <div key={c.id} className="py-3 flex items-center gap-3"><div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 font-black flex items-center justify-center">{i+1}</div><div className="flex-1"><p className="font-bold">{c.name || 'Cliente'}</p><p className="text-xs text-gray-400">{c.phone}</p></div><span className="font-black text-orange-600">{c.points} pts</span><input value={points[c.id] ?? ''} onChange={e=>setPoints({...points,[c.id]:e.target.value})} className="w-20 bg-gray-50 rounded-xl px-2 py-2 text-sm" placeholder="+10"/><button onClick={()=>{addCustomerPoints(c.id, Number(points[c.id]||0)); setPoints({...points,[c.id]:''});}} className="bg-orange-500 text-white rounded-xl px-3 py-2 text-xs font-black">Asignar</button></div>)}</div>
      </section>}

      {tab === 'orders' && <section className="bg-white rounded-3xl border border-gray-100 p-4 space-y-4">
        <h2 className="font-black text-gray-900 flex items-center gap-2"><Send size={18}/> Pedidos y estados WhatsApp</h2>
        {orders.length === 0 ? <p className="text-gray-400 text-sm py-8 text-center">Aún no hay pedidos guardados.</p> : <div className="space-y-3">{orders.map(o => <div key={o.id} className="border border-gray-100 rounded-2xl p-3"><div className="flex justify-between gap-2"><div><p className="font-black">{o.order_code}</p><p className="text-xs text-gray-400">{o.customer_phone} · ${o.total.toFixed(2)}</p></div><span className="text-xs font-black bg-orange-100 text-orange-600 px-2 py-1 rounded-full h-fit">{o.status}</span></div><div className="flex gap-2 flex-wrap mt-3">{statuses.map(st => <button key={st} onClick={()=>handleStatus(o.id, st)} className="text-xs bg-gray-100 rounded-xl px-3 py-2 font-bold">{st}</button>)}<a href={buildStatusWhatsAppUrl(o.customer_phone || WHATSAPP, o.order_code, o.status)} target="_blank" className="text-xs bg-green-500 text-white rounded-xl px-3 py-2 font-black flex items-center gap-1"><Send size={12}/>Enviar WhatsApp</a></div></div>)}</div>}
      </section>}
    </main>
  </div>;
}
