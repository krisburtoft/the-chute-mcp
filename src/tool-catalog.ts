import { z } from "zod";

import {
  animalRecordSchema,
  animalStatusFlags,
  allocationSchema,
  breedingRecordSchema,
  breedingSireSchema,
  dateSchema,
  expenseRecordSchema,
  healthRecordSchema,
  mcpPhotoFileSchema,
  optionalText,
  photoUploadInputSchema,
  reminderRecordSchema,
  reminderRecurrenceSchema,
  weightRecordSchema,
} from "./schemas.js";

const mcpPageSchema = {
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).max(10_000).default(0),
};

const readToolAnnotations = {
  readOnlyHint: true,
  openWorldHint: false,
  destructiveHint: false,
};

const draftToolAnnotations = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: false,
};

const confirmReminderAnnotations = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: false,
  idempotentHint: true,
};

const confirmChangeAnnotations = {
  readOnlyHint: false,
  openWorldHint: false,
  destructiveHint: true,
  idempotentHint: true,
};

export const THE_CHUTE_MCP_TOOL_DEFINITIONS = {
  get_ranch_dashboard: {
    title: "Get ranch dashboard",
    description:
      "Read active cattle, upcoming calvings, open care reminders, and health follow-ups for the connected ranch.",
    annotations: readToolAnnotations,
  },

  search_livestock: {
    title: "Search cattle",
    description:
      "Find cattle by name, ear tag, lifecycle status, or animal status flags. Archived animals are excluded by default; use status archived to find them. Returned status is the effective status, with archived taking precedence; lifecycle_status preserves the animal record status. If multiple flags are provided, a record matches any selected flag. Returns at most 50 concise records.",
    inputSchema: z.object({
      query: z.string().max(120).optional(),
      status: z
        .enum([
          "active",
          "sold",
          "deceased",
          "culled",
          "lost",
          "off_farm",
          "archived",
        ])
        .optional(),
      flags: z
        .array(z.enum(animalStatusFlags))
        .min(1)
        .max(animalStatusFlags.length)
        .optional(),
    }),
    annotations: readToolAnnotations,
  },

  get_animal_history: {
    title: "Get animal history",
    description:
      "Get one ranch animal with recent health, breeding, direct expense, and allocated expense history.",
    inputSchema: z.object({ animalId: z.string().uuid() }),
    annotations: readToolAnnotations,
  },

  list_animal_groups: {
    title: "List animal groups",
    description:
      "List active manual and smart animal groups in the connected ranch, including the current member count for each group.",
    annotations: readToolAnnotations,
  },

  get_animal_group: {
    title: "Get animal group",
    description:
      "Read a group and its current members. Smart group membership is resolved from its saved filters at request time.",
    inputSchema: z.object({ groupId: z.string().uuid() }),
    annotations: readToolAnnotations,
  },

  search_external_animals: {
    title: "Search external animals",
    description:
      "Search saved outside-ranch animal profiles. Before drafting a breeding record, search both the ranch herd and these profiles for the sire. If neither contains the bull, the breeding draft can create a linked external sire profile for review and confirmation.",
    inputSchema: z.object({
      query: z.string().trim().max(120).optional(),
      includeArchived: z.boolean().default(false),
      limit: z.number().int().min(1).max(100).default(50),
    }),
    annotations: readToolAnnotations,
  },

  list_ranch_expenses: {
    title: "List ranch expenses",
    description:
      "List up to 100 recent expenses, optionally filtered by dates, category, or animal allocation.",
    inputSchema: z.object({
      from: z.iso.date().optional(),
      through: z.iso.date().optional(),
      category: z.string().max(80).optional(),
      animalId: z.string().uuid().optional(),
    }),
    annotations: readToolAnnotations,
  },

  list_care_due: {
    title: "List care due",
    description:
      "Show upcoming and overdue reminders and health follow-ups through a chosen date (next 30 days by default).",
    inputSchema: z.object({ through: z.iso.date().optional() }),
    annotations: readToolAnnotations,
  },

  list_health_records: {
    title: "List health records",
    description:
      "Search ranch health records by animal, event type, or date range. Results include recorded medication and withdrawal fields and are paginated (25 by default, up to 100). These are stored records, not veterinary advice.",
    inputSchema: z.object({
      animalId: z.string().uuid().optional(),
      eventType: z
        .enum(["vaccination", "treatment", "observation", "vet_visit"])
        .optional(),
      from: z.iso.date().optional(),
      through: z.iso.date().optional(),
      ...mcpPageSchema,
    }),
    annotations: readToolAnnotations,
  },

  list_weight_records: {
    title: "List weight records",
    description:
      "Search saved animal weight records by animal or date range. Results include each recorded value, original unit, optional context, and are paginated (25 by default, up to 100).",
    inputSchema: z.object({
      animalId: z.string().uuid().optional(),
      from: z.iso.date().optional(),
      through: z.iso.date().optional(),
      ...mcpPageSchema,
    }),
    annotations: readToolAnnotations,
  },

  list_breeding_records: {
    title: "List breeding records",
    description:
      "Search breeding records by animal, pregnancy status, or expected calving date range. Results are paginated (25 by default, up to 100).",
    inputSchema: z.object({
      animalId: z.string().uuid().optional(),
      pregnancyStatus: z.enum(["unknown", "confirmed", "open"]).optional(),
      calvingFrom: z.iso.date().optional(),
      calvingThrough: z.iso.date().optional(),
      ...mcpPageSchema,
    }),
    annotations: readToolAnnotations,
  },

  list_medication_inventory: {
    title: "List medication inventory",
    description:
      "Search ranch medication inventory by name and optional expiration date. Each item includes its saved quantity, reorder threshold, low-stock indicator, and label withdrawal intervals.",
    inputSchema: z.object({
      query: z.string().trim().max(120).optional(),
      expiresBefore: z.iso.date().optional(),
      ...mcpPageSchema,
    }),
    annotations: readToolAnnotations,
  },

  draft_ranch_reminder: {
    title: "Draft a ranch reminder",
    description:
      "Draft a care reminder. This does not change ranch records until confirm_ranch_reminder is called with the returned draft ID.",
    inputSchema: z.object({
      title: z.string().min(1).max(160),
      dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      animalId: z.string().uuid().optional(),
      notes: z.string().max(2000).optional(),
      recurrenceDays: reminderRecurrenceSchema.optional(),
    }),
    annotations: draftToolAnnotations,
  },

  confirm_ranch_reminder: {
    title: "Confirm ranch reminder",
    description:
      "Apply a previously drafted reminder. Call only after the ranch owner has confirmed the exact action.",
    inputSchema: z.object({ draftId: z.string().uuid() }),
    annotations: confirmReminderAnnotations,
  },

  draft_animal_photo: {
    title: "Draft a photo for an existing animal",
    description:
      "Attach a photo to an EXISTING animal, without creating or editing the animal record. First use search_livestock to resolve the correct animalId; ask the user if matches are ambiguous. Use this tool only when the client supplies an OpenAI hosted attachment URL and file ID. If the attachment is a local path or the client cannot supply that hosted reference, use prepare_animal_photo_upload, upload the raw bytes with its returned PUT URL and headers, then call finish_animal_photo_upload. Show the returned animal identity, photo preview, caption and primary-photo choice, then ask for explicit approval before calling confirm_ranch_change. isPrimary defaults to false; set true only when the user wants this to become the profile photo. Drafts expire after 24 hours. Retry interrupted confirmation with the SAME draftId. Never create a duplicate animal to attach a photo.",
    inputSchema: z.object({
      animalId: z.string().uuid(),
      photo: mcpPhotoFileSchema,
      caption: z.string().trim().max(300).default(""),
      isPrimary: z.boolean().default(false),
    }),
    _meta: { "openai/fileParams": ["photo"] },
    annotations: draftToolAnnotations,
  },

  prepare_animal_photo_upload: {
    title: "Prepare an animal photo upload",
    description:
      "Use when the attached photo arrives as a local file path or the client cannot provide an OpenAI hosted attachment URL. The client must be able to read the file bytes and make an HTTP PUT request. First get the exact byte length, MIME type, and bytes from the attachment. This creates a photo draft and returns a private uploadUrl with required method and headers. Upload the raw file bytes exactly as instructed, then call finish_animal_photo_upload with the returned draftId. Never pass a local path to The Chute. Nothing is saved to the animal until the user approves the preview and confirm_ranch_change is called.",
    inputSchema: z.object({
      animalId: z.string().uuid(),
      ...photoUploadInputSchema.shape,
    }),
    annotations: draftToolAnnotations,
  },

  prepare_new_animal_photo_upload: {
    title: "Prepare a new animal photo upload",
    description:
      "Use when the attached photo arrives as a local file path or the client cannot provide an OpenAI hosted attachment URL. The client must be able to read the file bytes and make an HTTP PUT request. First get the exact byte length, MIME type, and bytes from the attachment. This creates an animal and photo draft and returns a private uploadUrl with required method and headers. Upload the raw file bytes exactly as instructed, then call finish_animal_photo_upload with the returned draftId. Never pass a local path to The Chute. No animal or photo is saved until the user approves the full preview and confirm_ranch_change is called.",
    inputSchema: z.object({
      record: animalRecordSchema,
      ...photoUploadInputSchema.shape,
      isPrimary: z.boolean().default(true),
    }),
    annotations: draftToolAnnotations,
  },

  finish_animal_photo_upload: {
    title: "Finish an animal photo upload",
    description:
      "Call after uploading the raw photo bytes to the private uploadUrl returned by prepare_animal_photo_upload or prepare_new_animal_photo_upload. This validates and processes the upload, then returns the photo preview. Show the exact animal and photo details and ask for explicit approval before calling confirm_ranch_change with the same draftId.",
    inputSchema: z.object({ draftId: z.string().uuid() }),
    annotations: draftToolAnnotations,
  },

  draft_animal_with_photo: {
    title: "Draft a new animal with a photo",
    description:
      "Use this tool only when the client supplies an OpenAI hosted attachment URL and file ID. If the attachment is a local path or the client cannot supply that hosted reference, use prepare_new_animal_photo_upload, upload the raw bytes with its returned PUT URL and headers, then call finish_animal_photo_upload. No animal is created yet. Show the exact returned animal details, photo preview, caption and primary-photo choice, then ask for explicit approval before calling confirm_ranch_change with this draftId. Do not infer animal facts from a photo. Drafts expire in 24 hours. Use review_animal_photo_draft to refresh the preview. On interrupted confirmation, retry the SAME draftId, never create a replacement animal draft.",
    inputSchema: z.object({
      record: animalRecordSchema,
      photo: mcpPhotoFileSchema,
      caption: z.string().trim().max(300).default(""),
      isPrimary: z.boolean().default(true),
    }),
    _meta: { "openai/fileParams": ["photo"] },
    annotations: draftToolAnnotations,
  },

  review_animal_photo_draft: {
    title: "Review animal and photo draft",
    description:
      "Read your animal photo draft and refresh its private photo preview before asking for explicit confirmation. Does not create or change an animal.",
    inputSchema: z.object({ draftId: z.string().uuid() }),
    annotations: readToolAnnotations,
  },

  draft_animal_change: {
    title: "Draft an animal change",
    description:
      "Draft adding or editing a cattle record, or archiving an animal. Archiving removes it from active herd lists while preserving its profile and linked history. Nothing changes until confirm_ranch_change is called after the ranch owner approves the exact preview.",
    inputSchema: z.object({
      operation: z.enum(["create", "update", "archive"]),
      animalId: z.string().uuid().optional(),
      record: animalRecordSchema.optional(),
    }),
    annotations: draftToolAnnotations,
  },

  draft_health_record: {
    title: "Draft a health record",
    description:
      "Draft a health event for an active ranch animal. Health records can be added through the web interface; they are never written until the owner confirms the exact draft with confirm_ranch_change.",
    inputSchema: healthRecordSchema,
    annotations: draftToolAnnotations,
  },

  draft_weight_record: {
    title: "Draft a weight record",
    description:
      "Prepare a dated weight record for one ranch animal, including its value, original unit, and optional context such as birth, weaning, processing, or sale. Nothing is saved until an authorized ranch member reviews the exact details and confirms with confirm_ranch_change.",
    inputSchema: weightRecordSchema,
    annotations: draftToolAnnotations,
  },

  draft_group_health_records: {
    title: "Draft health records for an animal group",
    description:
      "Prepare the same health event for every active cattle member of a saved group or an explicit list of animal IDs. The preview lists every animal that will be changed and any group members skipped. Nothing is saved until an authorized ranch member reviews and confirms the entire draft.",
    inputSchema: z
      .object({
        groupId: z.string().uuid().optional(),
        animalIds: z.array(z.string().uuid()).min(1).max(200).optional(),
        eventType: z.enum([
          "vaccination",
          "treatment",
          "observation",
          "vet_visit",
        ]),
        occurredOn: dateSchema,
        productName: optionalText(160),
        dosage: optionalText(160),
        administrationMethod: optionalText(120),
        veterinarian: optionalText(160),
        followUpOn: dateSchema.nullable().optional(),
        notes: optionalText(3000),
      })
      .strict()
      .refine(
        (value) => Boolean(value.groupId) !== Boolean(value.animalIds?.length),
        {
          message: "Choose either groupId or animalIds.",
        },
      )
      .refine(
        (value) => !value.followUpOn || value.followUpOn >= value.occurredOn,
        {
          message: "Follow-up date must be on or after the event date.",
          path: ["followUpOn"],
        },
      ),
    annotations: draftToolAnnotations,
  },

  draft_health_record_change: {
    title: "Draft a health record change",
    description:
      "Draft editing or permanently deleting an existing ranch health record. Updates replace the complete record. Nothing changes until the owner confirms the exact draft with confirm_ranch_change.",
    inputSchema: z.discriminatedUnion("operation", [
      z.object({
        operation: z.literal("update"),
        healthEventId: z.string().uuid(),
        record: healthRecordSchema,
      }),
      z.object({
        operation: z.literal("delete"),
        healthEventId: z.string().uuid(),
      }),
    ]),
    annotations: draftToolAnnotations,
  },

  draft_breeding_record: {
    title: "Draft a cattle breeding record",
    description:
      "Bull-exposure records require a sire. Before drafting, search_livestock and search_external_animals for the sire. Select the exact ranch bull or external profile. If neither search finds the bull, use sire.kind=create_external_animal to draft creation of a real external sire profile with the breeding record. The profile is rechecked for duplicates, shown in the preview, and created and linked only after confirmation. Never put the bull name in notes or use a free-text sire field. Breeding dates and calving windows use the same calculations as the web interface.",
    inputSchema: breedingRecordSchema,
    annotations: draftToolAnnotations,
  },

  draft_group_breeding_records: {
    title: "Draft breeding records for an animal group",
    description:
      "For bull exposure, a sire selection is required. First call search_livestock and search_external_animals. If no profile matches, pass sire.kind=create_external_animal with the bull profile details; this drafts an external profile and the group breeding records together. The profile is rechecked for duplicates, shown in the preview, and created and linked only after confirmation. Never put the bull name in notes or use a free-text sire field. This drafts one shared AI or bull-exposure record for every active female in the selected group or animal list, with calculated calving windows and an exact per-cow preview.",
    inputSchema: z
      .discriminatedUnion("method", [
        z
          .object({
            groupId: z.string().uuid().optional(),
            animalIds: z.array(z.string().uuid()).min(1).max(200).optional(),
            method: z.literal("ai"),
            breedingDate: dateSchema,
            sire: breedingSireSchema.optional(),
            pregnancyStatus: z
              .enum(["unknown", "confirmed", "open"])
              .default("unknown"),
            notes: optionalText(3000),
          })
          .strict(),
        z
          .object({
            groupId: z.string().uuid().optional(),
            animalIds: z.array(z.string().uuid()).min(1).max(200).optional(),
            method: z.literal("bull_exposure"),
            exposureStartDate: dateSchema,
            exposureEndDate: dateSchema,
            sire: breedingSireSchema,
            pregnancyStatus: z
              .enum(["unknown", "confirmed", "open"])
              .default("unknown"),
            notes: optionalText(3000),
          })
          .strict()
          .refine((value) => value.exposureStartDate <= value.exposureEndDate, {
            message: "Exposure end date must be on or after the start date.",
            path: ["exposureEndDate"],
          }),
      ])
      .superRefine((value, refinement) => {
        if (Boolean(value.groupId) === Boolean(value.animalIds?.length))
          refinement.addIssue({
            code: "custom",
            path: ["groupId"],
            message: "Choose either groupId or animalIds.",
          });
      }),
    annotations: draftToolAnnotations,
  },

  draft_breeding_record_change: {
    title: "Draft a breeding record change",
    description:
      "Draft editing or permanently deleting an existing cattle breeding record. Updates recalculate expected and normal calving windows. Nothing changes until the owner confirms the exact draft with confirm_ranch_change.",
    inputSchema: z.discriminatedUnion("operation", [
      z.object({
        operation: z.literal("update"),
        breedingRecordId: z.string().uuid(),
        record: breedingRecordSchema,
      }),
      z.object({
        operation: z.literal("delete"),
        breedingRecordId: z.string().uuid(),
      }),
    ]),
    annotations: draftToolAnnotations,
  },

  draft_expense_change: {
    title: "Draft an expense change",
    description:
      "Draft adding or editing an expense. Allocations can cover the whole ranch, selected active cattle, or every active animal in a saved group; animal allocations are split evenly with cent rounding. Confirm the exact animal-by-animal preview with confirm_ranch_change before anything is saved.",
    inputSchema: z.object({
      operation: z.enum(["create", "update"]),
      expenseId: z.string().uuid().optional(),
      record: expenseRecordSchema,
      allocation: allocationSchema.optional(),
    }),
    annotations: draftToolAnnotations,
  },

  draft_delete_ranch_expense: {
    title: "Draft deleting an expense",
    description:
      "Draft permanently deleting a ranch expense and its animal allocation rows. The expense remains until the owner confirms the exact draft with confirm_ranch_change.",
    inputSchema: z.object({ expenseId: z.string().uuid() }),
    annotations: draftToolAnnotations,
  },

  draft_ranch_reminder_change: {
    title: "Draft a reminder change",
    description:
      "Draft editing or permanently deleting an open reminder. An update replaces all reminder fields, including clearing an animal, note, or recurrence when set to null. Nothing changes until the owner confirms the exact draft with confirm_ranch_change.",
    inputSchema: z.discriminatedUnion("operation", [
      z.object({
        operation: z.literal("update"),
        reminderId: z.string().uuid(),
        record: reminderRecordSchema,
      }),
      z.object({
        operation: z.literal("delete"),
        reminderId: z.string().uuid(),
      }),
    ]),
    annotations: draftToolAnnotations,
  },

  draft_reminder_completion: {
    title: "Draft completing a reminder",
    description:
      "Draft completing an open reminder. If it repeats, the preview includes the next due date. Nothing changes until the owner confirms with confirm_ranch_change.",
    inputSchema: z.object({ reminderId: z.string().uuid() }),
    annotations: draftToolAnnotations,
  },

  confirm_ranch_change: {
    title: "Confirm a ranch change",
    description:
      "Apply a pending animal, health, breeding, weight, expense, or reminder draft. Call only after the ranch owner explicitly approves the exact action and values shown by the draft tool.",
    inputSchema: z.object({ draftId: z.string().uuid() }),
    annotations: confirmChangeAnnotations,
  },
} as const;
