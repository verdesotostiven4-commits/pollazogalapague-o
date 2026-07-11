from pathlib import Path

path = Path('src/components/AdminInventoryLauncher.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace(
    "import { supabase, isSupabaseConfigured } from '../lib/supabase';",
    "import { runAdminOperation } from '../utils/adminOperations';",
)

old = """  const loadProducts = async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase no está configurado.');
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name', { ascending: true });

    if (productsError) {
      console.error(productsError);
      setError('No pude cargar productos. Revisa permisos/RLS de products.');
    } else {
      setProducts((data || []) as InventoryProduct[]);
    }

    setLoading(false);
  };

  const loadMovements = async (productId: string) => {
    if (!isSupabaseConfigured) return;

    setLoadingMovements(true);

    const { data, error: movementsError } = await supabase.rpc('get_product_stock_movements_v1', {
      p_product_id: productId,
      p_limit: 12,
    });

    if (movementsError) {
      console.error(movementsError);
      setMovements([]);
    } else {
      setMovements((data || []) as StockMovement[]);
    }

    setLoadingMovements(false);
  };
"""
new = """  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await runAdminOperation<{ products?: InventoryProduct[] }>('inventory_load');
      setProducts(Array.isArray(result?.products) ? result.products : []);
    } catch (loadError) {
      console.error(loadError);
      setProducts([]);
      setError(loadError instanceof Error ? loadError.message : 'No pude cargar productos.');
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async (productId: string) => {
    setLoadingMovements(true);

    try {
      const result = await runAdminOperation<{ movements?: StockMovement[] }>(
        'inventory_movements',
        { productId, limit: 12 }
      );
      setMovements(Array.isArray(result?.movements) ? result.movements : []);
    } catch (movementsError) {
      console.error(movementsError);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };
"""
if old not in text:
    raise SystemExit('load inventory block not found')
text = text.replace(old, new)

old = """    const { error: updateError } = await supabase
      .from('products')
      .update({
        barcode: editBarcode.trim() || null,
        cost_price: parseNumber(editCost),
        stock_minimum: parseNumber(editMinimum),
        track_stock: editTrackStock,
      })
      .eq('id', selectedProduct.id);

    if (updateError) {
      console.error(updateError);
      setError('No pude guardar configuración de inventario.');
    } else {
      setMessage('Configuración de inventario guardada.');
      await refreshSelectedProduct(selectedProduct.id);
    }

    setSaving(false);
"""
new = """    try {
      await runAdminOperation('inventory_settings', {
        productId: selectedProduct.id,
        barcode: editBarcode.trim() || null,
        costPrice: parseNumber(editCost),
        stockMinimum: parseNumber(editMinimum),
        trackStock: editTrackStock,
      });
      setMessage('Configuración de inventario guardada.');
      await refreshSelectedProduct(selectedProduct.id);
    } catch (updateError) {
      console.error(updateError);
      setError(
        updateError instanceof Error
          ? updateError.message
          : 'No pude guardar configuración de inventario.'
      );
    } finally {
      setSaving(false);
    }
"""
if old not in text:
    raise SystemExit('inventory settings block not found')
text = text.replace(old, new)

old = """    const { data, error: rpcError } = await supabase.rpc('adjust_product_stock_v1', {
      p_product_id: selectedProduct.id,
      p_delta: delta,
      p_description: reason || (mode === 'add' ? 'Entrada de mercadería' : 'Salida/ajuste de inventario'),
      p_created_by: 'admin',
    });

    if (rpcError) {
      console.error(rpcError);
      setError(rpcError.message || 'No pude ajustar stock.');
    } else {
      setMessage(`Stock actualizado. Nuevo stock: ${qty(data)}.`);
      setAmount('1');
      await refreshSelectedProduct(selectedProduct.id);
    }

    setSaving(false);
"""
new = """    try {
      const result = await runAdminOperation<{ stock?: number | string }>('inventory_adjust', {
        productId: selectedProduct.id,
        delta,
        description:
          reason ||
          (mode === 'add' ? 'Entrada de mercadería' : 'Salida/ajuste de inventario'),
      });
      setMessage(`Stock actualizado. Nuevo stock: ${qty(result?.stock)}.`);
      setAmount('1');
      await refreshSelectedProduct(selectedProduct.id);
    } catch (rpcError) {
      console.error(rpcError);
      setError(rpcError instanceof Error ? rpcError.message : 'No pude ajustar stock.');
    } finally {
      setSaving(false);
    }
"""
if old not in text:
    raise SystemExit('inventory adjust block not found')
text = text.replace(old, new)

path.write_text(text, encoding='utf-8')
