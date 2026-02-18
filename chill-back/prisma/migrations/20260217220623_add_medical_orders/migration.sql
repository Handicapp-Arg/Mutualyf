-- CreateTable
CREATE TABLE "medical_orders" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "patient_dni" TEXT NOT NULL,
    "patient_name" TEXT NOT NULL,
    "patient_phone" TEXT,
    "order_date" TEXT NOT NULL,
    "doctor_name" TEXT,
    "doctor_license" TEXT,
    "health_insurance" TEXT,
    "requested_studies" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "file_type" TEXT NOT NULL,
    "validation_status" TEXT NOT NULL DEFAULT 'pending',
    "validated_by" TEXT,
    "validated_at" DATETIME,
    "rejection_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "medical_orders_session_id_idx" ON "medical_orders"("session_id");

-- CreateIndex
CREATE INDEX "medical_orders_patient_dni_idx" ON "medical_orders"("patient_dni");

-- CreateIndex
CREATE INDEX "medical_orders_validation_status_idx" ON "medical_orders"("validation_status");
