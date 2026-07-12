from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    source = target.read_text(encoding='utf-8')
    if old not in source:
        raise RuntimeError(f'No se encontró el bloque esperado en {path}: {old[:140]!r}')
    target.write_text(source.replace(old, new, 1), encoding='utf-8')


replace_once(
    'src/context/AdminContext.tsx',
    "import { runPanelAction } from '../utils/panelApi';",
    "import { runPanelAction } from '../utils/panelApi';\nimport { transitionOrder } from '../utils/orderLifecycleApi';",
)

replace_once(
    'src/context/AdminContext.tsx',
    """  const updateOrderStatus = useCallback(
    async (orderId: string, status: ExtendedOrder['status']) => {
      const currentOrder = orders.find(order => order.id === orderId);
      const result = await runPanelAction<{ order: ExtendedOrder }>('transition_order', {
        orderId,
        status,
      });

      if (result.order) {
        setOrders(prev =>
          prev.map(order => (order.id === orderId ? result.order : order))
        );

        if (currentOrder) {
          void sendOrderPushNotification(
            result.order,
            result.order.status,
            result.order.payment_status || currentOrder.payment_status || 'pendiente'
          );
        }
      }

      await load();
    },
    [load, orders]
  );""",
    """  const updateOrderStatus = useCallback(
    async (orderId: string, status: ExtendedOrder['status']) => {
      const currentOrder = orders.find(order => order.id === orderId);
      const panel = window.location.pathname === '/repartidor' ? 'delivery' : 'admin';
      const updatedOrder = (await transitionOrder(
        panel,
        orderId,
        status
      )) as ExtendedOrder;

      setOrders(prev =>
        prev.map(order => (order.id === orderId ? updatedOrder : order))
      );

      if (currentOrder) {
        void sendOrderPushNotification(
          updatedOrder,
          updatedOrder.status,
          updatedOrder.payment_status || currentOrder.payment_status || 'pendiente'
        );
      }

      await load();
    },
    [load, orders]
  );""",
)

replace_once(
    'src/components/DeliveryDashboard.tsx',
    """    } catch (error) {
      console.error('No se pudo actualizar pedido:', error);
      window.alert('No se pudo actualizar el pedido.');
    }""",
    """    } catch (error) {
      console.error('No se pudo actualizar pedido:', error);
      window.alert(
        error instanceof Error ? error.message : 'No se pudo actualizar el pedido.'
      );
    }""",
)

print('Actualización de estados migrada al ciclo de pedidos v3.')
