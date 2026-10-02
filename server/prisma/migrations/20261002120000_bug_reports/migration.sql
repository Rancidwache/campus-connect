-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "BugStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX');

-- CreateTable
CREATE TABLE "bug_reports" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "BugSeverity" NOT NULL DEFAULT 'MEDIUM',
    "page_url" TEXT,
    "user_agent" TEXT,
    "contact" TEXT,
    "status" "BugStatus" NOT NULL DEFAULT 'OPEN',
    "admin_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bug_reports_status_idx" ON "bug_reports"("status");

-- CreateIndex
CREATE INDEX "bug_reports_created_at_idx" ON "bug_reports"("created_at");

-- AddForeignKey
ALTER TABLE "bug_reports" ADD CONSTRAINT "bug_reports_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
