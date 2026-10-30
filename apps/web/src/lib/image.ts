/** Foto pronta para envio: reduzida no aparelho, para subir rápido mesmo no 4G do campus. */
export interface PreparedPhoto {
  photo: Blob;
  thumb: Blob;
  width: number;
  height: number;
}

const FULL_SIDE = 1600;
const THUMB_SIDE = 480;

async function encode(image: ImageBitmap, maxSide: number, quality: number) {
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  // JPEG: todo navegador sabe gerar (o Safari não gera WebP).
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("toBlob");
  return { blob, width, height };
}

/** Reduz a foto (lado maior de 1600 px) e gera a miniatura (480 px). A orientação da câmera é respeitada. */
export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  let image: ImageBitmap;
  try {
    image = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Não deu para abrir essa imagem. Use uma foto JPG ou PNG.");
  }
  try {
    const full = await encode(image, FULL_SIDE, 0.82);
    const thumb = await encode(image, THUMB_SIDE, 0.76);
    return { photo: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
  } catch {
    throw new Error("Não deu para preparar a foto neste aparelho.");
  } finally {
    image.close();
  }
}
