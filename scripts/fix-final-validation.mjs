import fs from 'node:fs';

const loaderFiles = [
  'src/components/AdminDeliveryDevices.tsx',
  'src/components/AdminOrderSourceControl.tsx',
  'src/components/RiderAutoDispatcher.tsx',
  'src/components/RiderRouteDock.tsx',
  'src/components/RiderTrackingBridge.tsx',
];

for (const path of loaderFiles) {
  const source = fs.readFileSync(path, 'utf8');
  if (!source.includes('LoaderCircle')) {
    throw new Error(`No se encontró LoaderCircle en ${path}`);
  }
  fs.writeFileSync(path, source.replaceAll('LoaderCircle', 'Loader2'));
}

const cascadaPath = 'src/components/CascadaCatalogPortal.tsx';
const cascada = fs.readFileSync(cascadaPath, 'utf8');
const cascadaBefore = '(categories as Category[]).map(category => (';
if (!cascada.includes(cascadaBefore)) {
  throw new Error('No se encontró el cast de categorías de La Cascada.');
}
fs.writeFileSync(
  cascadaPath,
  cascada.replace(cascadaBefore, 'categories.map(category => (')
);

const supabasePath = 'server/supabase-env.ts';
const supabase = fs.readFileSync(supabasePath, 'utf8');
if (!supabase.includes('  let selectedUrl =')) {
  throw new Error('No se encontró selectedUrl en supabase-env.ts');
}
fs.writeFileSync(
  supabasePath,
  supabase.replace('  let selectedUrl =', '  const selectedUrl =')
);

console.log('Correcciones finales aplicadas.');
