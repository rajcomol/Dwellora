"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/** Server-side list of financial documents for a project (respects RLS via user session). */
export async function listExpenseDocumentsForProject(projectId: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("expense_documents")
    .select(
      "id,expense_id,project_id,document_type,file_name,file_path,mime_type,file_size_bytes,uploaded_at,extracted_metadata"
    )
    .eq("project_id", projectId)
    .order("uploaded_at", { ascending: false });

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, data };
}
