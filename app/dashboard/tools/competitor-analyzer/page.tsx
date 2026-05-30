"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Swords, Plus, X, Loader2, TrendingUp, TrendingDown, Lightbulb, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"

// ─── أنواع ───────────────────────────────────────────────────────────────────

interface StoreScore {
  name: string
  url: string
  score: number
  strengths: string[]
  weaknesses: string[]
}

interface ComparisonRow {
  aspect: string
  myScore: number
  theirScore: number
  analysis: string
}

interface AnalysisResult {
  summary: string
  myStore: StoreScore
  competitors: StoreScore[]
  comparison: ComparisonRow[]
  opportunities: string[]
  threats: string[]
  strategy: string[]
}

const ASPECTS = [
  "الأسعار", "المنتجات", "التصميم", "السوشيال ميديا",
  "السيو", "سرعة الموقع", "خيارات الدفع", "خدمة العملاء",
]

const LOADING_STEPS = [
  "جاري تحليل متجرك...",
  "جاري تحليل المنافسين...",
  "جاري مقارنة البيانات...",
  "جاري إعداد التقرير...",
]

// ─── دائرة النقاط ─────────────────────────────────────────────────────────────

function ScoreRing({ score, size = 80, isMyStore = false }: { score: number; size?: number; isMyStore?: boolean }) {
  const r = size * 0.38
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? "#10B981" : score >= 50 ? "#F59E0B" : "#EF4444"
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1F2937" strokeWidth={size * 0.1} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={isMyStore ? "#A78BFA" : color}
          strokeWidth={size * 0.1} strokeLinecap="round" strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 0.8, ease: "easeOut" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-white font-black" style={{ fontSize: size * 0.24 }}>{score}</span>
        <span className="text-gray-500" style={{ fontSize: size * 0.1 }}>/100</span>
      </div>
    </div>
  )
}

// ─── بطاقة متجر ──────────────────────────────────────────────────────────────

function StoreCard({ store, isMyStore }: { store: StoreScore; isMyStore?: boolean }) {
  return (
    <Card className={`rounded-2xl ${isMyStore ? "bg-violet-500/10 border-violet-500/40" : "bg-gray-900/80 border-gray-800"}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <ScoreRing score={store.score} size={64} isMyStore={isMyStore} />
          <div className="flex-1 min-w-0">
            {isMyStore && <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-[10px] mb-1">متجرك</Badge>}
            <p className="text-white font-semibold text-sm truncate">{store.name}</p>
            <p className="text-gray-500 text-xs truncate">{store.url}</p>
          </div>
        </div>
        <div className="space-y-1.5">
          {store.strengths.slice(0, 2).map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle className="w-3 h-3 flex-shrink-0" />{s}
            </div>
          ))}
          {store.weaknesses.slice(0, 2).map((w, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-red-400">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />{w}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── صف المقارنة ──────────────────────────────────────────────────────────────

function ComparisonRow({ row, isFirst }: { row: ComparisonRow; isFirst?: boolean }) {
  const myWins = row.myScore >= row.theirScore
  return (
    <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[1fr_80px_80px] gap-3 items-center py-3 border-b border-gray-800 last:border-0">
      <div>
        <p className="text-gray-300 text-sm">{row.aspect}</p>
        <p className="text-gray-600 text-xs mt-0.5">{row.analysis}</p>
      </div>
      <div className="text-center">
        <div className={`text-base font-bold ${myWins ? "text-violet-400" : "text-gray-400"}`}>{row.myScore}/10</div>
        <div className="h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
          <motion.div className={`h-full rounded-full ${myWins ? "bg-violet-500" : "bg-gray-600"}`}
            animate={{ width: `${row.myScore * 10}%` }} transition={{ delay: 0.2 }} />
        </div>
      </div>
      <div className="text-center">
        <div className={`text-base font-bold ${!myWins ? "text-red-400" : "text-gray-400"}`}>{row.theirScore}/10</div>
        <div className="h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
          <motion.div className={`h-full rounded-full ${!myWins ? "bg-red-500" : "bg-gray-600"}`}
            animate={{ width: `${row.theirScore * 10}%` }} transition={{ delay: 0.3 }} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function CompetitorAnalyzerPage() {
  const [myUrl, setMyUrl] = useState("")
  const [competitors, setCompetitors] = useState([""])
  const [aspects, setAspects] = useState<string[]>(["التصميم", "السيو", "خيارات الدفع", "السوشيال ميديا"])
  const [loading, setLoading] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState("")

  const addCompetitor = () => {
    if (competitors.length < 1) setCompetitors([...competitors, ""])
  }
  const removeCompetitor = (i: number) => setCompetitors(competitors.filter((_, idx) => idx !== i))
  const updateCompetitor = (i: number, v: string) => {
    const next = [...competitors]; next[i] = v; setCompetitors(next)
  }

  const toggleAspect = (a: string) =>
    setAspects(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])

  const analyze = async () => {
    if (!myUrl || competitors.filter(Boolean).length === 0) {
      setError("أدخل رابط متجرك وأحد منافسيك على الأقل"); return
    }
    setError(""); setLoading(true); setResult(null); setStepIndex(0)
    // محاكاة الخطوات
    const interval = setInterval(() => setStepIndex(i => Math.min(i + 1, LOADING_STEPS.length - 1)), 1800)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null
      // backend takes one competitorUrl — use first valid one
      const competitorUrl = competitors.filter(u => { try { new URL(u); return true } catch { return false } })[0]
      const res = await fetch("/api/tools/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ myUrl, competitorUrl }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "حدث خطأ")
      setResult(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ، حاول مرة أخرى")
    } finally {
      clearInterval(interval); setLoading(false)
    }
  }

  const isValidUrl = (u: string) => { try { new URL(u); return true } catch { return false } }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <Swords className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">محلل المنافسين</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">Firecrawl + Gemini Pro</Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">قارن متجرك بمنافسيك واكتشف الفرص الخفية</p>
      </motion.div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── نموذج الإدخال ── */}
        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* متجري */}
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">رابط متجرك *</Label>
                <div className="relative">
                  <Input value={myUrl} onChange={e => setMyUrl(e.target.value)}
                    placeholder="https://متجرك.sa"
                    className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 text-right focus:border-violet-500 pl-10" />
                  {myUrl && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      {isValidUrl(myUrl)
                        ? <CheckCircle className="w-4 h-4 text-green-400" />
                        : <AlertCircle className="w-4 h-4 text-red-400" />}
                    </div>
                  )}
                </div>
              </div>

              {/* المنافسون */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-400 text-xs">رابط المنافس *</Label>
                  {competitors.length < 1 && (
                    <button onClick={addCompetitor} className="text-violet-400 text-xs flex items-center gap-1 hover:text-violet-300">
                      <Plus className="w-3 h-3" /> أضف منافس
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {competitors.map((c, i) => (
                    <div key={i} className="relative flex gap-2">
                      <div className="relative flex-1">
                        <Input value={c} onChange={e => updateCompetitor(i, e.target.value)}
                          placeholder={`https://منافس${i + 1}.sa`}
                          className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 text-right focus:border-violet-500 pl-10" />
                        {c && (
                          <div className="absolute left-3 top-1/2 -translate-y-1/2">
                            {isValidUrl(c) ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                          </div>
                        )}
                      </div>
                      {competitors.length > 1 && (
                        <button onClick={() => removeCompetitor(i)} className="text-gray-600 hover:text-red-400 p-2">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* جوانب المقارنة */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs">جوانب المقارنة</Label>
              <div className="flex flex-wrap gap-2">
                {ASPECTS.map(a => (
                  <button key={a} onClick={() => toggleAspect(a)}
                    className={`px-3 py-1.5 rounded-xl text-sm border transition-all ${aspects.includes(a) ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            <Button onClick={analyze} disabled={loading}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{LOADING_STEPS[stepIndex]}</> : <><Swords className="w-4 h-4" /> حلّل المنافسين</>}
            </Button>
          </CardContent>
        </Card>

        {/* ── النتائج ── */}
        <AnimatePresence>
          {result && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* الملخص */}
              <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                <CardContent className="p-5">
                  <p className="text-gray-300 text-sm leading-relaxed">{result.summary}</p>
                </CardContent>
              </Card>

              {/* بطاقات النقاط */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StoreCard store={result.myStore} isMyStore />
                {result.competitors.map((c, i) => <StoreCard key={i} store={c} />)}
              </div>

              {/* جدول المقارنة */}
              <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <div className="grid grid-cols-[1fr_80px_80px] gap-3">
                    <CardTitle className="text-gray-400 text-xs font-semibold uppercase">الجانب</CardTitle>
                    <p className="text-violet-400 text-xs text-center font-semibold">متجرك</p>
                    <p className="text-gray-400 text-xs text-center font-semibold">المنافس</p>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-4">
                  {result.comparison.map((row, i) => <ComparisonRow key={i} row={row} isFirst={i === 0} />)}
                </CardContent>
              </Card>

              {/* الفرص والتهديدات */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-green-500/5 border-green-500/20 rounded-2xl">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-green-400 text-sm flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> نقاط تميزك وفرصك
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-2">
                    {result.opportunities.map((o, i) => (
                      <div key={i} className="flex gap-2 text-sm text-gray-300">
                        <Lightbulb className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />{o}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-red-500/5 border-red-500/20 rounded-2xl">
                  <CardHeader className="pb-2 pt-4 px-5">
                    <CardTitle className="text-red-400 text-sm flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" /> نقاط ضعفك والتهديدات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-5 pb-4 space-y-2">
                    {result.threats.map((t, i) => (
                      <div key={i} className="flex gap-2 text-sm text-gray-300">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />{t}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* الاستراتيجية */}
              <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                <CardHeader className="pb-2 pt-4 px-5">
                  <CardTitle className="text-white text-sm">خطة التفوق على المنافسين</CardTitle>
                </CardHeader>
                <CardContent className="px-5 pb-4 space-y-3">
                  {result.strategy.map((s, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 text-xs flex items-center justify-center flex-shrink-0 font-bold">{i + 1}</div>
                      <p className="text-gray-300 text-sm">{s}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Button className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white gap-2" asChild>
                <a href="/dashboard/tools/social-plan">
                  <ExternalLink className="w-4 h-4" /> أنشئ خطة لتجاوزهم ←
                </a>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !result && (
          <div className="text-center py-16 text-gray-600">
            <Swords className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>أدخل روابط المتاجر واضغط "حلّل المنافسين"</p>
          </div>
        )}
      </div>
    </div>
  )
}
