import { useEffect } from 'react';

export default function CatalogCompactVisualBridge() {
  useEffect(() => {
    // El catálogo debe renderizarse sin puentes DOM extra para mantener el scroll fluido.
  }, []);

  return null;
}
