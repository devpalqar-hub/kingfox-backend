-- CreateTable
CREATE TABLE "billing_sessions" (
    "id" BIGSERIAL NOT NULL,
    "invoice_id" BIGINT NOT NULL,
    "gst_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "coupon_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_sessions_invoice_id_key" ON "billing_sessions"("invoice_id");

-- AddForeignKey
ALTER TABLE "billing_sessions" ADD CONSTRAINT "billing_sessions_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
