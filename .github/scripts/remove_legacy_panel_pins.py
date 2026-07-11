from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def remove_between(text: str, start_marker: str, end_marker: str) -> str:
    if start_marker not in text:
        return text

    start = text.index(start_marker)
    end = text.index(end_marker, start)
    return text[:start] + text[end:]


admin_path = ROOT / 'src/components/AdminDashboard.tsx'
admin = admin_path.read_text(encoding='utf-8')
admin = admin.replace(
    "import { buildStatusWhatsAppUrl } from '../utils/whatsapp';\n",
    "import { buildStatusWhatsAppUrl } from '../utils/whatsapp';\nimport { logoutPanelSession } from '../utils/panelSession';\n",
)
admin = admin.replace("\nconst ADMIN_PIN = '1328';\nconst PIN_KEY = 'pollazo_admin_auth';\n", "\n")
admin = remove_between(admin, 'function PinScreen(', 'const toNumber')
admin = admin.replace(
    "  const [authed, setAuthed] = useState(() => sessionStorage.getItem(PIN_KEY) === '1');\n",
    '',
)
admin = admin.replace("    if (!authed || !safeOrders.length) {", "    if (!safeOrders.length) {")
admin = admin.replace(
    "  }, [authed, raiseOperationalAlert, safeOrders]);",
    "  }, [raiseOperationalAlert, safeOrders]);",
)
admin = admin.replace("\n  if (!authed) return <PinScreen onAuth={() => setAuthed(true)} />;\n", "\n")
admin = admin.replace(
    "              onClick={() => {\n                sessionStorage.removeItem(PIN_KEY);\n                setAuthed(false);\n              }}",
    "              onClick={() => void logoutPanelSession('admin')}",
)
admin_path.write_text(admin, encoding='utf-8')


delivery_path = ROOT / 'src/components/DeliveryDashboard.tsx'
delivery = delivery_path.read_text(encoding='utf-8')
delivery = delivery.replace("  Lock,\n", '')
delivery = delivery.replace(
    "import type { Order, OrderStatus } from '../types';\n",
    "import type { Order, OrderStatus } from '../types';\nimport { logoutPanelSession } from '../utils/panelSession';\n",
)
delivery = delivery.replace(
    "\nconst DELIVERY_PIN = '2580';\nconst DELIVERY_PIN_KEY = 'pollazo_delivery_auth';",
    '',
)
delivery = remove_between(delivery, 'function DeliveryPinScreen(', 'export default function DeliveryDashboard()')
delivery = delivery.replace(
    "  const [authed, setAuthed] = useState(() => sessionStorage.getItem(DELIVERY_PIN_KEY) === '1');\n",
    '',
)
delivery = delivery.replace("    if (!authed) return undefined;\n\n", '')
delivery = delivery.replace("  }, [authed, refreshData]);", "  }, [refreshData]);")
delivery = delivery.replace("    if (!authed) return;\n\n", '')
delivery = delivery.replace("  }, [authed, readyOrders]);", "  }, [readyOrders]);")
delivery = delivery.replace(
    "\n  if (!authed) {\n    return <DeliveryPinScreen onAuth={() => setAuthed(true)} />;\n  }\n",
    "\n",
)
delivery = delivery.replace(
    "              onClick={() => {\n                sessionStorage.removeItem(DELIVERY_PIN_KEY);\n                setAuthed(false);\n              }}",
    "              onClick={() => void logoutPanelSession('delivery')}",
)
delivery_path.write_text(delivery, encoding='utf-8')
