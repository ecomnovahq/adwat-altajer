"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  Share2,
  Save,
  Lightbulb,
  Package,
  Truck,
  Megaphone,
  Store,
  RotateCcw,
  Receipt,
} from "lucide-react"

// ─── أنواع البيانات ───────────────────────────────────────────────────────────

interface ProfitInputs {
  salePrice: number
  productCost: number
  shippingCost: number
  adBudget: number
  platformCommission: number // نسبة مئوية 0-30
  returnRate: number         // نسبة مئوية 0-20
  includeVAT: boolean
}

interface ProfitResult {
  netProfit: number
  grossProfit: number
  profitMargin: number    // نسبة مئوية
  totalCosts: number
  commissionAmount: number
  returnCost: number
  vatAmount: number
  breakEvenUnits: number  // عدد الوحدات للتعادل
  roi: number             // العائد على الاستثمار
}

// ─── منطق الحساب ─────────────────────────────────────────────────────────────

function calculate(i: ProfitInputs): ProfitResult {
  const commissionAmount = (i.salePrice * i.platformCommission) / 100
  const returnCost       = (i.shippingCost * i.returnRate) / 100
  const vatAmount        = i.includeVAT ? i.salePrice * 0.15 : 0

  const totalCosts  = i.productCost + i.shippingCost + i.adBudget + commissionAmount + returnCost + vatAmount
  const grossProfit = i.salePrice - i.productCost
  const netProfit   = i.salePrice - totalCosts
  const profitMargin = i.salePrice > 0 ? (netProfit / i.salePrice) * 100 : 0
  const roi          = i.productCost > 0 ? (netProfit / totalCosts) * 100 : 0

  // نقطة التعادل: كم وحدة تحتاج تبيع لتغطية ميزانية الإعلانات فقط
  const breakEvenUnits = netProfit > 0 ? Math.ceil(i.adBudget / netProfit) : 0

  return { netProfit, grossProfit, profitMargin, totalCosts, commissionAmount, returnCost, vatAmount, breakEvenUnits, roi }
}

// ─── دائرة هامش الربح (SVG متحرك) ────────────────────────────────────────────

function ProfitRing({ margin }: { margin: number }) {
  const clamped    = Math.max(-100, Math.min(100, margin))
  const pct        = Math.max(0, clamped)          // الدائرة لا تملأ في الخسارة
  const r          = 45
  const circ       = 2 * Math.PI * r
  const offset     = circ - (pct / 100) * circ

  const strokeColor =
    clamped < 0   ? "#EF4444" :
    clamped < 10  ? "#EF4444" :
    clamped < 20  ? "#F59E0B" : "#10B981"

  const label =
    clamped < 0   ? "خسارة"   :
    clamped < 10  ? "ضعيف"   :
    clamped < 20  ? "جيد"    : "ممتاز"

  return (
    <div className="relative flex flex-col items-center">
      <svg width="120" height="120" className="-rotate-90">
        {/* الخلفية */}
        <circle cx="60" cy="60" r={r} fill="none" stroke="#1F2937" strokeWidth="10" />
        {/* التقدم */}
        <motion.circle
          cx="60" cy="60" r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      </svg>
      {/* النص بالمنتصف */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          key={Math.round(clamped)}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-xl font-black text-white leading-none"
        >
          {margin.toFixed(1)}%
        </motion.span>
        <span className="text-[11px] text-gray-400 mt-0.5">{label}</span>
      </div>
    </div>
  )
}

// ─── بطاقة حقل إدخال واحد ────────────────────────────────────────────────────

function SARInput({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string
  icon: React.ElementType
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-gray-400 text-xs flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-violet-400" />
        {label}
      </Label>
      <div className="relative">
        <Input
          type="number"
          min={0}
          value={value === 0 ? "" : value}
          placeholder="0"
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="
            bg-gray-800/80 border-gray-700 text-white
            text-right pr-11
            focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30
            h-11 rounded-xl transition-colors
          "
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
          ر.س
        </span>
      </div>
    </div>
  )
}

// ─── النصيحة الذكية (تتغير حسب الوضع) ───────────────────────────────────────

function SmartTip({ result, inputs }: { result: ProfitResult; inputs: ProfitInputs }) {
  const tip = useMemo(() => {
    if (result.netProfit < 0)
      return {
        emoji: "🚨",
        text: `أنت تخسر ${Math.abs(result.netProfit).toFixed(2)} ر.س على كل وحدة! ارفع سعر البيع أو قلّل تكلفة المنتج.`,
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
      }
    if (result.profitMargin < 10)
      return {
        emoji: "⚠️",
        text: `هامش ضعيف جداً. تقليل تكلفة الشحن بـ 5 ر.س سيرفع ربحك إلى ${(result.netProfit + 5).toFixed(2)} ر.س.`,
        color: "text-yellow-300",
        bg: "bg-yellow-500/10 border-yellow-500/20",
      }
    if (result.profitMargin >= 30)
      return {
        emoji: "🎯",
        text: `هامش ممتاز! يمكنك مضاعفة ميزانية الإعلانات إلى ${(inputs.adBudget * 2).toFixed(0)} ر.س وستحقق نمواً أسرع.`,
        color: "text-green-400",
        bg: "bg-green-500/10 border-green-500/20",
      }
    return {
      emoji: "💡",
      text: `لتحقيق هامش 30%، ارفع سعر البيع إلى ${((inputs.productCost + inputs.shippingCost + inputs.adBudget + result.commissionAmount + result.returnCost + result.vatAmount) / 0.70).toFixed(1)} ر.س.`,
      color: "text-blue-400",
      bg: "bg-blue-500/10 border-blue-500/20",
    }
  }, [result, inputs])

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={tip.emoji + tip.text.slice(0, 20)}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`flex gap-3 p-4 rounded-xl border ${tip.bg}`}
      >
        <span className="text-xl flex-shrink-0">{tip.emoji}</span>
        <div>
          <p className="text-gray-400 text-[11px] font-medium mb-0.5 flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            نصيحة ذكية
          </p>
          <p className={`text-sm leading-relaxed ${tip.color}`}>{tip.text}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── الصفحة الرئيسية ──────────────────────────────────────────────────────────

export default function ProfitCalculatorPage() {
  const [inputs, setInputs] = useState<ProfitInputs>({
    salePrice:          150,
    productCost:        55,
    shippingCost:       18,
    adBudget:           12,
    platformCommission: 5,
    returnRate:         5,
    includeVAT:         false,
  })

  // الحساب يتحدث فوراً مع كل تغيير
  const result = useMemo(() => calculate(inputs), [inputs])

  const set = <K extends keyof ProfitInputs>(k: K, v: ProfitInputs[K]) =>
    setInputs(prev => ({ ...prev, [k]: v }))

  const profitPositive = result.netProfit >= 0
  const profitColor    = profitPositive ? "text-green-400" : "text-red-400"

  // صفوف جدول التكاليف
  const costRows = [
    { icon: Package,   label: "تكلفة المنتج",                         value: inputs.productCost,       color: "text-gray-300" },
    { icon: Truck,     label: "تكلفة الشحن",                          value: inputs.shippingCost,      color: "text-gray-300" },
    { icon: Megaphone, label: "إعلانات / وحدة",                       value: inputs.adBudget,          color: "text-blue-400" },
    { icon: Store,     label: `عمولة المنصة (${inputs.platformCommission}%)`, value: result.commissionAmount, color: "text-orange-400" },
    { icon: RotateCcw, label: `تكلفة الإرجاع (${inputs.returnRate}%)`, value: result.returnCost,        color: "text-yellow-400" },
    ...(inputs.includeVAT
      ? [{ icon: Receipt, label: "ضريبة القيمة المضافة 15%", value: result.vatAmount, color: "text-red-400" }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">

      {/* ─── العنوان ─── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 max-w-6xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <Calculator className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">حاسبة صافي الربح</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
            تحديث فوري
          </Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">
          احسب ربحك الحقيقي بعد جميع التكاليف المخفية — يتحدث تلقائياً مع كل تغيير
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl mx-auto">

        {/* ══════════════════════ عمود الإدخال ══════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {/* بطاقة الأسعار والتكاليف */}
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl overflow-hidden">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-white text-base font-semibold">
                أسعار وتكاليف المنتج
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5 grid grid-cols-2 gap-4">
              <SARInput label="سعر البيع"       icon={Store}     value={inputs.salePrice}    onChange={v => set("salePrice", v)} />
              <SARInput label="تكلفة المنتج"    icon={Package}   value={inputs.productCost}  onChange={v => set("productCost", v)} />
              <SARInput label="تكلفة الشحن"     icon={Truck}     value={inputs.shippingCost} onChange={v => set("shippingCost", v)} />
              <SARInput label="إعلانات / وحدة"  icon={Megaphone} value={inputs.adBudget}     onChange={v => set("adBudget", v)} />
            </CardContent>
          </Card>

          {/* بطاقة النسب */}
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardContent className="px-5 pt-5 pb-5 space-y-6">

              {/* عمولة المنصة */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-orange-400" />
                    عمولة المنصة
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/25 text-xs">
                      {inputs.platformCommission}% = {result.commissionAmount.toFixed(1)} ر.س
                    </Badge>
                  </div>
                </div>
                <Slider
                  value={[inputs.platformCommission]}
                  onValueChange={([v]) => set("platformCommission", v)}
                  min={0} max={30} step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>0% — مباشر</span>
                  <span>5% — سلة</span>
                  <span>15% — أمازون</span>
                  <span>30%</span>
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* نسبة الإرجاع */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-gray-400 text-xs flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                    نسبة الإرجاع المتوقعة
                  </Label>
                  <Badge className="bg-yellow-500/15 text-yellow-300 border-yellow-500/25 text-xs">
                    {inputs.returnRate}%
                  </Badge>
                </div>
                <Slider
                  value={[inputs.returnRate]}
                  onValueChange={([v]) => set("returnRate", v)}
                  min={0} max={20} step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-[10px] text-gray-600">
                  <span>0% — لا إرجاع</span>
                  <span>5% — طبيعي</span>
                  <span>20% — مرتفع</span>
                </div>
              </div>

              <Separator className="bg-gray-800" />

              {/* ضريبة القيمة المضافة */}
              <div
                className={`
                  flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer select-none
                  transition-colors duration-200
                  ${inputs.includeVAT
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-gray-800/50 border-gray-700 hover:border-gray-600"}
                `}
                onClick={() => set("includeVAT", !inputs.includeVAT)}
              >
                <Checkbox
                  id="vat"
                  checked={inputs.includeVAT}
                  onCheckedChange={c => set("includeVAT", !!c)}
                  className="border-gray-600 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                />
                <div className="flex-1">
                  <p className="text-gray-300 text-sm font-medium">احتساب ضريبة القيمة المضافة</p>
                  <p className="text-gray-500 text-xs">15% من سعر البيع وفق أنظمة هيئة الزكاة</p>
                </div>
                <AnimatePresence>
                  {inputs.includeVAT && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                        -{result.vatAmount.toFixed(1)} ر.س
                      </Badge>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </CardContent>
          </Card>
        </motion.div>

        {/* ══════════════════════ عمود النتائج ══════════════════════ */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >

          {/* ─── البطاقة الرئيسية: الربح الصافي ─── */}
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl overflow-hidden">
            {/* شريط اللون العلوي */}
            <div
              className={`h-1 w-full transition-colors duration-500 ${
                result.netProfit < 0 ? "bg-red-500" :
                result.profitMargin < 10 ? "bg-yellow-500" :
                result.profitMargin < 20 ? "bg-amber-400" : "bg-green-500"
              }`}
            />
            <CardContent className="px-5 pt-5 pb-5">
              <div className="flex items-center justify-between">

                {/* الأرقام */}
                <div>
                  <p className="text-gray-500 text-xs mb-1 font-medium">صافي الربح / وحدة</p>
                  <motion.div
                    key={result.netProfit.toFixed(2)}
                    initial={{ y: -8, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className={`text-5xl font-black tracking-tight ${profitColor}`}
                  >
                    {profitPositive ? "+" : ""}
                    {result.netProfit.toFixed(2)}
                    <span className="text-lg font-normal text-gray-400 mr-1">ر.س</span>
                  </motion.div>
                  <div className="mt-2 flex items-center gap-1.5 text-gray-400 text-xs">
                    {profitPositive
                      ? <TrendingUp className="w-3.5 h-3.5 text-green-400" />
                      : <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    }
                    من إجمالي {inputs.salePrice} ر.س سعر بيع
                  </div>
                </div>

                {/* دائرة هامش الربح */}
                <div className="text-center">
                  <ProfitRing margin={result.profitMargin} />
                  <p className="text-gray-600 text-[10px] mt-1">هامش الربح</p>
                </div>

              </div>

              {/* إحصائيات سريعة */}
              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gray-800">
                {[
                  { label: "ربح إجمالي", value: result.grossProfit.toFixed(1), unit: "ر.س", color: "text-emerald-400" },
                  { label: "نقطة التعادل", value: result.breakEvenUnits || "—", unit: result.breakEvenUnits ? "وحدة" : "", color: "text-blue-400" },
                  { label: "عائد الاستثمار", value: result.roi.toFixed(1), unit: "%", color: result.roi >= 0 ? "text-violet-400" : "text-red-400" },
                ].map(s => (
                  <div key={s.label} className="text-center">
                    <motion.p
                      key={String(s.value)}
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`text-lg font-bold ${s.color}`}
                    >
                      {s.value}
                      <span className="text-[10px] font-normal text-gray-500 mr-0.5">{s.unit}</span>
                    </motion.p>
                    <p className="text-gray-600 text-[10px]">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ─── جدول تفصيل التكاليف ─── */}
          <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-gray-400 text-xs font-semibold uppercase tracking-wider">
                تفصيل التكاليف
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 space-y-0.5">
              {costRows.map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex justify-between items-center py-2 border-b border-gray-800/60 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <row.icon className="w-3.5 h-3.5 text-gray-600" />
                    <span className="text-gray-400 text-sm">{row.label}</span>
                  </div>
                  <motion.span
                    key={row.value.toFixed(2)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-sm font-medium tabular-nums ${row.color}`}
                  >
                    {row.value.toFixed(2)} ر.س
                  </motion.span>
                </motion.div>
              ))}

              {/* المجموع */}
              <div className="pt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">مجموع التكاليف</span>
                  <span className="text-red-400 font-semibold tabular-nums">
                    {result.totalCosts.toFixed(2)} ر.س
                  </span>
                </div>
                <div className="flex justify-between items-center p-2.5 bg-gray-800/60 rounded-xl">
                  <span className="text-white font-bold text-sm">صافي الربح</span>
                  <span className={`font-black text-base tabular-nums ${profitColor}`}>
                    {profitPositive ? "+" : ""}{result.netProfit.toFixed(2)} ر.س
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── النصيحة الذكية ─── */}
          <SmartTip result={result} inputs={inputs} />

          {/* ─── أزرار الإجراءات ─── */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="
                h-11 rounded-xl border-gray-700 text-gray-300
                hover:bg-gray-800 hover:text-white hover:border-gray-600
                gap-2 transition-all
              "
            >
              <Save className="w-4 h-4" />
              حفظ الحاسبة
            </Button>
            <Button
              variant="outline"
              className="
                h-11 rounded-xl border-violet-500/40 text-violet-300
                hover:bg-violet-500/10 hover:border-violet-500/60
                gap-2 transition-all
              "
            >
              <Share2 className="w-4 h-4" />
              مشاركة
            </Button>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
