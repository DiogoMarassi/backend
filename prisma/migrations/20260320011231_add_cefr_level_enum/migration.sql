/*
  Warnings:

  - The `level` column on the `Lesson` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "CefrLevel" AS ENUM ('A1', 'A2', 'B1', 'B2', 'C1', 'C2');

-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "level",
ADD COLUMN     "level" "CefrLevel";
