-- AlterTable
ALTER TABLE "crime_reports" ADD COLUMN "walletAddress" TEXT;

-- CreateTable
CREATE TABLE "solana_rewards" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crimeReportId" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "transactionId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "solana_rewards_crimeReportId_fkey" FOREIGN KEY ("crimeReportId") REFERENCES "crime_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "solana_rewards_crimeReportId_key" ON "solana_rewards"("crimeReportId");
