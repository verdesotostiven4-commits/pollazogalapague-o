from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
path = ROOT / 'src/context/AdminContext.tsx'
text = path.read_text(encoding='utf-8')


def replace_between(start_marker: str, end_marker: str, replacement: str) -> None:
    global text
    start = text.index(start_marker)
    end = text.index(end_marker, start)
    text = text[:start] + replacement + text[end:]


replace_between(
    '  const updateSetting = useCallback',
    '\n  const updateExtraSettings = useCallback',
    r'''  const updateSetting = useCallback(async (key: keyof AppSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));

    if (key === 'primary_color') {
      document.documentElement.style.setProperty('--pollazo-primary', value);
    }

    try {
      await runPanelAction('update_setting', { key, value });
    } catch (error) {
      await load();
      throw error;
    }
  }, [load]);
''',
)

replace_between(
    '  const updateExtraSettings = useCallback',
    '\n  const finalizeSeason = useCallback',
    r'''  const updateExtraSettings = useCallback(
    async (patch: Partial<ExtraSettings>) => {
      setExtraSettings(prev => ({ ...prev, ...patch }));

      try {
        await runPanelAction('update_extra_settings', { patch });
        await load();
      } catch (error) {
        await load();
        throw error;
      }
    },
    [load]
  );
''',
)

replace_between(
    '  const finalizeSeason = useCallback',
    '\n  const deleteSeason = useCallback',
    r'''  const finalizeSeason = useCallback(
    async (name: string, prize: string, winners: any[]) => {
      await runPanelAction('finalize_season', { name, prize, winners });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const deleteSeason = useCallback',
    '\n  const toggleSeasonVisibility = useCallback',
    r'''  const deleteSeason = useCallback(
    async (id: string) => {
      await runPanelAction('delete_season', { id });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const toggleSeasonVisibility = useCallback',
    '\n  const updateSeasonWinners = useCallback',
    r'''  const toggleSeasonVisibility = useCallback(
    async (id: string, published: boolean) => {
      await runPanelAction('toggle_season', { id, published });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const updateSeasonWinners = useCallback',
    '\n  const setOverride = useCallback',
    r'''  const updateSeasonWinners = useCallback(
    async (id: string, winners: any[]) => {
      await runPanelAction('update_season_winners', { id, winners });
      await load();
    },
    [load]
  );
''',
)

replace_between(
    '  const setOverride = useCallback',
    '\n  const addProduct = useCallback',
    r'''  const setOverride = useCallback(
    async (id: string, patch: Partial<Omit<ProductOverride, 'id'>>) => {
      const current = overrides[id] ?? { id, price: null, available: true };
      const updated: ProductOverride = {
        ...current,
        ...patch,
        id,
        available: patch.available ?? current.available ?? true,
      };

      setOverrides(prev => ({ ...prev, [id]: updated }));

      try {
        await runPanelAction('set_product_override', { ...updated });
      } catch (error) {
        await load();
        throw error;
      }
    },
    [load, overrides]
  );
''',
)

replace_between(
    '  const addProduct = useCallback',
    '\n  const updateProduct = useCallback',
    r'''  const addProduct = useCallback(async (product: Omit<Product, 'id'> & { id?: string }) => {
    const newProduct = normalizeProduct({
      ...product,
      id: product.id || slug(product.name),
    } as Product);

    setRemoteProducts(prev => [
      newProduct,
      ...prev.filter(item => item.id !== newProduct.id),
    ]);

    try {
      await runPanelAction<Product>('upsert_product', { product: newProduct });
    } catch (error) {
      await load();
      throw error;
    }
  }, [load]);
''',
)

replace_between(
    '  const updateProduct = useCallback',
    '\n  const deleteProduct = useCallback',
    r'''  const updateProduct = useCallback(
    async (id: string, patch: Partial<Product>) => {
      const baseProduct =
        remoteProducts.find(product => product.id === id) ||
        seedProducts.find(product => product.id === id);

      const nextProduct = normalizeProduct({
        ...(baseProduct || {
          id,
          name: patch.name || id,
          category: patch.category || 'Pollos',
        }),
        ...patch,
        id,
      } as Product);

      setRemoteProducts(prev => [
        nextProduct,
        ...prev.filter(product => product.id !== id),
      ]);

      try {
        await runPanelAction<Product>('upsert_product', { product: nextProduct });
      } catch (error) {
        await load();
        throw error;
      }
    },
    [load, remoteProducts]
  );
''',
)

replace_between(
    '  const deleteProduct = useCallback',
    '\n  const upsertCustomer = useCallback',
    r'''  const deleteProduct = useCallback(async (id: string) => {
    const seedProduct = seedProducts.find(product => product.id === id);

    if (seedProduct) {
      const hiddenProduct = normalizeProduct({ ...seedProduct, available: false } as Product);
      setRemoteProducts(prev => [hiddenProduct, ...prev.filter(product => product.id !== id)]);
      await runPanelAction('upsert_product', { product: hiddenProduct });
      return;
    }

    setRemoteProducts(prev => prev.filter(product => product.id !== id));

    try {
      await runPanelAction('delete_product', { id });
    } catch (error) {
      await load();
      throw error;
    }
  }, [load]);
''',
)

path.write_text(text, encoding='utf-8')
