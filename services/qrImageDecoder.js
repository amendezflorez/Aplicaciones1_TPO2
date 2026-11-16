import jsQR from 'jsqr';
import jpeg from 'jpeg-js';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

const MAX_IMAGE_DIMENSION = 1600;

export async function decodeQrFromImage(uri, width, height) {
  const image = ImageManipulator.manipulate(uri);
  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    if (width >= height) image.resize({ width: MAX_IMAGE_DIMENSION });
    else image.resize({ height: MAX_IMAGE_DIMENSION });
  }

  const rendered = await image.renderAsync();
  const result = await rendered.saveAsync({
    format: SaveFormat.JPEG,
    compress: 1,
    base64: true,
  });
  if (!result.base64) throw new Error('No se pudo preparar la imagen para leer el QR.');

  const bytes = Uint8Array.from(atob(result.base64), (character) => character.charCodeAt(0));
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true });
  const qr = jsQR(
    new Uint8ClampedArray(decoded.data),
    decoded.width,
    decoded.height,
    { inversionAttempts: 'attemptBoth' }
  );
  return qr?.data || null;
}
