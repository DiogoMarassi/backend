-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('PENDING', 'READY', 'ERROR');

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN "status" "LessonStatus" NOT NULL DEFAULT 'READY';
ALTER TABLE "Lesson" ADD COLUMN "errorMessage" TEXT;
