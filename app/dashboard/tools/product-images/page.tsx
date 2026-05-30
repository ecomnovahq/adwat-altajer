"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Image as ImageIcon,
  Upload,
  Download,
  ZoomIn,
  RefreshCw,
  Layers,
  Sun,
  Camera,
  Ratio,
  Sparkles,
  Library,
  X,
  Check,
  Loader2,
  RotateCcw,
  Copy,
  Star,
  Wand2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeneratedImage {
  id: string;
  url: string;
  style: string;
  prompt: string;
  saved: boolean;
}

interface FormState {
  productName: string;
  description: string;
  style: string;
  lighting: string;
  angle: string;
  ratio: string;
  colors: string;
  logoFile: File | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLES = [
  {
    id: "white-studio",
    label: "استوديو أبيض",
    labelEn: "White Studio",
    icon: "⬜",
    desc: "خلفية بيضاء نظيفة",
    gradient: "from-gray-100 to-white",
    border: "border-gray-300",
  },
  {
    id: "lifestyle",
    label: "Lifestyle",
    labelEn: "Lifestyle",
    icon: "🌿",
    desc: "بيئة طبيعية حياتية",
    gradient: "from-green-900/40 to-emerald-900/40",
    border: "border-green-600",
  },
  {
    id: "luxury",
    label: "فاخر",
    labelEn: "Luxury",
    icon: "✨",
    desc: "إضاءة ناعمة وتفاصيل راقية",
    gradient: "from-amber-900/40 to-yellow-900/40",
    border: "border-amber-500",
  },
  {
    id: "flat-lay",
    label: "Flat Lay",
    labelEn: "Flat Lay",
    icon: "📐",
    desc: "صورة من الأعلى منسقة",
    gradient: "from-violet-900/40 to-purple-900/40",
    border: "border-violet-500",
  },
];

const LIGHTINGS = [
  { id: "natural", label: "طبيعي", icon: "☀️" },
  { id: "studio", label: "استوديو", icon: "💡" },
  { id: "dramatic", label: "درامي", icon: "🌑" },
  { id: "soft", label: "ناعم", icon: "🌤️" },
];

const ANGLES = [
  { id: "front", label: "أمامي" },
  { id: "side", label: "جانبي" },
  { id: "top", label: "علوي" },
  { id: "45deg", label: "45°" },
];

const RATIOS = [
  { id: "1:1", label: "1:1", desc: "مربع" },
  { id: "4:3", label: "4:3", desc: "أفقي" },
  { id: "9:16", label: "9:16", desc: "عمودي" },
  { id: "16:9", label: "16:9", desc: "واسع" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StyleCard({
  style,
  selected,
  onClick,
}: {
  style: (typeof STYLES)[0];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative rounded-xl border-2 p-4 text-right transition-all ${
        selected
          ? `border-violet-500 bg-gradient-to-br ${style.gradient} ring-2 ring-violet-500/30`
          : `border-gray-700 bg-gray-800/50 hover:border-gray-600`
      }`}
    >
      {selected && (
        <div className="absolute top-2 left-2 rounded-full bg-violet-500 p-0.5">
          <Check className="h-3 w-3 text-white" />
        </div>
      )}
      <div className="mb-2 text-3xl">{style.icon}</div>
      <div className="font-bold text-white">{style.label}</div>
      <div className="mt-1 text-xs text-gray-400">{style.desc}</div>
    </motion.button>
  );
}

function ImageCard({
  image,
  onSave,
  onDownload,
  onRegenerate,
  onUseAsBase,
}: {
  image: GeneratedImage;
  onSave: () => void;
  onDownload: () => void;
  onRegenerate: () => void;
  onUseAsBase: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="group relative overflow-hidden rounded-xl bg-gray-800"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Image */}
        <div className="aspect-square w-full">
          <img
            src={image.url}
            alt={image.prompt}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>

        {/* Hover overlay */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-sm"
            >
              <div className="flex gap-2">
                <button
                  onClick={() => setZoomed(true)}
                  className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="تكبير"
                >
                  <ZoomIn className="h-5 w-5" />
                </button>
                <button
                  onClick={onDownload}
                  className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="تحميل"
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  onClick={onRegenerate}
                  className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="إعادة توليد"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
                <button
                  onClick={onUseAsBase}
                  className="rounded-lg bg-white/10 p-2 text-white transition hover:bg-white/20"
                  title="استخدام كأساس"
                >
                  <Layers className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={onSave}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  image.saved
                    ? "bg-green-600 text-white"
                    : "bg-violet-600 text-white hover:bg-violet-500"
                }`}
              >
                {image.saved ? (
                  <>
                    <Check className="h-4 w-4" /> محفوظ
                  </>
                ) : (
                  <>
                    <Library className="h-4 w-4" /> حفظ في المكتبة
                  </>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Saved badge */}
        {image.saved && (
          <div className="absolute top-2 right-2 rounded-full bg-green-500 p-1">
            <Star className="h-3 w-3 text-white" fill="white" />
          </div>
        )}
      </motion.div>

      {/* Zoom modal */}
      <AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setZoomed(false)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={image.url}
              alt={image.prompt}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setZoomed(false)}
              className="absolute top-4 left-4 rounded-full bg-white/10 p-2 text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SkeletonImage() {
  return (
    <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-800">
      <div className="h-full w-full animate-pulse bg-gradient-to-br from-gray-700 via-gray-600 to-gray-700">
        <div className="flex h-full items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className="h-8 w-8 text-violet-400/50" />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductImagesPage() {
  const [form, setForm] = useState<FormState>({
    productName: "",
    description: "",
    style: "white-studio",
    lighting: "natural",
    angle: "front",
    ratio: "1:1",
    colors: "",
    logoFile: null,
  });
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [promptCopied, setPromptCopied] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const loadingSteps = [
    "تحليل وصف المنتج...",
    "بناء الـ prompt...",
    "إرسال إلى Flux Schnell...",
    "معالجة الصورة المولّدة...",
  ];

  const update = (key: keyof FormState, val: FormState[typeof key]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) update("logoFile", file);
  };

  const handleGenerate = async () => {
    if (!form.productName.trim()) {
      setError("أدخل اسم المنتج");
      return;
    }

    setLoading(true);
    setError("");
    setImages([]);
    setLoadingStep(0);

    const stepInterval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, loadingSteps.length - 1));
    }, 1500);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null;
      const res = await fetch("/api/tools/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          productName: form.productName,
          description: form.description,
          style: form.style,
          colors: form.colors,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل التوليد");

      // backend returns {image: base64, mimeType}
      const styleLabel = STYLES.find((s) => s.id === form.style)?.label || form.style;
      const dataUrl = data.image
        ? `data:${data.mimeType || "image/png"};base64,${data.image}`
        : (data.imageUrl || null);
      if (!dataUrl) throw new Error("لم يتم توليد صورة");
      const generatedImages: GeneratedImage[] = [{
        id: `img-${Date.now()}-0`,
        url: dataUrl,
        style: styleLabel,
        prompt: form.productName,
        saved: false,
      }];

      setImages(generatedImages);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      clearInterval(stepInterval);
      setLoading(false);
    }
  };

  const handleSave = (id: string) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, saved: !img.saved } : img))
    );
  };

  const handleDownload = async (image: GeneratedImage) => {
    const link = document.createElement("a");
    link.href = image.url;
    link.download = `product-${image.id}.png`;
    link.click();
  };

  const handleRegenerate = useCallback(
    async (id: string) => {
      setImages((prev) =>
        prev.map((img) =>
          img.id === id
            ? { ...img, url: "", saved: false }
            : img
        )
      );

      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null;
        const res = await fetch("/api/tools/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            productName: form.productName,
            description: form.description,
            style: form.style,
            colors: form.colors,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        const newUrl = data.image
          ? `data:${data.mimeType || "image/png"};base64,${data.image}`
          : (data.imageUrl || null);
        setImages((prev) =>
          prev.map((img) => (img.id === id ? { ...img, url: newUrl } : img))
        );
      } catch {
        setImages((prev) =>
          prev.filter((img) => img.id !== id)
        );
      }
    },
    [form]
  );

  const handleUseAsBase = (image: GeneratedImage) => {
    setForm((prev) => ({
      ...prev,
      description: `${prev.description} [استناداً إلى: ${image.prompt}]`,
    }));
  };

  const handleDownloadAll = () => {
    images.forEach((img, i) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = img.url;
        link.download = `product-${i + 1}.png`;
        link.click();
      }, i * 300);
    });
  };

  const copyPrompt = () => {
    navigator.clipboard.writeText(prompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-600/20 p-3">
            <ImageIcon className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">صور المنتجات</h1>
            <p className="text-sm text-gray-400">
              توليد صور احترافية بالذكاء الاصطناعي — Flux Schnell
            </p>
          </div>
          <div className="mr-auto">
            <Badge className="bg-violet-600/20 text-violet-300 border-violet-600/40">
              <Sparkles className="ml-1 h-3 w-3" />
              Hugging Face
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* ─── Left: Form ─────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Product Info */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-violet-400" />
                معلومات المنتج
              </h2>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">اسم المنتج *</Label>
                <Input
                  value={form.productName}
                  onChange={(e) => update("productName", e.target.value)}
                  placeholder="مثال: حقيبة جلدية فاخرة"
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">
                  وصف تفصيلي (اختياري)
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="صف المنتج، مواده، ألوانه، مميزاته..."
                  className="h-24 resize-none border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300 text-sm">
                  الألوان الرئيسية (اختياري)
                </Label>
                <Input
                  value={form.colors}
                  onChange={(e) => update("colors", e.target.value)}
                  placeholder="مثال: ذهبي، أسود، بيج"
                  className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Style Selection */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-violet-400" />
                نمط الصورة
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {STYLES.map((s) => (
                  <StyleCard
                    key={s.id}
                    style={s}
                    selected={form.style === s.id}
                    onClick={() => update("style", s.id)}
                  />
                ))}
              </div>
            </div>

            {/* Lighting */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-3">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Sun className="h-4 w-4 text-violet-400" />
                الإضاءة
              </h2>
              <div className="flex gap-2 flex-wrap">
                {LIGHTINGS.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => update("lighting", l.id)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition ${
                      form.lighting === l.id
                        ? "bg-violet-600 text-white"
                        : "border border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <span>{l.icon}</span>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Angle & Ratio */}
            <div className="grid grid-cols-2 gap-4">
              {/* Angle */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-violet-400" />
                  الزاوية
                </h3>
                <div className="space-y-1.5">
                  {ANGLES.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => update("angle", a.id)}
                      className={`w-full rounded-lg px-3 py-1.5 text-right text-sm transition ${
                        form.angle === a.id
                          ? "bg-violet-600 text-white"
                          : "border border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
                      }`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ratio */}
              <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-4 space-y-3">
                <h3 className="font-semibold text-white text-sm flex items-center gap-1.5">
                  <Ratio className="h-3.5 w-3.5 text-violet-400" />
                  النسبة
                </h3>
                <div className="space-y-1.5">
                  {RATIOS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => update("ratio", r.id)}
                      className={`w-full flex items-center justify-between rounded-lg px-3 py-1.5 text-sm transition ${
                        form.ratio === r.id
                          ? "bg-violet-600 text-white"
                          : "border border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600"
                      }`}
                    >
                      <span className="font-mono">{r.id}</span>
                      <span className="text-xs opacity-70">{r.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-3">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-violet-400" />
                شعار المتجر (اختياري)
              </h2>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              {form.logoFile ? (
                <div className="flex items-center justify-between rounded-lg border border-green-600/40 bg-green-900/20 px-3 py-2">
                  <span className="text-sm text-green-300">
                    {form.logoFile.name}
                  </span>
                  <button
                    onClick={() => update("logoFile", null)}
                    className="text-gray-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-gray-700 py-4 text-center text-sm text-gray-400 transition hover:border-violet-600/50 hover:text-violet-400"
                >
                  <Upload className="mx-auto mb-1 h-5 w-5" />
                  اضغط لرفع الشعار
                </button>
              )}
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || !form.productName.trim()}
              className="w-full bg-violet-600 py-6 text-lg font-bold hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                  {loadingSteps[loadingStep]}
                </>
              ) : (
                <>
                  <Sparkles className="ml-2 h-5 w-5" />
                  توليد صورة
                </>
              )}
            </Button>

            {error && (
              <div className="rounded-xl border border-red-600/40 bg-red-900/20 p-4 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>

          {/* ─── Right: Output ───────────────────────────────────── */}
          <div className="space-y-5">
            {/* Images Grid */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-white">الصور المولّدة</h2>
                {images.length > 0 && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerate}
                      className="border-gray-700 bg-gray-800 text-gray-300"
                    >
                      <RotateCcw className="ml-1.5 h-3.5 w-3.5" />
                      إعادة توليد الكل
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadAll}
                      className="border-gray-700 bg-gray-800 text-gray-300"
                    >
                      <Download className="ml-1.5 h-3.5 w-3.5" />
                      تحميل الكل
                    </Button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {loading ? (
                  <>
                    <SkeletonImage />
                    <SkeletonImage />
                    <SkeletonImage />
                    <SkeletonImage />
                  </>
                ) : images.length > 0 ? (
                  images.map((img) => (
                    <ImageCard
                      key={img.id}
                      image={img}
                      onSave={() => handleSave(img.id)}
                      onDownload={() => handleDownload(img)}
                      onRegenerate={() => handleRegenerate(img.id)}
                      onUseAsBase={() => handleUseAsBase(img)}
                    />
                  ))
                ) : (
                  <div className="col-span-2 flex h-64 flex-col items-center justify-center gap-3 text-gray-500">
                    <ImageIcon className="h-12 w-12 opacity-30" />
                    <p>أدخل معلومات المنتج واضغط توليد</p>
                  </div>
                )}
              </div>
            </div>

            {/* Prompt display */}
            <AnimatePresence>
              {prompt && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white text-sm">
                      الـ Prompt المستخدم
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={copyPrompt}
                      className="h-7 text-xs text-gray-400 hover:text-white"
                    >
                      {promptCopied ? (
                        <Check className="h-3.5 w-3.5 text-green-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-400 font-mono leading-relaxed bg-gray-800/50 rounded-lg p-3">
                    {prompt}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Library */}
            <AnimatePresence>
              {images.some((img) => img.saved) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-violet-600/30 bg-violet-900/10 p-5 space-y-3"
                >
                  <h3 className="font-bold text-violet-300 flex items-center gap-2">
                    <Library className="h-4 w-4" />
                    مكتبة الصور المحفوظة
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {images
                      .filter((img) => img.saved)
                      .map((img) => (
                        <div
                          key={img.id}
                          className="aspect-square overflow-hidden rounded-lg"
                        >
                          <img
                            src={img.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full border-violet-600/40 text-violet-300"
                    onClick={() =>
                      images
                        .filter((img) => img.saved)
                        .forEach((img, i) => {
                          setTimeout(() => handleDownload(img), i * 300);
                        })
                    }
                  >
                    <Download className="ml-2 h-3.5 w-3.5" />
                    تحميل المحفوظات
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Tips */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-5 space-y-3">
              <h3 className="font-semibold text-white text-sm">
                نصائح للحصول على أفضل نتائج
              </h3>
              <ul className="space-y-2 text-sm text-gray-400">
                {[
                  "صف المنتج بتفاصيل دقيقة مثل الملمس والمواد",
                  "حدد الألوان بالضبط لنتائج أكثر دقة",
                  "استخدم 'استوديو أبيض' لصور التجارة الإلكترونية",
                  "جرب 'Lifestyle' لمنتجات الفاشن والديكور",
                  "اضغط على أيقونة الطبقات لاستخدام صورة كأساس",
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 rounded-full bg-violet-600/20 p-0.5 text-violet-400">
                      <Check className="h-3 w-3" />
                    </span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
