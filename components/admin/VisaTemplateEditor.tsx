"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Eye, FileText, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { deleteVisaCanvasTemplateAction, saveVisaCanvasTemplateAction } from "@/app/actions/visa";
import {
  DEFAULT_VISA_LAYOUT,
  VISA_SAMPLE_VALUES,
  type VisaFieldFont,
  type VisaLayout,
  type VisaLayoutField,
  type VisaTemplateRow,
} from "@/lib/visa/types";
import { getVisaFieldValue } from "@/lib/visa/format";
import SubmitButton from "@/components/portal/SubmitButton";
import { Badge, btnDanger, btnGold, btnPrimary, btnSecondary, inputCls } from "@/components/portal/ui";

const MAX_FILE_B64 = 2_200_000;

// Loads PDF.js from cdnjs dynamically in the browser
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfJs(): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error("Failed to load PDF preview engine from CDN."));
    document.head.appendChild(script);
  });
}

// Converts File to Base64
async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const raw = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < raw.byteLength; i++) {
    binary += String.fromCharCode(raw[i]);
  }
  return btoa(binary);
}

// Renders page 1 of a PDF to an image data URL for the canvas background
async function processPdfFile(file: File): Promise<{
  fileB64: string;
  previewB64: string;
  mime: string;
  width: number;
  height: number;
  url: string;
}> {
  const pdfjs = await loadPdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.8 });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport }).promise;

  const previewDataUrl = canvas.toDataURL("image/jpeg", 0.84);
  const previewB64 = previewDataUrl.split(",")[1];
  const fileB64 = await fileToBase64(file);

  return {
    fileB64,
    previewB64,
    mime: "application/pdf",
    width: Math.round(viewport.width / 1.8),
    height: Math.round(viewport.height / 1.8),
    url: previewDataUrl,
  };
}

// Renders an uploaded image (PNG or JPG)
async function processImageFile(file: File): Promise<{
  fileB64: string;
  previewB64: string;
  mime: string;
  width: number;
  height: number;
  url: string;
}> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read image file."));
    img.src = url;
  });

  const width = img.naturalWidth || 595;
  const height = img.naturalHeight || 842;
  const fileB64 = await fileToBase64(file);

  return {
    fileB64,
    previewB64: fileB64,
    mime: file.type || "image/png",
    width,
    height,
    url,
  };
}

export default function VisaTemplateEditor({ existing }: { existing: VisaTemplateRow | null }) {
  let initialLayout: VisaLayout = DEFAULT_VISA_LAYOUT;
  if (existing?.layout) {
    try {
      const parsed = JSON.parse(existing.layout);
      if (Array.isArray(parsed?.fields)) initialLayout = parsed;
    } catch {}
  }

  const [layout, setLayout] = useState<VisaLayout>(initialLayout);
  const [selectedId, setSelectedId] = useState<string>(initialLayout.fields[0]?.id ?? "f_ref");
  const [upload, setUpload] = useState<{
    fileB64: string;
    previewB64: string;
    mime: string;
    width: number;
    height: number;
    url: string;
  } | null>(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");

  const boxRef = useRef<HTMLDivElement>(null);
  const [boxWidth, setBoxWidth] = useState(600);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [upload, existing]);

  // If a template was previously uploaded, load its preview via API
  const existingPreviewUrl = existing?.preview_b64 || existing?.file_b64 ? "/api/admin/visa/template-preview" : null;
  const imageUrl = upload?.url ?? existingPreviewUrl;
  const dims = upload ?? (existing?.width && existing?.height ? existing : { width: 595, height: 842 });
  const scale = boxWidth / (dims.width || 595);

  const selectedIndex = layout.fields.findIndex((f) => f.id === selectedId);
  const selectedField = layout.fields[selectedIndex] ?? layout.fields[0];

  const updateField = (id: string, patch: Partial<VisaLayoutField>) => {
    setLayout((prev) => ({
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const startDrag = (id: string) => (e: React.PointerEvent) => {
    e.preventDefault();
    setSelectedId(id);
    const box = boxRef.current?.getBoundingClientRect();
    if (!box) return;

    const onPointerMove = (ev: PointerEvent) => {
      const x = Math.min(0.96, Math.max(0.02, (ev.clientX - box.left) / box.width));
      const y = Math.min(0.96, Math.max(0.02, (ev.clientY - box.top) / box.height));
      updateField(id, {
        x: Math.round(x * 1000) / 1000,
        y: Math.round(y * 1000) / 1000,
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  // Convert sample mock request for text replacement
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockReq: any = {
    id: "SAMPLE12345",
    passport_name: VISA_SAMPLE_VALUES.name,
    passport_number: VISA_SAMPLE_VALUES.passport_number,
    passport_expiry: VISA_SAMPLE_VALUES.passport_expiry,
    nationality: VISA_SAMPLE_VALUES.nationality,
    country_of_birth: VISA_SAMPLE_VALUES.country_of_birth,
    date_of_birth: VISA_SAMPLE_VALUES.date_of_birth,
    gender: VISA_SAMPLE_VALUES.gender,
    affiliation: VISA_SAMPLE_VALUES.affiliation,
    designation: VISA_SAMPLE_VALUES.designation,
    country: VISA_SAMPLE_VALUES.country,
    city: VISA_SAMPLE_VALUES.city,
    address: VISA_SAMPLE_VALUES.address,
    paper_id: VISA_SAMPLE_VALUES.paper_id,
    paper_title: VISA_SAMPLE_VALUES.paper_title,
    registration_id: VISA_SAMPLE_VALUES.registration_id,
    embassy_details: VISA_SAMPLE_VALUES.embassy,
    arrival_date: VISA_SAMPLE_VALUES.arrival_date,
    departure_date: VISA_SAMPLE_VALUES.departure_date,
    created_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-primary/10 p-2.5 text-brand-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900">
                {existing || upload ? "Replace Letterhead / Template" : "Upload Template PDF or Image"}
              </h4>
              <p className="text-xs text-slate-500">
                Upload your official letterhead or complete invitation form (PDF, PNG, or JPEG). You can drag and position all dynamic fields on top.
              </p>
            </div>
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary-hover">
            <span>Browse PDF / Image</span>
            <input
              type="file"
              accept="application/pdf,image/png,image/jpeg"
              className="hidden"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setErr("");
                setBusy("upload");
                try {
                  if (f.type === "application/pdf") {
                    const res = await processPdfFile(f);
                    setUpload(res);
                  } else {
                    const res = await processImageFile(f);
                    setUpload(res);
                  }
                } catch (ex) {
                  setErr(ex instanceof Error ? ex.message : String(ex));
                } finally {
                  setBusy("");
                }
              }}
            />
          </label>
        </div>

        {upload && (
          <div className="mt-3 flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
            <span>• New template selected ({upload.mime}). Remember to click &quot;Save Template&quot; below to apply.</span>
          </div>
        )}
      </div>

      {err && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs text-rose-700 font-medium">
          {err}
        </div>
      )}

      {/* Editor & Preview Grid */}
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        {/* Visual Drag Canvas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span>Click &amp; drag any text element directly onto the template:</span>
            <span className="font-mono text-[11px] text-slate-400">
              Page: {dims.width} × {dims.height} pt
            </span>
          </div>

          <div
            ref={boxRef}
            className="relative w-full select-none overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md"
            style={{ aspectRatio: `${dims.width} / ${dims.height}` }}
          >
            {/* Background: Uploaded image / PDF preview or Default Canvas */}
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Visa template background"
                className="absolute inset-0 h-full w-full object-fill pointer-events-none"
                draggable={false}
              />
            ) : (
              /* Built-in default letterhead banner when no custom template is uploaded */
              <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
                <div className="border-b-2 border-brand-accent pb-2">
                  <div className="h-10 w-full rounded bg-[#002147] flex items-center px-4 justify-between">
                    <span className="text-white font-bold text-xs uppercase tracking-wider">
                      VELLORE INSTITUTE OF TECHNOLOGY (VIT)
                    </span>
                    <span className="text-brand-accent font-bold text-[10px]">ic-ETITE&apos;28</span>
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-2 text-center text-[9px] text-slate-400">
                  VIT Vellore, Tamil Nadu 632014, India · https://ic-etite28.vercel.app · icetiteconference@vit.ac.in
                </div>
              </div>
            )}

            {/* Draggable Fields Overlay */}
            {layout.fields.map((f) => {
              if (!f.enabled) return null;
              const isSelected = f.id === selectedId;
              const rawText = getVisaFieldValue(f, mockReq, true);
              const previewText = rawText || f.label;
              const maxW = f.width && f.width > 0 ? f.width * scale : undefined;

              return (
                <div
                  key={f.id}
                  onPointerDown={startDrag(f.id)}
                  className={`absolute cursor-move select-none whitespace-pre-wrap rounded px-1 py-0.5 leading-snug transition-shadow ${
                    isSelected
                      ? "ring-2 ring-brand-accent bg-amber-50/70 shadow-md z-20"
                      : "ring-1 ring-dashed ring-sky-400/80 hover:bg-sky-50/50 z-10"
                  }`}
                  style={{
                    left: `${f.x * 100}%`,
                    top: `${f.y * 100}%`,
                    maxWidth: maxW ? `${maxW}px` : "92%",
                    transform: `translate(${
                      f.align === "center" ? "-50%" : f.align === "right" ? "-100%" : "0"
                    }, -15%)`,
                    fontSize: `${Math.max(7, f.size * scale)}px`,
                    color: f.color,
                    fontFamily: f.font.startsWith("Times")
                      ? "Times New Roman, serif"
                      : f.font === "Courier"
                      ? "Courier New, monospace"
                      : "Helvetica, Arial, sans-serif",
                    fontWeight: f.font.endsWith("Bold") ? 700 : 400,
                    fontStyle: f.font.endsWith("Italic") ? "italic" : "normal",
                    textAlign: f.align,
                  }}
                  title={`Drag to reposition (${Math.round(f.x * 100)}%, ${Math.round(f.y * 100)}%)`}
                >
                  {previewText}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1">
            <span>Tip: Drag with mouse to position. Real applicant details are printed at generation time.</span>
            <button
              type="button"
              onClick={() => {
                setLayout(DEFAULT_VISA_LAYOUT);
                setSelectedId("f_ref");
              }}
              className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="h-3 w-3" /> Reset to Default Layout
            </button>
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">Template Fields ({layout.fields.filter(f => f.enabled).length} active)</h4>
              <button
                type="button"
                onClick={() => {
                  const newId = `f_custom_${Date.now()}`;
                  const count = layout.fields.filter((f) => f.key === "custom").length + 1;
                  setLayout((prev) => ({
                    fields: [
                      ...prev.fields,
                      {
                        id: newId,
                        key: "custom",
                        label: `Custom Text ${count}`,
                        enabled: true,
                        x: 0.1,
                        y: 0.5,
                        size: 9,
                        color: "#101B2E",
                        font: "Helvetica",
                        align: "left",
                        width: 450,
                        text: "Custom note: {{name}} has registered for ic-ETITE'28.",
                      },
                    ],
                  }));
                  setSelectedId(newId);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Custom Field
              </button>
            </div>

            {/* Fields Accordion / Picker */}
            <div className="mt-3 max-h-[380px] space-y-2 overflow-y-auto pr-1">
              {layout.fields.map((f) => {
                const isSelected = f.id === selectedId;
                return (
                  <div
                    key={f.id}
                    onClick={() => setSelectedId(f.id)}
                    className={`cursor-pointer rounded-xl border p-2.5 transition ${
                      isSelected
                        ? "border-brand-accent bg-amber-50/50 shadow-sm"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={f.enabled}
                          onChange={(e) => updateField(f.id, { enabled: e.target.checked })}
                          className="accent-brand-primary rounded"
                        />
                        {f.label}
                      </label>
                      {f.key === "custom" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLayout((prev) => ({
                              fields: prev.fields.filter((x) => x.id !== f.id),
                            }));
                          }}
                          className="text-slate-400 hover:text-rose-600 p-0.5"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Extended options when selected */}
                    {isSelected && f.enabled && (
                      <div className="mt-3 space-y-2 border-t border-slate-100 pt-2 text-xs text-slate-600">
                        {/* Text template for editable or custom fields */}
                        {(f.text !== undefined || f.key === "custom") && (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Text Content &amp; Dynamic Tokens
                            </label>
                            <textarea
                              value={f.text ?? ""}
                              onChange={(e) => updateField(f.id, { text: e.target.value })}
                              rows={3}
                              placeholder="Type text with {{name}}, {{passport_number}}, etc."
                              className={`${inputCls} !text-xs !py-1 font-mono`}
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Size (pt)</label>
                            <input
                              type="number"
                              min={6}
                              max={64}
                              value={f.size}
                              onChange={(e) => updateField(f.id, { size: Number(e.target.value) || 9 })}
                              className={`${inputCls} !text-xs !py-1`}
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Color</label>
                            <input
                              type="color"
                              value={f.color}
                              onChange={(e) => updateField(f.id, { color: e.target.value })}
                              className="h-8 w-full cursor-pointer rounded-lg border border-slate-300"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Font</label>
                            <select
                              value={f.font}
                              onChange={(e) => updateField(f.id, { font: e.target.value as VisaFieldFont })}
                              className={`${inputCls} !text-xs !py-1`}
                            >
                              <option value="Helvetica">Helvetica</option>
                              <option value="Helvetica-Bold">Helvetica-Bold</option>
                              <option value="Times-Roman">Times-Roman</option>
                              <option value="Times-Bold">Times-Bold</option>
                              <option value="Times-Italic">Times-Italic</option>
                              <option value="Courier">Courier</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Align</label>
                            <select
                              value={f.align}
                              onChange={(e) => updateField(f.id, { align: e.target.value as "left" | "center" | "right" })}
                              className={`${inputCls} !text-xs !py-1`}
                            >
                              <option value="left">Left</option>
                              <option value="center">Center</option>
                              <option value="right">Right</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                            Max Width (0 = no wrap)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={600}
                            value={f.width ?? 0}
                            onChange={(e) => updateField(f.id, { width: Number(e.target.value) || 0 })}
                            className={`${inputCls} !text-xs !py-1`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save Template Form */}
            <form action={saveVisaCanvasTemplateAction} className="mt-4 border-t border-slate-100 pt-4 space-y-3">
              <input type="hidden" name="layout" value={JSON.stringify(layout)} />
              {upload && (
                <>
                  <input type="hidden" name="file_b64" value={upload.fileB64} />
                  <input type="hidden" name="preview_b64" value={upload.previewB64} />
                  <input type="hidden" name="mime" value={upload.mime} />
                  <input type="hidden" name="width" value={upload.width} />
                  <input type="hidden" name="height" value={upload.height} />
                </>
              )}

              <div className="flex flex-col gap-2">
                <SubmitButton pendingText="Saving Template…">
                  Save Template
                </SubmitButton>

                <a
                  href="/api/visa-letter?preview=1&inline=1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btnSecondary} flex items-center justify-center gap-1.5`}
                >
                  <Eye className="h-4 w-4" /> Live PDF Preview
                </a>
              </div>
            </form>

            {existing && (
              <form action={deleteVisaCanvasTemplateAction} className="pt-2">
                <SubmitButton
                  className={`${btnDanger} w-full text-xs !py-1.5`}
                  confirm="Revert uploaded template back to standard default letterhead?"
                >
                  Remove Uploaded Template
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
