# Casa do Vape

Loja completa (vitrine + checkout + painel administrativo com controle de estoque)
construída em Next.js 16, Prisma 7 e PostgreSQL no Neon.

> **Aviso**: a comercialização de cigarros eletrônicos é proibida no Brasil pela
> RDC 855/2024 da ANVISA. O software inclui verificação de idade 18+ e aviso
> legal configurável, mas a conformidade regulatória da operação é
> responsabilidade do lojista.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions, Turbopack) |
| Banco | PostgreSQL no Neon, via Prisma 7 + driver adapter `@prisma/adapter-pg` |
| Estilo | Tailwind CSS v4 (tema em `src/app/globals.css`) |
| Estado do carrinho | Zustand com persistência em `localStorage` |
| Autenticação do painel | JWT (`jose`) em cookie httpOnly + bcrypt |
| Validação | Zod em toda Server Action |

## Como rodar

```bash
npm install
cp .env.example .env      # DATABASE_URL, DIRECT_URL, AUTH_SECRET, BLOB_READ_WRITE_TOKEN
npm run db:migrate        # cria as tabelas
npm run db:seed           # catálogo de exemplo + usuário admin
npm run dev
```

Loja em `http://localhost:3000`, painel em `http://localhost:3000/admin`.

As credenciais do admin saem de `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
no `.env` — **troque a senha antes de publicar**.

## Decisões que valem conhecer

**Fotos: WebP no navegador, Vercel Blob no armazenamento.** O admin converte e
redimensiona a imagem no cliente (`src/lib/image-webp.ts`, máx. 1600 px de lado,
qualidade 0.82) e só então envia para `POST /api/admin/upload`, que guarda no
Vercel Blob. Converter antes de subir deixa uma foto de celular em ~200 KB, então
o upload é rápido e nunca esbarra no limite de 4,5 MB de corpo da função. A rota
autentica no Blob com `BLOB_READ_WRITE_TOKEN` (aba *.env.local* do store) ou,
na falta dele, com o id do store somado ao `VERCEL_OIDC_TOKEN` que a Vercel
injeta em runtime — aceitando também os nomes prefixados que a integração cria
(`BLOB_READ_WRITE_TOKEN_STORE_ID`). Em dev local só o token serve; sem nenhum
dos dois o upload responde 500 e o campo de URL manual continua valendo.

**Dinheiro em centavos.** Todo valor monetário é `Int` em centavos
(`priceCents`, `totalCents`…). Evita erro de ponto flutuante e o atrito de
serializar `Decimal` entre Server e Client Components. Conversão em
`toCents()` / `fromCents()` / `brl()` (`src/lib/utils.ts`).

**Estoque vive na variante.** Todo produto tem ao menos uma `ProductVariant`
(produtos sem sabores usam uma chamada "Padrão"). Assim existe um único
caminho de código para estoque, em vez de dois.

**Estoque só muda por movimento.** `ProductVariant.stock` nunca é editado
direto pelo formulário de produto. Toda alteração passa por
`applyMovement()` (`src/lib/stock.ts`), que atualiza o saldo e grava um
`StockMovement` com o balanço resultante, dentro da mesma transação. O
histórico do painel sempre bate com o saldo.

**Baixa de estoque no pagamento, com trava de idempotência.** O pedido nasce
`PENDING` sem tocar no estoque — o pagamento é confirmado manualmente no
WhatsApp. Ao marcar `PAID`/`SHIPPED`/`DELIVERED`, o estoque é debitado;
ao cancelar, é devolvido. A flag `Order.stockApplied` garante que isso
aconteça exatamente uma vez, mesmo com cliques repetidos.

**O servidor nunca confia no carrinho.** `createOrder()` recalcula preço,
desconto, frete e disponibilidade a partir do banco; o carrinho do cliente
só informa quais variantes e quantidades ele quer.

## Estrutura

```
src/app/(loja)      vitrine: home, listagem, produto, carrinho, checkout, pedido
src/app/(painel)    painel administrativo (protegido pelo layout)
src/app/(entrar)    login do painel (fora do layout protegido)
src/app/actions     Server Actions — cada uma revalida a própria sessão
src/lib             db, auth, estoque, preços, catálogo, formatação
src/components      ui/ (primitivos), store/ (loja), admin/ (painel)
prisma/             schema, migrations e seed
scripts/            teste de integração do estoque
```

## Testes

```bash
npm run test:stock   # baixa, idempotência, estorno e bloqueio de saldo negativo
npm run typecheck
npm run lint
```

O teste de estoque roda contra o banco configurado no `.env` e limpa o que
cria. Ele usa `--conditions=react-server` porque `src/lib/stock.ts` é marcado
com `server-only`.

## Publicar

O projeto roda em qualquer host Node. Na Vercel:

1. Configure `DATABASE_URL`, `DIRECT_URL` e `AUTH_SECRET` nas variáveis de ambiente
   (gere o segredo com `openssl rand -base64 32`).
2. `npm run db:deploy` aplica as migrations no banco de produção.
3. O `postinstall` já roda `prisma generate` no build.
