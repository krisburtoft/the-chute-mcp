import { z } from "zod";

export const animalStatusFlags = [
  "sick",
  "quarantined",
  "lactating",
  "dry",
  "weaning",
  "finishing",
  "for_sale",
] as const;

export const mcpPhotoFileSchema = z.object({
  download_url: z.string().max(8192),
  file_id: z.string().min(1).max(300),
  mime_type: z.string().max(100).optional(),
  file_name: z.string().max(300).optional(),
});

const animalOptionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const animalFields = {
  name: z.preprocess(
    (value) => (typeof value === "string" && !value.trim() ? null : value),
    z.string().trim().max(120).nullable().optional(),
  ),
  // Cattle are the only species currently supported for new The Chute™ records.
  // Keep the broader database species type for existing records and future expansion.
  species: z.literal("cattle").default("cattle"),
  breed: animalOptionalText(80),
  sex: z.enum(["female", "male"]),
  earTag: animalOptionalText(80),
  registrationNumber: animalOptionalText(100),
  dateOfBirth: z.iso.date().nullable().optional(),
  status: z.enum(["active", "sold", "deceased"]),
  notes: animalOptionalText(2000),
};

export const animalRecordSchema = z
  .object({
    ...animalFields,
    damId: z.string().uuid().nullable().optional(),
    sireId: z.string().uuid().nullable().optional(),
    damName: animalOptionalText(160),
    sireName: animalOptionalText(160),
    birthBreedingRecordId: z.string().uuid().nullable().optional(),
    status: animalFields.status.default("active"),
  })
  .superRefine((record, context) => {
    if (record.damId && record.damName?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["damName"],
        message: "Choose an in-ranch dam or enter an outside dam, not both.",
      });
    }
    if (record.sireId && record.sireName?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["sireName"],
        message: "Choose an in-ranch sire or enter an outside sire, not both.",
      });
    }
  });

export const dateSchema = z.iso.date();

export const optionalText = (max: number) =>
  z.string().trim().max(max).nullable().optional();

export const healthRecordSchema = z
  .object({
    animalId: z.string().uuid(),
    eventType: z.enum(["vaccination", "treatment", "observation", "vet_visit"]),
    occurredOn: dateSchema,
    productName: optionalText(160),
    dosage: optionalText(160),
    administrationMethod: optionalText(120),
    veterinarian: optionalText(160),
    followUpOn: dateSchema.nullable().optional(),
    notes: optionalText(3000),
  })
  .refine(
    (value) => !value.followUpOn || value.followUpOn >= value.occurredOn,
    {
      message: "Follow-up date must be on or after the event date.",
      path: ["followUpOn"],
    },
  );

export const weightRecordSchema = z
  .object({
    animalId: z.string().uuid(),
    measuredOn: dateSchema,
    weight: z.number().positive().max(10000),
    unit: z.enum(["lb", "kg"]),
    context: optionalText(160),
  })
  .strict();

export const breedingSireSchema = z.discriminatedUnion("kind", [
  z
    .object({ kind: z.literal("herd_animal"), animalId: z.string().uuid() })
    .strict(),
  z
    .object({
      kind: z.literal("external_animal"),
      externalAnimalId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("create_external_animal"),
      name: z.string().trim().min(1).max(120),
      earTag: optionalText(80),
      registrationNumber: optionalText(100),
      breed: optionalText(80),
      dateOfBirth: dateSchema.nullable().optional(),
      notes: optionalText(2000),
    })
    .strict(),
]);

export const breedingRecordCommonShape = {
  animalId: z.string().uuid(),
  pregnancyStatus: z.enum(["unknown", "confirmed", "open"]).default("unknown"),
  notes: optionalText(3000),
};

export const breedingRecordSchema = z.discriminatedUnion("method", [
  z
    .object({
      ...breedingRecordCommonShape,
      method: z.literal("ai"),
      breedingDate: dateSchema,
      sire: breedingSireSchema.optional(),
    })
    .strict(),
  z
    .object({
      ...breedingRecordCommonShape,
      method: z.literal("bull_exposure"),
      exposureStartDate: dateSchema,
      exposureEndDate: dateSchema,
      sire: breedingSireSchema,
    })
    .strict()
    .refine((value) => value.exposureStartDate <= value.exposureEndDate, {
      message: "Exposure end date must be on or after the start date.",
      path: ["exposureEndDate"],
    }),
]);

export const expenseRecordSchema = z.object({
  category: z.enum([
    "hay",
    "bedding",
    "feed_mineral",
    "veterinary",
    "medicine",
    "equipment",
    "pasture",
    "utilities",
    "other",
  ]),
  amount: z.number().min(0.01).lt(10_000_000),
  incurredOn: dateSchema,
  vendor: optionalText(160),
  description: z.string().trim().min(1).max(300),
  notes: optionalText(2000),
});

export const allocationSchema = z.object({
  mode: z.enum(["ranch", "animals"]).default("ranch"),
  animalIds: z.array(z.string().uuid()).max(200).optional(),
  groupId: z.string().uuid().optional(),
});

export const reminderRecurrenceSchema = z
  .number()
  .int()
  .refine((days) => [30, 90, 180, 365].includes(days), {
    message: "Reminder recurrence must be 30, 90, 180, or 365 days.",
  });

export const reminderRecordSchema = z.object({
  title: z.string().trim().min(1).max(160),
  dueOn: dateSchema,
  animalId: z.string().uuid().nullable(),
  notes: z.string().max(1000).nullable(),
  recurrenceDays: reminderRecurrenceSchema.nullable(),
});

export const photoUploadInputSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  bytes: z
    .number()
    .int()
    .min(1)
    .max(10 * 1024 * 1024),
  caption: z.string().trim().max(300).default(""),
  isPrimary: z.boolean().default(false),
});
