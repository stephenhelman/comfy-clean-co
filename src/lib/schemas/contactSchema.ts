import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .transform((val) => val.replace(/\D/g, ""))
    .pipe(z.string().length(10, "Phone must be exactly 10 digits")),
  service: z.enum(
    [
      "Residential Cleaning",
      "Commercial Cleaning",
      "Recurring Plan",
      "Move-in / Move-out",
      "Other",
    ],
    { error: "Please select a service type" }
  ),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000, "Message must be under 1000 characters"),
});

export type ContactFormData = z.infer<typeof contactSchema>;
