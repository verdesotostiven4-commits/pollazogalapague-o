from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, value: str) -> None:
    Path(path).write_text(value, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'No se encontró bloque en {path}: {old[:180]!r}')
    write(path, source.replace(old, new, 1))


# Garantizar que el mínimo se valide justo antes de registrar el pedido.
replace_once(
    'src/components/CartScreen.tsx',
    """  const handleEarlySaveClick = async () => {
    if (isSavingOrder || isOrderSaved) return;

    if (!hasProfile || !hasLocation) {
      triggerDryTap();
      onRequireLogin('block');
      return;
    }

    if (!paymentMethod) {""",
    """  const handleEarlySaveClick = async () => {
    if (isSavingOrder || isOrderSaved) return;

    if (!hasProfile || !hasLocation) {
      triggerDryTap();
      onRequireLogin('block');
      return;
    }

    if (!pricing.minimumReached) {
      triggerDryTap();
      showNotice(`La compra mínima es de $${MIN_ORDER_SUBTOTAL.toFixed(2)}.`);
      return;
    }

    if (!paymentMethod) {""",
)

# No convertir una ubicación ausente en 0,0.
replace_once(
    'src/components/OrderTracking.tsx',
    """                  customerLat={toNumber(activeOrder.lat)}
                  customerLng={toNumber(activeOrder.lng)}""",
    """                  customerLat={activeOrder.lat == null ? null : toNumber(activeOrder.lat)}
                  customerLng={activeOrder.lng == null ? null : toNumber(activeOrder.lng)}""",
)

# Retirar completamente Pollazo Plus de la pantalla de información y del perfil.
info = read('src/components/InfoScreen.tsx')
info = info.replace("import PollazoPlusProCard from './PollazoPlusProCard';\n", '')
info = info.replace(
    """      <div className="relative px-3 pb-3 pt-1">
        <PollazoPlusProCard onNavigate={onNavigate} />
      </div>
""",
    '',
    1,
)
info = info.replace(
    """    customerAvatar,
    hasPollazoPlus,
  } = useUser();""",
    """    customerAvatar,
  } = useUser();""",
    1,
)
info = info.replace("{hasPollazoPlus ? '👑' : level.emoji}", "{level.emoji}")
info = info.replace(
    """              {hasPollazoPlus ? 'Pollazo Plus activo · ' : ''}
              Nivel {level.level} · {level.title}""",
    """              Nivel {level.level} · {level.title}""",
    1,
)
write('src/components/InfoScreen.tsx', info)

# El hero ya no necesita navegación para una tarjeta de membresía retirada.
replace_once(
    'src/components/InfoScreen.tsx',
    """function InfoHero({
  onNavigate,
}: {
  onNavigate: (screen: Screen) => void;
}) {""",
    """function InfoHero() {""",
)
replace_once(
    'src/components/InfoScreen.tsx',
    "      <InfoHero onNavigate={onNavigate} />",
    "      <InfoHero />",
)

print('Ajustes finales de comercio aplicados correctamente.')
