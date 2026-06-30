-- 生産管理システム テーブル作成SQL
-- Supabase SQL Editorに貼り付けて実行する

-- ENUMタイプ
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SHIPPED', 'ON_HOLD');
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');
CREATE TYPE "ProcessingMethod" AS ENUM ('PRESS', 'LASER');
CREATE TYPE "WorkOrderStatus" AS ENUM ('PENDING', 'DRAFT', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD');

-- 顧客マスタ
CREATE TABLE "Customer" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "isExcelSync" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 製品ファミリーマスタ
CREATE TABLE "ProductFamily" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "processRoutes" JSONB NOT NULL,
  "altProcessRoutes" JSONB,
  "hasBothMethods" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 受注ヘッダー
CREATE TABLE "Order" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderNumber" TEXT NOT NULL UNIQUE,
  "customerId" UUID NOT NULL REFERENCES "Customer"("id"),
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "source" TEXT,
  "excelOrderId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 受注明細
CREATE TABLE "OrderItem" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL REFERENCES "Order"("id"),
  "productFamilyId" UUID NOT NULL REFERENCES "ProductFamily"("id"),
  "productCode" TEXT,
  "quantity" INTEGER NOT NULL,
  "thickness" DOUBLE PRECISION,
  "width" DOUBLE PRECISION,
  "height" DOUBLE PRECISION,
  "hasBend" BOOLEAN NOT NULL DEFAULT false,
  "bendAngle" DOUBLE PRECISION,
  "processingMethod" "ProcessingMethod" NOT NULL DEFAULT 'PRESS',
  "unitPrice" DOUBLE PRECISION,
  "status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 工程マスタ
CREATE TABLE "Process" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "machineType" TEXT NOT NULL,
  "stdMinPerPc" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "defaultSetupMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 機械マスタ
CREATE TABLE "Machine" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "machineType" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "workStartTime" TEXT NOT NULL DEFAULT '08:00',
  "workEndTime" TEXT NOT NULL DEFAULT '17:00',
  "lunchStartTime" TEXT NOT NULL DEFAULT '12:00',
  "lunchEndTime" TEXT NOT NULL DEFAULT '13:00',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 社員マスタ
CREATE TABLE "Employee" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "workStartTime" TEXT NOT NULL DEFAULT '08:00',
  "workEndTime" TEXT NOT NULL DEFAULT '17:00',
  "shiftPattern" TEXT NOT NULL DEFAULT 'weekday',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- スキルマッピング
CREATE TABLE "EmployeeSkill" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "employeeId" UUID NOT NULL REFERENCES "Employee"("id"),
  "processId" UUID NOT NULL REFERENCES "Process"("id"),
  "skillLevel" INTEGER NOT NULL DEFAULT 1,
  UNIQUE("employeeId", "processId")
);

-- 型マスタ
CREATE TABLE "Mold" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "moldNumber" TEXT NOT NULL UNIQUE,
  "machineType" TEXT NOT NULL,
  "setupMinutes" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 作業指示（中心テーブル）
CREATE TABLE "WorkOrder" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "orderItemId" UUID NOT NULL REFERENCES "OrderItem"("id"),
  "processId" UUID NOT NULL REFERENCES "Process"("id"),
  "machineId" UUID REFERENCES "Machine"("id"),
  "employeeId" UUID REFERENCES "Employee"("id"),
  "moldId" UUID REFERENCES "Mold"("id"),
  "processingMethod" "ProcessingMethod" NOT NULL DEFAULT 'PRESS',
  "seq" INTEGER NOT NULL,
  "status" "WorkOrderStatus" NOT NULL DEFAULT 'PENDING',
  "scheduledStart" TIMESTAMP(3),
  "scheduledEnd" TIMESTAMP(3),
  "actualStart" TIMESTAMP(3),
  "actualEnd" TIMESTAMP(3),
  "setupMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "processMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "isNested" BOOLEAN NOT NULL DEFAULT false,
  "nestingGroupId" TEXT,
  "isMoldGrouped" BOOLEAN NOT NULL DEFAULT false,
  "moldGroupId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX ON "Order"("customerId");
CREATE INDEX ON "Order"("dueDate");
CREATE INDEX ON "Order"("status");
CREATE INDEX ON "OrderItem"("orderId");
CREATE INDEX ON "WorkOrder"("orderItemId");
CREATE INDEX ON "WorkOrder"("machineId");
CREATE INDEX ON "WorkOrder"("employeeId");
CREATE INDEX ON "WorkOrder"("status");
CREATE INDEX ON "WorkOrder"("scheduledStart");
