import { z } from 'zod'

export const leadSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Please enter a valid email address'),
  phone: z
    .string()
    .transform((v) => v.replace(/\D/g, ''))
    .pipe(z.string().min(10, 'Phone must be at least 10 digits').max(11)),
  type: z.enum(['residential', 'commercial'], { error: 'Please select a cleaning type' }),
  frequency: z.enum(['one-time', 'recurring'], { error: 'Please select a frequency' }),
  preferredDay: z.enum(['monday','tuesday','wednesday','thursday','friday','saturday','sunday','flexible']).optional(),
  preferredTime: z.enum(['morning','afternoon','evening','flexible']).optional(),
  source: z.enum(['google','referral','social_media','drove_by','other']).optional(),
  notes: z.string().max(500, 'Notes must be under 500 characters').optional(),
  website: z.string().optional(), // honeypot
})

export type LeadFormData = z.infer<typeof leadSchema>
