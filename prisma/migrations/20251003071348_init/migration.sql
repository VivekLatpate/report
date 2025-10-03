-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "crime_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "mediaUrls" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "crime_reports_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crimeReportId" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "crimeType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "riskFactors" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "people" TEXT NOT NULL,
    "vehicles" TEXT NOT NULL,
    "weapons" TEXT NOT NULL,
    "locations" TEXT NOT NULL,
    "objects" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_analyses_crimeReportId_fkey" FOREIGN KEY ("crimeReportId") REFERENCES "crime_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "human_verifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "crimeReportId" TEXT NOT NULL,
    "verifiedBy" TEXT NOT NULL,
    "verifiedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isVerified" BOOLEAN NOT NULL,
    "notes" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL,
    "requiresFollowUp" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "human_verifications_crimeReportId_fkey" FOREIGN KEY ("crimeReportId") REFERENCES "crime_reports" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "human_verifications_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_crimeReportId_key" ON "ai_analyses"("crimeReportId");

-- CreateIndex
CREATE UNIQUE INDEX "human_verifications_crimeReportId_key" ON "human_verifications"("crimeReportId");
