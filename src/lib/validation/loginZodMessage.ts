import type { ZodError } from "zod";
import { PASSWORD_MIN_LENGTH } from "@/lib/validation/constants";
import type { TranslateFn } from "@/i18n/create-translator";

export function loginCredentialsZodMessage(t: TranslateFn, err: ZodError): string {
  const issue = err.issues[0];
  const path = issue?.path[0];
  if (path === "password" && issue?.code === "too_small") {
    return t("login.errorPasswordMin", { min: String(PASSWORD_MIN_LENGTH) });
  }
  if (path === "email") {
    return t("login.forgotEmailRequired");
  }
  return t("validation.generic");
}

export function signUpFormZodMessage(t: TranslateFn, err: ZodError): string {
  const issue = err.issues[0];
  const path = issue?.path[0];
  if (path === "confirmPassword") {
    return t("login.signUpPasswordMismatch");
  }
  if (path === "password" && issue?.code === "too_small") {
    return t("login.errorPasswordMin", { min: String(PASSWORD_MIN_LENGTH) });
  }
  if (path === "email") {
    return t("login.forgotEmailRequired");
  }
  return t("validation.generic");
}
