"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders } from "@/lib/supabase/client";
import { loadPlanners, savePlanner } from "@/lib/planner/storage";
import {
  emptyVisualisatieData,
  normalizeVisualisatieData,
  type RenderVersion,
  type VisualisatieData,
} from "@/lib/planner/types";

type UploadedImage = { name: string; dataUrl: string };

type ReferencePhoto = {
  id: string;
  image: UploadedImage;
  notitie: string;
};

const canvasShellClass =
  "flex min-h-[55vh] flex-col overflow-hidden rounded-xl border border-renovation-border bg-renovation-surface shadow-renovation-card lg:min-h-[calc(100vh-14rem)]";

const fieldClass =
  "w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated";

const dropZoneBaseClass =
  "block cursor-pointer rounded-xl border-2 border-dashed border-renovation-border p-4 text-center text-sm text-renovation-concrete transition-colors hover:border-renovation-accent hover:text-foreground";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function downloadImage(url: string, fileName: string): Promise<void> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function versionLabel(index: number): string {
  return `v${index + 1}`;
}

type PlannerQuotaState = {
  used: number;
  limit: number;
  remaining: number;
};

type PlannerApiErrorBody = {
  error?: string;
  used?: number;
  limit?: number;
};

function plannerApiErrorMessage(
  json: PlannerApiErrorBody,
  fallback: string,
  dailyLimitMessage: string
): string {
  if (json.error === "daily_limit_reached") {
    return dailyLimitMessage;
  }
  return json.error ?? fallback;
}

export default function PlannerPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();

  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [naam, setNaam] = useState("Nieuwe kamer");
  const [beschrijving, setBeschrijving] = useState("");

  const [basisFoto, setBasisFoto] = useState<UploadedImage | null>(null);
  const [referenties, setReferenties] = useState<ReferencePhoto[]>([]);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  const [versions, setVersions] = useState<RenderVersion[]>([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  const [renderFolder, setRenderFolder] = useState<string | null>(null);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

  const [refineInstruction, setRefineInstruction] = useState("");
  const [generating, setGenerating] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [quota, setQuota] = useState<PlannerQuotaState | null>(null);

  const hasResult = versions.length > 0;
  const step1Locked = hasResult;
  const quotaExhausted = quota !== null && quota.remaining <= 0;

  const fetchQuota = useCallback(async () => {
    if (!selectedProjectId) return;
    try {
      const headers = await getBearerAuthHeaders();
      const res = await fetch("/api/planner/quota", { headers, cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as PlannerQuotaState;
      if (
        typeof data.used === "number" &&
        typeof data.limit === "number" &&
        typeof data.remaining === "number"
      ) {
        setQuota(data);
      }
    } catch {
      /* quota is optional UX; fail silently */
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadPlanners(selectedProjectId);
        if (cancelled || rows.length === 0) return;
        const latest = rows[0];
        const data = normalizeVisualisatieData({
          ...emptyVisualisatieData(),
          ...(latest.kamer_data as VisualisatieData),
        });
        setPlannerId(latest.id);
        setNaam(latest.naam);
        setBeschrijving(data.beschrijving);
        setVersions(data.versions);
        setActiveVersionIndex(data.activeVersionIndex);
        setRenderFolder(data.renderFolder ?? null);
      } catch {
        /* tabel kan ontbreken vóór migratie; stil falen */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  useEffect(() => {
    if (!selectedProjectId) {
      setQuota(null);
      return;
    }
    void fetchQuota();
  }, [selectedProjectId, fetchQuota]);

  useEffect(() => {
    if (versions.length === 0) {
      setActiveVersionIndex(0);
      return;
    }
    setActiveVersionIndex((index) => Math.min(index, versions.length - 1));
  }, [versions]);

  const onSingleUpload = useCallback(
    async (file: File | undefined, setter: React.Dispatch<React.SetStateAction<UploadedImage | null>>) => {
      if (!file) return;
      setter({ name: file.name, dataUrl: await fileToDataUrl(file) });
      setError(null);
    },
    []
  );

  const handleStartOver = useCallback(() => {
    setVersions([]);
    setActiveVersionIndex(0);
    setRenderFolder(null);
    setRefineInstruction("");
    setRefineError(null);
    setError(null);
    setBeschrijving("");
    setBasisFoto(null);
    setReferenties([]);
  }, []);

  const addReferencePhoto = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    setReferenties((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        image: { name: file.name, dataUrl },
        notitie: "",
      },
    ]);
    setError(null);
  }, []);

  const updateReferenceNote = useCallback((id: string, notitie: string) => {
    setReferenties((prev) => prev.map((ref) => (ref.id === id ? { ...ref, notitie } : ref)));
  }, []);

  const removeReferencePhoto = useCallback((id: string) => {
    setReferenties((prev) => prev.filter((ref) => ref.id !== id));
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!basisFoto) {
      setError(t("planner.visual.basisRequired"));
      return;
    }

    setGenerating(true);
    setError(null);
    setRefineError(null);
    try {
      const headers = await getBearerAuthHeaders();
      const res = await fetch("/api/planner/visualiseer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          basisfoto: basisFoto.dataUrl,
          referenties: referenties.map((ref) => ({
            foto: ref.image.dataUrl,
            notitie: ref.notitie.trim() || undefined,
          })),
          beschrijving: beschrijving.trim() || undefined,
        }),
      });
      const json = (await res.json()) as PlannerApiErrorBody & { url?: string; folder?: string };
      if (!res.ok) {
        throw new Error(
          plannerApiErrorMessage(json, t("planner.visual.error"), t("planner.visual.dailyLimitReached"))
        );
      }
      if (!json.url || !json.folder) throw new Error(t("planner.visual.error"));

      setRenderFolder(json.folder);
      setVersions([{ url: json.url, label: versionLabel(0), instruction: null }]);
      setActiveVersionIndex(0);
      setRefineInstruction("");
      await fetchQuota();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("planner.visual.error"));
    } finally {
      setGenerating(false);
    }
  }, [basisFoto, referenties, beschrijving, t, fetchQuota]);

  const handleRefine = useCallback(async () => {
    const instruction = refineInstruction.trim();
    if (!instruction) {
      setRefineError(t("planner.visual.refineRequired"));
      return;
    }
    const activeVersion = versions[activeVersionIndex];
    if (!activeVersion || !renderFolder) return;

    setRefining(true);
    setRefineError(null);
    try {
      const headers = await getBearerAuthHeaders();
      const nextVersion = versions.length + 1;
      const res = await fetch("/api/planner/visualiseer/verfijn", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          basis_foto: activeVersion.url,
          instructie: instruction,
          folder: renderFolder,
          version: nextVersion,
        }),
      });
      const json = (await res.json()) as PlannerApiErrorBody & { url?: string };
      if (!res.ok) {
        throw new Error(
          plannerApiErrorMessage(json, t("planner.visual.refineError"), t("planner.visual.dailyLimitReached"))
        );
      }
      if (!json.url) throw new Error(t("planner.visual.refineError"));

      setVersions((prev) => [
        ...prev,
        { url: json.url!, label: versionLabel(prev.length), instruction },
      ]);
      setActiveVersionIndex(versions.length);
      setRefineInstruction("");
      await fetchQuota();
    } catch (e) {
      setRefineError(e instanceof Error ? e.message : t("planner.visual.refineError"));
    } finally {
      setRefining(false);
    }
  }, [refineInstruction, versions, activeVersionIndex, renderFolder, t, fetchQuota]);

  const handleSave = useCallback(async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const kamerData: VisualisatieData = {
        beschrijving: beschrijving.trim(),
        referentieNotities: referenties.map((ref) => ({
          name: ref.image.name,
          notitie: ref.notitie.trim(),
        })),
        versions,
        activeVersionIndex,
        renderFolder,
      };
      const row = await savePlanner({
        id: plannerId,
        projectId: selectedProjectId,
        naam: naam.trim() || "Nieuwe kamer",
        kamerData,
      });
      setPlannerId(row.id);
      setSaveMsg(t("planner.saved"));
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : t("planner.visual.error"));
    } finally {
      setSaving(false);
    }
  }, [selectedProjectId, plannerId, naam, beschrijving, referenties, versions, activeVersionIndex, renderFolder, t]);

  if (!selectedProjectId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("planner.title")}</h1>
        <p className="text-sm text-renovation-concrete">{t("planner.chooseProject")}</p>
      </div>
    );
  }

  const activeVersion = versions[activeVersionIndex] ?? null;
  const fullscreenVersion = fullscreenIndex !== null ? versions[fullscreenIndex] ?? null : null;

  return (
    <div className="space-y-6" data-testid="planner-page">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("planner.title")}</h1>
          <p className="mt-1 text-sm leading-relaxed text-renovation-concrete">
            {selectedProject ? t("planner.subtitleProject", { name: selectedProject.name }) : t("planner.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={t("planner.namePlaceholder")}
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder={t("planner.namePlaceholder")}
            className={`${fieldClass} sm:w-48`}
          />
          <Button type="button" onClick={handleSave} disabled={saving} data-testid="planner-save">
            {saving ? t("planner.saving") : t("planner.save")}
          </Button>
        </div>
      </div>

      {saveMsg ? <p className="text-sm text-renovation-steel">{saveMsg}</p> : null}

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Linkerkolom: stap 1 — eerste generatie */}
        <div className="lg:w-[45%]">
          <div className="space-y-4 rounded-xl border border-renovation-border bg-renovation-elevated p-4 shadow-renovation-card dark:border-renovation-border dark:bg-renovation-elevated">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-foreground" data-testid="planner-step1-title">
                {t("planner.visual.step1Title")}
              </p>
              {step1Locked ? (
                <button
                  type="button"
                  onClick={handleStartOver}
                  className="shrink-0 text-xs font-medium text-renovation-accent hover:underline"
                  data-testid="planner-start-over"
                >
                  {t("planner.visual.startOver")}
                </button>
              ) : null}
            </div>

            {step1Locked ? (
              <p className="text-xs text-renovation-concrete" data-testid="planner-step1-complete">
                {t("planner.visual.step1Complete")}
              </p>
            ) : null}

            <div className={step1Locked ? "pointer-events-none space-y-5 opacity-60" : "space-y-5"}>
              <section>
                <UploadZone
                  testid="upload-basis"
                  label={t("planner.visual.basis.label")}
                  hint={t("planner.visual.basis.hint")}
                  badge={t("planner.visual.required")}
                  cta={t("planner.visual.uploadCta")}
                  image={basisFoto}
                  icon={<CameraIcon />}
                  onUpload={(file) => onSingleUpload(file, setBasisFoto)}
                  onRemove={() => setBasisFoto(null)}
                  removeLabel={t("planner.visual.removeImage")}
                />
              </section>

              <section className="space-y-3" data-testid="reference-photos-section">
                <div>
                  <p className="text-xs font-semibold text-foreground">{t("planner.visual.references.label")}</p>
                  <p className="text-[11px] text-renovation-concrete">{t("planner.visual.references.hint")}</p>
                  <span className="mt-1 inline-block rounded-full bg-renovation-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-renovation-concrete">
                    {t("planner.visual.optional")}
                  </span>
                </div>

                {referenties.map((ref) => (
                  <ReferencePhotoRow
                    key={ref.id}
                    reference={ref}
                    noteLabel={t("planner.visual.references.noteLabel")}
                    notePlaceholder={t("planner.visual.references.notePlaceholder")}
                    removeLabel={t("planner.visual.removeImage")}
                    onNoteChange={(notitie) => updateReferenceNote(ref.id, notitie)}
                    onRemove={() => removeReferencePhoto(ref.id)}
                  />
                ))}

                <input
                  ref={referenceInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  data-testid="reference-file-input"
                  onChange={(e) => {
                    void addReferencePhoto(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => referenceInputRef.current?.click()}
                  className="w-full rounded-lg border border-dashed border-renovation-border bg-renovation-surface px-3 py-2 text-sm font-medium text-renovation-accent transition-colors hover:border-renovation-accent hover:bg-renovation-accent/5"
                  data-testid="add-reference-photo"
                >
                  {t("planner.visual.references.addPhoto")}
                </button>
              </section>

              <section>
                <label htmlFor="planner-beschrijving" className="mb-1 block text-xs font-medium text-renovation-concrete">
                  {t("planner.visual.changeLabel")}
                </label>
                <textarea
                  id="planner-beschrijving"
                  value={beschrijving}
                  onChange={(e) => setBeschrijving(e.target.value)}
                  placeholder={t("planner.visual.changePlaceholder")}
                  rows={3}
                  className={`${fieldClass} resize-y`}
                  data-testid="planner-beschrijving"
                  disabled={step1Locked}
                  readOnly={step1Locked}
                />
              </section>

              <section className="space-y-2">
                {!quotaExhausted ? (
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={generating || step1Locked}
                    className="w-full bg-renovation-accent text-renovation-accent-foreground hover:bg-renovation-steel"
                    data-testid="planner-generate"
                  >
                    {generating ? t("planner.visual.generating") : t("planner.visual.generate")}
                  </Button>
                ) : null}
                {quota && quota.remaining > 0 ? (
                  <p className="text-xs text-renovation-concrete" data-testid="planner-quota">
                    {t("planner.visual.quotaRemaining", {
                      remaining: quota.remaining,
                      limit: quota.limit,
                    })}
                  </p>
                ) : null}
                {quotaExhausted ? (
                  <p className="text-sm text-renovation-concrete" data-testid="planner-daily-limit-message">
                    {t("planner.visual.quotaExhausted", { limit: quota?.limit ?? 5 })}
                  </p>
                ) : null}
                {error ? (
                  <p className="text-sm text-renovation-steel" data-testid="planner-error">
                    {error}
                  </p>
                ) : null}
              </section>
            </div>
          </div>
        </div>

        {/* Rechterkolom: stap 2 — resultaat en bijsturen */}
        <div className="lg:w-[55%]">
          <div className={canvasShellClass} data-testid="render-gallery">
            <div className="border-b border-renovation-border px-4 py-3">
              <h2 className="text-sm font-semibold text-foreground" data-testid="render-canvas-heading">
                {t("planner.visual.resultHeading")}
              </h2>
              {hasResult ? (
                <p className="mt-0.5 text-xs text-renovation-concrete" data-testid="planner-step2-title">
                  {t("planner.visual.step2Title")}
                </p>
              ) : null}
            </div>

            {generating && !hasResult ? (
              <GeneratingState title={t("planner.visual.generating")} hint={t("planner.visual.generatingHint")} />
            ) : hasResult && activeVersion ? (
              <ResultGallery
                versions={versions}
                activeIndex={activeVersionIndex}
                naam={naam}
                downloadLabel={t("planner.visual.download")}
                refineTitle={t("planner.visual.refineTitle")}
                refinePlaceholder={t("planner.visual.refinePlaceholder")}
                refineSubmitLabel={refining ? t("planner.visual.refining") : t("planner.visual.refineSubmit")}
                refineInstruction={refineInstruction}
                refining={refining}
                refineError={refineError}
                quotaExhausted={quotaExhausted}
                quotaExhaustedMessage={
                  quotaExhausted
                    ? t("planner.visual.quotaExhausted", { limit: quota?.limit ?? 5 })
                    : null
                }
                onRefineInstructionChange={setRefineInstruction}
                onRefine={handleRefine}
                onSelectVersion={setActiveVersionIndex}
                onOpenFullscreen={setFullscreenIndex}
              />
            ) : (
              <EmptyCanvasState message={t("planner.visual.viewerEmpty")} />
            )}
          </div>
        </div>
      </div>

      {fullscreenVersion ? (
        <div
          className="fixed inset-0 z-[10050] flex flex-col bg-renovation-surface/95 backdrop-blur-sm dark:bg-renovation-elevated/95"
          role="dialog"
          aria-modal="true"
          data-testid="render-fullscreen"
        >
          <div className="flex items-center justify-end gap-2 border-b border-renovation-border p-3">
            <button
              type="button"
              onClick={() => downloadImage(fullscreenVersion.url, `${naam || "render"}-${fullscreenVersion.label}.png`)}
              className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-2 text-sm font-medium text-foreground hover:bg-renovation-muted"
            >
              {t("planner.visual.download")}
            </button>
            <button
              type="button"
              onClick={() => setFullscreenIndex(null)}
              className="rounded-lg border border-renovation-border bg-renovation-elevated px-4 py-2 text-sm font-medium text-foreground hover:bg-renovation-muted"
            >
              {t("planner.visual.close")}
            </button>
          </div>
          <div className="relative flex-1 bg-renovation-muted/30">
            <Image
              src={fullscreenVersion.url}
              alt={fullscreenVersion.label}
              fill
              unoptimized
              className="object-contain"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function GeneratingState({ title, hint }: { title: string; hint: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 bg-renovation-muted/20 px-8 py-12 text-center"
      data-testid="generating-state"
    >
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-renovation-border border-t-renovation-accent" />
      <div className="space-y-1">
        <p className="animate-pulse text-base font-medium text-foreground">{title}</p>
        <p className="text-sm text-renovation-concrete">{hint}</p>
      </div>
    </div>
  );
}

function EmptyCanvasState({ message }: { message: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center"
      data-testid="render-empty-state"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-renovation-border bg-renovation-elevated text-renovation-accent shadow-renovation-card">
        <SceneIcon />
      </div>
      <p className="max-w-sm text-sm leading-relaxed text-renovation-concrete">{message}</p>
    </div>
  );
}

type ResultGalleryProps = {
  versions: RenderVersion[];
  activeIndex: number;
  naam: string;
  downloadLabel: string;
  refineTitle: string;
  refinePlaceholder: string;
  refineSubmitLabel: string;
  refineInstruction: string;
  refining: boolean;
  refineError: string | null;
  quotaExhausted: boolean;
  quotaExhaustedMessage: string | null;
  onRefineInstructionChange: (value: string) => void;
  onRefine: () => void;
  onSelectVersion: (index: number) => void;
  onOpenFullscreen: (index: number) => void;
};

function ResultGallery({
  versions,
  activeIndex,
  naam,
  downloadLabel,
  refineTitle,
  refinePlaceholder,
  refineSubmitLabel,
  refineInstruction,
  refining,
  refineError,
  quotaExhausted,
  quotaExhaustedMessage,
  onRefineInstructionChange,
  onRefine,
  onSelectVersion,
  onOpenFullscreen,
}: ResultGalleryProps) {
  const active = versions[activeIndex];
  if (!active) return null;

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg border border-renovation-border bg-renovation-muted/30">
        {refining ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-renovation-surface/60 backdrop-blur-[1px]">
            <span className="h-10 w-10 animate-spin rounded-full border-4 border-renovation-border border-t-renovation-accent" />
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => onOpenFullscreen(activeIndex)}
          className="absolute inset-0 flex items-center justify-center"
          aria-label={active.label}
        >
          <Image
            src={active.url}
            alt={active.label}
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 40vw"
            className="object-contain"
            data-testid="render-main"
          />
        </button>
        <button
          type="button"
          onClick={() => downloadImage(active.url, `${naam || "render"}-${active.label}.png`)}
          data-testid="render-download"
          className="absolute right-2 top-2 rounded-lg border border-renovation-border bg-renovation-elevated/90 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur hover:bg-renovation-muted"
        >
          {downloadLabel}
        </button>
      </div>

      {versions.length > 1 ? (
        <div className="flex flex-wrap gap-2" data-testid="version-history">
          {versions.map((version, index) => (
            <VersionThumbnail
              key={`${version.label}-${index}`}
              version={version}
              selected={index === activeIndex}
              onSelect={() => onSelectVersion(index)}
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2" data-testid="version-history">
          <VersionThumbnail version={active} selected onSelect={() => undefined} />
        </div>
      )}

      <div
        className="rounded-xl border-2 border-renovation-accent bg-renovation-accent/5 p-4 shadow-renovation-card"
        data-testid="refine-panel"
      >
        <p className="mb-3 text-sm font-semibold text-foreground">{refineTitle}</p>
        {quotaExhausted && quotaExhaustedMessage ? (
          <p className="mb-3 text-sm text-renovation-concrete" data-testid="planner-daily-limit-message-refine">
            {quotaExhaustedMessage}
          </p>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={refineInstruction}
            onChange={(e) => onRefineInstructionChange(e.target.value)}
            placeholder={refinePlaceholder}
            className={`${fieldClass} flex-1`}
            data-testid="refine-input"
            disabled={refining || quotaExhausted}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onRefine();
              }
            }}
          />
          <Button
            type="button"
            onClick={onRefine}
            disabled={refining || quotaExhausted}
            className="shrink-0 bg-renovation-accent text-renovation-accent-foreground hover:bg-renovation-steel"
            data-testid="refine-submit"
          >
            {refineSubmitLabel}
          </Button>
        </div>
        {refineError ? (
          <p className="mt-2 text-sm text-renovation-steel" data-testid="refine-error">
            {refineError}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type VersionThumbnailProps = {
  version: RenderVersion;
  selected: boolean;
  onSelect: () => void;
};

function VersionThumbnail({ version, selected, onSelect }: VersionThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-20 flex-col overflow-hidden rounded-lg border bg-renovation-elevated text-left transition-colors ${
        selected
          ? "border-renovation-accent ring-2 ring-renovation-accent/30"
          : "border-renovation-border hover:border-renovation-steel"
      }`}
      aria-pressed={selected}
      data-testid="version-thumb"
    >
      <div className="relative aspect-square bg-renovation-muted/30">
        <Image src={version.url} alt={version.label} fill unoptimized sizes="80px" className="object-cover" />
      </div>
      <div className="border-t border-renovation-border px-2 py-1 text-center">
        <span className="block truncate text-[11px] font-medium text-foreground" data-testid="version-label">
          {version.label}
        </span>
      </div>
    </button>
  );
}

type UploadZoneProps = {
  testid: string;
  label: string;
  hint: string;
  badge: string;
  cta: string;
  image: UploadedImage | null;
  icon: React.ReactNode;
  onUpload: (file: File | undefined) => void;
  onRemove: () => void;
  removeLabel: string;
};

function UploadZone({
  testid,
  label,
  hint,
  badge,
  cta,
  image,
  icon,
  onUpload,
  onRemove,
  removeLabel,
}: UploadZoneProps) {
  return (
    <div
      className="rounded-xl border-l-4 border-l-renovation-accent bg-renovation-accent/5 p-3"
      data-testid={testid}
    >
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-renovation-accent" aria-hidden />
        <div className="flex flex-1 items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-renovation-concrete">{icon}</span>
            <div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[11px] text-renovation-concrete">{hint}</p>
            </div>
          </div>
          <span className="shrink-0 rounded-full bg-renovation-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-renovation-concrete">
            {badge}
          </span>
        </div>
      </div>

      {image ? (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-renovation-border bg-renovation-surface px-3 py-2 text-xs text-foreground">
          <span className="truncate">{image.name}</span>
          <button type="button" onClick={onRemove} className="shrink-0 text-renovation-steel hover:underline">
            {removeLabel}
          </button>
        </div>
      ) : (
        <label className={`${dropZoneBaseClass} bg-renovation-surface`}>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              onUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <span className="flex items-center justify-center gap-2">
            {icon}
            <span>{cta}</span>
          </span>
        </label>
      )}
    </div>
  );
}

type ReferencePhotoRowProps = {
  reference: ReferencePhoto;
  noteLabel: string;
  notePlaceholder: string;
  removeLabel: string;
  onNoteChange: (notitie: string) => void;
  onRemove: () => void;
};

function ReferencePhotoRow({
  reference,
  noteLabel,
  notePlaceholder,
  removeLabel,
  onNoteChange,
  onRemove,
}: ReferencePhotoRowProps) {
  return (
    <div
      className="space-y-2 rounded-xl border border-renovation-border bg-renovation-surface p-3"
      data-testid="reference-photo"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-renovation-border bg-renovation-muted/30">
          <Image src={reference.image.dataUrl} alt={reference.image.name} fill unoptimized className="object-cover" />
        </div>
        <span className="min-w-0 flex-1 truncate text-xs text-foreground">{reference.image.name}</span>
        <button type="button" onClick={onRemove} className="shrink-0 text-xs text-renovation-steel hover:underline">
          {removeLabel}
        </button>
      </div>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-renovation-concrete">{noteLabel}</span>
        <input
          type="text"
          value={reference.notitie}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder={notePlaceholder}
          className={fieldClass}
          data-testid="reference-note"
        />
      </label>
    </div>
  );
}

function SceneIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-8 w-8">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
      />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.798 2.25 10.125v7.875c0 1.035.84 1.875 1.875 1.875h13.5c1.035 0 1.875-.84 1.875-1.875v-7.875c0-1.327-.749-2.546-1.802-2.77-.377-.063-.754-.12-1.134-.176a2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039H9.384a2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}
