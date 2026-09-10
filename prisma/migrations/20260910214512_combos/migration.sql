-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "isCombo" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ComboItem" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComboItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ComboItem_comboId_position_idx" ON "ComboItem"("comboId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ComboItem_comboId_variantId_key" ON "ComboItem"("comboId", "variantId");

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboItem" ADD CONSTRAINT "ComboItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
