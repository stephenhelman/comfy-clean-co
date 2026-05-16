import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  // ─── AdminUser: Owner ──────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('ComfyClean2025!', 10)

  await db.adminUser.upsert({
    where: { email: 'adam@comfycleanco.com' },
    update: {},
    create: {
      name: 'Adam',
      email: 'adam@comfycleanco.com',
      passwordHash,
      role: 'owner',
      active: true,
    },
  })

  // ─── BusinessSettings: singleton ──────────────────────────────────────────
  const existing = await db.businessSettings.findFirst()

  if (!existing) {
    await db.businessSettings.create({
      data: {
        businessName: 'Comfy Clean Co.',
        businessEmail: 'hello@comfycleanco.com',
        businessPhone: '(915) 555-0100',
        defaultPaymentMethod: 'zelle',
        maxJobsPerDay: 8,
        maxJobsPerCleaner: 3,
        cancellationWindowHours: 24,
        invoiceNumberPrefix: 'INV',
        invoiceNumberSeed: 1,
        reviewCooldownDays: 30,
        reviewRequestHour: 9,
        appointmentReminderHour: 18,
        overdueDailyAlertThreshold: 1,
      },
    })
  }

  // ─── Test Cleaner ─────────────────────────────────────────────────────────
  const existingCleaner = await db.cleaner.findFirst({
    where: { email: 'test@comfycleanco.com' },
  })

  if (!existingCleaner) {
    const pinHash = await bcrypt.hash('1234', 10)

    await db.cleaner.create({
      data: {
        name: 'Test Cleaner',
        email: 'test@comfycleanco.com',
        phone: '9155550001',
        hourlyRate: 15.00,
        active: true,
        colorIndex: 0,
        availableDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        pinHash,
      },
    })
  }

  console.log('Seed complete — Adam can log in at admin.comfycleanco.com')
  console.log('Test Cleaner can log in at time.comfycleanco.com with PIN 1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
