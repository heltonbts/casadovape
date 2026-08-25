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

/**
 * Nomes possíveis da credencial do Blob. A integração da Vercel prefixa as
 * variáveis com o texto escolhido na hora de conectar o store, então o nome
 * depende da conexão — hoje o store da loja usa o prefixo `TESTE`. A ordem
 * importa: o primeiro nome preenchido vence, e o store atual vem antes dos
 * antigos para uma variável esquecida no projeto não sequestrar o upload.
 */
const TOKEN_VARS = ["TESTE_READ_WRITE_TOKEN", "BLOB_READ_WRITE_TOKEN"];
const STORE_ID_VARS = ["TESTE_STORE_ID", "BLOB_STORE_ID"];

/**
 * O Blob aceita duas credenciais: um token de leitura/escrita, ou o id do
 * store somado ao `VERCEL_OIDC_TOKEN` que a Vercel injeta em runtime. O token
 * é o único que também funciona em dev local.
 */
function blobAuth(): { token: string } | { storeId: string } | null {
  for (const name of TOKEN_VARS) {
    const token = process.env[name];
    if (token) return { token };
  }
  for (const name of STORE_ID_VARS) {
    const storeId = process.env[name];
    if (storeId) return { storeId };
  }
  return null;
}

function fail(error: string, status: number) {
  return Response.json({ error }, { status });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail("Sessão expirada. Entre novamente.", 401);

  const auth = blobAuth();
  if (!auth) {
    return fail(
      "Vercel Blob não configurado: falta BLOB_READ_WRITE_TOKEN (ou BLOB_STORE_ID) no ambiente.",
      500,
    );
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
      ...auth,
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
    // A rota é só para admin logado, então mostrar o motivo real na tela
    // poupa uma ida ao painel de logs quando a credencial está errada.
    const detail = error instanceof Error ? error.message : String(error);
    return fail(`Falha ao enviar a imagem: ${detail}`, 502);
  }
}
