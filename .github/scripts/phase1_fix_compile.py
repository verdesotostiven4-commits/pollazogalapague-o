from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace(path: str, old: str, new: str) -> None:
    file_path = ROOT / path
    text = file_path.read_text(encoding="utf-8")
    if new in text:
        return
    if old not in text:
        raise RuntimeError(f"Expected text not found in {path}: {old[:80]!r}")
    file_path.write_text(text.replace(old, new), encoding="utf-8")


replace(
    "src/Cart.tsx",
    "const isFixedPrice = (price: string | undefined) => {",
    "const isFixedPrice = (price?: string | null) => {",
)
replace(
    "src/Cart.tsx",
    "<img src={item.product.image} alt={item.product.name}",
    "<img src={item.product.image || '/logo-final.png'} alt={item.product.name}",
)

whatsapp = ROOT / "src/utils/whatsapp.ts"
whatsapp_text = whatsapp.read_text(encoding="utf-8")
if "export function buildStatusWhatsAppUrl" not in whatsapp_text:
    whatsapp_text = whatsapp_text.rstrip() + """

export function buildStatusWhatsAppUrl(
  customerPhone: string,
  code: string,
  status: OrderStatus
): string {
  const statusMessages: Record<OrderStatus, string> = {
    'Por Confirmar': 'recibimos tu pedido y está pendiente de confirmación',
    Recibido: 'tu pedido fue confirmado y recibido por el local',
    Preparando: 'estamos preparando tu pedido',
    Enviado: 'tu pedido salió para entrega',
    Entregado: 'tu pedido fue entregado',
    Cancelado: 'tu pedido fue cancelado',
  };

  const trackingUrl = `${APP_URL}/?tracking=1&orderCode=${encodeURIComponent(code)}`;
  const text = [
    `Hola 👋`,
    `Actualización de tu pedido ${code}: ${statusMessages[status]}.`,
    status === 'Cancelado'
      ? 'Escríbenos si necesitas ayuda con este pedido.'
      : `Puedes revisar el estado aquí: ${trackingUrl}`,
  ].join('\\n\\n');

  return `https://wa.me/${cleanPhoneNumber(customerPhone)}?text=${encodeURIComponent(text)}`;
}
"""
    whatsapp.write_text(whatsapp_text + "\n", encoding="utf-8")

replace(
    "src/components/CartScreen.tsx",
    "  const entry = TEXTS[key];\n  const base = entry[language] || entry.en || entry.es;",
    "  const entry = TEXTS[key] as Partial<Record<LanguageCode, string>>;\n  const base = entry[language] ?? entry.en ?? entry.es ?? key;",
)
replace(
    "src/components/CartScreen.tsx",
    "(current, [paramKey, value]) => current.replaceAll(`{${paramKey}}`, String(value)),",
    "(current, [paramKey, value]) => current.split(`{${paramKey}}`).join(String(value)),",
)
replace(
    "src/components/CartScreen.tsx",
    "  const ctx = canvas.getContext('2d');\n  if (!ctx) {\n    canvas.remove();\n    return;\n  }",
    "  const ctx = canvas.getContext('2d');\n  if (!ctx) {\n    canvas.remove();\n    return;\n  }\n\n  const context = ctx;",
)
for old, new in [
    ("    ctx.clearRect(0, 0, canvas.width, canvas.height);", "    context.clearRect(0, 0, canvas.width, canvas.height);"),
    ("      ctx.globalAlpha = alpha;", "      context.globalAlpha = alpha;"),
    ("      ctx.fillStyle = particle.color;", "      context.fillStyle = particle.color;"),
    ("      ctx.save();", "      context.save();"),
    ("      ctx.translate(particle.x, particle.y);", "      context.translate(particle.x, particle.y);"),
    ("      ctx.rotate(particle.rotation);", "      context.rotate(particle.rotation);"),
    ("      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.5);", "      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.5);"),
    ("      ctx.restore();", "      context.restore();"),
]:
    replace("src/components/CartScreen.tsx", old, new)

replace(
    "src/components/InstallQrGuideBridge.tsx",
    "ChevronRight, Download, Home, QrCode, Safari, Smartphone, Sparkles, X",
    "ChevronRight, Compass, Download, Home, QrCode, Smartphone, Sparkles, X",
)
replace(
    "src/components/InstallQrGuideBridge.tsx",
    "<Safari size={21} />",
    "<Compass size={21} />",
)

replace(
    "src/components/SafeOrdersOverlay.tsx",
    "CalendarDays, ChevronLeft, Home, Info, PackageSearch, RefreshCw, Search, ShoppingBag, ShoppingCart, Truck",
    "CalendarDays, ChevronLeft, Home, Info, PackageSearch, RefreshCw, Repeat2, Search, ShoppingBag, ShoppingCart, Truck",
)
replace(
    "src/components/SafeOrdersOverlay.tsx",
    "const ACTIVE_STATUSES = ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'];",
    "const WHATSAPP_NUMBER = '593989795628';\nconst ACTIVE_STATUSES = ['Por Confirmar', 'Recibido', 'Preparando', 'Enviado'];",
)

for path in ["src/context/LanguageContext.tsx", "src/utils/productI18n.ts"]:
    replace(
        path,
        "current.replaceAll(`{${key}}`, String(value))",
        "current.split(`{${key}}`).join(String(value))",
    )
