/**
 * Conversão de imagem para WebP no navegador, antes do upload.
 *
 * Fazer isso no cliente resolve dois problemas de uma vez: a foto de celular
 * (5–12 MB) vira um arquivo de ~150 KB antes de sair do aparelho, então o
 * upload é rápido e nunca esbarra no limite de corpo da função serverless.
 */

/** Tamanho máximo aceito do arquivo ORIGINAL escolhido pelo lojista. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Maior lado da imagem final. Suficiente para zoom na página do produto. */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

export type ConvertedImage = {
  file: File;
  /** false quando o navegador não sabe codificar WebP e caiu para JPEG. */
  isWebp: boolean;
};

function replaceExtension(name: string, extension: string) {
  return `${name.replace(/\.[^.]+$/, "") || "imagem"}.${extension}`;
}

/**
 * Redimensiona e converte para WebP. Navegadores antigos (Safari < 16.4) não
 * codificam WebP no canvas — nesse caso `toBlob` devolve PNG e nós caímos para
 * JPEG, que é menor. O upload continua funcionando, só sem o ganho do WebP.
 */
export async function convertToWebp(source: File): Promise<ConvertedImage> {
  if (!source.type.startsWith("image/")) {
    throw new Error(`"${source.name}" não é uma imagem.`);
  }
  if (source.size > MAX_SOURCE_BYTES) {
    throw new Error(`"${source.name}" passa de 25 MB.`);
  }

  // `imageOrientation` respeita o EXIF: foto de celular deitada não sobe torta.
  const bitmap = await createImageBitmap(source, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível preparar a imagem neste navegador.");

  // Fundo branco: PNG com transparência vira WebP/JPEG sem borda preta.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );

  if (webp?.type === "image/webp") {
    return {
      file: new File([webp], replaceExtension(source.name, "webp"), { type: "image/webp" }),
      isWebp: true,
    };
  }

  const jpeg = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", QUALITY),
  );
  if (!jpeg) throw new Error("Não foi possível converter a imagem.");

  return {
    file: new File([jpeg], replaceExtension(source.name, "jpg"), { type: "image/jpeg" }),
    isWebp: false,
  };
}
