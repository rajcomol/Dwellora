"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useRenovation } from "@/components/dashboard/RenovationProvider";
import { DocumentsListSkeleton, DocumentsPageSkeleton } from "@/components/ui/Skeleton";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders, supabase } from "@/lib/supabase/client";
import type { DocumentRecord } from "@/lib/documents/types";
import { formatDisplayDate } from "@/lib/format/dateDisplay";
import {
  documentCompareSelectionSchema,
  documentUploadRefinedSchema,
  summarizeDocumentIdSchema,
} from "@/lib/validation/schemas";

const DOCUMENTS_BUCKET = "documents";

type DocumentRow = {
  id: string;
  project_id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  ai_summary?: string | null;
};

function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    fileName: row.file_name,
    filePath: row.file_path,
    createdAt: row.created_at,
    aiSummary: row.ai_summary ?? null,
  };
}

export default function DocumentsPageClient() {
  const { t } = useI18n();
  const { projects, isRenovationDataReady } = useRenovation();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [summaryByDocumentId, setSummaryByDocumentId] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [summarizingDocumentId, setSummarizingDocumentId] = useState<string | null>(null);
  const [compareDocA, setCompareDocA] = useState("");
  const [compareDocB, setCompareDocB] = useState("");
  const [comparisonText, setComparisonText] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentsListLoading, setDocumentsListLoading] = useState(true);

  const projectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const project of projects) map.set(project.id, project.name);
    return map;
  }, [projects]);

  const accessibleProjectIds = useMemo(() => projects.map((p) => p.id), [projects]);

  useEffect(() => {
    if (projects.length === 0) {
      setSelectedProjectId("");
      return;
    }
    setSelectedProjectId((prev) => (prev && projectNameById.has(prev) ? prev : projects[0].id));
  }, [projects, projectNameById]);

  const documentsForSelectedProject = useMemo(
    () => documents.filter((d) => d.projectId === selectedProjectId),
    [documents, selectedProjectId]
  );

  useEffect(() => {
    setCompareDocA((prev) =>
      prev && documentsForSelectedProject.some((d) => d.id === prev) ? prev : ""
    );
    setCompareDocB((prev) =>
      prev && documentsForSelectedProject.some((d) => d.id === prev) ? prev : ""
    );
  }, [documentsForSelectedProject]);

  useEffect(() => {
    async function loadDocuments() {
      setDocumentsListLoading(true);
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session) {
          setDocuments([]);
          return;
        }

        if (accessibleProjectIds.length === 0) {
          setDocuments([]);
          return;
        }

        const res = await supabase
          .from("documents")
          .select("id,project_id,file_name,file_path,created_at,ai_summary")
          .in("project_id", accessibleProjectIds)
          .order("created_at", { ascending: false });

        if (res.error) {
          setError(t("documents.errorLoadList", { message: res.error.message }));
          return;
        }

        const mapped = (res.data ?? []).map((row) => mapDocument(row as DocumentRow));
        setDocuments(mapped);
        const summaries: Record<string, string> = {};
        for (const d of mapped) {
          if (d.aiSummary && d.aiSummary.trim()) summaries[d.id] = d.aiSummary;
        }
        setSummaryByDocumentId((prev) => ({ ...summaries, ...prev }));
      } finally {
        setDocumentsListLoading(false);
      }
    }

    void loadDocuments();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadDocuments();
    });

    return () => subscription.unsubscribe();
  }, [t, accessibleProjectIds]);

  async function uploadDocument() {
    const uploadParsed = documentUploadRefinedSchema.safeParse({
      projectId: selectedProjectId,
      file: file ?? undefined,
    });
    if (!uploadParsed.success) {
      const issue = uploadParsed.error.issues[0];
      const path = issue?.path[0];
      const msg = issue?.message;
      if (path === "projectId") {
        setError(t("documents.errorSelectProject"));
        return;
      }
      if (path === "file") {
        if (msg === "pdf_only") {
          setError(t("documents.errorPdfOnly"));
          return;
        }
        if (msg === "too_large") {
          setError(t("documents.errorFileTooLarge"));
          return;
        }
        setError(t("documents.errorSelectPdf"));
        return;
      }
      setError(t("documents.errorSelectPdf"));
      return;
    }

    const { projectId: uploadProjectId, file: uploadFile } = uploadParsed.data;

    setError(null);
    setUploading(true);

    try {
      const safeName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${uploadProjectId}/${Date.now()}-${safeName}`;

      const { data: authData, error: getUserError } = await supabase.auth.getUser();
      if (!authData.user) {
        console.error("Document upload blocked: not authenticated", getUserError);
        setError(t("documents.errorMustSignIn"));
        return;
      }

      const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, uploadFile, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) {
        console.error("Document storage upload failed:", uploadError);
        setError(uploadError.message);
        return;
      }

      const { data: insertedRows, error: dbError } = await supabase
        .from("documents")
        .insert({
          project_id: uploadProjectId,
          file_name: uploadFile.name,
          file_path: filePath,
        })
        .select("id,project_id,file_name,file_path,created_at,ai_summary");

      if (dbError) {
        console.error("Document metadata insert failed:", dbError);
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
        setError(dbError.message);
        return;
      }

      const insertData = insertedRows?.[0];
      if (!insertData) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
        setError(t("documents.errorMetadata"));
        return;
      }

      setDocuments((prev) => [mapDocument(insertData as DocumentRow), ...prev]);
      setFile(null);
      const input = document.getElementById("document-upload-input") as HTMLInputElement | null;
      if (input) input.value = "";
    } catch (e) {
      setError(e instanceof Error ? e.message : t("documents.errorUploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function summarizeDocument(documentId: string) {
    setError(null);
    const sumParsed = summarizeDocumentIdSchema.safeParse({ documentId });
    if (!sumParsed.success) {
      setError(t("documents.errorSummarizeFailed"));
      return;
    }
    setSummarizingDocumentId(sumParsed.data.documentId);

    try {
      const authHeaders = await getBearerAuthHeaders();
      const res = await fetch("/api/documents/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ documentId: sumParsed.data.documentId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || t("documents.errorSummarizeFailed"));
      }

      const data = (await res.json()) as { summary?: string };
      const summary = typeof data.summary === "string" ? data.summary.trim() : "";
      if (!summary) throw new Error(t("documents.errorNoSummary"));

      setSummaryByDocumentId((prev) => ({ ...prev, [sumParsed.data.documentId]: summary }));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("documents.errorSummarizeFailed"));
    } finally {
      setSummarizingDocumentId(null);
    }
  }

  async function runCompare() {
    const cmpParsed = documentCompareSelectionSchema.safeParse({
      documentIdA: compareDocA,
      documentIdB: compareDocB,
    });
    if (!cmpParsed.success) {
      const issue = cmpParsed.error.issues[0];
      if (issue?.message === "different") {
        setError(t("documents.errorSelectDifferent"));
        return;
      }
      setError(t("documents.errorSelectTwo"));
      return;
    }
    setError(null);
    setComparing(true);
    setComparisonText(null);

    try {
      const authHeaders = await getBearerAuthHeaders();
      const res = await fetch("/api/documents/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          documentIdA: cmpParsed.data.documentIdA,
          documentIdB: cmpParsed.data.documentIdB,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || t("documents.errorCompareFailed"));
      }

      const data = (await res.json()) as { comparison?: string };
      const comparison = typeof data.comparison === "string" ? data.comparison.trim() : "";
      if (!comparison) throw new Error(t("documents.errorNoComparison"));

      setComparisonText(comparison);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("documents.errorCompareFailed"));
    } finally {
      setComparing(false);
    }
  }

  if (!isRenovationDataReady) {
    return <DocumentsPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Tour-target alleen op de kop — volledige kolom als target breekt joyride bij lange inhoud. */}
      <div data-tour="quotes-hub">
        <h1 className="text-2xl font-semibold">{t("documents.title")}</h1>
        <p className="mt-1 text-sm text-renovation-concrete">{t("documents.subtitle")}</p>
      </div>

      <Card>
        <h2 className="text-base font-semibold">{t("documents.uploadTitle")}</h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void uploadDocument();
          }}
        >
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
          >
            {projects.length === 0 ? (
              <option value="">{t("documents.noProjectsOption")}</option>
            ) : (
              projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))
            )}
          </select>

          <div className="flex flex-wrap items-center gap-3">
            <input
              id="file-upload"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-renovation-border bg-renovation-surface px-4 py-2 text-sm text-foreground transition-colors hover:bg-renovation-muted"
            >
              Bestand kiezen
            </label>
            <span className="text-sm text-renovation-concrete">
              {file ? file.name : "Geen bestand gekozen"}
            </span>
          </div>

          <Button type="submit" disabled={uploading || projects.length === 0}>
            {uploading ? t("documents.uploading") : t("documents.uploadPdf")}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">{t("documents.compareTitle")}</h2>
        <p className="mt-1 text-xs text-renovation-concrete">{t("documents.compareHint")}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row">
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-renovation-concrete">
                {t("documents.documentA")}
              </label>
              <select
                value={compareDocA}
                onChange={(e) => setCompareDocA(e.target.value)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
              >
                <option value="">{t("documents.selectPlaceholder")}</option>
                {documentsForSelectedProject.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === compareDocB}>
                    {d.fileName}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-renovation-concrete">
                {t("documents.documentB")}
              </label>
              <select
                value={compareDocB}
                onChange={(e) => setCompareDocB(e.target.value)}
                className="w-full rounded-md border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm outline-none focus:border-renovation-steel dark:border-renovation-border dark:bg-renovation-elevated"
              >
                <option value="">{t("documents.selectPlaceholder")}</option>
                {documentsForSelectedProject.map((d) => (
                  <option key={d.id} value={d.id} disabled={d.id === compareDocA}>
                    {d.fileName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => void runCompare()}
            disabled={
              comparing ||
              documentsForSelectedProject.length < 2 ||
              !compareDocA ||
              !compareDocB ||
              compareDocA === compareDocB
            }
          >
            {comparing ? t("documents.comparing") : t("documents.compare")}
          </Button>
        </div>

        {comparisonText ? (
          <div className="mt-4 rounded-md border border-renovation-border bg-renovation-surface p-3 text-sm whitespace-pre-wrap dark:border-renovation-border dark:bg-renovation-muted/40">
            {comparisonText}
          </div>
        ) : null}
      </Card>

      <section className="space-y-3" aria-busy={documentsListLoading}>
        <h2 className="text-base font-semibold">{t("documents.uploadedTitle")}</h2>
        {documentsListLoading ? (
          <DocumentsListSkeleton />
        ) : documents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-renovation-border bg-renovation-elevated p-6 text-sm text-renovation-concrete dark:border-renovation-border dark:bg-renovation-elevated">
            {t("documents.uploadedEmpty")}
          </div>
        ) : (
          <div className="space-y-3">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm font-semibold">{doc.fileName}</div>
                    <div className="mt-1 text-xs text-renovation-concrete">
                      {t("documents.projectLabel")}: {projectNameById.get(doc.projectId) ?? doc.projectId}
                    </div>
                    <div className="mt-1 text-xs text-renovation-concrete">
                      {t("documents.uploadedAt")}: {formatDisplayDate(doc.createdAt)}
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={() => void summarizeDocument(doc.id)}
                    disabled={summarizingDocumentId === doc.id}
                  >
                    {summarizingDocumentId === doc.id ? t("documents.summarizing") : t("documents.summarize")}
                  </Button>
                </div>

                {summaryByDocumentId[doc.id] ? (
                  <div className="mt-4 rounded-md border border-renovation-border bg-renovation-surface p-3 text-sm whitespace-pre-wrap dark:border-renovation-border dark:bg-renovation-muted/40">
                    {summaryByDocumentId[doc.id]}
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>

      {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}
    </div>
  );
}
