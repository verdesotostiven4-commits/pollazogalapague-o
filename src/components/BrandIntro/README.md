# Entrada animada por capas · Pollazo Galapagueño

Esta es la **primera fase**: composición, curva vectorial en CSS/SVG, entradas,
movimiento suave y estructura para seis imágenes + tres fotogramas de ave.

## Cómo ver esta fase

Arranca el proyecto (`npm run dev`) y abre:
`http://localhost:5173/?introPreview=1`.

En la versión desplegada de la rama también se puede añadir
`?introPreview=1` a la URL de Vercel.

**No reemplaza la landing actual ni altera pedidos, instalación PWA, login o checkout.**
El botón Comenzar realiza una transición y abre la tienda.

## Cómo sustituir los recursos

Edita `src/components/BrandIntro/sceneAssets.ts` y coloca los enlaces finales.

| Campo | Archivo final |
| --- | --- |
| logo | logo de la marca con transparencia |
| background | mar, cielo y rocas sin el pollo |
| productAndLog | pollo y tronco juntos, con transparencia |
| leavesBack | hojas del fondo |
| leavesTop | hojas superiores |
| leavesFrontBlurred | hojas cercanas desenfocadas |
| birdFrames | tres PNG/WebP transparentes del mismo ave: alas arriba, abiertas y abajo |

**Para evitar saltos al mover las capas:** exportar todos los elementos del
lado derecho desde el mismo lienzo de referencia y con igual relación de aspecto
(recomendado 1920×1080). Aunque la mayor parte sea transparente, conservar
la posición original de cada elemento. El navegador recorta con `object-fit: cover`.
En móvil se reordena la escena encima del texto y se reajusta su encuadre.

## Movimiento

- Panel: aparición escalonada de logo, título, beneficios y botón.
- Curva: SVG en la interfaz (no necesita imagen).
- Fondo: parallax casi imperceptible.
- Producto: entra desde abajo y queda con una oscilación de 5px.
- Hojas: balanceo suave en distintas fases.
- Aves: solo activas cuando existen los 3 fotogramas. Aparecen con
  pausas, direcciones, alturas, tamaños y velocidades variables.
- Accesibilidad: se respetan las preferencias de movimiento reducido.

## Próximos pasos

1. Generar logo transparente definitivo.
2. Separar escena en cinco capas transparentes/correctamente alineadas.
3. Preparar tres fotogramas del ave.
4. Copiar los enlaces finales en `sceneAssets.ts`.
5. Revisar el resultado en móvil y escritorio y sustituir la landing actual
   **solo después de probarlo**, conservando el flujo de instalación PWA.
