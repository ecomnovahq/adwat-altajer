"use client"

import { useState, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  FileText, Copy, RotateCcw, Star, Download, Save, Check,
  X, Plus, Loader2, Sparkles
} from "lucide-react"

// ─── أنواع ───────────────────────────────────────────────────────────────────

interface Variant {
  text: string
  seoKeywords: string[]
  rating: number
  badge: string
}

interface FormState {
  productName: string
  category: string
  features: string[]
  audience: string
  tone: string
  language: string
  length: number
  bulletPoints: boolean
  seoKeywords: boolean
  hasCTA: boolean
}

// ─── بيانات ثابتة ─────────────────────────────────────────────────────────────

const TONES = [
  { id: "professional", icon: "🎯", label: "احترافي",  desc: "رسمي ومقنع للعلامات الراقية" },
  { id: "friendly",     icon: "😊", label: "ودود",      desc: "قريب ودافئ يحكي قصة المنتج" },
  { id: "luxury",       icon: "✨", label: "فاخر",      desc: "كلمات راقية تعكس الحصرية" },
  { id: "bold",         icon: "🔥", label: "جريء",     desc: "مباشر وحماسي يدفع للشراء" },
  { id: "emotional",    icon: "💝", label: "عاطفي",     desc: "يلمس المشاعر للهدايا" },
]

const CATEGORIES = [
  { group: "أزياء",       items: ["ملابس رجالية", "ملابس نسائية", "أطفال", "أحذية", "إكسسوارات"] },
  { group: "إلكترونيات",  items: ["هواتف", "أجهزة لوحية", "لابتوب", "إكسسوارات إلكترونية"] },
  { group: "جمال",        items: ["عطور", "مستحضرات", "عناية بالبشرة"] },
  { group: "طعام",        items: ["تمور", "قهوة", "شوكولاتة", "منتجات صحية"] },
  { group: "منزل",        items: ["أثاث", "ديكور", "مطبخ"] },
  { group: "رياضة",       items: ["ملابس رياضية", "معدات", "مكملات غذائية"] },
]

const AUDIENCES = ["رجال", "نساء", "أطفال", "عائلات", "شباب", "كبار السن", "متخصصون"]

// ─── مكوّن Chip للميزات ───────────────────────────────────────────────────────

function TagsInput({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput("")
  }

  const remove = (t: string) => onChange(tags.filter(x => x !== t))

  return (
    <div
      className="min-h-[44px] flex flex-wrap gap-2 p-2 bg-gray-800/80 border border-gray-700 rounded-xl cursor-text"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map(t => (
        <span key={t} className="flex items-center gap-1 bg-violet-500/20 text-violet-300 text-sm px-2 py-0.5 rounded-lg">
          {t}
          <button onClick={() => remove(t)} className="hover:text-white"><X className="w-3 h-3" /></button>
        </span>
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add() } }}
        placeholder={tags.length === 0 ? "اكتب ميزة واضغط Enter" : ""}
        className="flex-1 min-w-[120px] bg-transparent text-white text-sm outline-none placeholder:text-gray-500"
      />
    </div>
  )
}

// ─── بطاقة نتيجة واحدة ────────────────────────────────────────────────────────

function VariantCard({ variant, index }: { variant: Variant; index: number }) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(variant.text)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="bg-gray-900/80 border-gray-800 rounded-2xl h-full flex flex-col">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm font-medium">النسخة {index + 1}</span>
              <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">{variant.badge}</Badge>
            </div>
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-3.5 h-3.5 ${i < variant.rating ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 flex flex-col flex-1 gap-3">
          {editing ? (
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              className="flex-1 min-h-[180px] bg-gray-800 border-gray-700 text-gray-300 text-sm leading-relaxed rounded-xl resize-none"
              dir="rtl"
            />
          ) : (
            <p className="text-gray-300 text-sm leading-relaxed flex-1 whitespace-pre-line">{text}</p>
          )}

          {variant.seoKeywords.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-gray-500 text-xs font-medium">كلمات SEO المقترحة</p>
              <div className="flex flex-wrap gap-1.5">
                {variant.seoKeywords.map(kw => (
                  <span key={kw} className="bg-blue-500/15 text-blue-300 text-xs px-2 py-0.5 rounded-lg border border-blue-500/20">{kw}</span>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={copy}
              className="flex-1 h-8 rounded-lg border-gray-700 text-gray-400 hover:text-white gap-1 text-xs">
              {copied ? <><Check className="w-3 h-3 text-green-400" /> تم النسخ</> : <><Copy className="w-3 h-3" /> نسخ</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}
              className="flex-1 h-8 rounded-lg border-gray-700 text-gray-400 hover:text-white text-xs">
              {editing ? "حفظ" : "✏️ تعديل"}
            </Button>
            <Button size="sm" variant="outline"
              className="h-8 px-2 rounded-lg border-gray-700 text-gray-400 hover:text-white">
              <RotateCcw className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── هيكل عظمي (Loading) ──────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[0, 1, 2].map(i => (
        <Card key={i} className="bg-gray-900/80 border-gray-800 rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-gray-800 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-800 rounded animate-pulse" />
            </div>
            {[1, 2, 3, 4, 5].map(j => (
              <div key={j} className={`h-3 bg-gray-800 rounded animate-pulse`} style={{ width: `${85 - j * 8}%` }} />
            ))}
            <div className="flex gap-2 pt-2">
              {[1, 2, 3].map(j => <div key={j} className="h-8 flex-1 bg-gray-800 rounded-lg animate-pulse" />)}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function ProductDescriptionPage() {
  const [form, setForm] = useState<FormState>({
    productName: "",
    category: "",
    features: [],
    audience: "",
    tone: "professional",
    language: "ar",
    length: 150,
    bulletPoints: false,
    seoKeywords: true,
    hasCTA: true,
  })
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<Variant[] | null>(null)
  const [error, setError] = useState("")

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const generate = async () => {
    if (!form.productName || !form.category) {
      setError("من فضلك أدخل اسم المنتج والفئة على الأقل")
      return
    }
    setError("")
    setLoading(true)
    setVariants(null)
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null
      const toneMap: Record<string, string> = { professional: "professional", friendly: "friendly", luxury: "luxury", bold: "professional", emotional: "friendly" }
      const res = await fetch("/api/tools/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          productName: form.productName,
          features: form.features.join("، "),
          category: form.category,
          tone: toneMap[form.tone] || form.tone,
          targetAudience: form.audience,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error || "حدث خطأ")
      const data = await res.json()
      // backend returns {title, description, shortDescription, bulletPoints, keywords}
      const primaryKw: string[] = data.keywords?.primary || []
      const bullets: string = (data.bulletPoints || []).join("\n")
      setVariants([
        { text: data.description || "", seoKeywords: primaryKw, rating: 5, badge: "الوصف الكامل" },
        { text: [data.openingHook, data.shortDescription].filter(Boolean).join("\n\n"), seoKeywords: data.keywords?.secondary || [], rating: 4, badge: "الوصف المختصر" },
        { text: bullets, seoKeywords: data.keywords?.longTail?.slice(0, 4) || [], rating: 4, badge: "نقاط البيع" },
      ].filter(v => v.text.trim()))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "حدث خطأ، حاول مرة أخرى")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <FileText className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">مولّد أوصاف المنتجات</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">Gemini 2.5 Flash</Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">أنشئ 3 نسخ احترافية عربية محسّنة لـ SEO في ثوانٍ</p>
      </motion.div>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── نموذج الإدخال ── */}
        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
          <CardContent className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* العمود الأيمن */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">اسم المنتج *</Label>
                <Input value={form.productName} onChange={e => set("productName", e.target.value)}
                  placeholder="مثال: حقيبة جلد كلاسيكية للرجال"
                  className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 text-right focus:border-violet-500" />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">الفئة *</Label>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 focus:border-violet-500">
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white">
                    {CATEGORIES.map(g => (
                      <div key={g.group}>
                        <div className="px-2 py-1 text-xs text-gray-500 font-semibold">{g.group}</div>
                        {g.items.map(item => (
                          <SelectItem key={item} value={item} className="text-right">{item}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">المميزات (اضغط Enter لإضافة)</Label>
                <TagsInput tags={form.features} onChange={v => set("features", v)} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">الجمهور المستهدف</Label>
                  <Select value={form.audience} onValueChange={v => set("audience", v)}>
                    <SelectTrigger className="bg-gray-800/80 border-gray-700 text-white rounded-xl h-11 focus:border-violet-500">
                      <SelectValue placeholder="اختر" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 text-white">
                      {AUDIENCES.map(a => <SelectItem key={a} value={a} className="text-right">{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">اللغة</Label>
                  <div className="flex h-11 rounded-xl overflow-hidden border border-gray-700">
                    {[{ v: "ar", l: "عربي" }, { v: "en", l: "English" }, { v: "both", l: "الاثنين" }].map(({ v, l }) => (
                      <button key={v} onClick={() => set("language", v)}
                        className={`flex-1 text-sm transition-colors ${form.language === v ? "bg-violet-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* العمود الأيسر */}
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">النبرة</Label>
                <div className="grid grid-cols-2 gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => set("tone", t.id)}
                      className={`p-3 rounded-xl border-2 text-right transition-all ${form.tone === t.id ? "border-violet-500 bg-violet-500/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"}`}>
                      <div className="text-lg mb-0.5">{t.icon}</div>
                      <div className="text-white text-sm font-medium">{t.label}</div>
                      <div className="text-gray-500 text-[11px]">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-gray-400 text-xs">طول الوصف</Label>
                  <span className="text-violet-400 text-xs">{form.length} كلمة</span>
                </div>
                <Slider value={[form.length]} onValueChange={([v]) => set("length", v)} min={50} max={500} step={25} />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>50 (مختصر)</span><span>150 (متوسط)</span><span>500 (تفصيلي)</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">خيارات إضافية</Label>
                <div className="flex gap-4 flex-wrap">
                  {[
                    { k: "bulletPoints" as const, l: "نقاط تعداد" },
                    { k: "seoKeywords" as const, l: "كلمات SEO" },
                    { k: "hasCTA" as const, l: "دعوة للشراء" },
                  ].map(({ k, l }) => (
                    <label key={k} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox checked={form[k] as boolean} onCheckedChange={c => set(k, !!c)}
                        className="border-gray-600 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500" />
                      <span className="text-gray-300 text-sm">{l}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
              )}

              <Button onClick={generate} disabled={loading}
                className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التوليد...</> : <><Sparkles className="w-4 h-4" /> أنشئ 3 نسخ</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── النتائج ── */}
        <AnimatePresence>
          {loading && <SkeletonCards />}
          {variants && !loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {variants.map((v, i) => <VariantCard key={i} variant={v} index={i} />)}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-11 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800 gap-2">
                  <Save className="w-4 h-4" /> حفظ في المكتبة
                </Button>
                <Button variant="outline" className="flex-1 h-11 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800 gap-2">
                  <Download className="w-4 h-4" /> تصدير CSV
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── الحالة الفارغة ── */}
        {!loading && !variants && (
          <div className="text-center py-16 text-gray-600">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>أدخل بيانات المنتج أعلاه واضغط "أنشئ 3 نسخ"</p>
          </div>
        )}
      </div>
    </div>
  )
}
