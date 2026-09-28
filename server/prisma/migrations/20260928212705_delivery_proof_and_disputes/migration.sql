-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY_SUBMITTED';
ALTER TYPE "NotificationType" ADD VALUE 'DELIVERY_DISPUTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ReportReason" ADD VALUE 'NOT_DELIVERED';
ALTER TYPE "ReportReason" ADD VALUE 'ITEM_NOT_AS_DESCRIBED';

-- AlterEnum
ALTER TYPE "ReportTargetType" ADD VALUE 'TRANSACTION';

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "disputed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "delivery_proofs" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_proofs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_proof_photos" (
    "id" SERIAL NOT NULL,
    "delivery_proof_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_proof_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "delivery_proofs_transaction_id_key" ON "delivery_proofs"("transaction_id");

-- CreateIndex
CREATE INDEX "delivery_proof_photos_delivery_proof_id_idx" ON "delivery_proof_photos"("delivery_proof_id");

-- AddForeignKey
ALTER TABLE "delivery_proofs" ADD CONSTRAINT "delivery_proofs_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_proof_photos" ADD CONSTRAINT "delivery_proof_photos_delivery_proof_id_fkey" FOREIGN KEY ("delivery_proof_id") REFERENCES "delivery_proofs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
