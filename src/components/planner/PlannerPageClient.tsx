"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Button from "@/components/ui/Button";
import { useSelectedProject } from "@/components/layout/SelectedProjectContext";
import { useI18n } from "@/i18n/provider";
import { getBearerAuthHeaders } from "@/lib/supabase/client";
import { loadPlanners, savePlanner } from "@/lib/planner/storage";
import {
  KAMER_TYPES,
  emptyVisualisatieData,
  type RenderHoek,
  type RenderImage,
  type VisualisatieData,
} from "@/lib/planner/types";

type UploadedImage = { name: string; dataUrl: string };

type ZoneAccent = "amber" | "brown" | "blue" | "purple";

const ZONE_ACCENTS: Record<ZoneAccent, { border: string; bg: string; dot: string }> = {
  amber: {
    border: "border-l-amber-500",
    bg: "bg-amber-500/5",
    dot: "bg-amber-500",
  },
  brown: {
    border: "border-l-amber-900",
    bg: "bg-amber-900/5",
    dot: "bg-amber-900",
  },
  blue: {
    border: "border-l-blue-500",
    bg: "bg-blue-500/5",
    dot: "bg-blue-500",
  },
  purple: {
    border: "border-l-purple-500",
    bg: "bg-purple-500/5",
    dot: "bg-purple-500",
  },
};

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

const dropZoneBaseClass =
  "block cursor-pointer rounded-xl border-2 border-dashed border-renovation-border p-4 text-center text-sm text-renovation-concrete transition-colors hover:border-renovation-accent hover:text-foreground";

const RENDER_HOEKEN: RenderHoek[] = ["structuur", "gebalanceerd", "maximaal"];

export default function PlannerPageClient() {
  const { t } = useI18n();
  const { selectedProjectId, selectedProject } = useSelectedProject();

  const [plannerId, setPlannerId] = useState<string | null>(null);
  const [naam, setNaam] = useState("Nieuwe kamer");
  const [beschrijving, setBeschrijving] = useState("");
  const [kamerType, setKamerType] = useState<string>("Woonkamer");

  const [kamerFoto, setKamerFoto] = useState<UploadedImage | null>(null);
  const [vloerFoto, setVloerFoto] = useState<UploadedImage | null>(null);
  const [muurFoto, setMuurFoto] = useState<UploadedImage | null>(null);
  const [tvwandFoto, setTvwandFoto] = useState<UploadedImage | null>(null);

  const [renders, setRenders] = useState<RenderImage[]>([]);
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);

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
        setRenders(Array.isArray(data.renders) ? data.renders : []);
      } catch {
        /* tabel kan ontbreken vóór migratie; stil falen */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  const onSingleUpload = useCallback(
    async (file: File | undefined, setter: React.Dispatch<React.SetStateAction<UploadedImage | null>>) => {
      if (!file) return;
      setter({ name: file.name, dataUrl: await fileToDataUrl(file) });
      setError(null);
    },
    []
  );

  const handleGenerate = useCallback(async () => {
    if (!kamerFoto) {
      setError(t("planner.visual.kamerRequired"));
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
          kamer_foto: kamerFoto.dataUrl,
          vloer_foto: vloerFoto?.dataUrl ?? undefined,
          muur_foto: muurFoto?.dataUrl ?? undefined,
          tvwand_foto: tvwandFoto?.dataUrl ?? undefined,
          beschrijving: beschrijving.trim() || undefined,
          kamer_type: kamerType,
        }),
      });
      const json = (await res.json()) as { error?: string; renders?: RenderImage[] };
      if (!res.ok) throw new Error(json.error ?? t("planner.visual.error"));
      const nieuweRenders: RenderImage[] = Array.isArray(json.renders) ? json.renders : [];
      setRenders(nieuweRenders);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("planner.visual.error"));
    } finally {
      setGenerating(false);
    }
  }, [kamerFoto, vloerFoto, muurFoto, tvwandFoto, beschrijving, kamerType, t]);

  const handleSave = useCallback(async () => {
    if (!selectedProjectId) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const kamerData: VisualisatieData = {
        beschrijving: beschrijving.trim(),
        kamerType,
        renders,
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
  }, [selectedProjectId, plannerId, naam, beschrijving, kamerType, renders, t]);

  const hoekLabel = useCallback(
    (hoek: string) => {
      if (RENDER_HOEKEN.includes(hoek as RenderHoek)) {
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

  const fullscreenRender = fullscreenIndex !== null ? renders[fullscreenIndex] ?? null : null;

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
        {/* Linkerkolom: render galerij (65%) */}
        <div className="lg:w-[65%]">
          <div
            className="flex min-h-[55vh] flex-col overflow-hidden rounded-xl border border-renovation-border lg:min-h-[calc(100vh-14rem)]"
            data-testid="render-gallery"
          >
            {generating ? (
              <div className="relative flex-1" style={{ backgroundColor: "#1a1a2e" }}>
                <GeneratingState
                  title={t("planner.visual.generating")}
                  hint={t("planner.visual.generatingHint")}
                />
              </div>
            ) : renders.length > 0 ? (
              <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {renders.map((render, index) => (
                  <RenderCard
                    key={`${render.hoek}-${index}`}
                    render={render}
                    label={hoekLabel(render.hoek)}
                    naam={naam}
                    downloadLabel={t("planner.visual.download")}
                    onOpen={() => setFullscreenIndex(index)}
                  />
                ))}
              </div>
            ) : (
              <div
                className="flex flex-1 items-center justify-center px-8 text-center"
                style={{ backgroundColor: "#1a1a2e" }}
              >
                <p className="text-sm text-white/70">{t("planner.visual.viewerEmpty")}</p>
              </div>
            )}
          </div>
        </div>

        {/* Rechterkolom: input panel (35%) */}
        <div className="lg:w-[35%]">
          <div className="space-y-5 rounded-xl border border-renovation-border bg-renovation-elevated p-4 dark:border-renovation-border dark:bg-renovation-elevated">
            {/* Sectie 1: vier upload zones */}
            <section className="space-y-3">
              <p className="text-sm font-semibold text-foreground">{t("planner.visual.uploadTitle")}</p>

              <UploadZone
                testid="upload-kamer"
                accent="amber"
                label={t("planner.visual.zones.kamer.label")}
                hint={t("planner.visual.zones.kamer.hint")}
                badge={t("planner.visual.required")}
                cta={t("planner.visual.uploadCta")}
                image={kamerFoto}
                icon={<CameraIcon />}
                onUpload={(file) => onSingleUpload(file, setKamerFoto)}
                onRemove={() => setKamerFoto(null)}
                removeLabel={t("planner.visual.removeImage")}
              />

              <UploadZone
                testid="upload-vloer"
                accent="brown"
                label={t("planner.visual.zones.vloer.label")}
                hint={t("planner.visual.zones.vloer.hint")}
                badge={t("planner.visual.optional")}
                cta={t("planner.visual.uploadCta")}
                image={vloerFoto}
                icon={<FloorIcon />}
                onUpload={(file) => onSingleUpload(file, setVloerFoto)}
                onRemove={() => setVloerFoto(null)}
                removeLabel={t("planner.visual.removeImage")}
              />

              <UploadZone
                testid="upload-muur"
                accent="blue"
                label={t("planner.visual.zones.muur.label")}
                hint={t("planner.visual.zones.muur.hint")}
                badge={t("planner.visual.optional")}
                cta={t("planner.visual.uploadCta")}
                image={muurFoto}
                icon={<PaintIcon />}
                onUpload={(file) => onSingleUpload(file, setMuurFoto)}
                onRemove={() => setMuurFoto(null)}
                removeLabel={t("planner.visual.removeImage")}
              />

              <UploadZone
                testid="upload-tvwand"
                accent="purple"
                label={t("planner.visual.zones.tvwand.label")}
                hint={t("planner.visual.zones.tvwand.hint")}
                badge={t("planner.visual.optional")}
                cta={t("planner.visual.uploadCta")}
                image={tvwandFoto}
                icon={<TvIcon />}
                onUpload={(file) => onSingleUpload(file, setTvwandFoto)}
                onRemove={() => setTvwandFoto(null)}
                removeLabel={t("planner.visual.removeImage")}
              />
            </section>

            {/* Sectie 2: kamertype */}
            <section>
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
            </section>

            {/* Sectie 3: extra wensen (optioneel, kleiner) */}
            <section>
              <label htmlFor="planner-beschrijving" className="mb-1 block text-xs font-medium text-renovation-concrete">
                {t("planner.visual.extraWishesLabel")}
              </label>
              <textarea
                id="planner-beschrijving"
                value={beschrijving}
                onChange={(e) => setBeschrijving(e.target.value)}
                placeholder={t("planner.visual.extraWishesPlaceholder")}
                rows={2}
                className={`${fieldClass} resize-y`}
                data-testid="planner-beschrijving"
              />
            </section>

            {/* Sectie 4: genereer */}
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
              {error ? (
                <p className="text-sm text-red-600" data-testid="planner-error">
                  {error}
                </p>
              ) : null}
            </section>
          </div>
        </div>
      </div>

      {/* Fullscreen render */}
      {fullscreenRender ? (
        <div
          className="fixed inset-0 z-[10050] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          data-testid="render-fullscreen"
        >
          <div className="flex items-center justify-end gap-2 p-3">
            <button
              type="button"
              onClick={() => downloadImage(fullscreenRender.url, `${naam || "render"}-${fullscreenRender.hoek}.png`)}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              {t("planner.visual.download")}
            </button>
            <button
              type="button"
              onClick={() => setFullscreenIndex(null)}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              {t("planner.visual.close")}
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              src={fullscreenRender.url}
              alt={hoekLabel(fullscreenRender.hoek)}
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
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center" data-testid="generating-state">
      <span className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-renovation-accent" />
      <div className="space-y-1">
        <p className="animate-pulse text-base font-medium text-white">{title}</p>
        <p className="text-sm text-white/60">{hint}</p>
      </div>
    </div>
  );
}

type RenderCardProps = {
  render: RenderImage;
  label: string;
  naam: string;
  downloadLabel: string;
  onOpen: () => void;
};

function RenderCard({ render, label, naam, downloadLabel, onOpen }: RenderCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-renovation-border bg-renovation-surface">
      <div className="relative aspect-[4/3]" style={{ backgroundColor: "#1a1a2e" }}>
        <button
          type="button"
          onClick={onOpen}
          className="absolute inset-0 flex items-center justify-center"
          aria-label={label}
        >
          <Image
            src={render.url}
            alt={label}
            fill
            unoptimized
            sizes="(max-width: 1024px) 100vw, 22vw"
            className="object-cover"
            data-testid="render-image"
          />
        </button>
        <button
          type="button"
          onClick={() => downloadImage(render.url, `${naam || "render"}-${render.hoek}.png`)}
          data-testid="render-download"
          className="absolute right-2 top-2 rounded-lg border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur hover:bg-black/60"
        >
          {downloadLabel}
        </button>
      </div>
      <div className="border-t border-renovation-border bg-renovation-elevated px-3 py-2">
        <span className="text-sm font-medium text-foreground" data-testid="render-label">
          {label}
        </span>
      </div>
    </div>
  );
}

type UploadZoneProps = {
  testid: string;
  accent: ZoneAccent;
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
  accent,
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
  const styles = ZONE_ACCENTS[accent];

  return (
    <div
      className={`rounded-xl border-l-4 ${styles.border} ${styles.bg} p-3`}
      data-testid={testid}
    >
      <div className="mb-2 flex items-start gap-2">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${styles.dot}`} aria-hidden />
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
          <button type="button" onClick={onRemove} className="shrink-0 text-red-600 hover:underline">
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

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.798 2.25 10.125v7.875c0 1.035.84 1.875 1.875 1.875h13.5c1.035 0 1.875-.84 1.875-1.875v-7.875c0-1.327-.749-2.546-1.802-2.77-.377-.063-.754-.12-1.134-.176a2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039H9.384a2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" />
    </svg>
  );
}

function FloorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
    </svg>
  );
}

function PaintIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128ZM13.5 8.25H15A2.25 2.25 0 0 1 17.25 10.5v1.5a2.25 2.25 0 0 1-2.25 2.25h-1.5m-6.75 0H6A2.25 2.25 0 0 1 3.75 12v-1.5A2.25 2.25 0 0 1 6 8.25h1.5m6.75 0V6A2.25 2.25 0 0 0 12 3.75H9A2.25 2.25 0 0 0 6.75 6v2.25m6.75 0V18" />
    </svg>
  );
}

function TvIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12M3.75 5.25h16.5c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125H3.75c-.621 0-1.125-.504-1.125-1.125v-9.75c0-.621.504-1.125 1.125-1.125Z" />
    </svg>
  );
}
