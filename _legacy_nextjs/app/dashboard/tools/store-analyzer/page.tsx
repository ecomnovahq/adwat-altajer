"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Store, Search, CheckCircle2, XCircle, AlertCircle, Download,
  RotateCcw, TrendingUp, Zap, ChevronRight, Eye, ShieldCheck,
  BarChart3, Target, Gauge, Lightbulb, Clock, Layers, Lock,
  MousePointer, DollarSign, Globe, Heart, ShoppingCart, Award,
  Activity, Cpu, Palette, Users, Star, Brain, Swords, Image,
  Flame, TrendingDown, Navigation, Sparkles,
} from "lucide-react"
import { api, auth } from "@/lib/api"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────
interface Criterion { name: string; score: number; feedback: string; actions: string[] }
interface VisualItem { name: string; score: number; status: "pass"|"warn"|"fail"; issue: string; fix: string }
interface CROItem { name: string; score: number; impact: string; revenueImpact?: string; detail: string }
interface SEOItem { check: string; status: "pass"|"warn"|"fail"; value: string; issue: string; fix: string }
interface UXItem { name: string; score: number; issue: string; fix: string }
interface CommerceItem { name: string; status: "pass"|"fail"; detail: string; fix: string }
interface TrustItem { name: string; status: "pass"|"fail"; detail: string }
interface IndustryItem { name: string; score: number; status: "pass"|"warn"|"fail"; detail: string; fix: string }
interface BenchmarkMetric { name: string; yours: number; avg: number; top: number; percentile: number }
interface RevenueIssue { issue: string; estimatedImpact: string; confidence: "high"|"medium"|"low" }
interface Action { task: string; reason: string; impact: string; priority: "high"|"medium"|"low"; time: string; difficulty: string; confidence?: number; ease?: number; revenueImpact?: string; priorityScore?: number }
interface TechCheck { id: string; label: string; status: "pass"|"warn"|"fail"; value: string; detail?: string }
interface OptimizerSection { suggestedHeadline: string; suggestedSubtext: string; suggestedCTA: string }
interface PsychologyData { buyerPersona: string; purchaseMotivators: string[]; trustBarriers: string[]; emotionalTriggers: string[]; conversionProbability: number; cognitiveLoad: "low"|"medium"|"high"; attentionFlow: string; sessionReplay: string }
interface BrandData { identityScore: number; premiumFeel: "premium"|"professional"|"mid"|"budget"; consistencyScore: number; personality: string; issues: string[]; improvements: string[] }
interface PricingData { score: number; strategy: string; psychologyUsed: string[]; hasFakeDiscounts: boolean; fakeDiscountRisk: "high"|"medium"|"low"|"none"; issues: string[]; suggestions: string[] }
interface Competitor { name: string; url: string; arabicName: string; strength: string; differentiator: string }
interface HeroSectionData { score: number; attentionGrabbing: "pass"|"warn"|"fail"; messageClear: "pass"|"warn"|"fail"; ctaVisible: "pass"|"warn"|"fail"; improvement: string }
interface ProductImagesData { score: number; quality: string; bgConsistency: "pass"|"warn"|"fail"; lighting: string; hasMultipleAngles: boolean; issues: string[] }

interface AnalysisResult {
  overallScore: number
  platform: string
  storeName: string
  summary: string
  themeName?: string | null
  themeCode?: string | null
  detectedIndustry?: string | null
  visualAudit?: VisualItem[]
  visualScore?: number
  heroSection?: HeroSectionData | null
  productImages?: ProductImagesData | null
  brandConsistency?: { score: number; colorHarmony: string; fontConsistency: string; overallCoherence?: string } | null
  visualAttention?: { firstFocus: string; secondFocus: string; distractors: string[] } | null
  premiumFeel?: string | null
  ux?: { score: number; items: UXItem[] }
  cro?: { score: number; items: CROItem[] }
  conversionProbability?: number | null
  checkoutFriction?: { score: number; estimatedSteps: number; issues: string[]; improvements: string[] } | null
  offerStrength?: { score: number; urgencyScore: number; scarcityScore: number; socialProofScore: number; issues: string[] } | null
  seo?: { score: number; items: SEOItem[] }
  behavioral?: { loadTime: number|null; scrollDepth: number|null; productClickable: boolean|null; cartFriction: string|null; insights: string[] }
  industryAudit?: { items: IndustryItem[] }
  trustScore?: number
  trust?: { score: number; items: TrustItem[] }
  commerce?: { score: number; items: CommerceItem[] }
  benchmarking?: { industryLabel: string; overallPercentile: number; metrics: BenchmarkMetric[] }
  revenue?: { estimatedMonthlyLoss: string; topIssues: RevenueIssue[] }
  actions?: Action[]
  quickWins?: string[]
  strengths?: string[]
  weaknesses?: string[]
  criteria?: Criterion[]
  optimizer?: { heroSection: OptimizerSection; metaTitle: string; metaDescription: string; productDescriptionTemplate: string; ctaCopy: {placement: string; suggested: string}[]; seoTitles: {page: string; suggested: string}[]; contentCalendar?: {week: string; topic: string; platform: string; hook: string}[] }
  psychology?: PsychologyData | null
  brand?: BrandData | null
  pricing?: PricingData | null
  competitors?: Competitor[]
  maturityScore?: number | null
  merchantSuccessScore?: number | null
  healthScore?: number | null
  missingFeatures?: string[]
  growthOpportunities?: string[]
  rtlAnalysis?: { score: number; issues: string[] } | null
  gulfCommerceReadiness?: { score: number; localAdaptations: string[]; gaps: string[] } | null
  technicalData?: {
    checks: TechCheck[]
    pageSpeed?: { performanceScore: number; seoScore: number; accessibilityScore: number; lcp?: string; cls?: string; ttfb?: string; fcp?: string; totalSize?: string; unusedJs?: string; renderBlocking?: number }
    tracking: string[]
    croSignals?: Record<string, boolean | number>
    seoFiles?: { hasRobots: boolean; hasSitemap: boolean }
    security?: { score: number; headers: Record<string, boolean> }
    behavioral?: { loadTime: number|null; scrollDepth: number|null; productClickable: boolean|null; cartFriction: string|null }
  }
  visionUsed?: boolean | "groq"
  pageSpeedUsed?: boolean
  remaining?: number
  used?: number
  limit?: number
}

const CATEGORIES = [
  "عام", "ملابس وأزياء", "إلكترونيات", "عطور وجمال", "مواد غذائية",
  "أثاث ومنزل", "رياضة ولياقة", "ألعاب وأطفال", "مجوهرات وإكسسوارات",
  "كتب وقرطاسية", "صحة وعناية", "أدوات ومعدات", "قطع غيار",
]

// ─── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 120, strokeWidth = 10, showLabel = true }: {
  score: number; size?: number; strokeWidth?: number; showLabel?: boolean
}) {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.max(0, Math.min(100, score)) / 100) * circ
  const cx = size / 2, cy = size / 2
  const color = score >= 75 ? "#10B981" : score >= 50 ? "#A78BFA" : score >= 30 ? "#F59E0B" : "#EF4444"
  const label = score >= 75 ? "ممتاز" : score >= 50 ? "جيد" : score >= 30 ? "متوسط" : "ضعيف"
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1F2937" strokeWidth={strokeWidth} />
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span key={score} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="font-black text-white leading-none" style={{ fontSize: size < 80 ? 14 : 22 }}
        >{score}</motion.span>
        {showLabel && <span className="text-[10px] text-gray-400 mt-0.5">{label}</span>}
      </div>
    </div>
  )
}

function MiniRing({ score, size = 40 }: { score: number; size?: number }) {
  return <ScoreRing score={score} size={size} strokeWidth={5} showLabel={false} />
}

function StatusIcon({ status }: { status: "pass" | "warn" | "fail" }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
  if (status === "warn") return <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
  return <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
}

function Skeleton() {
  return (
    <div className="space-y-4 mt-4">
      {[1, 2, 3].map(i => (
        <motion.div key={i} className="h-20 bg-gray-800/60 rounded-2xl"
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.2 }} />
      ))}
    </div>
  )
}

function TechCheckRow({ check }: { check: TechCheck }) {
  const bg = check.status === "pass" ? "bg-green-500/8 border-green-500/15"
    : check.status === "warn" ? "bg-amber-500/8 border-amber-500/15"
    : "bg-red-500/8 border-red-500/15"
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
      <StatusIcon status={check.status} />
      <div className="flex-1 min-w-0">
        <span className="text-white text-sm font-medium">{check.label}</span>
        {check.detail && <span className="text-gray-500 text-xs ml-2">— {check.detail}</span>}
      </div>
      <span className={`text-xs font-semibold ${
        check.status === "pass" ? "text-green-400" : check.status === "warn" ? "text-amber-400" : "text-red-400"
      }`}>{check.value}</span>
    </div>
  )
}

function BenchmarkBar({ metric }: { metric: BenchmarkMetric }) {
  const pct = Math.min(100, metric.yours)
  const avgPct = Math.min(100, metric.avg)
  const topPct = Math.min(100, metric.top)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-gray-300 text-sm">{metric.name}</span>
        <span className="text-violet-400 text-xs font-semibold">أفضل من {metric.percentile}%</span>
      </div>
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 right-0 bg-gray-700/60 rounded-full" style={{ width: `${topPct}%` }} />
        <div className="absolute inset-y-0 right-0 bg-violet-500/30 rounded-full" style={{ width: `${avgPct}%` }} />
        <motion.div className="absolute inset-y-0 right-0 bg-violet-500 rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-600">
        <span>متجرك: {metric.yours}</span>
        <span>متوسط السوق: {metric.avg}</span>
        <span>أفضل 10%: {metric.top}+</span>
      </div>
    </div>
  )
}

function CriterionTab({ criterion }: { criterion: Criterion }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      className="space-y-4 pt-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={criterion.score} size={64} strokeWidth={7} showLabel={false} />
        <div>
          <p className="text-white font-bold">{criterion.name}</p>
          <p className="text-gray-400 text-sm">
            {criterion.score >= 75 ? "أداء ممتاز" : criterion.score >= 50 ? "أداء جيد" : criterion.score >= 30 ? "يحتاج تحسين" : "أداء ضعيف"}
            {" · "}<span className="text-white font-semibold">{criterion.score}/100</span>
          </p>
        </div>
      </div>
      <div className="bg-gray-800/40 rounded-xl p-4">
        <p className="text-gray-300 text-sm leading-relaxed">{criterion.feedback}</p>
      </div>
      {criterion.actions?.length > 0 && (
        <div className="space-y-2">
          <p className="text-violet-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> خطوات التحسين
          </p>
          {criterion.actions.map((a, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
              <p className="text-gray-300 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StoreAnalyzerPage() {
  const router = useRouter()
  const [url, setUrl] = useState("")
  const [category, setCategory] = useState("عام")
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState("")
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [mainTab, setMainTab] = useState("summary")
  const [criterionTab, setCriterionTab] = useState("")
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!auth.isLoggedIn()) router.push("/login")
  }, [router])

  const urlValid = url.length > 3 ? (() => {
    try { const u = new URL(url.startsWith("http") ? url : `https://${url}`); return u.hostname.includes(".") }
    catch { return false }
  })() : null

  const STEPS = [
    "جاري الوصول للمتجر وفحص التقنيات...",
    "جاري فحص رؤوس الأمان وسلوك المستخدم...",
    "جاري أخذ اسكرينشوتات وفحص Core Web Vitals...",
    "جاري تحليل robots.txt وsitemap وإشارات CRO...",
    "جاري التحليل البصري الذكي...",
    "جاري حساب درجة الثقة وتحليل التجارة الخليجية...",
    "جاري تحليل الإيرادات وبناء خطة الأولويات...",
    "جاري توليد المحتوى المحسّن والتقرير الشامل...",
  ]

  async function run() {
    if (!urlValid) return
    setLoading(true); setProgress(0); setResult(null); setError(""); setStep(STEPS[0])
    let si = 0
    intervalRef.current = setInterval(() => {
      si = Math.min(si + 1, STEPS.length - 1)
      setStep(STEPS[si])
      setProgress(Math.round((si / STEPS.length) * 88))
    }, 12000)
    try {
      const data = await api.analyze(
        url.startsWith("http") ? url : `https://${url}`,
        category === "عام" ? "" : category
      ) as AnalysisResult
      if (intervalRef.current) clearInterval(intervalRef.current)
      setProgress(100); setStep("اكتمل التحليل الشامل بـ 15 طبقة!")
      await new Promise(r => setTimeout(r, 300))
      setResult(data)
      setCriterionTab(data.criteria?.[0]?.name ?? "")
      setMainTab("summary")
    } catch (err: unknown) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setError(err instanceof Error ? err.message : "حدث خطأ غير متوقع")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])
  function reset() { setResult(null); setError(""); setProgress(0); setStep("") }

  const groupChecks = (checks: TechCheck[]) => ({
    core: checks.filter(c => ["ssl","cdn","perf","ps_seo","a11y"].includes(c.id)),
    seo: checks.filter(c => ["robots","sitemap","schema","og","robots_meta","h1","meta_desc","alt_imgs"].includes(c.id)),
    ux: checks.filter(c => ["search","cart","wishlist","mobile_menu","lazy","scripts"].includes(c.id)),
    tracking: checks.filter(c => ["tracking_ga","tracking_gtm","tracking_fb","tracking_tt","tracking_snap","hotjar"].includes(c.id)),
  })

  const TABS = [
    { id: "summary",   icon: <Layers className="w-3.5 h-3.5" />,      label: "ملخص" },
    { id: "technical", icon: <Cpu className="w-3.5 h-3.5" />,          label: "تقني" },
    { id: "visual",    icon: <Eye className="w-3.5 h-3.5" />,          label: "بصري" },
    { id: "ux",        icon: <MousePointer className="w-3.5 h-3.5" />, label: "UX" },
    { id: "cro",       icon: <Target className="w-3.5 h-3.5" />,       label: "CRO" },
    { id: "seo",       icon: <Search className="w-3.5 h-3.5" />,       label: "SEO" },
    { id: "behavioral",icon: <Activity className="w-3.5 h-3.5" />,     label: "سلوك" },
    { id: "industry",  icon: <Store className="w-3.5 h-3.5" />,        label: "الصناعة" },
    { id: "trust",     icon: <ShieldCheck className="w-3.5 h-3.5" />,  label: "ثقة" },
    { id: "commerce",  icon: <ShoppingCart className="w-3.5 h-3.5" />, label: "تجارة" },
    { id: "benchmark", icon: <BarChart3 className="w-3.5 h-3.5" />,    label: "مقارنة" },
    { id: "revenue",   icon: <DollarSign className="w-3.5 h-3.5" />,   label: "إيرادات" },
    { id: "actions",   icon: <Lightbulb className="w-3.5 h-3.5" />,    label: "خطة العمل" },
    { id: "priorities",icon: <Award className="w-3.5 h-3.5" />,        label: "أولويات" },
    { id: "optimizer", icon: <Palette className="w-3.5 h-3.5" />,      label: "المحسّن" },
    { id: "psychology",icon: <Brain className="w-3.5 h-3.5" />,        label: "ذكاء" },
    { id: "competitors",icon: <Swords className="w-3.5 h-3.5" />,      label: "منافسين" },
  ]

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <Store className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">محلل المتجر الذكي v4</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">Intelligence Engine</Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">Technical · Visual · UX · CRO · SEO · Behavioral · Psychology · Brand · Competitors · Revenue</p>
      </motion.div>

      <div className="max-w-5xl mx-auto space-y-5">
        {/* Input */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardContent className="px-5 pt-5 pb-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium">رابط المتجر</Label>
                  <div className="relative">
                    <Input type="text" dir="ltr" placeholder="https://mystore.sa" value={url}
                      onChange={e => setUrl(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && run()}
                      className="bg-gray-800/80 border-gray-700 text-white text-left h-11 rounded-xl pr-4 pl-10 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-colors placeholder:text-gray-600" />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <AnimatePresence mode="wait">
                        {urlValid === true && <motion.div key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><CheckCircle2 className="w-4 h-4 text-green-400" /></motion.div>}
                        {urlValid === false && <motion.div key="err" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><XCircle className="w-4 h-4 text-red-400" /></motion.div>}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs font-medium">تخصص المتجر</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-gray-800/80 border-gray-700 text-white h-11 rounded-xl focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white rounded-xl">
                      {CATEGORIES.map(c => (
                        <SelectItem key={c} value={c} className="focus:bg-violet-500/20 focus:text-white rounded-lg">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={run} disabled={!urlValid || loading}
                className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-all disabled:opacity-40 gap-2">
                <Search className="w-4 h-4" />
                {loading ? "جاري التحليل الشامل بـ 15 طبقة..." : "ابدأ التحليل الشامل"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Loading */}
        <AnimatePresence>
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                <CardContent className="px-5 pt-5 pb-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium text-sm">{step}</p>
                    <p className="text-gray-400 text-sm tabular-nums">{progress}%</p>
                  </div>
                  <Progress value={progress} className="h-2 bg-gray-800 [&>div]:bg-violet-500 [&>div]:rounded-full" />
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {["فحص تقني", "تحليل بصري", "ذكاء تجاري", "خطة العمل"].map((s, i) => (
                      <div key={i} className={`text-center text-xs py-2 rounded-lg ${progress > i * 25 ? "bg-violet-500/20 text-violet-300" : "bg-gray-800/60 text-gray-600"}`}>{s}</div>
                    ))}
                  </div>
                  <Skeleton />
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Card className="bg-red-500/10 border-red-500/30 rounded-2xl">
                <CardContent className="px-5 pt-5 pb-5">
                  <div className="flex gap-4 items-start">
                    <div className="p-2.5 bg-red-500/20 rounded-xl flex-shrink-0"><AlertCircle className="w-5 h-5 text-red-400" /></div>
                    <div className="flex-1">
                      <p className="text-red-300 font-semibold mb-1">فشل التحليل</p>
                      <p className="text-red-400/80 text-sm mb-4">{error}</p>
                      <Button onClick={reset} variant="outline" className="h-10 rounded-xl border-red-500/40 text-red-300 hover:bg-red-500/15 gap-2">
                        <RotateCcw className="w-3.5 h-3.5" /> حاول مرة أخرى
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {result && (
            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

              {/* Score Header */}
              <Card className="bg-gray-900/80 border-gray-800 rounded-2xl overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-l from-violet-500 via-purple-500 to-violet-600" />
                <CardContent className="px-5 pt-5 pb-5">
                  <div className="flex gap-6 items-start">
                    <div className="flex-shrink-0 flex flex-col items-center gap-1">
                      <ScoreRing score={result.overallScore} size={120} strokeWidth={10} />
                      <p className="text-gray-500 text-[10px]">التقييم الكلي</p>
                      <div className="flex flex-wrap gap-1 mt-1 justify-center">
                        {result.visionUsed === true && <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25 text-[10px]"><Eye className="w-2.5 h-2.5 ml-1" />Gemini Vision</Badge>}
                        {result.visionUsed === "groq" && <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/25 text-[10px]"><Eye className="w-2.5 h-2.5 ml-1" />Llama Vision</Badge>}
                        {result.pageSpeedUsed && <Badge className="bg-green-500/15 text-green-300 border-green-500/25 text-[10px]"><Gauge className="w-2.5 h-2.5 ml-1" />PageSpeed</Badge>}
                      </div>
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-white font-bold text-lg">{result.storeName}</span>
                        {result.platform && <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">{result.platform}</Badge>}
                        {result.themeName && <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs"><Sparkles className="w-2.5 h-2.5 ml-1 inline" />{result.themeName}</Badge>}
                        {result.detectedIndustry && <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs">{result.detectedIndustry}</Badge>}
                        {result.benchmarking && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">أفضل من {result.benchmarking.overallPercentile}% من {result.benchmarking.industryLabel}</Badge>}
                        {result.premiumFeel && <Badge className={`text-xs ${result.premiumFeel === 'premium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : result.premiumFeel === 'professional' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : result.premiumFeel === 'mid' ? 'bg-gray-600/40 text-gray-300 border-gray-600/40' : 'bg-red-500/15 text-red-300 border-red-500/20'}`}>{result.premiumFeel === 'premium' ? '⭐ فاخر' : result.premiumFeel === 'professional' ? '✦ احترافي' : result.premiumFeel === 'mid' ? '◈ متوسط' : '◇ بدائي'}</Badge>}
                      </div>
                      <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
                      <div className="flex flex-wrap gap-4 pt-1">
                        {result.trustScore !== undefined && (
                          <div className="flex items-center gap-2">
                            <MiniRing score={result.trustScore} />
                            <div><p className="text-[10px] text-gray-500">Trust Score</p><p className="text-xs text-white font-semibold">{result.trustScore}/100</p></div>
                          </div>
                        )}
                        {result.cro && (
                          <div className="flex items-center gap-2">
                            <MiniRing score={result.cro.score} />
                            <div><p className="text-[10px] text-gray-500">CRO Score</p><p className="text-xs text-white font-semibold">{result.cro.score}/100</p></div>
                          </div>
                        )}
                        {result.visualScore !== undefined && (
                          <div className="flex items-center gap-2">
                            <MiniRing score={result.visualScore} />
                            <div><p className="text-[10px] text-gray-500">Visual Score</p><p className="text-xs text-white font-semibold">{result.visualScore}/100</p></div>
                          </div>
                        )}
                        {result.healthScore != null && (
                          <div className="flex items-center gap-2">
                            <MiniRing score={result.healthScore} />
                            <div><p className="text-[10px] text-gray-500">Health Score</p><p className="text-xs text-white font-semibold">{result.healthScore}/100</p></div>
                          </div>
                        )}
                        {result.maturityScore != null && (
                          <div className="flex items-center gap-2">
                            <MiniRing score={result.maturityScore} />
                            <div><p className="text-[10px] text-gray-500">Maturity</p><p className="text-xs text-white font-semibold">{result.maturityScore}/100</p></div>
                          </div>
                        )}
                        {result.conversionProbability != null && (
                          <div className="flex items-center gap-2">
                            <MiniRing score={result.conversionProbability} />
                            <div><p className="text-[10px] text-gray-500">احتمال الشراء</p><p className="text-xs text-white font-semibold">{result.conversionProbability}%</p></div>
                          </div>
                        )}
                        {result.technicalData?.pageSpeed && (
                          <div className="flex items-center gap-2">
                            <MiniRing score={result.technicalData.pageSpeed.performanceScore} />
                            <div><p className="text-[10px] text-gray-500">Performance</p><p className="text-xs text-white font-semibold">{result.technicalData.pageSpeed.performanceScore}/100</p></div>
                          </div>
                        )}
                      </div>
                      {result.remaining !== undefined && (
                        <p className="text-gray-600 text-xs">الاستخدام: {result.used}/{result.limit} اليوم — متبقي {result.remaining}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 15 Tabs */}
              <Tabs value={mainTab} onValueChange={setMainTab}>
                <TabsList className="bg-gray-900/80 border border-gray-800 rounded-2xl p-1.5 flex flex-wrap gap-1 h-auto w-full">
                  {TABS.map(t => (
                    <TabsTrigger key={t.id} value={t.id}
                      className="rounded-xl text-gray-400 text-xs px-3 py-2 flex items-center gap-1.5 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all">
                      {t.icon} {t.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {/* ── Tab 1: Summary ─────────────────────────────────── */}
                <TabsContent value="summary" className="mt-4 space-y-4 outline-none">
                  {result.quickWins && result.quickWins.length > 0 && (
                    <Card className="bg-amber-500/5 border-amber-500/20 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5" /> إصلاحات سريعة — أقل من 24 ساعة
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {result.quickWins.map((w, i) => (
                            <div key={i} className="flex gap-2 items-start bg-amber-500/10 rounded-xl p-3">
                              <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                              <p className="text-amber-100/80 text-sm leading-relaxed">{w}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.strengths && result.strengths.length > 0 && (
                      <Card className="bg-green-500/5 border-green-500/20 rounded-2xl">
                        <CardContent className="px-4 pt-4 pb-4">
                          <p className="text-green-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> نقاط القوة</p>
                          <div className="space-y-2">
                            {result.strengths.map((s, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-2 flex-shrink-0" />
                                <p className="text-gray-300 text-sm leading-relaxed">{s}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    {result.weaknesses && result.weaknesses.length > 0 && (
                      <Card className="bg-red-500/5 border-red-500/20 rounded-2xl">
                        <CardContent className="px-4 pt-4 pb-4">
                          <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5"><XCircle className="w-3.5 h-3.5" /> نقاط الضعف</p>
                          <div className="space-y-2">
                            {result.weaknesses.map((w, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-2 flex-shrink-0" />
                                <p className="text-gray-300 text-sm leading-relaxed">{w}</p>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                  {/* Criteria overview */}
                  {result.criteria && result.criteria.length > 0 && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <p className="text-white font-semibold mb-4">نظرة عامة — {result.criteria.length} معيار</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {result.criteria.map((c, i) => (
                            <button key={i} onClick={() => { setMainTab("criteria"); setCriterionTab(c.name) }}
                              className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/60 hover:bg-gray-800 transition-colors text-right">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${c.score >= 75 ? "bg-green-500/20 text-green-400" : c.score >= 50 ? "bg-violet-500/20 text-violet-400" : "bg-red-500/20 text-red-400"}`}>{c.score}</div>
                              <span className="text-gray-300 text-xs leading-tight truncate">{c.name.replace("تحسين محركات البحث ", "").replace(" والمصداقية", "")}</span>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ── Tab 2: Technical ──────────────────────────────── */}
                <TabsContent value="technical" className="mt-4 space-y-4 outline-none">
                  {result.technicalData?.pageSpeed ? (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <p className="text-white font-semibold mb-4 flex items-center gap-2"><Gauge className="w-4 h-4 text-green-400" /> Core Web Vitals — PageSpeed Mobile</p>
                        <div className="grid grid-cols-3 gap-3 mb-4">
                          {[
                            { label: "Performance", value: result.technicalData.pageSpeed.performanceScore },
                            { label: "SEO Score", value: result.technicalData.pageSpeed.seoScore },
                            { label: "Accessibility", value: result.technicalData.pageSpeed.accessibilityScore },
                          ].map((m, i) => {
                            const color = m.value >= 70 ? "text-green-400 bg-green-500/10 border-green-500/20"
                              : m.value >= 50 ? "text-amber-400 bg-amber-500/10 border-amber-500/20"
                              : "text-red-400 bg-red-500/10 border-red-500/20"
                            return (
                              <div key={i} className={`rounded-xl p-3 border text-center ${color}`}>
                                <p className="text-2xl font-black">{m.value}</p>
                                <p className="text-[10px] opacity-80">{m.label}</p>
                              </div>
                            )
                          })}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { label: "LCP", value: result.technicalData.pageSpeed.lcp },
                            { label: "CLS", value: result.technicalData.pageSpeed.cls },
                            { label: "TTFB", value: result.technicalData.pageSpeed.ttfb },
                            { label: "FCP", value: result.technicalData.pageSpeed.fcp },
                            { label: "حجم الصفحة", value: result.technicalData.pageSpeed.totalSize },
                            { label: "JS غير مستخدم", value: result.technicalData.pageSpeed.unusedJs },
                          ].filter(x => x.value).map((m, i) => (
                            <div key={i} className="bg-gray-800/60 rounded-xl p-3">
                              <p className="text-gray-400 text-[10px]">{m.label}</p>
                              <p className="text-white text-sm font-semibold">{m.value}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="bg-gray-900/40 border-gray-700/60 rounded-2xl border-dashed">
                      <CardContent className="px-5 pt-4 pb-4 flex items-center gap-3">
                        <Gauge className="w-5 h-5 text-gray-600 flex-shrink-0" />
                        <div>
                          <p className="text-gray-500 text-sm font-medium">Core Web Vitals غير متاح</p>
                          <p className="text-gray-600 text-xs mt-0.5">أضف <span className="text-violet-400 font-mono">PAGESPEED_API_KEY</span> في backend/.env لتفعيل Google PageSpeed Insights</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {/* Security Headers */}
                  {result.technicalData?.security && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-white font-semibold flex items-center gap-2"><Lock className="w-4 h-4 text-violet-400" /> رؤوس الأمان Security Headers</p>
                          <div className={`text-sm font-bold ${result.technicalData.security.score >= 70 ? "text-green-400" : result.technicalData.security.score >= 40 ? "text-amber-400" : "text-red-400"}`}>{result.technicalData.security.score}/100</div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: "csp", label: "Content-Security-Policy" },
                            { key: "hsts", label: "HSTS" },
                            { key: "xfo", label: "X-Frame-Options" },
                            { key: "xss", label: "X-XSS-Protection" },
                            { key: "ref", label: "Referrer-Policy" },
                            { key: "perm", label: "Permissions-Policy" },
                            { key: "nosniff", label: "X-Content-Type" },
                          ].map(({ key, label }) => {
                            const present = result.technicalData?.security?.headers[key]
                            return (
                              <div key={key} className={`flex items-center gap-2 p-2.5 rounded-xl text-xs ${present ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
                                {present ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" /> : <XCircle className="w-3 h-3 flex-shrink-0" />}
                                <span className="truncate">{label}</span>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {result.technicalData?.checks && (() => {
                    const groups = groupChecks(result.technicalData!.checks)
                    return (
                      <div className="space-y-4">
                        {[
                          { title: "الأمان والأداء الأساسي", icon: <ShieldCheck className="w-4 h-4 text-violet-400" />, checks: groups.core },
                          { title: "تحسين محركات البحث SEO", icon: <Search className="w-4 h-4 text-violet-400" />, checks: groups.seo },
                          { title: "تجربة المستخدم UX", icon: <Store className="w-4 h-4 text-violet-400" />, checks: groups.ux },
                          { title: "أدوات التتبع والإعلانات", icon: <BarChart3 className="w-4 h-4 text-violet-400" />, checks: groups.tracking },
                        ].filter(g => g.checks.length > 0).map((g, gi) => (
                          <Card key={gi} className="bg-gray-900/80 border-gray-800 rounded-2xl">
                            <CardContent className="px-5 pt-4 pb-4">
                              <p className="text-white font-semibold mb-3 flex items-center gap-2">{g.icon} {g.title}</p>
                              <div className="space-y-2">{g.checks.map((c, i) => <TechCheckRow key={i} check={c} />)}</div>
                              <div className="mt-3 flex gap-3 text-xs text-gray-500">
                                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-400" /> {g.checks.filter(c => c.status === "pass").length} ممتاز</span>
                                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-400" /> {g.checks.filter(c => c.status === "warn").length} يحتاج مراجعة</span>
                                <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-red-400" /> {g.checks.filter(c => c.status === "fail").length} مفقود</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )
                  })()}
                </TabsContent>

                {/* ── Tab 3: Visual ─────────────────────────────────── */}
                <TabsContent value="visual" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-white font-semibold flex items-center gap-2">
                          <Eye className="w-4 h-4 text-violet-400" /> التدقيق البصري الذكي
                          {result.visionUsed === true && <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25 text-[10px] ml-1"><Eye className="w-2.5 h-2.5 ml-1" />Gemini Vision</Badge>}
                          {result.visionUsed === "groq" && <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/25 text-[10px] ml-1"><Eye className="w-2.5 h-2.5 ml-1" />Llama Vision</Badge>}
                          {!result.visionUsed && <Badge className="bg-gray-700/60 text-gray-500 border-gray-600/40 text-[10px] ml-1">تحليل نصي</Badge>}
                        </p>
                        {result.visualScore !== undefined && <span className="text-gray-400 text-sm">Visual Score: <span className="text-white font-bold">{result.visualScore}/100</span></span>}
                      </div>
                      {/* ── Hero + Product Images + Brand + Attention sub-sections ── */}
                      {(result.heroSection || result.productImages || result.brandConsistency || result.visualAttention) && (
                        <div className="space-y-3 mb-5">
                          {/* Hero Section */}
                          {result.heroSection && (
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/40">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-white text-sm font-semibold flex items-center gap-2"><Image className="w-3.5 h-3.5 text-violet-400" /> قسم الـ Hero</p>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${result.heroSection.score >= 7 ? "bg-green-500/20 text-green-400" : result.heroSection.score >= 4 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>{result.heroSection.score}/10</span>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                {([["attentionGrabbing", "جذب الانتباه"], ["messageClear", "وضوح الرسالة"], ["ctaVisible", "وضوح الـ CTA"]] as [keyof HeroSectionData, string][]).map(([k, label]) => (
                                  <div key={k} className={`rounded-lg p-2 text-center text-[11px] font-medium ${result.heroSection![k] === "pass" ? "bg-green-500/15 text-green-400" : result.heroSection![k] === "warn" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                                    {label}<br /><span className="text-[10px] opacity-75">{result.heroSection![k] === "pass" ? "✓ جيد" : result.heroSection![k] === "warn" ? "⚠ متوسط" : "✗ ضعيف"}</span>
                                  </div>
                                ))}
                              </div>
                              {result.heroSection.improvement && <p className="text-violet-300 text-xs flex items-start gap-1.5"><ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />{result.heroSection.improvement}</p>}
                            </div>
                          )}
                          {/* Product Images */}
                          {result.productImages && (
                            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/40">
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-white text-sm font-semibold flex items-center gap-2"><Palette className="w-3.5 h-3.5 text-violet-400" /> صور المنتجات</p>
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-[10px] ${result.productImages.quality === "professional" ? "bg-green-500/20 text-green-300 border-green-500/30" : result.productImages.quality === "amateur" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>{result.productImages.quality === "professional" ? "احترافية" : result.productImages.quality === "amateur" ? "هاوية" : "متباينة"}</Badge>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${result.productImages.score >= 7 ? "bg-green-500/20 text-green-400" : result.productImages.score >= 4 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>{result.productImages.score}/10</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 mb-2">
                                {([["bgConsistency", "خلفية متناسقة"], ["lighting", "إضاءة"], ["hasMultipleAngles", "زوايا متعددة"]] as const).map(([k, label]) => {
                                  const val = result.productImages![k as keyof ProductImagesData]
                                  const pass = val === "pass" || val === "good" || val === true
                                  const warn = val === "warn"
                                  return (
                                    <div key={k} className={`rounded-lg p-2 text-center text-[11px] font-medium ${pass ? "bg-green-500/15 text-green-400" : warn ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                                      {label}<br /><span className="text-[10px] opacity-75">{pass ? "✓ جيد" : warn ? "⚠ متوسط" : "✗ ضعيف"}</span>
                                    </div>
                                  )
                                })}
                              </div>
                              {result.productImages.issues && result.productImages.issues.length > 0 && (
                                <div className="space-y-1">
                                  {result.productImages.issues.map((iss, i) => <p key={i} className="text-red-400/80 text-xs flex items-start gap-1.5"><span className="mt-0.5 flex-shrink-0">•</span>{iss}</p>)}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Brand Consistency + Visual Attention side-by-side */}
                          {(result.brandConsistency || result.visualAttention) && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {result.brandConsistency && (
                                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/40">
                                  <p className="text-white text-sm font-semibold flex items-center gap-2 mb-3"><Award className="w-3.5 h-3.5 text-violet-400" /> اتساق الهوية</p>
                                  <div className="space-y-2">
                                    {([["colorHarmony", "انسجام الألوان"], ["fontConsistency", "اتساق الخطوط"], ["overallCoherence", "التوافق العام"]] as const).map(([k, label]) => {
                                      const val = (result.brandConsistency as any)[k]
                                      return (
                                        <div key={k} className="flex items-center justify-between">
                                          <span className="text-gray-400 text-xs">{label}</span>
                                          <span className={`text-xs font-medium ${val === "pass" ? "text-green-400" : val === "warn" ? "text-amber-400" : "text-red-400"}`}>{val === "pass" ? "✓ جيد" : val === "warn" ? "⚠ متوسط" : "✗ ضعيف"}</span>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              {result.visualAttention && (
                                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/40">
                                  <p className="text-white text-sm font-semibold flex items-center gap-2 mb-3"><Eye className="w-3.5 h-3.5 text-violet-400" /> مسار الانتباه</p>
                                  <div className="space-y-2">
                                    <div className="flex items-start gap-2"><span className="text-[10px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded font-bold flex-shrink-0 mt-0.5">1</span><p className="text-gray-300 text-xs">{result.visualAttention.firstFocus}</p></div>
                                    <div className="flex items-start gap-2"><span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold flex-shrink-0 mt-0.5">2</span><p className="text-gray-300 text-xs">{result.visualAttention.secondFocus}</p></div>
                                    {result.visualAttention.distractors && result.visualAttention.distractors.length > 0 && (
                                      <div className="pt-1 border-t border-gray-700/40">
                                        <p className="text-gray-500 text-[10px] mb-1">عناصر مشتتة:</p>
                                        {result.visualAttention.distractors.map((d, i) => <p key={i} className="text-red-400/70 text-xs">• {d}</p>)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {/* ── Existing audit list ── */}
                      {result.visualAudit && result.visualAudit.length > 0 ? (
                        <div className="space-y-3">
                          {result.visualAudit.map((v, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                              className="bg-gray-800/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-center gap-3">
                                <StatusIcon status={v.status} />
                                <span className="text-white text-sm font-medium flex-1">{v.name}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${v.score >= 7 ? "bg-green-500" : v.score >= 4 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${v.score * 10}%` }} />
                                  </div>
                                  <span className="text-white text-sm font-bold w-8 text-left">{v.score}/10</span>
                                </div>
                              </div>
                              {v.issue && <p className="text-gray-400 text-xs leading-relaxed mr-7">{v.issue}</p>}
                              {v.fix && v.status !== "pass" && (
                                <div className="mr-7 flex items-start gap-1.5">
                                  <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-violet-300 text-xs leading-relaxed">{v.fix}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات التدقيق البصري</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 4: UX ─────────────────────────────────────── */}
                <TabsContent value="ux" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-white font-semibold flex items-center gap-2"><MousePointer className="w-4 h-4 text-violet-400" /> تجربة المستخدم UX Intelligence</p>
                        {result.ux?.score !== undefined && <span className="text-gray-400 text-sm">UX Score: <span className="text-white font-bold">{result.ux.score}/100</span></span>}
                      </div>
                      {result.ux?.items && result.ux.items.length > 0 ? (
                        <div className="space-y-3">
                          {result.ux.items.map((item, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                              className="bg-gray-800/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${item.score >= 7 ? "bg-green-500/20 text-green-400" : item.score >= 4 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>{item.score}</div>
                                <span className="text-white text-sm font-medium flex-1">{item.name}</span>
                              </div>
                              {item.issue && <p className="text-gray-400 text-xs leading-relaxed mr-12">{item.issue}</p>}
                              {item.fix && (
                                <div className="mr-12 flex items-start gap-1.5">
                                  <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-violet-300 text-xs leading-relaxed">{item.fix}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات UX</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 5: CRO ────────────────────────────────────── */}
                <TabsContent value="cro" className="mt-4 space-y-4 outline-none">
                  {result.cro ? (
                    <>
                      <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                        <CardContent className="px-5 pt-4 pb-4">
                          <div className="flex items-center gap-4 mb-5">
                            <ScoreRing score={result.cro.score} size={80} strokeWidth={8} />
                            <div>
                              <p className="text-white font-bold text-lg">CRO Score</p>
                              <p className="text-gray-400 text-sm">Conversion Rate Optimization</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            {result.cro.items.map((item, i) => (
                              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                                className="bg-gray-800/40 rounded-xl p-3 space-y-1">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${item.score >= 7 ? "bg-green-500/20 text-green-400" : item.score >= 4 ? "bg-amber-500/20 text-amber-400" : "bg-red-500/20 text-red-400"}`}>{item.score}</div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-white text-sm font-medium">{item.name}</p>
                                    <p className="text-gray-500 text-xs leading-relaxed">{item.detail}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <Badge className={`text-[10px] ${item.impact.includes("+") ? "bg-green-500/20 text-green-300 border-green-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>{item.impact}</Badge>
                                    {item.revenueImpact && <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">{item.revenueImpact}</Badge>}
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                        <CardContent className="px-5 pt-4 pb-4">
                          <p className="text-white font-semibold mb-3 flex items-center gap-2"><Target className="w-4 h-4 text-violet-400" /> إشارات التحويل المكتشفة</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {[
                              { key: "hasReviews", label: "تقييمات العملاء" },
                              { key: "hasCountdown", label: "عداد تنازلي" },
                              { key: "hasUrgency", label: "نص Urgency" },
                              { key: "hasAddToCart", label: "زر الشراء" },
                              { key: "hasWhatsApp", label: "WhatsApp" },
                              { key: "hasShippingBadge", label: "شحن مجاني" },
                              { key: "hasReturnPolicy", label: "سياسة الإرجاع" },
                              { key: "hasChatWidget", label: "Chat Widget" },
                              { key: "hasProductVideo", label: "فيديو منتجات" },
                              { key: "hasSizeGuide", label: "دليل المقاسات" },
                              { key: "hasTrustBadges", label: "شارات الثقة" },
                              { key: "hasPaymentBadgesInFooter", label: "شارات الدفع" },
                            ].map(({ key, label }) => {
                              const signals = result.technicalData?.croSignals
                              const unknown = !signals
                              const pass = !unknown && !!signals[key]
                              return (
                                <div key={key} className={`flex items-center gap-2 p-2.5 rounded-xl ${unknown ? "bg-gray-800/50 border border-gray-700/40" : pass ? "bg-green-500/8 border border-green-500/15" : "bg-red-500/8 border border-red-500/15"}`}>
                                  {unknown ? <AlertCircle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" /> : pass ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                                  <span className={`text-xs ${unknown ? "text-gray-600" : pass ? "text-green-300" : "text-red-400"}`}>{label}</span>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات CRO</p>}
                </TabsContent>

                {/* ── Tab 6: SEO ────────────────────────────────────── */}
                <TabsContent value="seo" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-white font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-violet-400" /> تحليل SEO المتقدم</p>
                        {result.seo?.score !== undefined && <span className="text-gray-400 text-sm">SEO Score: <span className="text-white font-bold">{result.seo.score}/100</span></span>}
                      </div>
                      {result.seo?.items && result.seo.items.length > 0 ? (
                        <div className="space-y-2">
                          {result.seo.items.map((item, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                              className={`rounded-xl p-3 border ${item.status === "pass" ? "bg-green-500/5 border-green-500/15" : item.status === "warn" ? "bg-amber-500/5 border-amber-500/15" : "bg-red-500/5 border-red-500/15"}`}>
                              <div className="flex items-center gap-3">
                                <StatusIcon status={item.status} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium">{item.check}</p>
                                  {item.issue && <p className="text-gray-400 text-xs mt-0.5">{item.issue}</p>}
                                </div>
                                <span className={`text-xs font-semibold flex-shrink-0 ${item.status === "pass" ? "text-green-400" : item.status === "warn" ? "text-amber-400" : "text-red-400"}`}>{item.value}</span>
                              </div>
                              {item.fix && item.status !== "pass" && (
                                <div className="mr-7 mt-2 flex items-start gap-1.5">
                                  <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-violet-300 text-xs">{item.fix}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {result.technicalData?.checks.filter(c => ["robots","sitemap","schema","og","robots_meta","h1","meta_desc","alt_imgs","ps_seo"].includes(c.id)).map((c, i) => <TechCheckRow key={i} check={c} />)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 7: Behavioral ─────────────────────────────── */}
                <TabsContent value="behavioral" className="mt-4 space-y-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <p className="text-white font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-violet-400" /> محاكاة سلوك المستخدم — Layer 6</p>
                      {result.behavioral?.loadTime !== null && result.behavioral?.loadTime !== undefined ? (
                        <>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                            {[
                              { label: "وقت التحميل", value: result.behavioral.loadTime ? `${result.behavioral.loadTime}ms` : "—", color: (result.behavioral.loadTime ?? 0) < 2000 ? "text-green-400" : (result.behavioral.loadTime ?? 0) < 4000 ? "text-amber-400" : "text-red-400" },
                              { label: "عمق التمرير", value: result.behavioral.scrollDepth ? `${result.behavioral.scrollDepth}%` : "—", color: (result.behavioral.scrollDepth ?? 0) >= 70 ? "text-green-400" : "text-amber-400" },
                              { label: "نقر المنتج", value: result.behavioral.productClickable ? "✓ سهل" : "✗ صعب", color: result.behavioral.productClickable ? "text-green-400" : "text-red-400" },
                              { label: "احتكاك السلة", value: result.behavioral.cartFriction === "low" ? "منخفض" : result.behavioral.cartFriction === "medium" ? "متوسط" : result.behavioral.cartFriction === "high" ? "مرتفع" : "—", color: result.behavioral.cartFriction === "low" ? "text-green-400" : result.behavioral.cartFriction === "medium" ? "text-amber-400" : "text-red-400" },
                            ].map((m, i) => (
                              <div key={i} className="bg-gray-800/60 rounded-xl p-3 text-center">
                                <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                                <p className="text-gray-500 text-[10px] mt-0.5">{m.label}</p>
                              </div>
                            ))}
                          </div>
                          {result.behavioral.insights && result.behavioral.insights.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-gray-400 text-xs font-semibold">ملاحظات سلوكية</p>
                              {result.behavioral.insights.map((insight, i) => (
                                <div key={i} className="flex gap-2 items-start bg-gray-800/40 rounded-xl p-3">
                                  <Zap className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-gray-300 text-sm">{insight}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 space-y-3">
                          <Activity className="w-10 h-10 text-gray-700 mx-auto" />
                          <p className="text-gray-500 text-sm">لم تتوفر بيانات السلوك</p>
                          <p className="text-gray-600 text-xs">ثبّت Playwright: <span className="text-violet-400 font-mono">npm install playwright && npx playwright install chromium</span></p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 8: Industry ───────────────────────────────── */}
                <TabsContent value="industry" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <p className="text-white font-semibold mb-4 flex items-center gap-2"><Store className="w-4 h-4 text-violet-400" /> تحليل خاص بتخصص المتجر — {category}</p>
                      {result.industryAudit?.items?.length ? (
                        <div className="space-y-3">
                          {result.industryAudit.items.map((item, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                              className="bg-gray-800/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-center gap-3">
                                <StatusIcon status={item.status} />
                                <span className="text-white text-sm font-medium flex-1">{item.name}</span>
                                <span className={`text-sm font-bold ${item.score >= 7 ? "text-green-400" : item.score >= 4 ? "text-amber-400" : "text-red-400"}`}>{item.score}/10</span>
                              </div>
                              {item.detail && <p className="text-gray-400 text-xs leading-relaxed mr-7">{item.detail}</p>}
                              {item.fix && item.status !== "pass" && (
                                <div className="mr-7 flex items-start gap-1.5">
                                  <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-violet-300 text-xs leading-relaxed">{item.fix}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات تحليل الصناعة</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 9: Trust ──────────────────────────────────── */}
                <TabsContent value="trust" className="mt-4 space-y-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <div className="flex items-center gap-4 mb-5">
                        {result.trustScore !== undefined && <ScoreRing score={result.trustScore} size={80} strokeWidth={8} />}
                        <div>
                          <p className="text-white font-bold text-lg">Trust Score</p>
                          <p className="text-gray-400 text-sm">درجة الثقة المحسوبة من 12 معيار</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {["+10 SSL", "+8 تقييمات", "+7 سياسة إرجاع", "+7 WhatsApp", "+6 شارات دفع", "+5 ثقة", "+5 هاتف", "+5 إيميل", "+4 سوشيال", "+3 Chat", "+3 Sitemap", "+2 Newsletter"].map(b => (
                              <span key={b} className="text-[10px] bg-gray-800 text-gray-500 rounded px-1.5 py-0.5">{b}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      {result.trust?.items && result.trust.items.length > 0 ? (
                        <div className="space-y-2">
                          {result.trust.items.map((item, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${item.status === "pass" ? "bg-green-500/8 border-green-500/15" : "bg-red-500/8 border-red-500/15"}`}>
                              {item.status === "pass" ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                              <div className="flex-1">
                                <p className="text-white text-sm font-medium">{item.name}</p>
                                {item.detail && <p className="text-gray-500 text-xs">{item.detail}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : <p className="text-gray-500 text-sm text-center py-4">لم تتوفر بيانات الثقة التفصيلية</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 10: Commerce ──────────────────────────────── */}
                <TabsContent value="commerce" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-white font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-violet-400" /> ذكاء التجارة الخليجية</p>
                        {result.commerce?.score !== undefined && <span className="text-gray-400 text-sm">Commerce Score: <span className="text-white font-bold">{result.commerce.score}/100</span></span>}
                      </div>
                      {result.commerce?.items && result.commerce.items.length > 0 ? (
                        <div className="space-y-2">
                          {result.commerce.items.map((item, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                              className={`rounded-xl p-3.5 border ${item.status === "pass" ? "bg-green-500/5 border-green-500/15" : "bg-red-500/5 border-red-500/15"}`}>
                              <div className="flex items-center gap-3">
                                {item.status === "pass" ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                                <div className="flex-1">
                                  <p className="text-white text-sm font-medium">{item.name}</p>
                                  {item.detail && <p className="text-gray-400 text-xs mt-0.5">{item.detail}</p>}
                                </div>
                              </div>
                              {item.fix && item.status !== "pass" && (
                                <div className="mr-7 mt-2 flex items-start gap-1.5">
                                  <ChevronRight className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-violet-300 text-xs">{item.fix}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات التجارة الخليجية</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 11: Benchmark ─────────────────────────────── */}
                <TabsContent value="benchmark" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <p className="text-white font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-violet-400" /> مقارنة بالسوق — {result.benchmarking?.industryLabel}
                      </p>
                      {(result.benchmarking?.metrics?.length ?? 0) > 0 ? (
                        <div className="space-y-5">
                          <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-center mb-4">
                            <p className="text-violet-300 text-sm">متجرك أفضل من</p>
                            <p className="text-4xl font-black text-white">{result.benchmarking!.overallPercentile}%</p>
                            <p className="text-gray-500 text-xs">من {result.benchmarking!.industryLabel}</p>
                          </div>
                          {result.benchmarking!.metrics.map((m, i) => <BenchmarkBar key={i} metric={m} />)}
                        </div>
                      ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات المقارنة</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 12: Revenue ───────────────────────────────── */}
                <TabsContent value="revenue" className="mt-4 space-y-4 outline-none">
                  {result.revenue ? (
                    <>
                      <Card className="bg-red-500/10 border-red-500/20 rounded-2xl">
                        <CardContent className="px-5 pt-4 pb-4">
                          <p className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> الخسارة الشهرية المقدّرة</p>
                          <p className="text-3xl font-black text-white">{result.revenue.estimatedMonthlyLoss}</p>
                          <p className="text-gray-500 text-xs mt-1">بسبب المشاكل الحالية في المتجر</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                        <CardContent className="px-5 pt-4 pb-4">
                          <p className="text-white font-semibold mb-3">أكبر مشاكل الإيرادات</p>
                          <div className="space-y-3">
                            {result.revenue.topIssues.map((issue, i) => (
                              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                                className="bg-gray-800/40 rounded-xl p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <p className="text-white text-sm font-medium flex-1">{issue.issue}</p>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px]">{issue.estimatedImpact}</Badge>
                                    <Badge className={`text-[10px] ${issue.confidence === "high" ? "bg-red-500/20 text-red-300 border-red-500/30" : issue.confidence === "medium" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-gray-700/60 text-gray-400 border-gray-600"}`}>
                                      {issue.confidence === "high" ? "ثقة عالية" : issue.confidence === "medium" ? "ثقة متوسطة" : "ثقة منخفضة"}
                                    </Badge>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات الإيرادات</p>}
                </TabsContent>

                {/* ── Tab 13: Actions ───────────────────────────────── */}
                <TabsContent value="actions" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <p className="text-white font-semibold mb-4 flex items-center gap-2"><Lightbulb className="w-4 h-4 text-violet-400" /> خطة العمل — مرتبة بالأولوية والتأثير</p>
                      {result.actions?.length ? (
                        <div className="space-y-3">
                          {result.actions.map((action, i) => (
                            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                              className="bg-gray-800/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-start gap-3">
                                <Badge className={`text-[10px] flex-shrink-0 mt-0.5 ${action.priority === "high" ? "bg-red-500/20 text-red-300 border-red-500/30" : action.priority === "medium" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-gray-500/20 text-gray-400 border-gray-600/30"}`}>
                                  {action.priority === "high" ? "عالي" : action.priority === "medium" ? "متوسط" : "منخفض"}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-semibold">{action.task}</p>
                                  <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{action.reason}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2 mr-12">
                                <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/25 text-[10px]"><TrendingUp className="w-2.5 h-2.5 ml-1" />{action.impact}</Badge>
                                <Badge className="bg-gray-700/60 text-gray-400 border-gray-700 text-[10px]"><Clock className="w-2.5 h-2.5 ml-1" />{action.time}</Badge>
                                <Badge className={`text-[10px] ${action.difficulty === "سهل" ? "bg-green-500/15 text-green-300 border-green-500/25" : action.difficulty === "متوسط" ? "bg-amber-500/15 text-amber-300 border-amber-500/25" : "bg-red-500/15 text-red-300 border-red-500/25"}`}>{action.difficulty}</Badge>
                                {action.revenueImpact && <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/25 text-[10px]"><DollarSign className="w-2.5 h-2.5 ml-1" />{action.revenueImpact}</Badge>}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر خطة العمل</p>}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ── Tab 14: Priorities ────────────────────────────── */}
                <TabsContent value="priorities" className="mt-4 outline-none">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardContent className="px-5 pt-4 pb-4">
                      <p className="text-white font-semibold mb-2 flex items-center gap-2"><Award className="w-4 h-4 text-violet-400" /> الأولويات المحسوبة — Priority = Impact × Confidence × Ease ÷ 10</p>
                      <p className="text-gray-500 text-xs mb-4">مرتبة تنازلياً بالـ Priority Score</p>
                      {result.actions?.some(a => a.priorityScore !== undefined) ? (
                        <div className="space-y-2">
                          {[...result.actions!].sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)).map((action, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                              className="flex items-center gap-3 bg-gray-800/40 rounded-xl p-3">
                              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                                style={{ background: `hsl(${Math.min(120, (action.priorityScore ?? 0) * 1.2)}, 60%, 20%)`, color: `hsl(${Math.min(120, (action.priorityScore ?? 0) * 1.2)}, 80%, 65%)` }}>
                                {action.priorityScore ?? "—"}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-sm font-medium truncate">{action.task}</p>
                                <div className="flex gap-2 mt-0.5">
                                  {action.confidence !== undefined && <span className="text-[10px] text-gray-500">ثقة: {action.confidence}/10</span>}
                                  {action.ease !== undefined && <span className="text-[10px] text-gray-500">سهولة: {action.ease}/10</span>}
                                </div>
                              </div>
                              <Badge className={`text-[10px] flex-shrink-0 ${action.priority === "high" ? "bg-red-500/20 text-red-300 border-red-500/30" : action.priority === "medium" ? "bg-amber-500/20 text-amber-300 border-amber-500/30" : "bg-gray-700/60 text-gray-400"}`}>
                                {action.priority === "high" ? "عالي" : action.priority === "medium" ? "متوسط" : "منخفض"}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {result.actions?.map((action, i) => (
                            <div key={i} className="flex items-center gap-3 bg-gray-800/40 rounded-xl p-3">
                              <span className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                              <p className="text-white text-sm flex-1 truncate">{action.task}</p>
                              <Badge className={`text-[10px] flex-shrink-0 ${action.priority === "high" ? "bg-red-500/20 text-red-300 border-red-500/30" : "bg-amber-500/20 text-amber-300 border-amber-500/30"}`}>
                                {action.priority === "high" ? "عالي" : "متوسط"}
                              </Badge>
                            </div>
                          ))}
                          {!result.actions?.length && <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات الأولويات</p>}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  {/* Criteria detailed view */}
                  {result.criteria && result.criteria.length > 0 && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-5">
                        <p className="text-white font-semibold mb-4">التحليل التفصيلي ({result.criteria.length} معيار)</p>
                        <Tabs value={criterionTab} onValueChange={setCriterionTab}>
                          <TabsList className="bg-gray-800/80 rounded-xl p-1 flex flex-wrap gap-1 h-auto w-full mb-4">
                            {result.criteria.map(c => (
                              <TabsTrigger key={c.name} value={c.name}
                                className="rounded-lg text-gray-400 text-[11px] px-2.5 py-1.5 flex items-center gap-1 data-[state=active]:bg-violet-600 data-[state=active]:text-white transition-all">
                                <span className={`text-[10px] font-bold ${c.score >= 75 ? "text-green-400" : c.score >= 50 ? "text-violet-300" : "text-red-400"}`}>{c.score}</span>
                                <span className="truncate max-w-[70px]">{c.name.replace("تحسين محركات البحث ", "").replace(" والمصداقية", "").replace(" والاحتفاظ بالعملاء", "")}</span>
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          {result.criteria.map(c => (
                            <TabsContent key={c.name} value={c.name} className="mt-0 outline-none">
                              <CriterionTab criterion={c} />
                            </TabsContent>
                          ))}
                        </Tabs>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ── Tab 15: Optimizer ─────────────────────────────── */}
                <TabsContent value="optimizer" className="mt-4 space-y-4 outline-none">
                  {result.optimizer ? (
                    <>
                      {/* Hero Section */}
                      {result.optimizer.heroSection && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-5 pt-4 pb-4">
                            <p className="text-white font-semibold mb-3 flex items-center gap-2"><Star className="w-4 h-4 text-violet-400" /> Hero Section المقترح</p>
                            <div className="space-y-3">
                              <div className="bg-gray-800/60 rounded-xl p-3">
                                <p className="text-gray-500 text-[10px] mb-1">العنوان الرئيسي</p>
                                <p className="text-white font-bold">{result.optimizer.heroSection.suggestedHeadline}</p>
                              </div>
                              <div className="bg-gray-800/60 rounded-xl p-3">
                                <p className="text-gray-500 text-[10px] mb-1">النص الفرعي</p>
                                <p className="text-gray-300 text-sm">{result.optimizer.heroSection.suggestedSubtext}</p>
                              </div>
                              <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                                <p className="text-gray-500 text-[10px] mb-1">زر CTA</p>
                                <p className="text-violet-300 font-semibold">{result.optimizer.heroSection.suggestedCTA}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {/* Meta */}
                      {(result.optimizer.metaTitle || result.optimizer.metaDescription) && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-5 pt-4 pb-4">
                            <p className="text-white font-semibold mb-3 flex items-center gap-2"><Globe className="w-4 h-4 text-violet-400" /> Meta SEO محسّن</p>
                            {result.optimizer.metaTitle && (
                              <div className="mb-3">
                                <p className="text-gray-500 text-[10px] mb-1">Meta Title ({result.optimizer.metaTitle.length} حرف)</p>
                                <div className="bg-gray-800/60 rounded-xl p-3 font-mono text-blue-400 text-sm">{result.optimizer.metaTitle}</div>
                              </div>
                            )}
                            {result.optimizer.metaDescription && (
                              <div>
                                <p className="text-gray-500 text-[10px] mb-1">Meta Description ({result.optimizer.metaDescription.length} حرف)</p>
                                <div className="bg-gray-800/60 rounded-xl p-3 text-gray-300 text-sm leading-relaxed">{result.optimizer.metaDescription}</div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}
                      {/* CTA Copy */}
                      {result.optimizer.ctaCopy && result.optimizer.ctaCopy.length > 0 && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-5 pt-4 pb-4">
                            <p className="text-white font-semibold mb-3 flex items-center gap-2"><Zap className="w-4 h-4 text-violet-400" /> نصوص CTA المقترحة</p>
                            <div className="space-y-2">
                              {result.optimizer.ctaCopy.map((cta, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-800/40 rounded-xl p-3">
                                  <span className="text-gray-500 text-xs flex-shrink-0 w-20">{cta.placement}</span>
                                  <span className="text-violet-300 font-semibold text-sm">{cta.suggested}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {/* SEO Titles */}
                      {result.optimizer.seoTitles && result.optimizer.seoTitles.length > 0 && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-5 pt-4 pb-4">
                            <p className="text-white font-semibold mb-3 flex items-center gap-2"><Search className="w-4 h-4 text-violet-400" /> عناوين SEO للصفحات</p>
                            <div className="space-y-2">
                              {result.optimizer.seoTitles.map((t, i) => (
                                <div key={i} className="bg-gray-800/40 rounded-xl p-3">
                                  <p className="text-gray-500 text-[10px] mb-1">{t.page}</p>
                                  <p className="text-blue-400 font-mono text-sm">{t.suggested}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {/* Product Description Template */}
                      {result.optimizer.productDescriptionTemplate && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-5 pt-4 pb-4">
                            <p className="text-white font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-violet-400" /> قالب وصف المنتج</p>
                            <div className="bg-gray-800/60 rounded-xl p-4 text-gray-300 text-sm leading-relaxed whitespace-pre-line">{result.optimizer.productDescriptionTemplate}</div>
                          </CardContent>
                        </Card>
                      )}
                      {/* Content Calendar */}
                      {result.optimizer.contentCalendar && result.optimizer.contentCalendar.length > 0 && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-5 pt-4 pb-4">
                            <p className="text-white font-semibold mb-3 flex items-center gap-2"><Heart className="w-4 h-4 text-violet-400" /> تقويم المحتوى — 4 أسابيع</p>
                            <div className="space-y-2">
                              {result.optimizer.contentCalendar.map((week, i) => (
                                <div key={i} className="bg-gray-800/40 rounded-xl p-3 space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px]">{week.week}</Badge>
                                    <Badge className="bg-gray-700/60 text-gray-400 text-[10px]">{week.platform}</Badge>
                                    <span className="text-white text-sm font-medium">{week.topic}</span>
                                  </div>
                                  <p className="text-gray-400 text-xs">{week.hook}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  ) : <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات المحسّن الذكي</p>}
                </TabsContent>

                {/* ── Tab 16: Psychology ────────────────────────────── */}
                <TabsContent value="psychology" className="mt-4 space-y-4 outline-none">
                  {/* Buyer Persona + Scores */}
                  <div className="grid grid-cols-3 gap-3">
                    {result.healthScore != null && (
                      <Card className="bg-gray-900/80 border-gray-800 rounded-2xl"><CardContent className="px-4 pt-4 pb-4 text-center"><p className="text-gray-500 text-[10px] mb-1">Health Score</p><ScoreRing score={result.healthScore} size={72} strokeWidth={7} /></CardContent></Card>
                    )}
                    {result.maturityScore != null && (
                      <Card className="bg-gray-900/80 border-gray-800 rounded-2xl"><CardContent className="px-4 pt-4 pb-4 text-center"><p className="text-gray-500 text-[10px] mb-1">Maturity</p><ScoreRing score={result.maturityScore} size={72} strokeWidth={7} /></CardContent></Card>
                    )}
                    {result.merchantSuccessScore != null && (
                      <Card className="bg-gray-900/80 border-gray-800 rounded-2xl"><CardContent className="px-4 pt-4 pb-4 text-center"><p className="text-gray-500 text-[10px] mb-1">نجاح التاجر</p><ScoreRing score={result.merchantSuccessScore} size={72} strokeWidth={7} /></CardContent></Card>
                    )}
                  </div>

                  {/* Psychology */}
                  {result.psychology && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4 space-y-4">
                        <p className="text-white font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-violet-400" /> نفسية المتسوق</p>
                        <div className="bg-gray-800/40 rounded-xl p-4">
                          <p className="text-gray-500 text-[10px] mb-1">الشخصية المستهدفة</p>
                          <p className="text-white text-sm">{result.psychology.buyerPersona}</p>
                        </div>
                        {result.psychology.attentionFlow && (
                          <div className="bg-violet-500/8 border border-violet-500/20 rounded-xl p-3">
                            <p className="text-gray-500 text-[10px] mb-1 flex items-center gap-1"><Eye className="w-3 h-3" /> تدفق الانتباه البصري</p>
                            <p className="text-violet-300 text-sm">{result.psychology.attentionFlow}</p>
                          </div>
                        )}
                        {result.psychology.sessionReplay && (
                          <div className="bg-gray-800/40 rounded-xl p-3">
                            <p className="text-gray-500 text-[10px] mb-2 flex items-center gap-1"><Activity className="w-3 h-3" /> محاكاة جلسة العميل</p>
                            <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{result.psychology.sessionReplay}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {result.psychology.purchaseMotivators?.length > 0 && (
                            <div className="bg-green-500/8 border border-green-500/20 rounded-xl p-3">
                              <p className="text-green-400 text-[10px] font-semibold mb-2">محركات الشراء</p>
                              {result.psychology.purchaseMotivators.map((m, i) => <p key={i} className="text-gray-300 text-xs mb-1">• {m}</p>)}
                            </div>
                          )}
                          {result.psychology.trustBarriers?.length > 0 && (
                            <div className="bg-red-500/8 border border-red-500/20 rounded-xl p-3">
                              <p className="text-red-400 text-[10px] font-semibold mb-2">عوائق الثقة</p>
                              {result.psychology.trustBarriers.map((b, i) => <p key={i} className="text-gray-300 text-xs mb-1">• {b}</p>)}
                            </div>
                          )}
                          {result.psychology.emotionalTriggers?.length > 0 && (
                            <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-3">
                              <p className="text-amber-400 text-[10px] font-semibold mb-2">المحفزات العاطفية</p>
                              {result.psychology.emotionalTriggers.map((t, i) => <p key={i} className="text-gray-300 text-xs mb-1">• {t}</p>)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-xs">Cognitive Load:</span>
                          <Badge className={`text-[10px] ${result.psychology.cognitiveLoad === 'low' ? 'bg-green-500/20 text-green-300 border-green-500/30' : result.psychology.cognitiveLoad === 'medium' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
                            {result.psychology.cognitiveLoad === 'low' ? 'منخفض ✓' : result.psychology.cognitiveLoad === 'medium' ? 'متوسط ⚠️' : 'مرتفع ✗'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Brand */}
                  {result.brand && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-violet-400" /> الهوية والبراند</p>
                          <div className="flex gap-3">
                            <span className="text-gray-500 text-xs">هوية: <span className="text-white font-bold">{result.brand.identityScore}/100</span></span>
                            <span className="text-gray-500 text-xs">تناسق: <span className="text-white font-bold">{result.brand.consistencyScore}/100</span></span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge className={`text-xs ${result.brand.premiumFeel === 'premium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : result.brand.premiumFeel === 'professional' ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' : 'bg-gray-700 text-gray-400'}`}>
                            {result.brand.premiumFeel === 'premium' ? '⭐ فاخر' : result.brand.premiumFeel === 'professional' ? '✦ احترافي' : result.brand.premiumFeel === 'mid' ? '◈ متوسط' : '◇ بدائي'}
                          </Badge>
                          {result.brand.personality && <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/25 text-xs">{result.brand.personality}</Badge>}
                        </div>
                        {result.brand.issues?.filter(Boolean).length > 0 && (
                          <div className="space-y-1">{result.brand.issues.filter(Boolean).map((iss, i) => <div key={i} className="flex gap-2 items-start"><XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" /><p className="text-gray-300 text-xs">{iss}</p></div>)}</div>
                        )}
                        {result.brand.improvements?.filter(Boolean).length > 0 && (
                          <div className="space-y-1">{result.brand.improvements.filter(Boolean).map((imp, i) => <div key={i} className="flex gap-2 items-start"><ChevronRight className="w-3.5 h-3.5 text-violet-400 flex-shrink-0 mt-0.5" /><p className="text-gray-300 text-xs">{imp}</p></div>)}</div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Pricing */}
                  {result.pricing && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-white font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-violet-400" /> تحليل التسعير</p>
                          <span className="text-gray-500 text-xs">تقييم: <span className="text-white font-bold">{result.pricing.score}/100</span></span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {result.pricing.strategy && <Badge className="bg-gray-700/60 text-gray-300 text-xs">{result.pricing.strategy}</Badge>}
                          {result.pricing.hasFakeDiscounts && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">⚠️ خصومات مشبوهة</Badge>}
                          {result.pricing.fakeDiscountRisk === 'high' && <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">خطر وهمية: عالي</Badge>}
                          {result.pricing.psychologyUsed?.filter(Boolean).map((p, i) => <Badge key={i} className="bg-violet-500/15 text-violet-300 border-violet-500/25 text-[10px]">{p}</Badge>)}
                        </div>
                        {result.pricing.issues?.filter(Boolean).length > 0 && (
                          <div className="space-y-1">{result.pricing.issues.filter(Boolean).map((iss, i) => <div key={i} className="flex gap-2 items-start"><AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" /><p className="text-gray-300 text-xs">{iss}</p></div>)}</div>
                        )}
                        {result.pricing.suggestions?.filter(Boolean).length > 0 && (
                          <div className="space-y-1">{result.pricing.suggestions.filter(Boolean).map((s, i) => <div key={i} className="flex gap-2 items-start"><ChevronRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><p className="text-gray-300 text-xs">{s}</p></div>)}</div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* RTL + Gulf */}
                  {(result.rtlAnalysis || result.gulfCommerceReadiness) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {result.rtlAnalysis && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-4 pt-4 pb-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-white text-sm font-semibold flex items-center gap-2"><Navigation className="w-4 h-4 text-violet-400" /> RTL UX</p>
                              <span className="text-white font-bold">{result.rtlAnalysis.score}/100</span>
                            </div>
                            {result.rtlAnalysis.issues?.filter(Boolean).map((iss, i) => <p key={i} className="text-gray-400 text-xs mb-1">• {iss}</p>)}
                          </CardContent>
                        </Card>
                      )}
                      {result.gulfCommerceReadiness && (
                        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                          <CardContent className="px-4 pt-4 pb-4">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-white text-sm font-semibold flex items-center gap-2"><Globe className="w-4 h-4 text-violet-400" /> Gulf Commerce</p>
                              <span className="text-white font-bold">{result.gulfCommerceReadiness.score}/100</span>
                            </div>
                            {result.gulfCommerceReadiness.gaps?.filter(Boolean).map((g, i) => <p key={i} className="text-red-400 text-xs mb-1">• {g}</p>)}
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}

                  {!result.psychology && !result.brand && !result.pricing && (
                    <p className="text-gray-500 text-sm text-center py-8">لم تتوفر بيانات ذكاء الأعمال</p>
                  )}
                </TabsContent>

                {/* ── Tab 17: Competitors ───────────────────────────── */}
                <TabsContent value="competitors" className="mt-4 space-y-4 outline-none">
                  {/* Competitors */}
                  {result.competitors && result.competitors.length > 0 ? (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <p className="text-white font-semibold mb-4 flex items-center gap-2"><Swords className="w-4 h-4 text-violet-400" /> المنافسون في السوق السعودي</p>
                        <div className="space-y-3">
                          {result.competitors.map((comp, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                              className="bg-gray-800/40 rounded-xl p-4 space-y-2">
                              <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 text-sm flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white font-semibold">{comp.arabicName || comp.name}</p>
                                  {comp.url && <a href={comp.url} target="_blank" rel="noopener noreferrer" className="text-violet-400 text-xs hover:underline truncate block">{comp.url}</a>}
                                </div>
                              </div>
                              {comp.strength && (
                                <div className="mr-11 flex items-start gap-1.5">
                                  <Flame className="w-3 h-3 text-amber-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-gray-300 text-xs">نقاط قوته: {comp.strength}</p>
                                </div>
                              )}
                              {comp.differentiator && (
                                <div className="mr-11 flex items-start gap-1.5">
                                  <TrendingUp className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5" />
                                  <p className="text-gray-300 text-xs">فرصة التمايز: {comp.differentiator}</p>
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ) : <p className="text-gray-500 text-sm text-center py-6">جاري اكتشاف المنافسين...</p>}

                  {/* Missing Features */}
                  {result.missingFeatures && result.missingFeatures.filter(Boolean).length > 0 && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <p className="text-white font-semibold mb-3 flex items-center gap-2"><TrendingDown className="w-4 h-4 text-red-400" /> ميزات مفقودة مقارنة بالمنافسين</p>
                        <div className="space-y-2">
                          {result.missingFeatures.filter(Boolean).map((f, i) => (
                            <div key={i} className="flex gap-2 items-start bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                              <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                              <p className="text-gray-300 text-sm">{f}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Growth Opportunities */}
                  {result.growthOpportunities && result.growthOpportunities.filter(Boolean).length > 0 && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <p className="text-white font-semibold mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-400" /> فرص النمو المخفية</p>
                        <div className="space-y-2">
                          {result.growthOpportunities.filter(Boolean).map((opp, i) => (
                            <div key={i} className="flex gap-2 items-start bg-amber-500/5 border border-amber-500/15 rounded-xl p-3">
                              <TrendingUp className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                              <p className="text-gray-300 text-sm">{opp}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Checkout Friction */}
                  {result.checkoutFriction && (
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardContent className="px-5 pt-4 pb-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-white font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-violet-400" /> Checkout Friction</p>
                          <div className="flex gap-3">
                            <span className="text-gray-500 text-xs">تقييم: <span className="text-white font-bold">{result.checkoutFriction.score}/100</span></span>
                            {result.checkoutFriction.estimatedSteps > 0 && <span className="text-gray-500 text-xs">خطوات: <span className="text-amber-400 font-bold">{result.checkoutFriction.estimatedSteps}</span></span>}
                          </div>
                        </div>
                        {result.checkoutFriction.issues?.filter(Boolean).map((iss, i) => <div key={i} className="flex gap-2 items-start mb-1.5"><AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" /><p className="text-gray-300 text-xs">{iss}</p></div>)}
                        {result.checkoutFriction.improvements?.filter(Boolean).map((imp, i) => <div key={i} className="flex gap-2 items-start mt-1"><ChevronRight className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" /><p className="text-gray-300 text-xs">{imp}</p></div>)}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>

              {/* Bottom actions */}
              <div className="flex gap-3">
                <Button onClick={() => window.print()}
                  className="flex-1 h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2 transition-all">
                  <Download className="w-4 h-4" /> تصدير PDF
                </Button>
                <Button onClick={reset} variant="outline"
                  className="h-11 rounded-xl border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-white px-4">
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Idle */}
        <AnimatePresence>
          {!loading && !result && !error && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center gap-4">
              <div className="p-4 bg-gray-800/50 rounded-2xl border border-gray-800">
                <Store className="w-8 h-8 text-gray-600" />
              </div>
              <div>
                <p className="text-gray-500 text-sm max-w-sm leading-relaxed mb-3">أدخل رابط متجرك واختر التخصص لبدء التحليل الشامل بـ 15 طبقة ذكية</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {["Technical", "Visual AI", "UX", "CRO", "SEO", "Behavioral", "Trust", "Commerce", "Revenue", "Optimizer"].map(f => (
                    <Badge key={f} className="bg-gray-800 text-gray-500 border-gray-700 text-[10px]">{f}</Badge>
                  ))}
                </div>
              </div>
              <p className="text-gray-600 text-xs">يستغرق التحليل الشامل 60–120 ثانية</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
