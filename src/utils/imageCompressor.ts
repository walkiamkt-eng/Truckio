/**
 * Image compressor utility for Truckio PWA
 * Compresses images client-side via HTML5 Canvas to WebP or JPEG
 * Max dimension: 1024px, Quality: 0.8, Output size: < 1MB
 */

export interface CompressedImageResult {
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  format: string;
  name: string;
}

export async function compressImage(
  file: File,
  maxDimension: number = 1024,
  quality: number = 0.8
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => reject(new Error('Error al decodificar la imagen'));

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio scale
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('No se pudo inicializar el contexto 2D de Canvas'));
          return;
        }

        // Draw image onto canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Try webp first, fallback to jpeg if not supported
        let format = 'image/webp';
        let dataUrl = canvas.toDataURL(format, quality);

        // If browser generated PNG fallback or webp failed
        if (!dataUrl.startsWith('data:image/webp')) {
          format = 'image/jpeg';
          dataUrl = canvas.toDataURL(format, quality);
        }

        // Estimate size from base64
        const head = dataUrl.indexOf(',') + 1;
        const base64Length = dataUrl.length - head;
        const compressedSize = Math.round((base64Length * 3) / 4);

        resolve({
          dataUrl,
          originalSize: file.size,
          compressedSize,
          width,
          height,
          format,
          name: file.name.replace(/\.[^/.]+$/, '') + (format === 'image/webp' ? '.webp' : '.jpg'),
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
