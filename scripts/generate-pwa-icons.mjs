import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';
import jpegModule from 'jpeg-js';

const LOGO_URL =
  'https://cdn.phototourl.com/free/2026-07-16-e4197884-cd6c-4cd6-a494-900356e0debf.png';
const OUTPUTS = [192, 512];
const jpeg = jpegModule?.default || jpegModule;

const fetchWithTimeout = async (url, timeoutMs = 30000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'image/jpeg,image/png,image/*;q=0.9,*/*;q=0.5',
        'User-Agent': 'PollazoPwaBuild/23',
      },
    });
  } finally {
    clearTimeout(timer);
  }
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const resizeSquare = (source, targetSize) => {
  const side = Math.min(source.width, source.height);
  const trim = Math.max(1, Math.round(side * 0.0104));
  const cropSize = side - trim * 2;
  const originX = Math.floor((source.width - side) / 2) + trim;
  const originY = Math.floor((source.height - side) / 2) + trim;
  const output = new Uint8Array(targetSize * targetSize * 4);

  for (let y = 0; y < targetSize; y += 1) {
    const sourceY = originY + ((y + 0.5) * cropSize) / targetSize - 0.5;
    const y0 = clamp(Math.floor(sourceY), 0, source.height - 1);
    const y1 = clamp(y0 + 1, 0, source.height - 1);
    const fy = sourceY - Math.floor(sourceY);

    for (let x = 0; x < targetSize; x += 1) {
      const sourceX = originX + ((x + 0.5) * cropSize) / targetSize - 0.5;
      const x0 = clamp(Math.floor(sourceX), 0, source.width - 1);
      const x1 = clamp(x0 + 1, 0, source.width - 1);
      const fx = sourceX - Math.floor(sourceX);
      const destinationOffset = (y * targetSize + x) * 4;
      const topLeft = (y0 * source.width + x0) * 4;
      const topRight = (y0 * source.width + x1) * 4;
      const bottomLeft = (y1 * source.width + x0) * 4;
      const bottomRight = (y1 * source.width + x1) * 4;

      for (let channel = 0; channel < 4; channel += 1) {
        const top =
          source.data[topLeft + channel] * (1 - fx) +
          source.data[topRight + channel] * fx;
        const bottom =
          source.data[bottomLeft + channel] * (1 - fx) +
          source.data[bottomRight + channel] * fx;
        output[destinationOffset + channel] = Math.round(
          top * (1 - fy) + bottom * fy
        );
      }
    }
  }

  return output;
};

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[n] = value >>> 0;
  }

  return table;
})();

const crc32 = bytes => {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const pngChunk = (type, data) => {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
};

const encodePng = (width, height, rgba) => {
  const rowLength = width * 4;
  const raw = Buffer.alloc((rowLength + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const outputOffset = y * (rowLength + 1);
    raw[outputOffset] = 0;
    Buffer.from(
      rgba.buffer,
      rgba.byteOffset + y * rowLength,
      rowLength
    ).copy(raw, outputOffset + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(raw, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
};

const response = await fetchWithTimeout(LOGO_URL);
if (!response.ok) {
  throw new Error(`No se pudo descargar el logo: HTTP ${response.status}`);
}

const sourceBytes = Buffer.from(await response.arrayBuffer());
if (sourceBytes.length < 10000) {
  throw new Error('El logo descargado está vacío o incompleto.');
}

const decoded = jpeg.decode(sourceBytes, {
  useTArray: true,
  formatAsRGBA: true,
});

if (
  !decoded ||
  decoded.width < 512 ||
  decoded.height < 512 ||
  decoded.data.length < decoded.width * decoded.height * 4
) {
  throw new Error('El logo descargado no pudo decodificarse correctamente.');
}

await mkdir('public', { recursive: true });

for (const size of OUTPUTS) {
  const resized = resizeSquare(decoded, size);
  const png = encodePng(size, size, resized);
  await writeFile(`public/pollazo-icon-${size}-v23.png`, png);
  console.log(`Icono PWA generado: ${size}x${size} (${png.length} bytes)`);
}
