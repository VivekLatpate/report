-- CreateEnum
CREATE TYPE "public"."CrimeCategory" AS ENUM ('SEXUAL_VIOLENCE', 'DOMESTIC_VIOLENCE', 'STREET_CRIMES', 'MOB_VIOLENCE_LYNCHING', 'ROAD_RAGE_INCIDENTS', 'CYBERCRIMES', 'DRUG');

-- Add new category column with default value
ALTER TABLE "public"."crime_reports" ADD COLUMN "category_new" "public"."CrimeCategory" DEFAULT 'STREET_CRIMES';

-- Update existing records to use STREET_CRIMES as default
UPDATE "public"."crime_reports" SET "category_new" = 'STREET_CRIMES' WHERE "category_new" IS NULL;

-- Make the new column NOT NULL
ALTER TABLE "public"."crime_reports" ALTER COLUMN "category_new" SET NOT NULL;

-- Drop the old category column
ALTER TABLE "public"."crime_reports" DROP COLUMN "category";

-- Rename the new column to category
ALTER TABLE "public"."crime_reports" RENAME COLUMN "category_new" TO "category";
