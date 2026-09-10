-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "showOnHome" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE INDEX "Collection_active_position_idx" ON "Collection"("active", "position");

-- CreateIndex
CREATE INDEX "CollectionItem_collectionId_position_idx" ON "CollectionItem"("collectionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "CollectionItem_collectionId_productId_key" ON "CollectionItem"("collectionId", "productId");

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Os produtos já marcados como destaque viram a primeira lista, para a loja
-- não perder a vitrine que estava no ar quando as listas entraram.
INSERT INTO "Collection" ("id", "name", "slug", "subtitle", "position", "active", "showOnHome", "createdAt", "updatedAt")
SELECT 'seed_destaques', 'Destaques', 'destaques', 'A seleção da loja', 0, true, true, NOW(), NOW()
WHERE EXISTS (SELECT 1 FROM "Product" WHERE "featured" = true);

INSERT INTO "CollectionItem" ("id", "collectionId", "productId", "position", "createdAt")
SELECT gen_random_uuid()::text,
       'seed_destaques',
       p."id",
       (row_number() OVER (ORDER BY p."createdAt" DESC))::int - 1,
       NOW()
  FROM "Product" p
 WHERE p."featured" = true
   AND EXISTS (SELECT 1 FROM "Collection" WHERE "id" = 'seed_destaques');
