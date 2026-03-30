/** Server and client cap on a single chat message (limits accidental huge pastes / API input size). */
export const CHAT_MESSAGE_MAX_CHARS = 8000;

/** Aligned with common Supabase email/password defaults. */
export const PASSWORD_MIN_LENGTH = 6;

export const MAX_PDF_UPLOAD_BYTES = 25 * 1024 * 1024;
