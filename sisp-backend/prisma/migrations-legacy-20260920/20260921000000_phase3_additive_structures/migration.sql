-- Phase 3 (P3-02/P3-04/P3-05/P3-06/P3-07/P3-08/P3-09): additive supporting
-- structures. Generated with Prisma's own schema-diff engine and reviewed.
-- No existing column/table is removed; all changes are additive or relax the
-- audit_logs FK to survive account removal.

-- pgvector is required by knowledge_chunks.embedding (P3-08).
CREATE EXTENSION IF NOT EXISTS vector;

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "actor_email" TEXT,
ADD COLUMN     "actor_role" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "enrollment_history" ADD COLUMN     "academic_term_id" TEXT,
ADD COLUMN     "academic_year" TEXT,
ADD COLUMN     "changed_by_id" TEXT,
ADD COLUMN     "course_id" TEXT,
ADD COLUMN     "enrollment_id" TEXT,
ADD COLUMN     "previous_status" TEXT;

-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "class_section_id" TEXT;

-- CreateTable
CREATE TABLE "class_sections" (
    "id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "academic_term_id" TEXT NOT NULL,
    "section_code" TEXT NOT NULL,
    "instructor_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "class_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_schedules" (
    "id" TEXT NOT NULL,
    "class_section_id" TEXT NOT NULL,
    "day_of_week" TEXT NOT NULL,
    "start_time" TIME,
    "end_time" TIME,
    "room" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "class_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_term_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "payment_method" TEXT,
    "reference_number" TEXT,
    "proof_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_by_id" TEXT,
    "paid_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adviser_assignments" (
    "id" TEXT NOT NULL,
    "adviser_user_id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "academic_term_id" TEXT,
    "academic_year" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adviser_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advising_concerns" (
    "id" TEXT NOT NULL,
    "student_profile_id" TEXT NOT NULL,
    "adviser_user_id" TEXT,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "advising_concerns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_documents" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" TEXT,
    "effective_date" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "embedding" vector(384),
    "embedding_model" TEXT,
    "embedded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "class_sections_academic_term_id_idx" ON "class_sections"("academic_term_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_sections_course_id_academic_term_id_section_code_key" ON "class_sections"("course_id", "academic_term_id", "section_code");

-- CreateIndex
CREATE UNIQUE INDEX "class_schedules_class_section_id_day_of_week_start_time_key" ON "class_schedules"("class_section_id", "day_of_week", "start_time");

-- CreateIndex
CREATE INDEX "payment_transactions_student_id_academic_term_id_idx" ON "payment_transactions"("student_id", "academic_term_id");

-- CreateIndex
CREATE INDEX "adviser_assignments_student_profile_id_idx" ON "adviser_assignments"("student_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "adviser_assignments_adviser_user_id_student_profile_id_acad_key" ON "adviser_assignments"("adviser_user_id", "student_profile_id", "academic_term_id");

-- CreateIndex
CREATE INDEX "advising_concerns_student_profile_id_status_idx" ON "advising_concerns"("student_profile_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_documents_filename_key" ON "knowledge_documents"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_chunks_document_id_chunk_index_key" ON "knowledge_chunks"("document_id", "chunk_index");

-- CreateIndex
CREATE INDEX "enrollment_history_student_id_created_at_idx" ON "enrollment_history"("student_id", "created_at");

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_history" ADD CONSTRAINT "enrollment_history_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_history" ADD CONSTRAINT "enrollment_history_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_history" ADD CONSTRAINT "enrollment_history_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollment_history" ADD CONSTRAINT "enrollment_history_changed_by_id_fkey" FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sections" ADD CONSTRAINT "class_sections_instructor_id_fkey" FOREIGN KEY ("instructor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_schedules" ADD CONSTRAINT "class_schedules_class_section_id_fkey" FOREIGN KEY ("class_section_id") REFERENCES "class_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_assignments" ADD CONSTRAINT "adviser_assignments_adviser_user_id_fkey" FOREIGN KEY ("adviser_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_assignments" ADD CONSTRAINT "adviser_assignments_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adviser_assignments" ADD CONSTRAINT "adviser_assignments_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advising_concerns" ADD CONSTRAINT "advising_concerns_student_profile_id_fkey" FOREIGN KEY ("student_profile_id") REFERENCES "student_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advising_concerns" ADD CONSTRAINT "advising_concerns_adviser_user_id_fkey" FOREIGN KEY ("adviser_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_chunks" ADD CONSTRAINT "knowledge_chunks_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
