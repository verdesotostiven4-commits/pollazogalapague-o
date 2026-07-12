from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    Path(path).write_text(value, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'No se encontró bloque en {path}: {old[:180]!r}')
    write(path, source.replace(old, new, 1))


# Servidor: mismas reglas que el carrito y solo efectivo/transferencia.
path = 'server/api-handlers/create-order-v3.ts'
source = read(path)
source = source.replace(
    "import { products as seedProducts } from '../../src/data/products.js';",
    "import { products as seedProducts } from '../../src/data/products.js';\nimport {\n  calculateOrderPricing,\n  isInsidePuertoAyora,\n  MIN_ORDER_SUBTOTAL,\n} from '../../src/utils/commerce.js';",
    1,
)
source = source.replace("type PaymentMethod = 'efectivo' | 'deuna';", "type PaymentMethod = 'efectivo' | 'transferencia';", 1)
source = re.sub(r"\ntype MembershipRow = \{.*?\n\};\n", "\n", source, count=1, flags=re.S)
source = source.replace("const MIN_DELIVERY_ORDER = 5;\nconst FIRST_DELIVERY_FREE_MIN = 10;\nconst PLUS_FREE_DELIVERY_MIN = 8;\n", '', 1)
source = source.replace(
    """  if (clean === 'deuna' || clean === 'de una') {
    return 'deuna';
  }""",
    """  if (clean === 'transferencia' || clean === 'transfer') {
    return 'transferencia';
  }""",
    1,
)
source = re.sub(r"\nconst activeMembership = \(.*?\n\};\n", "\n", source, count=1, flags=re.S)
source = source.replace(
    "error: 'Selecciona efectivo o DeUna al recibir.',",
    "error: 'Selecciona efectivo o transferencia.',",
    1,
)
source = source.replace(
    """    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        ok: false,
        error: 'La ubicación de entrega no es válida.',
        code: 'INVALID_DELIVERY_COORDINATES',
      });
    }""",
    """    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({
        ok: false,
        error: 'La ubicación de entrega no es válida.',
        code: 'INVALID_DELIVERY_COORDINATES',
      });
    }

    if (!isInsidePuertoAyora(lat, lng)) {
      return res.status(409).json({
        ok: false,
        error: 'La entrega debe estar dentro de Puerto Ayora.',
        code: 'OUTSIDE_DELIVERY_ZONE',
      });
    }""",
    1,
)
source = source.replace(
    """  const [productsResult, overridesResult, membershipsResult] =
    await Promise.all([
      loadRemoteProducts(supabase),
      supabase.from('product_overrides').select('id,price,available'),
      supabase
        .from('customer_memberships')
        .select('id,customer_phone,plan_name,status,expires_at')
        .eq('status', 'active')
        .limit(100),
    ]);""",
    """  const [productsResult, overridesResult] = await Promise.all([
    loadRemoteProducts(supabase),
    supabase.from('product_overrides').select('id,price,available'),
  ]);""",
    1,
)
source = re.sub(
    r"\n  const memberships = membershipsResult\.error.*?\n    : \(\(membershipsResult\.data \|\| \[\]\) as MembershipRow\[\]\);",
    '',
    source,
    count=1,
    flags=re.S,
)
source = source.replace("  const membership = activeMembership(memberships, customerPhone);\n\n", '', 1)
source = re.sub(
    r"  if \(deliveryType === 'domicilio'\) \{\n    const minimum = membership.*?\n  \}\n\n  const previousOrders =.*?\n  const total = Number\(\(subtotal \+ deliveryFee\)\.toFixed\(2\)\);",
    """  if (deliveryType === 'domicilio' && subtotal < MIN_ORDER_SUBTOTAL) {
    return res.status(409).json({
      ok: false,
      error: `La compra mínima es $${MIN_ORDER_SUBTOTAL.toFixed(2)}.`,
      code: 'MINIMUM_ORDER_NOT_REACHED',
      minimumOrder: MIN_ORDER_SUBTOTAL,
    });
  }

  const pricing = calculateOrderPricing({
    subtotal,
    customerLat: lat,
    customerLng: lng,
  });
  const deliveryFeeOriginal = deliveryType === 'domicilio' ? pricing.deliveryFeeOriginal : 0;
  const deliveryFee = deliveryType === 'domicilio' ? pricing.deliveryFeeFinal : 0;
  const smallOrderFee = deliveryType === 'domicilio' ? pricing.smallOrderFee : 0;
  const total = Number((subtotal + deliveryFee + smallOrderFee).toFixed(2));""",
    source,
    count=1,
    flags=re.S,
)
source = source.replace("    delivery_fee_original: deliveryFee,\n    delivery_fee_final: deliveryFee,\n    service_fee: 0,", "    delivery_fee_original: deliveryFeeOriginal,\n    delivery_fee_final: deliveryFee,\n    service_fee: smallOrderFee,", 1)
source = source.replace("    membership_applied: Boolean(membership),\n    membership_id: membership?.id || null,\n    membership_plan: membership?.plan_name || null,", "    membership_applied: false,\n    membership_id: null,\n    membership_plan: null,", 1)
source = source.replace("    delivery_fee_original: deliveryFee,\n    delivery_fee_final: deliveryFee,\n    service_fee: 0,", "    delivery_fee_original: deliveryFeeOriginal,\n    delivery_fee_final: deliveryFee,\n    service_fee: smallOrderFee,", 1)
source = source.replace("    membership_applied: Boolean(membership),\n    membership_id: membership?.id || null,\n    membership_plan: membership?.plan_name || null,", "    membership_applied: false,\n    membership_id: null,\n    membership_plan: null,", 1)
write(path, source)

# Notificaciones cuando se asigna, se acerca y llega el repartidor.
replace_once(
    'server/api-handlers/delivery-tracking-admin.ts',
    "import { getDeliveryDeviceByToken } from '../delivery-tracking-auth.js';",
    "import { getDeliveryDeviceByToken } from '../delivery-tracking-auth.js';\nimport { sendDeliveryTrackingPush } from '../delivery-tracking-push.js';",
)
replace_once(
    'server/api-handlers/delivery-tracking-admin.ts',
    """  await supabase
    .from('delivery_devices')
    .update({ last_seen_at: now, updated_at: now })
    .eq('id', lookup.device.id);

  return res.status(201).json({""",
    """  await supabase
    .from('delivery_devices')
    .update({ last_seen_at: now, updated_at: now })
    .eq('id', lookup.device.id);

  void sendDeliveryTrackingPush(supabase, orderCode, 'assigned');

  return res.status(201).json({""",
)
replace_once(
    'server/api-handlers/delivery-tracking-device.ts',
    "import { getDeliveryDeviceByToken } from '../delivery-tracking-auth.js';",
    "import { getDeliveryDeviceByToken } from '../delivery-tracking-auth.js';\nimport { sendDeliveryTrackingPush } from '../delivery-tracking-push.js';",
)
replace_once(
    'server/api-handlers/delivery-tracking-device.ts',
    """  if (transitioned && nextStatus === 'en_route') {
    await supabase
      .from('orders')
      .update({ status: 'Enviado', updated_at: now })
      .eq('order_code', session.order_code);
  }

  return res.status(200).json({""",
    """  if (transitioned && nextStatus === 'en_route') {
    await supabase
      .from('orders')
      .update({ status: 'Enviado', updated_at: now })
      .eq('order_code', session.order_code);
  }

  if (transitioned && nextStatus === 'nearby') {
    void sendDeliveryTrackingPush(supabase, session.order_code, 'nearby');
  }

  if (transitioned && nextStatus === 'arrived') {
    void sendDeliveryTrackingPush(supabase, session.order_code, 'arrived');
  }

  return res.status(200).json({""",
)

# ETA estable: se ancla a creación o al último cambio de estado.
path = 'src/utils/commerce.ts'
source = read(path)
source = source.replace("  now = new Date(),\n}: {", "  now = new Date(),\n  anchor = null,\n}: {", 1)
source = source.replace("  now?: Date;\n}): ArrivalWindow | null => {", "  now?: Date;\n  anchor?: Date | string | null;\n}): ArrivalWindow | null => {", 1)
source = source.replace(
    """  const from = new Date(now.getTime() + minMinutes * 60_000);
  const to = new Date(now.getTime() + maxMinutes * 60_000);

  return {""",
    """  const parsedAnchor = anchor instanceof Date ? anchor : anchor ? new Date(anchor) : null;
  const base = parsedAnchor && Number.isFinite(parsedAnchor.getTime()) ? parsedAnchor : now;
  let from = new Date(base.getTime() + minMinutes * 60_000);
  let to = new Date(base.getTime() + maxMinutes * 60_000);

  if (to.getTime() < now.getTime()) {
    from = new Date(now.getTime() + 5 * 60_000);
    to = new Date(now.getTime() + Math.max(12, maxMinutes - minMinutes + 8) * 60_000);
  }

  return {""",
    1,
)
write(path, source)
replace_once(
    'src/components/OrderTracking.tsx',
    """        totalUnits: itemCount,
      })""",
    """        totalUnits: itemCount,
        anchor: activeOrder.status === 'Por Confirmar'
          ? activeOrder.created_at
          : activeOrder.updated_at || activeOrder.created_at,
      })""",
)

# Administrador: retirar Plus y dejar transferencias como único pago digital nuevo.
path = 'src/components/AdminDashboard.tsx'
source = read(path)
source = source.replace("import AdminPlusPanel from './AdminPlusPanel';\n", '')
source = source.replace("  { id: 'plus', label: 'Plus', Icon: Crown },\n", '')
source = source.replace("        {tab === 'plus' && <AdminPlusPanel />}\n\n", '')
source = re.sub(r"\n\s*\{order\.membership_applied && \(\n\s*<span.*?\n\s*\)\}", '', source, count=1, flags=re.S)
source = re.sub(r"\n\s*\{order\.membership_applied && \(\n\s*<div.*?\n\s*\)\}", '', source, count=1, flags=re.S)
source = re.sub(r"\n\s*\{Array\.isArray\(order\.bonus_items\).*?\n\s*\)\}", '', source, count=1, flags=re.S)
source = re.sub(r"\n\s*\{customer\.membership_status === 'active' && \(.*?\n\s*\)\}", '', source, count=1, flags=re.S)
source = source.replace('Revisa Deuna o transferencia antes de confirmar.', 'Revisa la transferencia antes de confirmar.')
source = source.replace('placeholder="Ej: Hoy delivery gratis desde $10..."', 'placeholder="Ej: Hoy llegaron productos frescos..."')
write(path, source)

print('Servidor, notificaciones, ETA y administrador actualizados.')
