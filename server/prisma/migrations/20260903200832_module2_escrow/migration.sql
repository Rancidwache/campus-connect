-- CreateEnum
CREATE TYPE "MpesaEventKind" AS ENUM ('STK_PUSH_REQUEST', 'STK_CALLBACK', 'B2C_REQUEST', 'B2C_RESULT', 'B2C_TIMEOUT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ESCROW_FUNDED', 'PAYMENT_FAILED', 'DELIVERY_APPROVED', 'ESCROW_RELEASED', 'ESCROW_REFUNDED', 'JOB_DECLINED');

-- AlterEnum: recreate EscrowStatus with the full set of values.
-- (A plain `ALTER TYPE ... ADD VALUE` cannot be used later in the same
--  transaction, and this migration also sets a new value as the column default.
--  Recreating the type sidesteps both restrictions. Safe here: `transactions`
--  is empty at this point.)
ALTER TABLE "transactions" ALTER COLUMN "escrow_status" DROP DEFAULT;
ALTER TYPE "EscrowStatus" RENAME TO "EscrowStatus_old";
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING_PAYMENT', 'PAYMENT_FAILED', 'HELD', 'RELEASING', 'RELEASED', 'REFUNDING', 'REFUNDED', 'CANCELLED');
ALTER TABLE "transactions" ALTER COLUMN "escrow_status" TYPE "EscrowStatus" USING ("escrow_status"::text::"EscrowStatus");
DROP TYPE "EscrowStatus_old";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "mpesa_checkout_id",
ADD COLUMN     "b2c_conversation_id" TEXT,
ADD COLUMN     "b2c_receipt" TEXT,
ADD COLUMN     "b2c_result_code" INTEGER,
ADD COLUMN     "b2c_result_desc" TEXT,
ADD COLUMN     "client_phone" TEXT NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'KES',
ADD COLUMN     "fee_amount" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "paid_at" TIMESTAMP(3),
ADD COLUMN     "platform_fee" DECIMAL(12,2) NOT NULL,
ADD COLUMN     "provider_phone" TEXT NOT NULL,
ADD COLUMN     "refunded_at" TIMESTAMP(3),
ADD COLUMN     "released_at" TIMESTAMP(3),
ADD COLUMN     "stk_checkout_request_id" TEXT,
ADD COLUMN     "stk_merchant_request_id" TEXT,
ADD COLUMN     "stk_result_code" INTEGER,
ADD COLUMN     "stk_result_desc" TEXT,
ALTER COLUMN "escrow_status" SET DEFAULT 'PENDING_PAYMENT';

-- CreateTable
CREATE TABLE "mpesa_events" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER,
    "kind" "MpesaEventKind" NOT NULL,
    "ref" TEXT,
    "result_code" INTEGER,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mpesa_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "transaction_id" INTEGER,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mpesa_events_transaction_id_idx" ON "mpesa_events"("transaction_id");

-- CreateIndex
CREATE INDEX "mpesa_events_ref_idx" ON "mpesa_events"("ref");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_idx" ON "notifications"("user_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_stk_checkout_request_id_key" ON "transactions"("stk_checkout_request_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_b2c_conversation_id_key" ON "transactions"("b2c_conversation_id");

-- CreateIndex
CREATE INDEX "transactions_escrow_status_idx" ON "transactions"("escrow_status");

-- AddForeignKey
ALTER TABLE "mpesa_events" ADD CONSTRAINT "mpesa_events_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

