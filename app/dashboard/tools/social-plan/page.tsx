"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Calendar, List, BarChart2, Loader2, Clock, Hash, ExternalLink, Copy, Check } from "lucide-react"

// ─── أنواع ───────────────────────────────────────────────────────────────────

interface Post {
  platform: string
  type: string
  caption: string
  hashtags: string[]
  time: string
  tip: string
}

interface DayPlan {
  day: number
  theme: string
  posts: Post[]
}

interface PlanResult {
  plan: DayPlan[]
  bestTimes: Record<string, string>
  summary: string
  storeName: string
}

const PLATFORMS = [
  { id: "instagram", icon: "📸", label: "Instagram", color: "bg-pink-500/20 text-pink-300 border-pink-500/30" },
  { id: "tiktok",    icon: "🎵", label: "TikTok",    color: "bg-red-500/20 text-red-300 border-red-500/30" },
  { id: "snapchat",  icon: "👻", label: "Snapchat",   color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  { id: "twitter",   icon: "🐦", label: "X (تويتر)", color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  { id: "linkedin",  icon: "💼", label: "LinkedIn",   color: "bg-sky-500/20 text-sky-300 border-sky-500/30" },
]

const GOALS = ["زيادة المبيعات", "وعي بالعلامة", "تفاعل", "متابعين جدد", "ولاء العملاء"]
const TONES = [
  { id: "friendly",     label: "ودود",       icon: "😊" },
  { id: "professional", label: "احترافي",    icon: "🎯" },
  { id: "youthful",     label: "شبابي",      icon: "🔥" },
  { id: "luxury",       label: "فاخر",       icon: "✨" },
]
const BUSINESS_TYPES = ["أزياء", "إلكترونيات", "مأكولات", "جمال", "رياضة", "منزل", "هدايا"]

function getPlatformStyle(pid: string) {
  return PLATFORMS.find(p => p.id === pid) ?? PLATFORMS[0]
}

// ─── بطاقة يوم في التقويم ─────────────────────────────────────────────────────

function DayCell({ day, onClick }: { day: DayPlan; onClick: () => void }) {
  const platforms = [...new Set(day.posts.map(p => p.platform))]
  return (
    <button onClick={onClick}
      className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-2 text-right hover:border-violet-500/50 hover:bg-gray-800 transition-all min-h-[80px] group">
      <div className="text-gray-500 text-xs mb-1 font-medium">{day.day}</div>
      <div className="text-violet-300 text-[10px] leading-tight mb-1.5 font-medium line-clamp-1">{day.theme}</div>
      <div className="flex flex-wrap gap-1">
        {platforms.map(p => {
          const plt = getPlatformStyle(p)
          return <span key={p} className="text-[11px]">{plt.icon}</span>
        })}
      </div>
    </button>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function CalendarSkeleton() {
  return (
    <div className="grid grid-cols-7 gap-2">
      {Array.from({ length: 28 }).map((_, i) => (
        <div key={i} className="bg-gray-800 rounded-xl h-20 animate-pulse" />
      ))}
    </div>
  )
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function SocialPlanPage() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "tiktok"])
  const [storeName, setStoreName] = useState("")
  const [productType, setProductType] = useState("")
  const [duration, setDuration] = useState("شهر")
  const [businessType, setBusinessType] = useState("")
  const [goals, setGoals] = useState<string[]>(["زيادة المبيعات"])
  const [tone, setTone] = useState("friendly")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PlanResult | null>(null)
  const [error, setError] = useState("")
  const [view, setView] = useState<"calendar" | "list" | "stats">("calendar")
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null)
  const [copied, setCopied] = useState(false)

  const togglePlatform = (id: string) =>
    setSelectedPlatforms(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleGoal = (g: string) =>
    setGoals(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])

  const generate = async () => {
    if (!storeName || selectedPlatforms.length === 0) {
      setError("أدخل اسم المتجر واختر منصة واحدة على الأقل"); return
    }
    setError(""); setLoading(true); setResult(null)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null
      const res = await fetch("/api/tools/social-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ storeName, productType, days: duration, tone }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "حدث خطأ")
      setResult(await res.json())
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ، حاول مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  const copyAll = () => {
    if (!result) return
    const text = result.plan.map(d =>
      `اليوم ${d.day} — ${d.theme}\n` + d.posts.map(p => `[${p.platform}] ${p.caption}`).join("\n")
    ).join("\n\n")
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <Calendar className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">خطة محتوى السوشيال ميديا</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">Gemini Flash</Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">خطة محتوى شاملة لجميع المنصات — تقويم منظم جاهز للتنفيذ</p>
      </motion.div>

      <div className="max-w-6xl mx-auto space-y-6">
        {/* ── نموذج الإدخال ── */}
        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
          <CardContent className="p-6 space-y-5">
            {/* المنصات */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs">المنصات *</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${selectedPlatforms.includes(p.id) ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}`}>
                    <span>{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">اسم المتجر *</Label>
                <Input value={storeName} onChange={e => setStoreName(e.target.value)}
                  placeholder="متجر نور"
                  className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 text-right focus:border-violet-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">نوع المنتجات</Label>
                <Input value={productType} onChange={e => setProductType(e.target.value)}
                  placeholder="ملابس نسائية / عطور..."
                  className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 text-right focus:border-violet-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">المدة</Label>
                <div className="flex h-11 rounded-xl overflow-hidden border border-gray-700">
                  {["أسبوع", "شهر", "3 أشهر"].map(d => (
                    <button key={d} onClick={() => setDuration(d)}
                      className={`flex-1 text-xs transition-colors ${duration === d ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">مجال المتجر</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 focus:border-violet-500">
                    <SelectValue placeholder="اختر" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {BUSINESS_TYPES.map(t => <SelectItem key={t} value={t} className="text-right">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">الأهداف</Label>
                <div className="flex flex-wrap gap-2">
                  {GOALS.map(g => (
                    <button key={g} onClick={() => toggleGoal(g)}
                      className={`px-3 py-1.5 rounded-xl border text-xs transition-all ${goals.includes(g) ? "bg-violet-500/20 border-violet-500/50 text-violet-300" : "bg-gray-800 border-gray-700 text-gray-400"}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">النبرة</Label>
                <div className="grid grid-cols-4 gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      className={`p-2 rounded-xl border text-center transition-all ${tone === t.id ? "border-violet-500 bg-violet-500/10" : "border-gray-700 bg-gray-800 hover:border-gray-600"}`}>
                      <div className="text-lg">{t.icon}</div>
                      <div className={`text-[11px] ${tone === t.id ? "text-violet-300" : "text-gray-400"}`}>{t.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            <Button onClick={generate} disabled={loading}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />جاري تخطيط المحتوى...</> : <><Calendar className="w-4 h-4" />أنشئ خطة المحتوى</>}
            </Button>
          </CardContent>
        </Card>

        {/* ── Skeleton ── */}
        {loading && (
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardContent className="p-6"><CalendarSkeleton /></CardContent>
          </Card>
        )}

        {/* ── النتائج ── */}
        <AnimatePresence>
          {result && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              {/* الملخص + أفضل الأوقات */}
              <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                <CardContent className="p-5">
                  <p className="text-gray-300 text-sm mb-3">{result.summary}</p>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(result.bestTimes).map(([plt, time]) => {
                      const p = getPlatformStyle(plt)
                      return (
                        <div key={plt} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs ${p.color}`}>
                          <span>{p.icon}</span>
                          <Clock className="w-3 h-3" />
                          <span>{time}</span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* View Toggle + Actions */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex bg-gray-900 border border-gray-800 rounded-xl p-1 gap-1">
                  {[
                    { v: "calendar" as const, icon: <Calendar className="w-4 h-4" />, label: "تقويم" },
                    { v: "list"     as const, icon: <List     className="w-4 h-4" />, label: "قائمة" },
                    { v: "stats"    as const, icon: <BarChart2 className="w-4 h-4" />, label: "إحصائيات" },
                  ].map(({ v, icon, label }) => (
                    <button key={v} onClick={() => setView(v)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${view === v ? "bg-violet-600 text-white" : "text-gray-400 hover:text-white"}`}>
                      {icon}{label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyAll}
                    className="h-9 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800 gap-1.5 text-xs">
                    {copied ? <><Check className="w-3.5 h-3.5 text-green-400" />تم</> : <><Copy className="w-3.5 h-3.5" />نسخ الكل</>}
                  </Button>
                  <Button size="sm" variant="outline"
                    className="h-9 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800 text-xs">
                    تصدير CSV
                  </Button>
                </div>
              </div>

              {/* تقويم */}
              {view === "calendar" && (
                <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-7 gap-2">
                      {["أحد", "إثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"].map(d => (
                        <div key={d} className="text-center text-gray-600 text-[10px] pb-1 font-medium">{d}</div>
                      ))}
                      {result.plan.map(day => (
                        <DayCell key={day.day} day={day} onClick={() => setSelectedDay(day)} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* قائمة */}
              {view === "list" && (
                <div className="space-y-3">
                  {result.plan.map(day => (
                    <Card key={day.day} className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <button className="w-full p-4 text-right" onClick={() => setSelectedDay(day)}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-sm">اليوم {day.day}</p>
                            <p className="text-violet-400 text-xs">{day.theme}</p>
                          </div>
                          <div className="flex gap-1">
                            {[...new Set(day.posts.map(p => p.platform))].map(pid => (
                              <span key={pid} className="text-lg">{getPlatformStyle(pid).icon}</span>
                            ))}
                          </div>
                        </div>
                      </button>
                    </Card>
                  ))}
                </div>
              )}

              {/* إحصائيات */}
              {view === "stats" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-white text-sm">توزيع المنشورات حسب المنصة</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-3">
                      {selectedPlatforms.map(pid => {
                        const plt = getPlatformStyle(pid)
                        const count = result.plan.reduce((sum, d) => sum + d.posts.filter(p => p.platform === pid).length, 0)
                        const pct = result.plan.length > 0 ? Math.round((count / result.plan.length) * 100) : 0
                        return (
                          <div key={pid} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300 flex items-center gap-1.5"><span>{plt.icon}</span>{plt.label}</span>
                              <span className="text-gray-400">{count} منشور</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <motion.div className="h-full bg-violet-500 rounded-full"
                                animate={{ width: `${pct}%` }} transition={{ delay: 0.2 }} />
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                  <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                    <CardHeader className="pb-2 pt-4 px-5">
                      <CardTitle className="text-white text-sm">أفضل أوقات النشر</CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-4 space-y-3">
                      {Object.entries(result.bestTimes).map(([plt, time]) => {
                        const p = getPlatformStyle(plt)
                        return (
                          <div key={plt} className="flex items-center justify-between">
                            <span className="text-gray-300 text-sm flex items-center gap-2"><span>{p.icon}</span>{p.label}</span>
                            <Badge className={`text-xs ${p.color}`}>{time}</Badge>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !result && (
          <div className="text-center py-16 text-gray-600">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>حدد إعدادات خطتك واضغط "أنشئ خطة المحتوى"</p>
          </div>
        )}
      </div>

      {/* ── Sheet تفاصيل اليوم ── */}
      <Sheet open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <SheetContent side="left" className="bg-gray-900 border-gray-800 w-full sm:max-w-lg overflow-y-auto" dir="rtl">
          {selectedDay && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="text-white">اليوم {selectedDay.day} — {selectedDay.theme}</SheetTitle>
              </SheetHeader>
              <div className="space-y-4">
                {selectedDay.posts.map((post, i) => {
                  const plt = getPlatformStyle(post.platform)
                  return (
                    <Card key={i} className="bg-gray-800 border-gray-700 rounded-xl">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <Badge className={`text-xs ${plt.color}`}>{plt.icon} {plt.label}</Badge>
                          <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                            <Clock className="w-3 h-3" />{post.time}
                          </div>
                        </div>
                        <p className="text-gray-300 text-sm leading-relaxed">{post.caption}</p>
                        {post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {post.hashtags.map(h => (
                              <span key={h} className="flex items-center gap-0.5 text-blue-400 text-xs">
                                <Hash className="w-3 h-3" />{h.replace("#", "")}
                              </span>
                            ))}
                          </div>
                        )}
                        {post.tip && (
                          <p className="text-amber-300/80 text-xs bg-amber-500/10 rounded-lg px-3 py-2">💡 {post.tip}</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
                <Button className="w-full h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-300 hover:bg-violet-600/30 gap-2 text-sm" asChild>
                  <a href="/dashboard/tools/product-images">
                    <ExternalLink className="w-3.5 h-3.5" /> أنشئ صورة لهذا المنشور
                  </a>
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
