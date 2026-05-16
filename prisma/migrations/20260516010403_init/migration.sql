-- CreateTable
CREATE TABLE "AdminUser" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "inviteToken" TEXT,
    "inviteTokenExpiry" TIMESTAMP(3),
    "invitedBy" TEXT,
    "invitedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT false,
    "deactivatedAt" TIMESTAMP(3),
    "deactivatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL DEFAULT 'Comfy Clean Co.',
    "businessAddress" TEXT,
    "businessCity" TEXT,
    "businessZip" TEXT,
    "businessPhone" TEXT,
    "businessEmail" TEXT,
    "logoUrl" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0D9488',
    "emailFromName" TEXT NOT NULL DEFAULT 'Comfy Clean Co.',
    "emailReplyTo" TEXT,
    "maxJobsPerDay" INTEGER NOT NULL DEFAULT 8,
    "maxJobsPerCleaner" INTEGER NOT NULL DEFAULT 3,
    "workdayStartHour" INTEGER NOT NULL DEFAULT 8,
    "workdayEndHour" INTEGER NOT NULL DEFAULT 18,
    "serviceZipCodes" TEXT[],
    "blackoutDates" TIMESTAMP(3)[],
    "cancellationWindowHours" INTEGER NOT NULL DEFAULT 24,
    "cancellationFeeDefault" DOUBLE PRECISION,
    "invoiceFooterText" TEXT,
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoiceNumberSeed" INTEGER NOT NULL DEFAULT 1,
    "zellePaymentLink" TEXT,
    "defaultPaymentMethod" TEXT NOT NULL DEFAULT 'zelle',
    "googlePlaceId" TEXT,
    "reviewRequestHour" INTEGER NOT NULL DEFAULT 9,
    "reviewRequestSkipWeekends" BOOLEAN NOT NULL DEFAULT false,
    "reviewCooldownDays" INTEGER NOT NULL DEFAULT 30,
    "googleOverallRating" DOUBLE PRECISION,
    "googleTotalRatings" INTEGER,
    "adminNotificationEmail" TEXT,
    "adminNotificationPhone" TEXT,
    "automationSettings" JSONB NOT NULL DEFAULT '{"globalPause":false,"clientCommunications":{"enabled":true,"appointmentReminder":true,"cleanerOnTheWay":true,"reviewRequest":true},"adminAlerts":{"enabled":true,"staleLead":true,"overdueInvoice":true,"openClockEntry":true,"capacityWarning":true,"negativeReview":true,"pinLocked":true,"newLead":true},"financialAutomations":{"enabled":true,"invoiceGeneration":true,"overdueTransition":true}}',
    "appointmentReminderHour" INTEGER NOT NULL DEFAULT 18,
    "overdueDailyAlertThreshold" INTEGER NOT NULL DEFAULT 1,
    "googleMyBusinessConnected" BOOLEAN NOT NULL DEFAULT false,
    "twilioConnected" BOOLEAN NOT NULL DEFAULT false,
    "ghlConnected" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "linkPath" TEXT,
    "actorName" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadInquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "preferredDay" TEXT,
    "preferredTime" TEXT,
    "notes" TEXT,
    "source" TEXT,
    "adminNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "contactedAt" TIMESTAMP(3),
    "contactedBy" TEXT,
    "convertedAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "clientId" TEXT,
    "quoteId" TEXT,
    "smsOptInSent" BOOLEAN NOT NULL DEFAULT false,
    "smsOptInSentAt" TIMESTAMP(3),
    "smsOptedIn" BOOLEAN NOT NULL DEFAULT false,
    "smsOptedInAt" TIMESTAMP(3),
    "smsOptedOut" BOOLEAN NOT NULL DEFAULT false,
    "smsOptedOutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL,
    "companyName" TEXT,
    "secondaryContactName" TEXT,
    "secondaryContactEmail" TEXT,
    "secondaryContactPhone" TEXT,
    "secondaryContactTitle" TEXT,
    "defaultAddress" TEXT,
    "defaultCity" TEXT,
    "defaultZip" TEXT,
    "accessNotes" TEXT,
    "petNotes" TEXT,
    "specialInstructions" TEXT,
    "defaultFrequency" TEXT,
    "defaultJobType" TEXT,
    "preferredDay" TEXT,
    "preferredTime" TEXT,
    "preferredCleanerId" TEXT,
    "preferredPaymentMethod" TEXT,
    "standardRate" DOUBLE PRECISION,
    "acquisitionSource" TEXT,
    "referredBy" TEXT,
    "clientSince" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "internalNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "smsOptedIn" BOOLEAN NOT NULL DEFAULT false,
    "smsOptedOut" BOOLEAN NOT NULL DEFAULT false,
    "smsOptedInAt" TIMESTAMP(3),
    "smsOptedOutAt" TIMESTAMP(3),
    "lastReviewRequestedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cleaner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "dateHired" TIMESTAMP(3),
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "pinHash" TEXT NOT NULL,
    "pinAttempts" INTEGER NOT NULL DEFAULT 0,
    "pinLockedUntil" TIMESTAMP(3),
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "payType" TEXT NOT NULL DEFAULT 'hourly',
    "availableDays" TEXT[],
    "colorIndex" INTEGER NOT NULL DEFAULT 0,
    "internalNotes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cleaner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "serviceAddress" TEXT NOT NULL,
    "serviceCity" TEXT NOT NULL,
    "serviceZip" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "estimatedHours" DOUBLE PRECISION,
    "jobType" TEXT NOT NULL,
    "notes" TEXT,
    "estimatedValue" DOUBLE PRECISION,
    "actualRevenue" DOUBLE PRECISION,
    "paymentMethod" TEXT,
    "paymentNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'stand_by',
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancellationType" TEXT,
    "cancellationFee" DOUBLE PRECISION,
    "recurringRule" TEXT,
    "recurringGroupId" TEXT,
    "isRecurringRoot" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobAssignment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "cleanerId" TEXT NOT NULL,
    "clockedInAt" TIMESTAMP(3),
    "clockedOutAt" TIMESTAMP(3),
    "durationMins" INTEGER,
    "hourlyRateSnapshot" DOUBLE PRECISION,
    "laborCost" DOUBLE PRECISION,
    "gpsLat" DOUBLE PRECISION,
    "gpsLng" DOUBLE PRECISION,
    "gpsBlocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationPing" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "pingedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationPing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION,
    "paymentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "overdueMarkedAt" TIMESTAMP(3),
    "paymentLinkClickedAt" TIMESTAMP(3),
    "manuallyConfirmedAt" TIMESTAMP(3),
    "manuallyConfirmedBy" TEXT,
    "refundAmount" DOUBLE PRECISION,
    "refundNotes" TEXT,
    "writtenOffAt" TIMESTAMP(3),
    "writtenOffBy" TEXT,
    "writtenOffReason" TEXT,
    "snapshotScheduledAt" TIMESTAMP(3),
    "snapshotAmount" DOUBLE PRECISION,
    "snapshotAddress" TEXT,
    "pdfUrl" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartialPayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartialPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodedAddress" (
    "id" TEXT NOT NULL,
    "addressKey" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodedAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "jobId" TEXT,
    "sentAt" TIMESTAMP(3),
    "sentViaEmail" BOOLEAN NOT NULL DEFAULT false,
    "sentViaSms" BOOLEAN NOT NULL DEFAULT false,
    "clickedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'queued',
    "googleReviewId" TEXT,
    "matchedAt" TIMESTAMP(3),
    "matchedBy" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GoogleReview" (
    "id" TEXT NOT NULL,
    "googleReviewId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "text" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "pulledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagAcknowledgedAt" TIMESTAMP(3),
    "flagAcknowledgedBy" TEXT,
    "reviewRequestId" TEXT,

    CONSTRAINT "GoogleReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Communication" (
    "id" TEXT NOT NULL,
    "clientId" TEXT,
    "leadId" TEXT,
    "channel" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'outbound',
    "eventType" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientEmail" TEXT,
    "recipientPhone" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "externalId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Communication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_inviteToken_key" ON "AdminUser"("inviteToken");

-- CreateIndex
CREATE INDEX "AdminUser_email_idx" ON "AdminUser"("email");

-- CreateIndex
CREATE INDEX "AdminUser_role_idx" ON "AdminUser"("role");

-- CreateIndex
CREATE INDEX "AdminUser_active_idx" ON "AdminUser"("active");

-- CreateIndex
CREATE INDEX "AdminUser_inviteToken_idx" ON "AdminUser"("inviteToken");

-- CreateIndex
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityLog_eventType_idx" ON "ActivityLog"("eventType");

-- CreateIndex
CREATE INDEX "LeadInquiry_status_idx" ON "LeadInquiry"("status");

-- CreateIndex
CREATE INDEX "LeadInquiry_createdAt_idx" ON "LeadInquiry"("createdAt");

-- CreateIndex
CREATE INDEX "LeadInquiry_type_idx" ON "LeadInquiry"("type");

-- CreateIndex
CREATE INDEX "LeadInquiry_frequency_idx" ON "LeadInquiry"("frequency");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE INDEX "Client_active_idx" ON "Client"("active");

-- CreateIndex
CREATE INDEX "Client_defaultZip_idx" ON "Client"("defaultZip");

-- CreateIndex
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");

-- CreateIndex
CREATE INDEX "Cleaner_active_idx" ON "Cleaner"("active");

-- CreateIndex
CREATE INDEX "Cleaner_createdAt_idx" ON "Cleaner"("createdAt");

-- CreateIndex
CREATE INDEX "Job_scheduledAt_idx" ON "Job"("scheduledAt");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_clientId_idx" ON "Job"("clientId");

-- CreateIndex
CREATE INDEX "Job_recurringGroupId_idx" ON "Job"("recurringGroupId");

-- CreateIndex
CREATE INDEX "JobAssignment_cleanerId_idx" ON "JobAssignment"("cleanerId");

-- CreateIndex
CREATE INDEX "JobAssignment_jobId_idx" ON "JobAssignment"("jobId");

-- CreateIndex
CREATE INDEX "JobAssignment_clockedInAt_idx" ON "JobAssignment"("clockedInAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobAssignment_jobId_cleanerId_key" ON "JobAssignment"("jobId", "cleanerId");

-- CreateIndex
CREATE INDEX "LocationPing_assignmentId_idx" ON "LocationPing"("assignmentId");

-- CreateIndex
CREATE INDEX "LocationPing_pingedAt_idx" ON "LocationPing"("pingedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_jobId_key" ON "Invoice"("jobId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

-- CreateIndex
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_idx" ON "Invoice"("dueDate");

-- CreateIndex
CREATE INDEX "PartialPayment_invoiceId_idx" ON "PartialPayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodedAddress_addressKey_key" ON "GeocodedAddress"("addressKey");

-- CreateIndex
CREATE INDEX "GeocodedAddress_addressKey_idx" ON "GeocodedAddress"("addressKey");

-- CreateIndex
CREATE INDEX "ReviewRequest_clientId_idx" ON "ReviewRequest"("clientId");

-- CreateIndex
CREATE INDEX "ReviewRequest_jobId_idx" ON "ReviewRequest"("jobId");

-- CreateIndex
CREATE INDEX "ReviewRequest_status_idx" ON "ReviewRequest"("status");

-- CreateIndex
CREATE INDEX "ReviewRequest_createdAt_idx" ON "ReviewRequest"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleReview_googleReviewId_key" ON "GoogleReview"("googleReviewId");

-- CreateIndex
CREATE INDEX "GoogleReview_rating_idx" ON "GoogleReview"("rating");

-- CreateIndex
CREATE INDEX "GoogleReview_publishedAt_idx" ON "GoogleReview"("publishedAt");

-- CreateIndex
CREATE INDEX "GoogleReview_flagged_idx" ON "GoogleReview"("flagged");

-- CreateIndex
CREATE INDEX "GoogleReview_reviewRequestId_idx" ON "GoogleReview"("reviewRequestId");

-- CreateIndex
CREATE INDEX "Communication_clientId_idx" ON "Communication"("clientId");

-- CreateIndex
CREATE INDEX "Communication_leadId_idx" ON "Communication"("leadId");

-- CreateIndex
CREATE INDEX "Communication_channel_idx" ON "Communication"("channel");

-- CreateIndex
CREATE INDEX "Communication_eventType_idx" ON "Communication"("eventType");

-- CreateIndex
CREATE INDEX "Communication_createdAt_idx" ON "Communication"("createdAt");

-- CreateIndex
CREATE INDEX "Communication_status_idx" ON "Communication"("status");

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_preferredCleanerId_fkey" FOREIGN KEY ("preferredCleanerId") REFERENCES "Cleaner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobAssignment" ADD CONSTRAINT "JobAssignment_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "Cleaner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocationPing" ADD CONSTRAINT "LocationPing_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "JobAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartialPayment" ADD CONSTRAINT "PartialPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewRequest" ADD CONSTRAINT "ReviewRequest_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Communication" ADD CONSTRAINT "Communication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
