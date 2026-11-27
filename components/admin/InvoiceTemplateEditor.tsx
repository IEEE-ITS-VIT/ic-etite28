"use client";

import { useEffect, useRef, useState } from "react";
import {
  Eye,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Move,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import {
  deleteInvoiceCanvasTemplateAction,
  saveInvoiceCanvasTemplateAction,
} from "@/app/actions/invoice-template";
import {
  DEFAULT_INVOICE_LAYOUT,
  INVOICE_FIELD_DEFINITIONS,
  getInvoiceFieldValue,
  type InvoiceFieldFont,
  type InvoiceFieldKey,
  type InvoiceLayout,
  type InvoiceLayoutField,
  type InvoiceTemplateRow,
} from "@/lib/invoice-template/types";
import SubmitButton from "@/components/portal/SubmitButton";
import { btnDanger, btnPrimary, btnSecondary, inputCls } from "@/components/portal/ui";

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

export default function InvoiceTemplateEditor({ existing }: { existing: InvoiceTemplateRow | null }) {
  let initialLayout: InvoiceLayout = DEFAULT_INVOICE_LAYOUT;
  if (existing?.layout) {
    try {
      const parsed = JSON.parse(existing.layout);
      if (Array.isArray(parsed?.fields)) initialLayout = parsed;
    } catch {}
  }

  const [layout, setLayout] = useState<InvoiceLayout>(initialLayout);
  const [selectedId, setSelectedId] = useState<string>(initialLayout.fields[0]?.id ?? "f_num");
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
  const existingPreviewUrl = existing?.preview_b64 || existing?.file_b64 ? "/api/admin/invoices/template-preview" : null;
  const imageUrl = upload?.url ?? existingPreviewUrl;
  const dims = upload ?? (existing?.width && existing?.height ? existing : { width: 595, height: 842 });
  const scale = boxWidth / (dims.width || 595);

  const selectedIndex = layout.fields.findIndex((f) => f.id === selectedId);
  const selectedField = layout.fields[selectedIndex] ?? layout.fields[0];

  const updateField = (id: string, patch: Partial<InvoiceLayoutField>) => {
    setLayout((prev) => ({
      fields: prev.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    }));
  };

  const addField = (defKey: InvoiceFieldKey) => {
    const def = INVOICE_FIELD_DEFINITIONS.find((d) => d.key === defKey);
    const newId = `f_${Date.now().toString(36)}`;
    const newField: InvoiceLayoutField = {
      id: newId,
      key: defKey,
      label: def?.label || "Custom Field",
      x: 0.2,
      y: 0.35,
      font: def?.defaultFont || "Helvetica",
      fontSize: def?.defaultFontSize || 10,
      color: def?.defaultColor || "#002147",
      align: def?.defaultAlign || "left",
      width: def?.defaultWidth || 0.5,
      multiline: def?.multiline || false,
      customText: defKey === "custom" ? "Custom Note / Tax ID" : undefined,
    };
    setLayout((prev) => ({ fields: [...prev.fields, newField] }));
    setSelectedId(newId);
  };

  const removeField = (id: string) => {
    if (layout.fields.length <= 1) return;
    setLayout((prev) => ({ fields: prev.fields.filter((f) => f.id !== id) }));
    if (selectedId === id) {
      const remaining = layout.fields.filter((f) => f.id !== id);
      setSelectedId(remaining[0]?.id || "");
    }
  };

  const resetToDefaultLayout = () => {
    setLayout(DEFAULT_INVOICE_LAYOUT);
    setSelectedId(DEFAULT_INVOICE_LAYOUT.fields[0].id);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErr("");
    setBusy("Reading template file...");
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const res = await processPdfFile(file);
        setUpload(res);
      } else if (file.type.startsWith("image/")) {
        const res = await processImageFile(file);
        setUpload(res);
      } else {
        throw new Error("Please upload a PDF document or image file (PNG, JPG, WebP).");
      }
    } catch (error: unknown) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Failed to process template file.";
      setErr(msg);
    } finally {
      setBusy("");
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 shadow-sm transition-colors hover:border-brand-primary">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Upload Invoice Stationery / Background (PDF or Image)</h4>
              <p className="text-xs text-slate-500">
                Upload your official letterhead or invoice border (A4 PDF or high-res PNG/JPG). Drag fields anywhere on the page.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <label className={`${btnSecondary} cursor-pointer text-xs`}>
              <span>{busy ? busy : "Browse File..."}</span>
              <input
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={Boolean(busy)}
                onChange={handleFileUpload}
              />
            </label>
            {existing?.file_b64 && (
              <form action={deleteInvoiceCanvasTemplateAction}>
                <SubmitButton className={btnDanger} confirm="Remove custom template and revert to standard layout?">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Template</span>
                </SubmitButton>
              </form>
            )}
          </div>
        </div>
        {err && <p className="mt-2 text-xs font-semibold text-rose-600">{err}</p>}
      </div>

      {/* Editor Grid: Canvas (Left) + Field Controls (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Canvas */}
        <div className="lg:col-span-8 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Visual Canvas ({dims.width} × {dims.height} pt)
              </span>
              {upload && <span className="rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">Unsaved Background</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetToDefaultLayout}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 underline"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Reset Positions</span>
              </button>
              <a
                href="/api/admin/invoices/preview"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Preview PDF</span>
              </a>
            </div>
          </div>

          <div
            ref={boxRef}
            className="relative mx-auto overflow-hidden rounded-xl border border-slate-300 bg-white shadow-md select-none touch-none"
            style={{
              width: "100%",
              maxWidth: 620,
              aspectRatio: `${dims.width} / ${dims.height}`,
            }}
          >
            {/* Background Image / Letterhead Preview */}
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt="Invoice Template Background"
                className="absolute inset-0 h-full w-full object-contain pointer-events-none"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:24px_24px]">
                {/* Default Header Banner Preview */}
                <div className="h-16 w-full bg-[#002147] border-b-2 border-[#D39E00] px-5 flex items-center justify-between text-white">
                  <span className="font-serif font-black text-sm tracking-wider">ic-ETITE&apos;28 · VIT</span>
                  <span className="text-xs font-bold text-[#D39E00]">INVOICE</span>
                </div>
              </div>
            )}

            {/* Draggable Fields */}
            {layout.fields.map((f) => {
              const isSelected = f.id === selectedId;
              const textVal = getInvoiceFieldValue(f, null, null, true);

              return (
                <div
                  key={f.id}
                  onPointerDown={startDrag(f.id)}
                  className={`absolute cursor-move transition-shadow ${
                    isSelected
                      ? "ring-2 ring-brand-primary ring-offset-1 z-30 shadow-lg"
                      : "hover:ring-1 hover:ring-slate-400 z-20"
                  }`}
                  style={{
                    left: `${f.x * 100}%`,
                    top: `${f.y * 100}%`,
                    transform: f.align === "center" ? "translateX(-50%)" : f.align === "right" ? "translateX(-100%)" : "none",
                    width: f.width ? `${f.width * 100}%` : undefined,
                  }}
                >
                  <div
                    className={`px-1.5 py-0.5 rounded border text-left ${
                      isSelected
                        ? "bg-blue-50/90 border-blue-400"
                        : "bg-white/90 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-1 leading-none mb-0.5">
                      <Move className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">
                        {f.label}
                      </span>
                    </div>
                    <div
                      className="truncate leading-tight select-none"
                      style={{
                        fontFamily: f.font.includes("Times") ? "serif" : f.font.includes("Courier") ? "monospace" : "sans-serif",
                        fontWeight: f.font.includes("Bold") ? "bold" : "normal",
                        fontSize: `${Math.max(9, f.fontSize * scale)}px`,
                        color: f.color || "#000000",
                        textAlign: f.align,
                      }}
                    >
                      {textVal}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Field Inspector & Customizer */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Type className="h-4 w-4 text-brand-primary" />
                <h4 className="font-bold text-slate-900 text-sm">Selected Field</h4>
              </div>
              {selectedField && (
                <button
                  type="button"
                  onClick={() => removeField(selectedField.id)}
                  title="Remove this field from layout"
                  className="text-xs text-rose-500 hover:text-rose-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {selectedField ? (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Field Type</label>
                  <select
                    value={selectedField.key}
                    onChange={(e) => {
                      const newKey = e.target.value as InvoiceFieldKey;
                      const def = INVOICE_FIELD_DEFINITIONS.find((d) => d.key === newKey);
                      updateField(selectedField.id, {
                        key: newKey,
                        label: def?.label || "Field",
                        customText: newKey === "custom" ? (selectedField.customText || "Custom Text") : undefined,
                      });
                    }}
                    className={inputCls}
                  >
                    {INVOICE_FIELD_DEFINITIONS.map((def) => (
                      <option key={def.key} value={def.key}>
                        {def.label}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedField.key === "custom" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Custom Text</label>
                    <input
                      type="text"
                      value={selectedField.customText || ""}
                      onChange={(e) => updateField(selectedField.id, { customText: e.target.value })}
                      placeholder="e.g. Registered in VIT Vellore"
                      className={inputCls}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">X Position (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={Math.round(selectedField.x * 1000) / 10}
                      onChange={(e) => updateField(selectedField.id, { x: Number(e.target.value) / 100 })}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Y Position (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={Math.round(selectedField.y * 1000) / 10}
                      onChange={(e) => updateField(selectedField.id, { y: Number(e.target.value) / 100 })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Font Family</label>
                    <select
                      value={selectedField.font}
                      onChange={(e) => updateField(selectedField.id, { font: e.target.value as InvoiceFieldFont })}
                      className={inputCls}
                    >
                      <option value="Helvetica">Helvetica (Standard)</option>
                      <option value="Helvetica-Bold">Helvetica Bold</option>
                      <option value="Times-Roman">Times New Roman</option>
                      <option value="Times-Bold">Times Bold</option>
                      <option value="Courier">Courier (Monospace)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Font Size (pt)</label>
                    <input
                      type="number"
                      min={7}
                      max={32}
                      value={selectedField.fontSize}
                      onChange={(e) => updateField(selectedField.id, { fontSize: Number(e.target.value) })}
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Text Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedField.color || "#000000"}
                        onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                        className="h-8 w-10 p-0 rounded border border-slate-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedField.color || "#000000"}
                        onChange={(e) => updateField(selectedField.id, { color: e.target.value })}
                        className={`${inputCls} !py-1 text-xs uppercase`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Alignment</label>
                    <div className="flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateField(selectedField.id, { align: "left" })}
                        className={`flex-1 py-1 rounded text-xs flex justify-center ${selectedField.align === "left" ? "bg-white shadow text-brand-primary" : "text-slate-500"}`}
                      >
                        <AlignLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(selectedField.id, { align: "center" })}
                        className={`flex-1 py-1 rounded text-xs flex justify-center ${selectedField.align === "center" ? "bg-white shadow text-brand-primary" : "text-slate-500"}`}
                      >
                        <AlignCenter className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateField(selectedField.id, { align: "right" })}
                        className={`flex-1 py-1 rounded text-xs flex justify-center ${selectedField.align === "right" ? "bg-white shadow text-brand-primary" : "text-slate-500"}`}
                      >
                        <AlignRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="text-xs text-slate-600 font-medium">Multiline Wrapping</label>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedField.multiline)}
                    onChange={(e) => updateField(selectedField.id, { multiline: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Click any field on the canvas to configure it.</p>
            )}

            {/* Add Field Button */}
            <div className="border-t border-slate-100 pt-3">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Add Another Field</label>
              <div className="flex gap-2">
                <select id="addFieldSelect" defaultValue="custom" className={`${inputCls} text-xs`}>
                  {INVOICE_FIELD_DEFINITIONS.map((def) => (
                    <option key={def.key} value={def.key}>
                      + {def.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("addFieldSelect") as HTMLSelectElement;
                    if (el) addField(el.value as InvoiceFieldKey);
                  }}
                  className={`${btnSecondary} text-xs shrink-0`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add</span>
                </button>
              </div>
            </div>
          </div>

          {/* Save Action Form */}
          <form action={saveInvoiceCanvasTemplateAction} className="space-y-3">
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
            <SubmitButton className={`${btnPrimary} w-full justify-center py-2.5`} pendingText="Saving template...">
              Save Template Layout & Positions
            </SubmitButton>
          </form>
        </div>
      </div>
    </div>
  );
}
