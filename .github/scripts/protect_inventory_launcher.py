from pathlib import Path

path = Path('src/components/AdminInventoryLauncher.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace(
    "import { supabase, isSupabaseConfigured } from '../lib/supabase';",
    "import { runAdminOperation } from '../utils/adminOperations';",
)

old_load_products = '''  const loadProducts = async () => {
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
'''
new_load_products = '''  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await runAdminOperation<{ products: InventoryProduct[] }>(
        'inventory_load'
      );
      setProducts(Array.isArray(result.products) ? result.products : []);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude cargar productos.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
'''
if old_load_products not in text:
    raise RuntimeError('loadProducts block not found')
text = text.replace(old_load_products, new_load_products)

old_movements = '''  const loadMovements = async (productId: string) => {
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
'''
new_movements = '''  const loadMovements = async (productId: string) => {
    setLoadingMovements(true);

    try {
      const result = await runAdminOperation<{ movements: StockMovement[] }>(
        'inventory_movements',
        { productId, limit: 12 }
      );
      setMovements(Array.isArray(result.movements) ? result.movements : []);
    } catch (error) {
      console.error(error);
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };
'''
if old_movements not in text:
    raise RuntimeError('loadMovements block not found')
text = text.replace(old_movements, new_movements)

old_settings = '''    const { error: updateError } = await supabase
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
'''
new_settings = '''    try {
      await runAdminOperation('inventory_settings', {
        productId: selectedProduct.id,
        barcode: editBarcode.trim() || null,
        costPrice: parseNumber(editCost),
        stockMinimum: parseNumber(editMinimum),
        trackStock: editTrackStock,
      });
      setMessage('Configuración de inventario guardada.');
      await refreshSelectedProduct(selectedProduct.id);
    } catch (error) {
      console.error(error);
      setError(
        error instanceof Error
          ? error.message
          : 'No pude guardar configuración de inventario.'
      );
    } finally {
      setSaving(false);
    }
'''
if old_settings not in text:
    raise RuntimeError('settings block not found')
text = text.replace(old_settings, new_settings)

old_adjust = '''    const { data, error: rpcError } = await supabase.rpc('adjust_product_stock_v1', {
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
'''
new_adjust = '''    try {
      const result = await runAdminOperation<{ stock: number | string }>(
        'inventory_adjust',
        {
          productId: selectedProduct.id,
          delta,
          description:
            reason ||
            (mode === 'add'
              ? 'Entrada de mercadería'
              : 'Salida/ajuste de inventario'),
        }
      );
      setMessage(`Stock actualizado. Nuevo stock: ${qty(result.stock)}.`);
      setAmount('1');
      await refreshSelectedProduct(selectedProduct.id);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude ajustar stock.');
    } finally {
      setSaving(false);
    }
'''
if old_adjust not in text:
    raise RuntimeError('adjust block not found')
text = text.replace(old_adjust, new_adjust)

path.write_text(text, encoding='utf-8')
