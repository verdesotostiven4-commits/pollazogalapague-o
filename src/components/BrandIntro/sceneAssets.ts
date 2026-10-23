/**
 * Imagenes por capas para la entrada de Pollazo.
 * Cuando tengamos las 5 capas y los 3 fotogramas finales,
 * solo hay que colocar sus URLs aquí. No hace falta reescribir las animaciones.
 *
 * Todas las capas deben conservar el MISMO encuadre de referencia.
 * Exportar PNG/WebP transparente para producto y hojas.
 */
export const brandIntroAssets = {
  // Logo provisional del sitio. Sustituir por PNG/WebP transparente definitivo.
  logo: '/logo-final.png',

  // Fondo SIN producto ni hojas principales (mar, cielo, islotes).
  background: '',

  // Pollo + tronco, recortados con transparencia.
  productAndLog: '',

  // Tres capas de vegetación recortadas por separado.
  leavesBack: '',
  leavesTop: '',
  leavesFrontBlurred: '',

  // Tres posturas del MISMO ave, sobre transparencia:
  // alas arriba, alas extendidas, alas abajo.
  birdFrames: ['', '', ''] as [string, string, string],
} as const;
