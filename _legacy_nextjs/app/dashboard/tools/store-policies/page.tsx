"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollText, Copy, Download, Loader2, Check, AlertTriangle, Scale } from "lucide-react"

// ─── أنواع ───────────────────────────────────────────────────────────────────

interface PolicyDef {
  id: string
  icon: string
  label: string
  desc: string
}

const POLICY_DEFS: PolicyDef[] = [
  { id: "shipping",  icon: "🚚", label: "الشحن والتوصيل",    desc: "مواعيد التوصيل، مناطق الخدمة، التكاليف" },
  { id: "returns",   icon: "↩️", label: "الإرجاع والاستبدال", desc: "شروط الإرجاع، المدة، الاستثناءات" },
  { id: "privacy",   icon: "🔒", label: "سياسة الخصوصية",    desc: "جمع البيانات، الاستخدام، الحماية" },
  { id: "terms",     icon: "📄", label: "الشروط والأحكام",    desc: "استخدام الموقع، المسؤوليات، الإلغاء" },
  { id: "cookies",   icon: "🍪", label: "ملفات الكوكيز",      desc: "أنواع الكوكيز، إدارتها، الموافقة" },
]

const BUSINESS_TYPES = ["ملابس وأزياء", "إلكترونيات", "مأكولات ومشروبات", "عطور ومستحضرات", "مجوهرات وإكسسوارات", "رياضة ولياقة", "أثاث ومنزل", "كتب وقرطاسية", "خدمات", "أخرى"]
const COUNTRIES = ["المملكة العربية السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان", "مصر", "الأردن"]

// ─── مكوّن زر النسخ ────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setDone(true)
    setTimeout(() => setDone(false), 2000)
  }
  return (
    <Button size="sm" variant="outline" onClick={copy}
      className="h-8 rounded-lg border-gray-700 text-gray-400 hover:text-white gap-1 text-xs">
      {done ? <><Check className="w-3 h-3 text-green-400" />تم</> : <><Copy className="w-3 h-3" />نسخ</>}
    </Button>
  )
}

// ─── حلقة الإكمال ─────────────────────────────────────────────────────────────

function CompletionRing({ selected, total }: { selected: number; total: number }) {
  const pct = total > 0 ? (selected / total) * 100 : 0
  const r = 28; const circ = 2 * Math.PI * r
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-16 h-16">
        <svg width="64" height="64" className="-rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="#1F2937" strokeWidth="6" />
          <motion.circle cx="32" cy="32" r={r} fill="none" stroke="#A78BFA" strokeWidth="6"
            strokeLinecap="round" strokeDasharray={circ}
            animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
            transition={{ duration: 0.5 }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-white text-sm font-bold">{selected}/{total}</span>
        </div>
      </div>
      <div>
        <p className="text-white text-sm font-medium">سياسات مختارة</p>
        <p className="text-gray-500 text-xs">{pct.toFixed(0)}% من الحزمة الكاملة</p>
      </div>
    </div>
  )
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function StorePoliciesPage() {
  const [storeName, setStoreName] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [country, setCountry] = useState("المملكة العربية السعودية")
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>(["shipping", "returns"])
  const [extraDetails, setExtraDetails] = useState("")
  const [loading, setLoading] = useState(false)
  const [policies, setPolicies] = useState<Record<string, string> | null>(null)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState("")

  const togglePolicy = (id: string) =>
    setSelectedPolicies(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )

  const generate = async () => {
    if (!storeName || !businessType || selectedPolicies.length === 0) {
      setError("أدخل اسم المتجر ونوع النشاط واختر سياسة واحدة على الأقل"); return
    }
    setError(""); setLoading(true); setPolicies(null)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null
      const res = await fetch("/api/tools/store-policies", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ storeName, productType: businessType, city: country, shippingDays: "3-5", returnDays: "7" }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "حدث خطأ")
      const data = await res.json()
      // backend returns { policies: [{id, title, icon, content}] } — convert to {id: content}
      const policiesMap: Record<string, string> = {}
      if (Array.isArray(data.policies)) {
        for (const p of data.policies) policiesMap[p.id] = p.content
      }
      setPolicies(policiesMap)
      setActiveTab(selectedPolicies[0])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ، حاول مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  const activePolicies = useMemo(
    () => POLICY_DEFS.filter(p => selectedPolicies.includes(p.id)),
    [selectedPolicies]
  )

  const downloadPolicy = (id: string) => {
    const text = policies?.[id] ?? ""
    const blob = new Blob([text], { type: "text/html;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob)
    a.download = `${id}-policy.html`; a.click()
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <Scale className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">مولّد سياسات المتجر</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">Gemini 2.5 Flash</Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">أنشئ سياسات قانونية متوافقة مع نظام التجارة الإلكترونية السعودي</p>
      </motion.div>

      <div className="max-w-5xl mx-auto space-y-6">
        {/* ── نموذج الإدخال ── */}
        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
          <CardContent className="p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">اسم المتجر *</Label>
                <Input value={storeName} onChange={e => setStoreName(e.target.value)}
                  placeholder="متجر الجوهرة"
                  className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 text-right focus:border-violet-500" />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">نوع النشاط *</Label>
                <Select value={businessType} onValueChange={setBusinessType}>
                  <SelectTrigger className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 focus:border-violet-500">
                    <SelectValue placeholder="اختر النشاط" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {BUSINESS_TYPES.map(t => <SelectItem key={t} value={t} className="text-right">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">الدولة</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 focus:border-violet-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {COUNTRIES.map(c => <SelectItem key={c} value={c} className="text-right">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* اختيار السياسات */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-gray-400 text-xs">السياسات المطلوبة *</Label>
                <CompletionRing selected={selectedPolicies.length} total={POLICY_DEFS.length} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POLICY_DEFS.map(p => (
                  <button key={p.id} onClick={() => togglePolicy(p.id)}
                    className={`p-4 rounded-xl border-2 text-right transition-all flex items-start gap-3 ${selectedPolicies.includes(p.id) ? "border-violet-500 bg-violet-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"}`}>
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <p className={`text-sm font-medium ${selectedPolicies.includes(p.id) ? "text-white" : "text-gray-300"}`}>{p.label}</p>
                      <p className="text-gray-500 text-xs">{p.desc}</p>
                    </div>
                    {selectedPolicies.includes(p.id) && <Check className="w-4 h-4 text-violet-400 mr-auto flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* تفاصيل إضافية */}
            <div className="space-y-2">
              <Label className="text-gray-400 text-xs">تفاصيل إضافية (اختياري)</Label>
              <Textarea value={extraDetails} onChange={e => setExtraDetails(e.target.value)}
                placeholder="أي شروط خاصة أو استثناءات تريد إضافتها..."
                className="bg-gray-800/80 border-gray-700 text-white rounded-xl resize-none text-right focus:border-violet-500 text-sm"
                rows={3} />
            </div>

            {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>}

            <Button onClick={generate} disabled={loading}
              className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإنشاء...</> : <><ScrollText className="w-4 h-4" /> أنشئ السياسات</>}
            </Button>
          </CardContent>
        </Card>

        {/* ── Skeleton ── */}
        {loading && (
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-9 w-28 bg-gray-800 rounded-lg animate-pulse" />)}
              </div>
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-3 bg-gray-800 rounded animate-pulse" style={{ width: `${95 - i * 5}%` }} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* ── النتائج ── */}
        <AnimatePresence>
          {policies && !loading && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-gray-900 border border-gray-800 p-1 rounded-xl gap-1 flex-wrap h-auto">
                  {activePolicies.map(p => (
                    <TabsTrigger key={p.id} value={p.id}
                      className="rounded-lg text-sm data-[state=active]:bg-violet-600 data-[state=active]:text-white text-gray-400">
                      {p.icon} {p.label}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {activePolicies.map(p => (
                  <TabsContent key={p.id} value={p.id}>
                    <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
                      <CardHeader className="pb-2 pt-4 px-5">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-white text-base">{p.icon} {p.label}</CardTitle>
                          <div className="flex gap-2">
                            <CopyButton text={policies[p.id] ?? ""} />
                            <Button size="sm" variant="outline" onClick={() => downloadPolicy(p.id)}
                              className="h-8 rounded-lg border-gray-700 text-gray-400 hover:text-white gap-1 text-xs">
                              <Download className="w-3 h-3" /> HTML
                            </Button>
                          </div>
                        </div>
                        <p className="text-gray-500 text-xs">{(policies[p.id] ?? "").length} حرف</p>
                      </CardHeader>
                      <CardContent className="px-5 pb-4">
                        <Textarea
                          value={policies[p.id] ?? ""}
                          onChange={e => setPolicies(prev => prev ? { ...prev, [p.id]: e.target.value } : prev)}
                          className="bg-gray-800/60 border-gray-700 text-gray-300 rounded-xl resize-none text-sm leading-relaxed focus:border-violet-500"
                          rows={18}
                          dir="rtl"
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>

              {/* تنبيه قانوني */}
              <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-200/80 text-sm leading-relaxed">
                  هذه السياسات مُولَّدة بالذكاء الاصطناعي وتتوافق مع نظام التجارة الإلكترونية السعودي.
                  يُنصح بمراجعة محامٍ متخصص قبل النشر الرسمي.
                </p>
              </div>

              <Button variant="outline" className="w-full h-11 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800 gap-2">
                <Copy className="w-4 h-4" /> نسخ رابط للسياسات
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {!loading && !policies && (
          <div className="text-center py-16 text-gray-600">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>اختر السياسات المطلوبة واضغط "أنشئ السياسات"</p>
          </div>
        )}
      </div>
    </div>
  )
}
