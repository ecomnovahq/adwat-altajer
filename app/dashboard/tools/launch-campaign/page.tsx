"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Rocket,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2,
  Sparkles,
  Package,
  Users,
  CalendarDays,
  BarChart3,
  Download,
  Copy,
  Share2,
  Instagram,
  Twitter,
  Youtube,
  Facebook,
  MessageCircle,
  Mail,
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  Megaphone,
  FileText,
  Image as ImageIcon,
  Star,
  AlertCircle,
  X,
  Plus,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step1 {
  productName: string;
  category: string;
  description: string;
}
interface Step2 {
  features: string[];
  audience: string;
  price: string;
  competitors: string;
}
interface Step3 {
  launchDate: string;
  budget: string;
  platforms: string[];
  goal: string;
}

interface CampaignCard {
  id: string;
  type: "post" | "ad" | "email" | "story" | "video" | "offer";
  platform: string;
  title: string;
  content: string;
  timing: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

interface CampaignResult {
  summary: string;
  timeline: Array<{ day: string; tasks: string[] }>;
  cards: CampaignCard[];
  kpis: Array<{ label: string; value: string; icon: string }>;
  budget: Array<{ channel: string; amount: string; pct: number }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "أزياء وملابس",
  "إلكترونيات",
  "جمال وعناية",
  "طعام وشراب",
  "منزل وديكور",
  "رياضة",
  "صحة",
  "كتب وتعليم",
  "ألعاب وترفيه",
  "أخرى",
];

const PLATFORMS_LIST = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-400" },
  { id: "tiktok", label: "TikTok", icon: Megaphone, color: "text-cyan-400" },
  { id: "snapchat", label: "Snapchat", icon: Star, color: "text-yellow-400" },
  { id: "twitter", label: "X (Twitter)", icon: Twitter, color: "text-sky-400" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-400" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "text-red-400" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, color: "text-green-400" },
  { id: "email", label: "البريد", icon: Mail, color: "text-violet-400" },
];

const GOALS = [
  { id: "awareness", label: "زيادة الوعي بالعلامة" },
  { id: "sales", label: "تعظيم المبيعات" },
  { id: "leads", label: "جمع العملاء المحتملين" },
  { id: "engagement", label: "زيادة التفاعل" },
  { id: "launch", label: "إطلاق منتج جديد" },
  { id: "retention", label: "الاحتفاظ بالعملاء" },
];

const CARD_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  post: Instagram,
  ad: Target,
  email: Mail,
  story: Star,
  video: Youtube,
  offer: DollarSign,
};

const CARD_TYPE_COLORS: Record<string, string> = {
  post: "violet",
  ad: "blue",
  email: "amber",
  story: "pink",
  video: "red",
  offer: "green",
};

const STEPS = [
  { label: "المنتج", icon: Package },
  { label: "الجمهور", icon: Users },
  { label: "الإطلاق", icon: CalendarDays },
  { label: "مراجعة", icon: BarChart3 },
];

// ─── Tags Input ───────────────────────────────────────────────────────────────

function TagsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800 p-2 focus-within:border-violet-500">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-violet-600/20 px-2.5 py-0.5 text-sm text-violet-300"
          >
            {tag}
            <button onClick={() => onChange(value.filter((t) => t !== tag))}>
              <X className="h-3 w-3 hover:text-white" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
        />
        <button
          onClick={add}
          className="rounded-md bg-violet-600/20 px-2 py-1 text-violet-400 hover:bg-violet-600/40 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <div key={i} className="flex items-center">
            <div
              className={`flex flex-col items-center gap-1 ${
                active ? "text-violet-400" : done ? "text-green-400" : "text-gray-600"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all ${
                  active
                    ? "border-violet-500 bg-violet-600/20"
                    : done
                    ? "border-green-500 bg-green-600/20"
                    : "border-gray-700 bg-gray-800"
                }`}
              >
                {done ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              <span className="text-xs font-medium">{step.label}</span>
            </div>
            {i < total - 1 && (
              <div
                className={`mb-5 h-0.5 w-12 sm:w-20 transition-all ${
                  done ? "bg-green-500" : "bg-gray-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────

function CampaignContentCard({ card }: { card: CampaignCard }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const Icon = card.icon;
  const colorMap: Record<string, string> = {
    violet: "border-violet-600/40 bg-violet-900/10",
    blue: "border-blue-600/40 bg-blue-900/10",
    amber: "border-amber-600/40 bg-amber-900/10",
    pink: "border-pink-600/40 bg-pink-900/10",
    red: "border-red-600/40 bg-red-900/10",
    green: "border-green-600/40 bg-green-900/10",
  };
  const iconColorMap: Record<string, string> = {
    violet: "text-violet-400 bg-violet-600/20",
    blue: "text-blue-400 bg-blue-600/20",
    amber: "text-amber-400 bg-amber-600/20",
    pink: "text-pink-400 bg-pink-600/20",
    red: "text-red-400 bg-red-600/20",
    green: "text-green-400 bg-green-600/20",
  };

  const copy = () => {
    navigator.clipboard.writeText(card.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      className={`rounded-2xl border p-4 space-y-3 ${colorMap[card.color] || colorMap.violet}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={`rounded-lg p-2 ${iconColorMap[card.color]}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-white text-sm">{card.title}</div>
            <div className="text-xs text-gray-400">{card.platform}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge
            variant="outline"
            className="text-xs border-gray-700 text-gray-400"
          >
            <Clock className="ml-1 h-3 w-3" />
            {card.timing}
          </Badge>
          <button
            onClick={copy}
            className="rounded-lg border border-gray-700 p-1.5 text-gray-400 hover:text-white transition"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-400" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      <p className={`text-sm text-gray-300 leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}>
        {card.content}
      </p>

      {card.content.length > 150 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-violet-400 hover:text-violet-300"
        >
          {expanded ? "عرض أقل" : "عرض الكامل"}
        </button>
      )}
    </motion.div>
  );
}

// ─── Timeline ─────────────────────────────────────────────────────────────────

function Timeline({ items }: { items: CampaignResult["timeline"] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600/20 text-violet-400 text-xs font-bold">
              {i + 1}
            </div>
            {i < items.length - 1 && (
              <div className="mt-1 h-full w-0.5 bg-gray-700" />
            )}
          </div>
          <div className="pb-4">
            <div className="font-semibold text-white text-sm mb-1.5">
              {item.day}
            </div>
            <ul className="space-y-1">
              {item.tasks.map((task, j) => (
                <li
                  key={j}
                  className="flex items-start gap-1.5 text-sm text-gray-400"
                >
                  <ChevronLeft className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-violet-500" />
                  {task}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LaunchCampaignPage() {
  const [step, setStep] = useState(0);
  const [step1, setStep1] = useState<Step1>({
    productName: "",
    category: "",
    description: "",
  });
  const [step2, setStep2] = useState<Step2>({
    features: [],
    audience: "",
    price: "",
    competitors: "",
  });
  const [step3, setStep3] = useState<Step3>({
    launchDate: "",
    budget: "",
    platforms: [],
    goal: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"timeline" | "content" | "budget">(
    "content"
  );

  const loadingSteps = [
    "تحليل المنتج والسوق...",
    "تحديد الجمهور المستهدف...",
    "بناء استراتيجية المحتوى...",
    "توليد محتوى الحملة...",
    "تجهيز الجدول الزمني...",
  ];

  const canProceed = useMemo(() => {
    if (step === 0) return step1.productName.trim() && step1.category;
    if (step === 1) return step2.audience.trim();
    if (step === 2)
      return step3.launchDate && step3.platforms.length > 0 && step3.goal;
    return true;
  }, [step, step1, step2, step3]);

  const togglePlatform = (id: string) => {
    setStep3((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(id)
        ? prev.platforms.filter((p) => p !== id)
        : [...prev.platforms, id],
    }));
  };

  const handleLaunch = async () => {
    setLoading(true);
    setError("");
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep((prev) => Math.min(prev + 1, loadingSteps.length - 1));
    }, 1200);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null
      const res = await fetch("/api/tools/launch-campaign", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          productName: step1.productName,
          category: step1.category,
          description: step1.description,
          features: step2.features,
          audience: step2.audience,
          price: step2.price,
          competitors: step2.competitors,
          launchDate: step3.launchDate,
          budget: step3.budget,
          platforms: step3.platforms,
          goal: step3.goal,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إنشاء الحملة");

      const cards: CampaignCard[] = (data.cards || []).map(
        (c: Omit<CampaignCard, "icon">) => ({
          ...c,
          icon: CARD_TYPE_ICONS[c.type] || FileText,
          color: CARD_TYPE_COLORS[c.type] || "violet",
        })
      );

      setResult({ ...data, cards });
      setStep(4);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const exportCampaign = () => {
    if (!result) return;
    const content = [
      `# حملة إطلاق: ${step1.productName}`,
      `\n## ملخص\n${result.summary}`,
      `\n## الجدول الزمني\n${result.timeline
        .map((t) => `### ${t.day}\n${t.tasks.map((task) => `- ${task}`).join("\n")}`)
        .join("\n\n")}`,
      `\n## محتوى الحملة\n${result.cards
        .map((c) => `### ${c.title} (${c.platform})\n${c.content}`)
        .join("\n\n")}`,
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campaign-${step1.productName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reset = () => {
    setStep(0);
    setResult(null);
    setError("");
    setStep1({ productName: "", category: "", description: "" });
    setStep2({ features: [], audience: "", price: "", competitors: "" });
    setStep3({ launchDate: "", budget: "", platforms: [], goal: "" });
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-600/20 p-3">
            <Rocket className="h-7 w-7 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">حملة الإطلاق</h1>
            <p className="text-sm text-gray-400">
              استراتيجية إطلاق متكاملة بالذكاء الاصطناعي — Gemini Pro
            </p>
          </div>
          <div className="mr-auto">
            <Badge className="bg-violet-600/20 text-violet-300 border-violet-600/40">
              <Sparkles className="ml-1 h-3 w-3" />
              Orchestrator AI
            </Badge>
          </div>
        </div>

        {/* ─── CAMPAIGN RESULT ──────────────────────────────────── */}
        {step === 4 && result ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="rounded-2xl border border-violet-600/30 bg-gradient-to-br from-violet-900/20 to-purple-900/20 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-white mb-2">
                    🚀 حملة {step1.productName} جاهزة!
                  </h2>
                  <p className="text-gray-300 leading-relaxed">{result.summary}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportCampaign}
                    className="border-gray-700 bg-gray-800 text-gray-300"
                  >
                    <Download className="ml-1.5 h-3.5 w-3.5" />
                    تصدير
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reset}
                    className="border-gray-700 bg-gray-800 text-gray-300"
                  >
                    حملة جديدة
                  </Button>
                </div>
              </div>
            </div>

            {/* KPIs */}
            {result.kpis && result.kpis.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {result.kpis.map((kpi, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 text-center"
                  >
                    <div className="text-2xl mb-1">{kpi.icon}</div>
                    <div className="text-xl font-black text-white">{kpi.value}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{kpi.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 rounded-xl border border-gray-800 bg-gray-900/80 p-1">
              {(
                [
                  { id: "content", label: "المحتوى", icon: FileText },
                  { id: "timeline", label: "الجدول الزمني", icon: CalendarDays },
                  { id: "budget", label: "توزيع الميزانية", icon: BarChart3 },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition ${
                      activeTab === tab.id
                        ? "bg-violet-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
              {activeTab === "content" && (
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-4 sm:grid-cols-2"
                >
                  {result.cards.map((card) => (
                    <CampaignContentCard key={card.id} card={card} />
                  ))}
                </motion.div>
              )}

              {activeTab === "timeline" && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6"
                >
                  <h3 className="mb-4 font-bold text-white">
                    الجدول الزمني للحملة
                  </h3>
                  <Timeline items={result.timeline} />
                </motion.div>
              )}

              {activeTab === "budget" && result.budget && (
                <motion.div
                  key="budget"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-3"
                >
                  <h3 className="font-bold text-white mb-4">
                    توزيع الميزانية المقترح
                  </h3>
                  {result.budget.map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">{item.channel}</span>
                        <span className="font-semibold text-white">
                          {item.amount}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.pct}%` }}
                          transition={{ delay: i * 0.1, duration: 0.6 }}
                          className="h-full rounded-full bg-violet-600"
                        />
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          /* ─── FORM ──────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Stepper */}
            <div className="flex justify-center">
              <Stepper current={step} total={4} />
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              {/* Step 0: Product */}
              {step === 0 && (
                <motion.div
                  key="step0"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5"
                >
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5">
                      معلومات المنتج
                    </h2>
                    <p className="text-sm text-gray-400">
                      أخبرنا عن المنتج الذي تريد إطلاقه
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">اسم المنتج *</Label>
                    <Input
                      value={step1.productName}
                      onChange={(e) =>
                        setStep1((p) => ({ ...p, productName: e.target.value }))
                      }
                      placeholder="مثال: عطر الملكة"
                      className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">الفئة *</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() =>
                            setStep1((p) => ({ ...p, category: cat }))
                          }
                          className={`rounded-lg border px-3 py-2 text-right text-sm transition ${
                            step1.category === cat
                              ? "border-violet-500 bg-violet-600/20 text-violet-300"
                              : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">وصف المنتج</Label>
                    <Textarea
                      value={step1.description}
                      onChange={(e) =>
                        setStep1((p) => ({ ...p, description: e.target.value }))
                      }
                      placeholder="صف منتجك ومميزاته وقصته..."
                      className="h-28 resize-none border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 1: Audience */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5"
                >
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5">
                      الجمهور والسوق
                    </h2>
                    <p className="text-sm text-gray-400">
                      من هو عميلك المثالي؟
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">
                      المميزات الرئيسية (Enter لإضافة)
                    </Label>
                    <TagsInput
                      value={step2.features}
                      onChange={(v) => setStep2((p) => ({ ...p, features: v }))}
                      placeholder="أضف ميزة..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">الجمهور المستهدف *</Label>
                    <Textarea
                      value={step2.audience}
                      onChange={(e) =>
                        setStep2((p) => ({ ...p, audience: e.target.value }))
                      }
                      placeholder="مثال: نساء 25-40 سنة، مهتمات بالعناية، دخل متوسط-مرتفع، مناطق الخليج..."
                      className="h-24 resize-none border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">سعر المنتج (ر.س)</Label>
                      <Input
                        type="number"
                        value={step2.price}
                        onChange={(e) =>
                          setStep2((p) => ({ ...p, price: e.target.value }))
                        }
                        placeholder="199"
                        className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">المنافسون</Label>
                      <Input
                        value={step2.competitors}
                        onChange={(e) =>
                          setStep2((p) => ({
                            ...p,
                            competitors: e.target.value,
                          }))
                        }
                        placeholder="اسم أو رابط المنافس"
                        className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Launch */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5"
                >
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5">
                      تفاصيل الإطلاق
                    </h2>
                    <p className="text-sm text-gray-400">
                      متى وأين وكيف تطلق؟
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">تاريخ الإطلاق *</Label>
                      <Input
                        type="date"
                        value={step3.launchDate}
                        onChange={(e) =>
                          setStep3((p) => ({ ...p, launchDate: e.target.value }))
                        }
                        className="border-gray-700 bg-gray-800 text-white [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-300">الميزانية (ر.س)</Label>
                      <Input
                        type="number"
                        value={step3.budget}
                        onChange={(e) =>
                          setStep3((p) => ({ ...p, budget: e.target.value }))
                        }
                        placeholder="5000"
                        className="border-gray-700 bg-gray-800 text-white placeholder:text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">المنصات *</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {PLATFORMS_LIST.map((p) => {
                        const Icon = p.icon;
                        const selected = step3.platforms.includes(p.id);
                        return (
                          <button
                            key={p.id}
                            onClick={() => togglePlatform(p.id)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-right text-sm transition ${
                              selected
                                ? "border-violet-500 bg-violet-600/20 text-violet-300"
                                : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                            }`}
                          >
                            <Icon className={`h-4 w-4 ${p.color}`} />
                            {p.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">الهدف الرئيسي *</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {GOALS.map((g) => (
                        <button
                          key={g.id}
                          onClick={() =>
                            setStep3((p) => ({ ...p, goal: g.id }))
                          }
                          className={`rounded-lg border px-3 py-2 text-right text-sm transition ${
                            step3.goal === g.id
                              ? "border-violet-500 bg-violet-600/20 text-violet-300"
                              : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5"
                >
                  <div>
                    <h2 className="text-lg font-bold text-white mb-0.5">
                      مراجعة الحملة
                    </h2>
                    <p className="text-sm text-gray-400">
                      تأكد من المعلومات قبل الإطلاق
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Product summary */}
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
                        <Package className="h-4 w-4" />
                        المنتج
                      </div>
                      <div className="text-white font-bold">{step1.productName}</div>
                      <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                        {step1.category}
                      </Badge>
                      {step1.description && (
                        <p className="text-xs text-gray-400 line-clamp-2">
                          {step1.description}
                        </p>
                      )}
                    </div>

                    {/* Audience summary */}
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
                        <Users className="h-4 w-4" />
                        الجمهور
                      </div>
                      <p className="text-sm text-gray-300">{step2.audience}</p>
                      {step2.price && (
                        <p className="text-xs text-gray-400">
                          السعر: {step2.price} ر.س
                        </p>
                      )}
                      {step2.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {step2.features.slice(0, 3).map((f, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs border-gray-600 text-gray-400"
                            >
                              {f}
                            </Badge>
                          ))}
                          {step2.features.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{step2.features.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Launch summary */}
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
                        <CalendarDays className="h-4 w-4" />
                        الإطلاق
                      </div>
                      <p className="text-sm text-gray-300">{step3.launchDate}</p>
                      {step3.budget && (
                        <p className="text-xs text-gray-400">
                          الميزانية: {Number(step3.budget).toLocaleString("ar-SA")} ر.س
                        </p>
                      )}
                    </div>

                    {/* Platforms summary */}
                    <div className="rounded-xl border border-gray-700 bg-gray-800/50 p-4 space-y-2">
                      <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
                        <TrendingUp className="h-4 w-4" />
                        المنصات والهدف
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {step3.platforms.map((id) => {
                          const p = PLATFORMS_LIST.find((pl) => pl.id === id);
                          return p ? (
                            <Badge
                              key={id}
                              variant="outline"
                              className="text-xs border-gray-600 text-gray-400"
                            >
                              {p.label}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                      <p className="text-xs text-gray-400">
                        {GOALS.find((g) => g.id === step3.goal)?.label}
                      </p>
                    </div>
                  </div>

                  {/* Alert */}
                  <div className="flex items-start gap-3 rounded-xl border border-amber-600/30 bg-amber-900/10 p-4">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                    <p className="text-sm text-amber-300">
                      سيقوم الذكاء الاصطناعي بإنشاء استراتيجية إطلاق كاملة تشمل المحتوى، الجدول الزمني، وتوزيع الميزانية. قد يستغرق ذلك 20-30 ثانية.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation */}
            {step < 4 && (
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                  disabled={step === 0 || loading}
                  className="border-gray-700 bg-gray-800 text-gray-300"
                >
                  <ChevronRight className="ml-1.5 h-4 w-4" />
                  السابق
                </Button>

                {step < 3 ? (
                  <Button
                    onClick={() => setStep((prev) => prev + 1)}
                    disabled={!canProceed}
                    className="bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
                  >
                    التالي
                    <ChevronLeft className="mr-1.5 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleLaunch}
                    disabled={loading}
                    className="bg-violet-600 py-5 px-8 text-base font-bold hover:bg-violet-500 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                        {loadingSteps[loadingStep]}
                      </>
                    ) : (
                      <>
                        <Rocket className="ml-2 h-5 w-5" />
                        أطلق الحملة!
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-600/40 bg-red-900/20 p-4 text-sm text-red-300">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
