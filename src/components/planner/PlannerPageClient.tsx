"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders } from "@/lib/supabase/client";
import PanoramaViewer from "@/components/planner/PanoramaViewer";
import { loadPlanners, savePlanner } from "@/lib/planner/storage";
import {
  KAMER_TYPES,
  STIJL_PRESETS,
  emptyVisualisatieData,
  presetById,
  type RenderImage,
  type VisualisatieData,
} from "@/lib/planner/types";

type UploadedImage = { name: string; dataUrl: string };

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

const fieldClass =
  "w-full rounded-lg border border-renovation-border bg-renovation-elevated px-3 py-2 text-sm dark:border-renovation-border dark:bg-renovation-elevated";

const dropZoneClass =
  "block cursor-pointer rounded-xl border-2 border-dashed border-renovation-border bg-renovation-surface p-4 text-center text-sm text-renovation-concrete transition-colors hover:border-renovation-accent hover:text-foreground";

export default function PlannerPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();

  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [naam, setNaam] = useState("Nieuwe kamer");
  const [beschrijving, setBeschrijving] = useState("");
  const [kamerType, setKamerType] = useState<string>("Woonkamer");
  const [stijlPreset, setStijlPreset] = useState<string | null>(null);

  const [huidigeFotos, setHuidigeFotos] = useState<UploadedImage[]>([]);
  const [inspiratieFotos, setInspiratieFotos] = useState<UploadedImage[]>([]);

  const [renders, setRenders] = useState<RenderImage[]>([]);
  const [panorama, setPanorama] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [panoramaOpen, setPanoramaOpen] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = await loadPlanners(selectedProjectId);
        if (cancelled || rows.length === 0) return;
        const latest = rows[0];
        const data = { ...emptyVisualisatieData(), ...(latest.kamer_data as VisualisatieData) };
        setPlannerId(latest.id);
        setNaam(latest.naam);
        setBeschrijving(data.beschrijving);
        setKamerType(data.kamerType || "Woonkamer");
        setStijlPreset(data.stijlPreset);
        setRenders(Array.isArray(data.renders) ? data.renders : []);
        setPanorama(data.panorama ?? null);
        setCurrent(0);
      } catch {
        /* tabel kan ontbreken vóór migratie; stil falen */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const onUpload = useCallback(
    async (files: FileList | null, setter: React.Dispatch<React.SetStateAction<UploadedImage[]>>) => {
      if (!files || files.length === 0) return;
      const arr = await Promise.all(
        Array.from(files)
          .slice(0, 4)
          .map(async (f) => ({ name: f.name, dataUrl: await fileToDataUrl(f) }))
      );
      setter((prev) => [...prev, ...arr].slice(0, 4));
      setError(null);
    },
    []
  );

  const applyPreset = useCallback((id: string) => {
    const preset = presetById(id);
    if (!preset) return;
    setStijlPreset(id);
    setBeschrijving(preset.beschrijving);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (beschrijving.trim().length < 3) {
      setError(t("planner.visual.describeRequired"));
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const headers = await getBearerAuthHeaders();
      const res = await fetch("/api/planner/visualiseer", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          beschrijving: beschrijving.trim(),
          kamer_type: kamerType,
          stijl_preset: stijlPreset,
          huidige_kamer_fotos: huidigeFotos.map((p) => p.dataUrl),
          inspiratie_fotos: inspiratieFotos.map((p) => p.dataUrl),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? t("planner.visual.error"));
      const nieuweRenders: RenderImage[] = Array.isArray(json.renders) ? json.renders : [];
      setRenders(nieuweRenders);
      setPanorama(json.panorama ?? null);
      setCurrent(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("planner.visual.error"));
    } finally {
      setGenerating(false);
    }
  }, [beschrijving, kamerType, stijlPreset, huidigeFotos, inspiratieFotos, t]);

  const handleSave = useCallback(async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const kamerData: VisualisatieData = {
        beschrijving: beschrijving.trim(),
        kamerType,
        stijlPreset,
        renders,
        panorama,
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
  }, [selectedProjectId, plannerId, naam, beschrijving, kamerType, stijlPreset, renders, panorama, t]);

  const hoekLabel = useCallback(
    (hoek: string) => {
      if (hoek === "overzicht" || hoek === "hoek" || hoek === "detail") {
        return t(`planner.visual.labels.${hoek}`);
      }
      return hoek;
    },
    [t]
  );

  if (!selectedProjectId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{t("planner.title")}</h1>
        <p className="text-sm text-renovation-concrete">{t("planner.chooseProject")}</p>
      </div>
    );
  }

  const activeRender = renders[current] ?? null;

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

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Linkerkolom: render viewer (65%) */}
        <div className="lg:w-[65%]">
          <div className="flex h-[55vh] flex-col overflow-hidden rounded-xl border border-renovation-border lg:h-[calc(100vh-14rem)]">
            <div className="relative flex-1" style={{ backgroundColor: "#1a1a2e" }} data-testid="render-viewer">
              {generating ? (
                <GeneratingState
                  title={t("planner.visual.generating")}
                  hint={t("planner.visual.generatingHint")}
                />
              ) : activeRender ? (
                <>
                  <button
                    type="button"
                    onClick={() => setFullscreen(true)}
                    className="absolute inset-0 flex items-center justify-center"
                    aria-label={hoekLabel(activeRender.hoek)}
                  >
                    <Image
                      src={activeRender.url}
                      alt={hoekLabel(activeRender.hoek)}
                      fill
                      unoptimized
                      sizes="(max-width: 1024px) 100vw, 65vw"
                      className="object-contain"
                      data-testid="render-image"
                    />
                  </button>
                  {renders.length > 1 ? (
                    <>
                      <button
                        type="button"
                        aria-label={t("planner.visual.prev")}
                        data-testid="render-prev"
                        onClick={() => setCurrent((c) => (c - 1 + renders.length) % renders.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
                      >
                        <ChevronIcon dir="left" />
                      </button>
                      <button
                        type="button"
                        aria-label={t("planner.visual.next")}
                        data-testid="render-next"
                        onClick={() => setCurrent((c) => (c + 1) % renders.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/40 p-2 text-white backdrop-blur hover:bg-black/60"
                      >
                        <ChevronIcon dir="right" />
                      </button>
                    </>
                  ) : null}
                  <div className="absolute right-3 top-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadImage(activeRender.url, `${naam || "render"}-${activeRender.hoek}.png`)}
                      data-testid="render-download"
                      className="rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/60"
                    >
                      {t("planner.visual.download")}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center px-8 text-center">
                  <p className="text-sm text-white/70">{t("planner.visual.viewerEmpty")}</p>
                </div>
              )}
            </div>

            {/* Onderbalk: label + 360° knop */}
            <div className="flex items-center justify-between gap-3 border-t border-renovation-border bg-renovation-elevated px-4 py-3">
              <div className="text-sm">
                {activeRender ? (
                  <span className="font-medium text-foreground" data-testid="render-label">
                    {hoekLabel(activeRender.hoek)}{" "}
                    <span className="text-renovation-concrete">
                      ({current + 1} / {renders.length})
                    </span>
                  </span>
                ) : (
                  <span className="text-renovation-concrete">{t("planner.visual.noRenders")}</span>
                )}
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={!panorama}
                onClick={() => setPanoramaOpen(true)}
                data-testid="open-360"
              >
                {t("planner.visual.view360")}
              </Button>
            </div>
          </div>
        </div>

        {/* Rechterkolom: input panel (35%) */}
        <div className="lg:w-[35%]">
          <div className="space-y-5 rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated">
            {/* Sectie 1: foto upload */}
            <section className="space-y-3">
              <p className="text-sm font-semibold text-foreground">{t("planner.visual.uploadTitle")}</p>
              <UploadZone
                testid="upload-huidige"
                label={t("planner.visual.currentPhotos")}
                hint={t("planner.visual.currentPhotosHint")}
                cta={t("planner.visual.uploadCta")}
                images={huidigeFotos}
                onUpload={(files) => onUpload(files, setHuidigeFotos)}
                onRemove={(i) => setHuidigeFotos((prev) => prev.filter((_, idx) => idx !== i))}
                removeLabel={t("planner.visual.removeImage")}
              />
              <UploadZone
                testid="upload-inspiratie"
                label={t("planner.visual.inspirationPhotos")}
                hint={t("planner.visual.inspirationPhotosHint")}
                cta={t("planner.visual.uploadCta")}
                images={inspiratieFotos}
                onUpload={(files) => onUpload(files, setInspiratieFotos)}
                onRemove={(i) => setInspiratieFotos((prev) => prev.filter((_, idx) => idx !== i))}
                removeLabel={t("planner.visual.removeImage")}
              />
            </section>

            {/* Sectie 2: beschrijving */}
            <section className="space-y-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-renovation-concrete">{t("planner.visual.presetsLabel")}</p>
                <div className="flex flex-wrap gap-1.5" data-testid="planner-presets">
                  {STIJL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className={[
                        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                        stijlPreset === preset.id
                          ? "bg-renovation-accent text-renovation-accent-foreground"
                          : "border border-renovation-border text-renovation-concrete hover:bg-renovation-muted hover:text-foreground",
                      ].join(" ")}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="planner-beschrijving" className="mb-1 block text-xs font-medium text-renovation-concrete">
                  {t("planner.visual.describeLabel")}
                </label>
                <textarea
                  id="planner-beschrijving"
                  value={beschrijving}
                  onChange={(e) => setBeschrijving(e.target.value)}
                  placeholder={t("planner.visual.describePlaceholder")}
                  rows={6}
                  className={`${fieldClass} resize-y`}
                  data-testid="planner-beschrijving"
                />
              </div>

              <div>
                <label htmlFor="planner-kamertype" className="mb-1 block text-xs font-medium text-renovation-concrete">
                  {t("planner.visual.roomTypeLabel")}
                </label>
                <select
                  id="planner-kamertype"
                  value={kamerType}
                  onChange={(e) => setKamerType(e.target.value)}
                  className={fieldClass}
                  data-testid="planner-kamertype"
                >
                  {KAMER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </section>

            {/* Sectie 3: genereer */}
            <section className="space-y-2">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-renovation-accent text-renovation-accent-foreground hover:bg-renovation-steel"
                data-testid="planner-generate"
              >
                {generating ? t("planner.visual.generating") : t("planner.visual.generate")}
              </Button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </section>
          </div>
        </div>
      </div>

      {/* Fullscreen render */}
      {fullscreen && activeRender ? (
        <div
          className="fixed inset-0 z-[10050] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          data-testid="render-fullscreen"
        >
          <div className="flex items-center justify-end gap-2 p-3">
            <button
              type="button"
              onClick={() => downloadImage(activeRender.url, `${naam || "render"}-${activeRender.hoek}.png`)}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              {t("planner.visual.download")}
            </button>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              {t("planner.visual.close")}
            </button>
          </div>
          <div className="relative flex-1">
            <Image src={activeRender.url} alt={hoekLabel(activeRender.hoek)} fill unoptimized className="object-contain" />
          </div>
        </div>
      ) : null}

      <PanoramaViewer
        src={panorama}
        open={panoramaOpen}
        onClose={() => setPanoramaOpen(false)}
        closeLabel={t("planner.visual.close")}
      />
    </div>
  );
}

function ChevronIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d={dir === "left" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GeneratingState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center" data-testid="generating-state">
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-renovation-accent" />
      <div className="space-y-1">
        <p className="animate-pulse text-base font-medium text-white">{title}</p>
        <p className="text-sm text-white/60">{hint}</p>
      </div>
    </div>
  );
}

type UploadZoneProps = {
  testid: string;
  label: string;
  hint: string;
  cta: string;
  images: UploadedImage[];
  onUpload: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  removeLabel: string;
};

function UploadZone({ testid, label, hint, cta, images, onUpload, onRemove, removeLabel }: UploadZoneProps) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-renovation-concrete">{label}</p>
      <label className={dropZoneClass} data-testid={testid}>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onUpload(e.target.files)} />
        <span className="block">{cta}</span>
        <span className="mt-1 block text-xs">{hint}</span>
      </label>
      {images.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {images.map((img, i) => (
            <li key={`${img.name}-${i}`} className="flex items-center justify-between gap-2 text-xs text-foreground">
              <span className="truncate">{img.name}</span>
              <button type="button" onClick={() => onRemove(i)} className="text-red-600 hover:underline">
                {removeLabel}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
