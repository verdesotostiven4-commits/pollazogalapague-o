from pathlib import Path
root=Path('.')

def replace_between(text,start,end,new):
    i=text.index(start); j=text.index(end,i); return text[:i]+new+text[j:]

p=root/'src/components/AdminPosSmartLauncher.tsx'; t=p.read_text()
t=t.replace("import { supabase, isSupabaseConfigured } from '../lib/supabase';", "import { runAdminOperation } from '../utils/adminOperations';")
needle="""type ActiveRegister = {
  id: string;
  openingBalance: number;
  expectedCashSales: number;
};
"""
add=needle+"""
type RegisterRow = {
  id: string;
  opening_balance?: number | string | null;
  expected_cash_sales?: number | string | null;
};

const mapRegister = (row: RegisterRow | null): ActiveRegister | null => {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    openingBalance: parseMoney(row.opening_balance),
    expectedCashSales: parseMoney(row.expected_cash_sales),
  };
};
"""
t=t.replace(needle,add)
new_funcs=r'''  const applyRegister = (row: RegisterRow | null, fallbackOpeningBalance = 0) => {
    const next = mapRegister(row) ||
      (row?.id
        ? {
            id: String(row.id),
            openingBalance: fallbackOpeningBalance,
            expectedCashSales: 0,
          }
        : null);

    setRegister(next);
    if (next) {
      setClosingCash(money(next.openingBalance + next.expectedCashSales));
    }
  };

  const loadProducts = async () => {
    setLoadingProducts(true);
    setError(null);

    try {
      const result = await runAdminOperation<{
        products: PosProduct[];
        register: RegisterRow | null;
      }>('pos_load', { operator: POS_OPERATOR });

      setProducts(
        (Array.isArray(result.products) ? result.products : []).filter(
          product => product.show_in_pos !== false
        )
      );
      if (result.register) applyRegister(result.register);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude cargar productos para caja.');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadRegisterById = async (
    registerId: string,
    fallbackOpeningBalance = 0
  ) => {
    try {
      const result = await runAdminOperation<{ register: RegisterRow | null }>(
        'pos_register',
        { registerId }
      );
      applyRegister(result.register || { id: registerId }, fallbackOpeningBalance);
    } catch (error) {
      console.error(error);
      applyRegister({ id: registerId }, fallbackOpeningBalance);
    }
  };

  const loadCurrentOpenRegister = async () => {
    try {
      const result = await runAdminOperation<{
        products: PosProduct[];
        register: RegisterRow | null;
      }>('pos_load', { operator: POS_OPERATOR });
      if (result.register) applyRegister(result.register);
    } catch (error) {
      console.error(error);
    }
  };
'''
t=replace_between(t,'  const loadProducts = async () => {','\n  useEffect(() => {',new_funcs)
new_open=r'''  const openCashRegister = async () => {
    setSaving(true);
    setError(null);

    const cleanOpeningBalance = parseMoney(openingBalance);

    try {
      const result = await runAdminOperation<{ register: RegisterRow | null }>(
        'pos_open_register',
        {
          openingBalance: cleanOpeningBalance,
          operator: POS_OPERATOR,
          notes: 'Caja abierta desde POS del admin',
        }
      );

      if (!result.register) throw new Error('No se recibió la caja abierta.');
      applyRegister(result.register, cleanOpeningBalance);
      setSessionSales([]);
      setLastSaleId(null);
      setLastTicket(null);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No se pudo abrir caja.');
    } finally {
      setSaving(false);
    }
  };
'''
t=replace_between(t,'  const openCashRegister = async () => {','\n  const closeCashRegister = async () => {',new_open)
old="""    const { error: closeError } = await supabase.rpc('close_cash_register_v1', {
      p_cash_register_id: register.id,
      p_real_balance_cash: realCash,
      p_notes: `Cierre POS. Esperado $${money(expectedCash)}. Contado $${money(realCash)}. Diferencia $${money(difference)}`,
    });

    if (closeError) {
      console.error(closeError);
      setError(closeError.message || 'No se pudo cerrar caja.');
    } else {
      setRegister(null);
      setItems([]);
      setCashReceived('');
      setPaymentReference('');
      setClosingCash('');
      setLastSaleId(null);
      setLastTicket(null);
      window.alert('Turno de caja cerrado correctamente.');
    }

    setClosing(false);
"""
new="""    try {
      await runAdminOperation('pos_close_register', {
        registerId: register.id,
        realCash,
        notes: `Cierre POS. Esperado $${money(expectedCash)}. Contado $${money(realCash)}. Diferencia $${money(difference)}`,
      });
      setRegister(null);
      setItems([]);
      setCashReceived('');
      setPaymentReference('');
      setClosingCash('');
      setLastSaleId(null);
      setLastTicket(null);
      window.alert('Turno de caja cerrado correctamente.');
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No se pudo cerrar caja.');
    } finally {
      setClosing(false);
    }
"""
t=t.replace(old,new)
old_start="    const { data, error: rpcError } = await supabase.rpc('create_pos_sale_v1', {"
i=t.index(old_start); j=t.index('\n    setSaving(false);',i)
newblock=r'''    try {
      const result = await runAdminOperation<{
        saleId: string;
        register: RegisterRow | null;
      }>('pos_create_sale', {
        registerId: register.id,
        customerName: 'Consumidor final',
        operator: POS_OPERATOR,
        items: payloadItems,
        payments,
        discountAmount: 0,
        notes: 'Venta de mostrador desde POS',
      });

      const saleId = String(result.saleId || '');
      if (!saleId) throw new Error('No se recibió el ID de la venta.');
      const saleDate = new Date().toLocaleString('es-EC');

      setLastSaleId(saleId);
      setLastTicket({
        saleId,
        date: saleDate,
        items: soldItemsSnapshot,
        total: soldTotal,
        paymentMethod: soldPaymentMethod,
        cashReceived: soldCashReceived,
        change: soldChange,
      });
      setSessionSales(current => [
        {
          saleId,
          total: soldTotal,
          paymentMethod: soldPaymentMethod,
          date: saleDate,
          itemsCount: soldItemsSnapshot.reduce((sum, item) => sum + item.quantity, 0),
        },
        ...current,
      ].slice(0, 6));

      if (result.register) {
        applyRegister(result.register);
      } else {
        setRegister(current => {
          if (!current) return current;
          const nextExpectedCashSales =
            current.expectedCashSales +
            (soldPaymentMethod === 'cash' ? soldTotal : 0);
          setClosingCash(money(current.openingBalance + nextExpectedCashSales));
          return { ...current, expectedCashSales: nextExpectedCashSales };
        });
      }

      setItems([]);
      setCashReceived('');
      setPaymentReference('');
      await loadProducts();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No se pudo guardar la venta.');
    }
'''
t=t[:i]+newblock+t[j:]
p.write_text(t)

p=root/'src/components/AdminPosReportsLauncher.tsx'; t=p.read_text()
t=t.replace("import { supabase, isSupabaseConfigured } from '../lib/supabase';", "import { runAdminOperation } from '../utils/adminOperations';")
new=r'''  const loadReport = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await runAdminOperation<{ report: PosReport }>('pos_report', {
        startDate: range.start.toISOString(),
        endDate: range.end.toISOString(),
      });
      setReport(result.report || {});
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude cargar reporte POS.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };
'''
t=replace_between(t,'  const loadReport = async () => {','\n  useEffect(() => {',new)
p.write_text(t)

p=root/'src/components/AdminPosCorrectionsLauncher.tsx'; t=p.read_text()
t=t.replace("import { supabase, isSupabaseConfigured } from '../lib/supabase';", "import { runAdminOperation } from '../utils/adminOperations';")
new=r'''  const loadSales = async () => {
    setLoading(true);
    setError(null);

    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    try {
      const result = await runAdminOperation<{ report: PosReport }>('pos_report', {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });
      setSales(result.report?.sales || []);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude cargar ventas POS.');
      setSales([]);
    } finally {
      setLoading(false);
    }
  };
'''
t=replace_between(t,'  const loadSales = async () => {','\n  useEffect(() => {',new)
old="""    const { error: correctionError } = await supabase.rpc('void_pos_sale_v1', {
      p_pos_sale_id: sale.id,
      p_reason: reason.trim(),
      p_voided_by: 'admin',
    });

    if (correctionError) {
      console.error(correctionError);
      setError(correctionError.message || 'No pude corregir la venta.');
    } else {
      setMessage(`Venta ${sale.sale_code} corregida correctamente.`);
      await loadSales();
    }

    setCorrectingId(null);
"""
new="""    try {
      await runAdminOperation('pos_void_sale', {
        saleId: sale.id,
        reason: reason.trim(),
      });
      setMessage(`Venta ${sale.sale_code} corregida correctamente.`);
      await loadSales();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude corregir la venta.');
    } finally {
      setCorrectingId(null);
    }
"""
t=t.replace(old,new)
p.write_text(t)

p=root/'src/components/AdminCatalogMasterLauncher.tsx'; t=p.read_text()
t=t.replace("import { supabase, isSupabaseConfigured } from '../lib/supabase';", "import { runAdminOperation } from '../utils/adminOperations';\nimport { runPanelAction } from '../utils/panelApi';")
new=r'''  const loadProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await runAdminOperation<{ products: CatalogProduct[] }>(
        'inventory_load'
      );
      setProducts(mergeCatalogProducts(result.products || []));
    } catch (error) {
      console.error(error);
      setError('No pude cargar los productos del sistema. Mostrando lista guardada de respaldo.');
      setProducts(mergeCatalogProducts([]));
    } finally {
      setLoading(false);
    }
  };
'''
t=replace_between(t,'  const loadProducts = async () => {','\n  useEffect(() => {',new)
new=r'''  const activateFullCatalog = async () => {
    const pendingProducts = products.filter(product => product.source === 'base');

    if (pendingProducts.length === 0) {
      setMessage('Catálogo completo listo. No hay productos pendientes.');
      return;
    }

    const confirmed = window.confirm(`Se activarán ${pendingProducts.length} productos para que aparezcan en el sistema del local. No se tocarán productos que ya fueron editados. ¿Continuar?`);
    if (!confirmed) return;

    setSyncingCatalog(true);
    setError(null);
    setMessage(null);

    try {
      const now = new Date().toISOString();
      const payload = pendingProducts.map(product =>
        buildInsertPayloadFromBaseProduct(product, now)
      );
      for (const product of payload) {
        await runPanelAction('upsert_product', { product });
      }
      setMessage(`Catálogo completo activado. ${pendingProducts.length} productos quedaron listos para clientes, caja e inventario.`);
      await loadProducts();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude activar el catálogo completo.');
    } finally {
      setSyncingCatalog(false);
    }
  };
'''
t=replace_between(t,'  const activateFullCatalog = async () => {','\n  const selectProduct =',new)
old="""    const { error: saveError } = await supabase.from('products').upsert(payload);

    if (saveError) {
      console.error(saveError);
      setError(saveError.message || 'No pude guardar el producto.');
    } else {
      setMessage('Producto guardado. Ya está actualizado para clientes, caja e inventario.');
      await loadProducts();
      setSelectedId(id);
    }

    setSaving(false);
"""
new="""    try {
      await runPanelAction('upsert_product', { product: payload });
      setMessage('Producto guardado. Ya está actualizado para clientes, caja e inventario.');
      await loadProducts();
      setSelectedId(id);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude guardar el producto.');
    } finally {
      setSaving(false);
    }
"""
t=t.replace(old,new)
old="""    const { error: toggleError } = await supabase.from('products').upsert(payload);

    if (toggleError) {
      setError('No pude cambiar disponibilidad.');
    } else {
      setMessage(next ? 'Producto marcado como disponible.' : 'Producto marcado como agotado. Puede seguir visible, pero no se podrá comprar.');
      await loadProducts();
    }
"""
new="""    try {
      await runPanelAction('upsert_product', { product: payload });
      setMessage(next ? 'Producto marcado como disponible.' : 'Producto marcado como agotado. Puede seguir visible, pero no se podrá comprar.');
      await loadProducts();
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : 'No pude cambiar disponibilidad.');
    }
"""
t=t.replace(old,new)
for block in ["""    if (!isSupabaseConfigured) {
      setError('No hay conexión con el sistema de productos. Intenta nuevamente en unos segundos.');
      return;
    }

"""]:
    t=t.replace(block,'')
p.write_text(t)

p=root/'src/components/AdminDashboard.tsx'; t=p.read_text()
t=t.replace("import { supabase, isSupabaseConfigured } from '../lib/supabase';", "import { runAdminOperation } from '../utils/adminOperations';")
old="""    if (!isSupabaseConfigured) {
      window.alert('Supabase no está configurado.');
      return;
    }

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      window.alert('No se pudo borrar. Puede faltar una política DELETE en Supabase.');
      console.error(error);
      return;
    }
"""
new="""    try {
      await runAdminOperation('delete_test_order', { orderId });
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : 'No se pudo borrar el pedido de prueba.');
      return;
    }
"""
t=t.replace(old,new)
p.write_text(t)

p=root/'src/main.tsx'; t=p.read_text()
t=t.replace("import OnlineOrderStockSyncBridge from './components/OnlineOrderStockSyncBridge';\n",'')
t=t.replace('        <OnlineOrderStockSyncBridge />\n','')
p.write_text(t)
