"use client"

import { useState, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  MessageCircle,
  Copy,
  Check,
  Phone,
  Wifi,
  Battery,
  Signal,
  Send,
  Bookmark,
  Smile,
  Link,
  Loader2,
  AlertCircle,
  ChevronRight,
} from "lucide-react"

// ─── أنواع البيانات ───────────────────────────────────────────────────────────

interface FormInputs {
  messageType: string
  storeName: string
  productType: string
  brandName: string
  tone: "formal" | "friendly" | "funny"
  includeEmoji: boolean
  includeLink: boolean
}

interface TemplateItem {
  text: string
  charCount: number
}

type PageState = "empty" | "loading" | "success" | "error"

const MESSAGE_TYPES = [
  { value: "welcome", label: "🎉 رسالة ترحيب بعميل جديد" },
  { value: "order_confirm", label: "📦 متابعة وتأكيد الطلب" },
  { value: "abandoned_cart", label: "🛒 استرداد سلة مهجورة" },
  { value: "special_offer", label: "🎁 عرض خاص وخصم" },
  { value: "thank_you", label: "💝 شكر بعد الشراء" },
  { value: "review_request", label: "⭐ طلب تقييم / استطلاع" },
  { value: "expiring_offer", label: "🔔 تذكير بعرض ينتهي قريباً" },
]

const TONE_OPTIONS: { value: "formal" | "friendly" | "funny"; emoji: string; label: string; sub: string }[] = [
  { value: "formal", emoji: "🤝", label: "رسمي ومحترف", sub: "أسلوب مؤسسي راقٍ" },
  { value: "friendly", emoji: "😊", label: "ودود ومرح", sub: "أسلوب دافئ وقريب" },
  { value: "funny", emoji: "😄", label: "فكاهي وخفيف", sub: "أسلوب خفيف وممتع" },
]

const VARIABLE_CHIPS = [
  "{اسم_العميل}",
  "{رقم_الطلب}",
  "{اسم_المنتج}",
  "{رابط_المنتج}",
  "{اسم_المتجر}",
]

// ─── دالة تمييز المتغيرات داخل النص ─────────────────────────────────────────

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\{[^}]+\})/g)
  return (
    <>
      {parts.map((part, i) =>
        /^\{[^}]+\}$/.test(part) ? (
          <mark
            key={i}
            className="bg-violet-500/20 text-violet-300 rounded px-0.5 not-italic font-medium"
            style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", borderRadius: "3px", padding: "0 2px" }}
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  )
}

// ─── عداد الأحرف ─────────────────────────────────────────────────────────────

function CharCounter({ count }: { count: number }) {
  const color =
    count > 1000 ? "text-red-400 bg-red-500/15 border-red-500/30" :
    count > 800  ? "text-amber-400 bg-amber-500/15 border-amber-500/30" :
                   "text-gray-400 bg-gray-800 border-gray-700"
  return (
    <Badge className={`text-xs border font-mono ${color}`}>
      {count}/1000 حرف
    </Badge>
  )
}

// ─── هيكل تحميل ──────────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="h-4 bg-gray-800 rounded w-24" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-800 rounded w-full" />
            <div className="h-3 bg-gray-800 rounded w-5/6" />
            <div className="h-3 bg-gray-800 rounded w-4/6" />
          </div>
          <div className="flex gap-2 pt-1">
            <div className="h-9 bg-gray-800 rounded-xl w-20" />
            <div className="h-9 bg-gray-800 rounded-xl w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── محاكاة هاتف واتساب ──────────────────────────────────────────────────────

interface WhatsAppPreviewProps {
  templates: TemplateItem[]
  activeTab: number
  onTabChange: (i: number) => void
  storeName: string
  pageState: PageState
}

function WhatsAppPreview({ templates, activeTab, onTabChange, storeName, pageState }: WhatsAppPreviewProps) {
  const [phoneInput, setPhoneInput] = useState("")
  const [showPhoneInput, setShowPhoneInput] = useState(false)

  const activeTemplate = templates[activeTab]
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`

  return (
    <div className="flex flex-col items-center gap-4">
      {/* إطار الهاتف */}
      <div
        className="relative w-72 rounded-[2.5rem] border-4 border-gray-700 overflow-hidden shadow-2xl"
        style={{ background: "#0B141A" }}
      >
        {/* شريط الحالة */}
        <div className="flex justify-between items-center px-5 pt-3 pb-1" style={{ background: "#1F2C34" }}>
          <span className="text-white text-xs font-semibold">
            {now.getHours()}:{now.getMinutes().toString().padStart(2, "0")}
          </span>
          <div className="flex items-center gap-1">
            <Signal className="w-3 h-3 text-white" />
            <Wifi className="w-3 h-3 text-white" />
            <Battery className="w-3.5 h-3.5 text-white" />
          </div>
        </div>

        {/* رأس المحادثة */}
        <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: "#1F2C34" }}>
          <ChevronRight className="w-5 h-5 text-gray-400" />
          <div className="w-9 h-9 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            {(storeName || "م").charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{storeName || "اسم متجرك"}</p>
            <p className="text-green-400 text-[10px]">متصل الآن</p>
          </div>
          <Phone className="w-4 h-4 text-gray-400" />
        </div>

        {/* منطقة الدردشة */}
        <div className="min-h-56 p-3 flex flex-col justify-end" style={{ background: "#0B141A" }}>
          {pageState === "empty" && (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-gray-600" />
              </div>
              <p className="text-gray-600 text-xs">اختر نوع الرسالة<br />لتوليد القوالب</p>
            </div>
          )}

          {pageState === "loading" && (
            <div className="flex flex-col items-center justify-center h-48 gap-2">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <p className="text-gray-500 text-xs">جارٍ توليد القوالب…</p>
            </div>
          )}

          {pageState === "success" && activeTemplate && (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="self-end max-w-[90%]"
              >
                <div
                  className="rounded-2xl rounded-tr-sm px-3 py-2 text-white text-[11px] leading-relaxed shadow"
                  style={{ background: "#005C4B" }}
                >
                  <p className="whitespace-pre-wrap break-words">{activeTemplate.text}</p>
                  <div className="flex justify-end items-center gap-1 mt-1">
                    <span className="text-[9px] text-green-300/70">{timeStr}</span>
                    <Check className="w-3 h-3 text-blue-400" />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* شريط الكتابة المزيف */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: "#1F2C34" }}
        >
          <Smile className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <div className="flex-1 bg-gray-700/60 rounded-full h-8 flex items-center px-3">
            <span className="text-gray-500 text-[10px]">رسالة</span>
          </div>
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <Send className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>

      {/* أزرار التبديل بين القوالب */}
      {pageState === "success" && templates.length > 0 && (
        <div className="flex gap-2">
          {templates.map((t, i) => (
            <button
              key={i}
              onClick={() => onTabChange(i)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200
                ${activeTab === i
                  ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600"}
              `}
            >
              <span>قالب {i + 1}</span>
              <CharCounter count={t.charCount} />
            </button>
          ))}
        </div>
      )}

      {/* زر الإرسال التجريبي */}
      {pageState === "success" && (
        <div className="w-full space-y-2">
          {!showPhoneInput ? (
            <Button
              variant="outline"
              className="w-full h-10 rounded-xl border-green-600/40 text-green-400 hover:bg-green-600/10 hover:border-green-600/60 gap-2 text-sm"
              onClick={() => setShowPhoneInput(true)}
            >
              <Phone className="w-4 h-4" />
              إرسال تجريبي على رقمي
            </Button>
          ) : (
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="05XXXXXXXX"
                value={phoneInput}
                onChange={e => setPhoneInput(e.target.value)}
                className="bg-gray-800/80 border-gray-700 rounded-xl h-10 text-right focus:border-violet-500 text-sm text-white flex-1"
              />
              <Button
                asChild
                className="h-10 rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 flex-shrink-0"
              >
                <a
                  href={`https://wa.me/966${phoneInput.replace(/^0/, "")}?text=${encodeURIComponent(activeTemplate?.text || "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send className="w-4 h-4" />
                </a>
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── بطاقة قالب واحد ─────────────────────────────────────────────────────────

interface TemplateCardProps {
  template: TemplateItem
  index: number
  onUpdate: (text: string) => void
}

function TemplateCard({ template, index, onUpdate }: TemplateCardProps) {
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(template.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [template.text])

  const handleSave = useCallback(() => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="bg-gray-900/80 border border-gray-800 rounded-2xl p-5 space-y-3"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-violet-400 font-bold text-sm">قالب {index + 1}</span>
          <CharCounter count={template.charCount} />
        </div>
      </div>

      {/* منطقة النص القابلة للتعديل */}
      <div className="relative">
        <Textarea
          value={template.text}
          onChange={e => onUpdate(e.target.value)}
          rows={5}
          className="
            bg-gray-800/80 border-gray-700 rounded-xl text-right
            focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30
            text-gray-200 text-sm leading-relaxed resize-none
            transition-colors w-full
          "
        />
        {/* معاينة المتغيرات المميزة - نعرضها تحت التكست إيريا */}
      </div>

      {/* عرض مميز للمتغيرات */}
      <div
        className="
          text-sm leading-relaxed p-3 bg-gray-800/50 border border-gray-800
          rounded-xl text-gray-300 whitespace-pre-wrap break-words
        "
        style={{ direction: "rtl" }}
      >
        <p className="text-[10px] text-gray-600 mb-1.5">معاينة المتغيرات</p>
        <HighlightedText text={template.text} />
      </div>

      <div className="flex gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          className="h-9 rounded-xl border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600 gap-1.5 text-xs flex-1"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "تم النسخ!" : "نسخ"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 rounded-xl gap-1.5 text-xs flex-1 transition-colors ${
            saved
              ? "border-violet-500/50 text-violet-300 bg-violet-500/10"
              : "border-gray-700 text-gray-300 hover:bg-gray-800 hover:border-gray-600"
          }`}
          onClick={handleSave}
        >
          <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-violet-400 text-violet-400" : ""}`} />
          {saved ? "تم الحفظ!" : "حفظ في القوالب"}
        </Button>
      </div>
    </motion.div>
  )
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function WhatsAppTemplatesPage() {
  const [form, setForm] = useState<FormInputs>({
    messageType: "",
    storeName: "",
    productType: "",
    brandName: "",
    tone: "friendly",
    includeEmoji: true,
    includeLink: false,
  })

  const [templates, setTemplates] = useState<TemplateItem[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [pageState, setPageState] = useState<PageState>("empty")
  const [errorMsg, setErrorMsg] = useState("")
  const [copiedChip, setCopiedChip] = useState<string | null>(null)

  const set = <K extends keyof FormInputs>(k: K, v: FormInputs[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const handleChipClick = async (chip: string) => {
    await navigator.clipboard.writeText(chip)
    setCopiedChip(chip)
    setTimeout(() => setCopiedChip(null), 1500)
  }

  const handleUpdateTemplate = (index: number, text: string) => {
    setTemplates(prev =>
      prev.map((t, i) =>
        i === index ? { text, charCount: text.length } : t
      )
    )
  }

  const handleSubmit = async () => {
    if (!form.messageType || !form.storeName) return
    setPageState("loading")
    setErrorMsg("")
    setActiveTab(0)

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("tajer-token") : null
      const res = await fetch("/api/tools/whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          storeName: form.storeName,
          productType: form.productType || "منتجات متنوعة",
          brandName: form.brandName,
          tone: form.tone,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `خطأ ${res.status}`)
      }

      const data = await res.json()
      // backend returns {categories: [{type, title, icon, messages: []}]}
      // find category matching messageType, fall back to first
      const cats: { type: string; messages: string[] }[] = data.categories || []
      const cat = cats.find(c => c.type === form.messageType) || cats[0]
      const msgs: TemplateItem[] = (cat?.messages || []).map((t: string) => ({ text: t, charCount: t.length }))
      setTemplates(msgs)
      setPageState("success")
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.")
      setPageState("error")
    }
  }

  const canSubmit = !!form.messageType

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">

      {/* ─── العنوان ─── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-green-500/15 rounded-xl border border-green-500/20">
            <MessageCircle className="w-5 h-5 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">قوالب رسائل واتساب</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
            Groq Llama 3.3
          </Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">
          أنشئ قوالب رسائل واتساب احترافية لمتجرك في ثوانٍ — 3 قوالب جاهزة للاستخدام
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

        {/* ══════════════════════ عمود الإدخال (2/3) ══════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-5"
        >
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardHeader className="pb-4 pt-5 px-5">
              <CardTitle className="text-white text-base font-semibold">إعدادات الرسالة</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 space-y-5">

              {/* 1. نوع الرسالة */}
              <div className="space-y-1.5">
                <Label className="text-gray-400 text-xs">نوع الرسالة</Label>
                <Select value={form.messageType} onValueChange={v => set("messageType", v)}>
                  <SelectTrigger className="bg-gray-800/80 border-gray-700 rounded-xl h-11 text-right focus:border-violet-500 text-gray-200 text-sm">
                    <SelectValue placeholder="اختر نوع الرسالة..." />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 rounded-xl">
                    {MESSAGE_TYPES.map(mt => (
                      <SelectItem
                        key={mt.value}
                        value={mt.value}
                        className="text-gray-200 text-sm focus:bg-gray-800 focus:text-white cursor-pointer"
                      >
                        {mt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 2 & 3. اسم المتجر + نوع المنتجات */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">اسم متجرك *</Label>
                  <Input
                    value={form.storeName}
                    onChange={e => set("storeName", e.target.value)}
                    placeholder="مثال: نون ستور"
                    className="bg-gray-800/80 border-gray-700 rounded-xl h-11 text-right focus:border-violet-500 text-gray-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-400 text-xs">نوع منتجاتك *</Label>
                  <Input
                    value={form.productType}
                    onChange={e => set("productType", e.target.value)}
                    placeholder="مثال: عطور، ملابس، إلكترونيات"
                    className="bg-gray-800/80 border-gray-700 rounded-xl h-11 text-right focus:border-violet-500 text-gray-200 text-sm"
                  />
                </div>
              </div>

              {/* 4. نبرة الرسالة */}
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">نبرة الرسالة</Label>
                <div className="grid grid-cols-3 gap-3">
                  {TONE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => set("tone", opt.value)}
                      className={`
                        bg-gray-800 rounded-xl p-3 text-right cursor-pointer border-2 transition-all duration-200
                        ${form.tone === opt.value
                          ? "border-violet-500 bg-violet-500/10"
                          : "border-gray-700 hover:border-gray-600"}
                      `}
                    >
                      <div className="text-xl mb-1">{opt.emoji}</div>
                      <p className={`text-xs font-semibold ${form.tone === opt.value ? "text-violet-300" : "text-gray-300"}`}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">{opt.sub}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. خيارات الإضافة */}
              <div className="flex gap-4">
                {[
                  { key: "includeEmoji" as const, label: "✅ أضف إيموجي مناسب", emoji: <Smile className="w-3.5 h-3.5 text-yellow-400" /> },
                  { key: "includeLink" as const, label: "🔗 أضف رابط المنتج", emoji: <Link className="w-3.5 h-3.5 text-blue-400" /> },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className={`
                      flex items-center gap-2.5 px-4 py-2.5 rounded-xl border cursor-pointer flex-1 transition-colors
                      ${form[key]
                        ? "bg-violet-500/10 border-violet-500/40"
                        : "bg-gray-800/60 border-gray-700 hover:border-gray-600"}
                    `}
                  >
                    <Checkbox
                      checked={form[key]}
                      onCheckedChange={c => set(key, !!c)}
                      className="border-gray-600 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                    />
                    <span className={`text-sm select-none ${form[key] ? "text-violet-300" : "text-gray-300"}`}>
                      {label}
                    </span>
                  </label>
                ))}
              </div>

              {/* 6. شرائح المتغيرات */}
              <div className="space-y-2">
                <Label className="text-gray-400 text-xs">المتغيرات المتاحة — انقر للنسخ</Label>
                <div className="flex flex-wrap gap-2">
                  {VARIABLE_CHIPS.map(chip => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-mono border transition-all duration-150
                        ${copiedChip === chip
                          ? "bg-green-500/20 border-green-500/40 text-green-300"
                          : "bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25 hover:border-violet-500/50"}
                      `}
                    >
                      {copiedChip === chip ? "✓ تم النسخ" : chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* 7. زر الإنشاء */}
              <Button
                className="
                  w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500
                  text-white font-semibold text-sm gap-2 transition-all
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
                disabled={!canSubmit || pageState === "loading"}
                onClick={handleSubmit}
              >
                {pageState === "loading" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارٍ التوليد…
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4" />
                    أنشئ 3 قوالب
                  </>
                )}
              </Button>

              {/* رسالة الخطأ */}
              <AnimatePresence>
                {pageState === "error" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                  >
                    <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{errorMsg}</p>
                  </motion.div>
                )}
              </AnimatePresence>

            </CardContent>
          </Card>

          {/* ═══ بطاقات القوالب الثلاثة ═══ */}
          <AnimatePresence mode="wait">
            {pageState === "loading" && (
              <motion.div
                key="skeleton"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingSkeleton />
              </motion.div>
            )}

            {pageState === "success" && templates.length > 0 && (
              <motion.div
                key="templates"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Check className="w-4 h-4 text-green-400" />
                  <p className="text-green-400 text-sm font-medium">تم توليد {templates.length} قوالب بنجاح</p>
                </div>
                {templates.map((t, i) => (
                  <TemplateCard
                    key={i}
                    template={t}
                    index={i}
                    onUpdate={text => handleUpdateTemplate(i, text)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ══════════════════════ لوحة معاينة واتساب (1/3) ══════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-white text-sm font-semibold">معاينة واتساب</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <WhatsAppPreview
                templates={templates}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                storeName={form.storeName}
                pageState={pageState}
              />
            </CardContent>
          </Card>

          {/* نصائح الاستخدام */}
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardContent className="px-5 py-4 space-y-3">
              <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider">نصائح الاستخدام</p>
              {[
                { icon: "✨", text: "استبدل المتغيرات بالبيانات الفعلية قبل الإرسال" },
                { icon: "📏", text: "واتساب يدعم حتى 1000 حرف بشكل مثالي" },
                { icon: "⏰", text: "أفضل وقت للإرسال: 10ص–12ظ أو 7م–9م" },
              ].map((tip, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="text-sm flex-shrink-0">{tip.icon}</span>
                  <p className="text-gray-500 text-xs leading-relaxed">{tip.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

      </div>
    </div>
  )
}
