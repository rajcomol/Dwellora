import { z } from "zod";
import { CHAT_MESSAGE_MAX_CHARS, MAX_PDF_UPLOAD_BYTES, PASSWORD_MIN_LENGTH } from "@/lib/validation/constants";
import { RENOVATION_PHASE_ORDER } from "@/lib/renovation/phases";

const renovationPhaseSchema = z.enum(RENOVATION_PHASE_ORDER);
const taskStatusSchema = z.enum(["todo", "doing", "done"]);
const taskPrioritySchema = z.enum(["low", "medium", "high"]);

/** Shared by POST /api/chat and client fetch body. */
export const chatPostBodySchema = z
  .object({
    message: z.unknown(),
    projectId: z.unknown().optional(),
    threadId: z.unknown().optional(),
  })
  .transform((raw) => ({
    message: typeof raw.message === "string" ? raw.message.trim() : "",
    projectId:
      typeof raw.projectId === "string" && raw.projectId.trim() ? raw.projectId.trim() : null,
    threadId:
      typeof raw.threadId === "string" && raw.threadId.trim() ? raw.threadId.trim() : null,
  }))
  .superRefine((data, ctx) => {
    if (!data.message) {
      ctx.addIssue({ code: "custom", message: "Message is required.", path: ["message"] });
    } else if (data.message.length > CHAT_MESSAGE_MAX_CHARS) {
      ctx.addIssue({
        code: "custom",
        message: `Message is too long (max ${CHAT_MESSAGE_MAX_CHARS} characters).`,
        path: ["message"],
      });
    }
    if (data.projectId !== null && !z.string().uuid().safeParse(data.projectId).success) {
      ctx.addIssue({ code: "custom", message: "Invalid projectId.", path: ["projectId"] });
    }
    if (data.threadId !== null && !z.string().uuid().safeParse(data.threadId).success) {
      ctx.addIssue({ code: "custom", message: "Invalid threadId.", path: ["threadId"] });
    }
  });

export const documentsCompareBodySchema = z
  .object({
    documentIdA: z.unknown(),
    documentIdB: z.unknown(),
  })
  .transform((raw) => ({
    documentIdA: typeof raw.documentIdA === "string" ? raw.documentIdA.trim() : "",
    documentIdB: typeof raw.documentIdB === "string" ? raw.documentIdB.trim() : "",
  }))
  .superRefine((data, ctx) => {
    if (!data.documentIdA || !data.documentIdB) {
      ctx.addIssue({ code: "custom", message: "documentIdA and documentIdB are required.", path: ["documentIdA"] });
      return;
    }
    const aOk = z.string().uuid().safeParse(data.documentIdA).success;
    const bOk = z.string().uuid().safeParse(data.documentIdB).success;
    if (!aOk || !bOk) {
      ctx.addIssue({ code: "custom", message: "Invalid document id.", path: !aOk ? ["documentIdA"] : ["documentIdB"] });
      return;
    }
    if (data.documentIdA === data.documentIdB) {
      ctx.addIssue({ code: "custom", message: "Select two different documents.", path: ["documentIdB"] });
    }
  });

export const documentsSummarizeBodySchema = z
  .object({
    documentId: z.unknown(),
  })
  .transform((raw) => ({
    documentId: typeof raw.documentId === "string" ? raw.documentId.trim() : "",
  }))
  .superRefine((data, ctx) => {
    if (!data.documentId) {
      ctx.addIssue({ code: "custom", message: "documentId is required.", path: ["documentId"] });
    } else if (!z.string().uuid().safeParse(data.documentId).success) {
      ctx.addIssue({ code: "custom", message: "Invalid documentId.", path: ["documentId"] });
    }
  });

export const loginCredentialsSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(PASSWORD_MIN_LENGTH),
});

export const signUpFormSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(PASSWORD_MIN_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "mismatch",
  });

export const forgotEmailSchema = z.object({
  email: z.string().trim().email(),
});

export const updatePasswordFormSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "mismatch",
  });

const budgetFromString = z
  .string()
  .transform((s) => {
    const t = s.trim();
    if (t === "") return null;
    const n = Number.parseFloat(t);
    return Number.isFinite(n) ? n : NaN;
  })
  .pipe(z.union([z.null(), z.number().finite().min(0)]));

export const projectCreateFormSchema = z.object({
  name: z.string().trim().min(1),
  ownContribution: budgetFromString,
  constructionDepotTotal: budgetFromString,
  address: z.string(),
  expectedKeyHandover: z.string(),
  notes: z.string(),
});

export const projectUpdateFormSchema = z.object({
  name: z.string().trim().min(1),
  ownContribution: budgetFromString,
  constructionDepotTotal: budgetFromString,
  address: z.string(),
  expectedKeyHandover: z.string(),
  notes: z.string(),
});

export const expenseLineFormSchema = z.object({
  title: z.string().trim().min(1),
  amount: z
    .string()
    .transform((s) => (s.trim() === "" ? 0 : Number.parseFloat(s)))
    .pipe(z.number().finite().min(0)),
  spentOn: z.string(),
  notes: z.string(),
  taskId: z.union([z.literal(""), z.string().uuid()]),
});

export const taskFormFieldsSchema = z.object({
  title: z.string().trim().min(1),
  roomIds: z.array(z.string().uuid()),
  durationDays: z
    .string()
    .transform((s) => (s.trim() === "" ? 0 : Number.parseInt(s, 10)))
    .pipe(z.number().int().min(0)),
  description: z.string(),
  startDate: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  renovationPhase: renovationPhaseSchema,
  assignedRosterId: z.string(),
});

export const checklistItemTitleSchema = z.object({
  title: z.string().trim().min(1),
});

const optionalEmail = z.union([z.literal(""), z.string().trim().email()]);

export const rosterEntryFormSchema = z.object({
  displayName: z.string().trim().min(1),
  email: optionalEmail,
  roleHint: z.string(),
});

export const roomNameFormSchema = z.object({
  name: z.string().trim().min(1),
});

export const chatComposerMessageSchema = z
  .string()
  .trim()
  .min(1)
  .max(CHAT_MESSAGE_MAX_CHARS);

export const documentUploadFormSchema = z.object({
  projectId: z.string().trim().uuid(),
  file: z.custom<File>((v) => v instanceof File && v.size > 0),
});

export const documentUploadRefinedSchema = documentUploadFormSchema.superRefine((data, ctx) => {
  if (data.file.type !== "application/pdf") {
    ctx.addIssue({ code: "custom", message: "pdf_only", path: ["file"] });
  }
  if (data.file.size > MAX_PDF_UPLOAD_BYTES) {
    ctx.addIssue({ code: "custom", message: "too_large", path: ["file"] });
  }
});

export const documentCompareSelectionSchema = z
  .object({
    documentIdA: z.string().trim().uuid(),
    documentIdB: z.string().trim().uuid(),
  })
  .refine((d) => d.documentIdA !== d.documentIdB, {
    path: ["documentIdB"],
    message: "different",
  });

export const summarizeDocumentIdSchema = z.object({
  documentId: z.string().trim().uuid(),
});

export const projectInviteEmailBodySchema = z.object({
  email: z.string().trim().email().max(320).transform((s) => s.toLowerCase()),
});

export const acceptProjectInviteBodySchema = z.object({
  token: z.string().trim().min(32).max(512),
});
