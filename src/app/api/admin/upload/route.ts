import { put } from "@vercel/blob";
import { getSession } from "@/lib/auth";
import { slugify } from "@/lib/utils";

/**
 * Recebe a imagem JÁ convertida para WebP no navegador (ver
 * `src/lib/image-webp.ts`) e guarda no Vercel Blob. O limite abaixo é folgado
 * de propósito: depois da conversão uma foto grande fica em ~200 KB.
 */
const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/** Pastas do store. Evita que o cliente escreva em qualquer caminho. */
const FOLDERS = new Set(["produtos", "banners", "categorias"]);

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail("Sessão expirada. Entre novamente.", 401);

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return fail("BLOB_READ_WRITE_TOKEN não configurado no ambiente.", 500);
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return fail("Nenhum arquivo enviado.", 400);

  const extension = EXTENSIONS[file.type];
  if (!extension) return fail("Formato não aceito. Envie JPG, PNG ou WebP.", 415);
  if (file.size === 0) return fail("Arquivo vazio.", 400);
  if (file.size > MAX_BYTES) return fail("Imagem acima de 4 MB depois da conversão.", 413);

  const folderInput = String(form.get("folder") ?? "produtos");
  const folder = FOLDERS.has(folderInput) ? folderInput : "produtos";
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "imagem";

  try {
    const blob = await put(`${folder}/${base}.${extension}`, file, {
      access: "public",
      // Nomes iguais ("foto.webp") são a regra vinda do celular, então o
      // sufixo aleatório evita colisão sem sobrescrever nada.
      addRandomSuffix: true,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return Response.json({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    console.error("[upload] falha ao enviar para o Blob", error);
    return fail("Falha ao enviar a imagem. Tente de novo.", 502);
  }
}
