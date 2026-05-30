"use client"

import { useState, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Calendar,
  List,
  LayoutDashboard,
  Star,
  Flame,
  ChevronLeft,
  ExternalLink,
  Hash,
  Lightbulb,
  Clock,
  Filter,
} from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "religious" | "national" | "global" | "seasonal"
type ViewMode = "calendar" | "list" | "kanban"
type Market = "السعودية" | "الإمارات" | "مصر" | "الخليج" | "عام"
type CategoryKey =
  | "أزياء" | "إلكترونيات" | "مأكولات" | "عطور"
  | "مجوهرات" | "رياضة" | "كتب" | "صحة"

interface SeasonEvent {
  id: string
  name: string
  date: string        // YYYY-MM-DD
  endDate?: string    // YYYY-MM-DD
  type: EventType
  intensity: 1 | 2 | 3
  ideas: string[]
  hashtags: string[]
  markets: Market[]
  categories: CategoryKey[]
}

// ─── Hardcoded Events (2025-2026) ─────────────────────────────────────────────

const ALL_EVENTS: SeasonEvent[] = [
  {
    id: "ramadan",
    name: "شهر رمضان المبارك",
    date: "2025-03-01",
    endDate: "2025-03-30",
    type: "religious",
    intensity: 3,
    ideas: [
      "إطلاق مجموعة رمضان الخاصة مع تصاميم تراثية وألوان ذهبية",
      "عروض الإفطار والسحور — خصومات حصرية للساعة 3-5 فجراً",
      "حملة 'هدية رمضان' — تغليف مجاني وبطاقة معايدة مخصصة",
    ],
    hashtags: ["#رمضان_2025", "#رمضان_كريم", "#عروض_رمضان", "#رمضان_يجمعنا"],
    markets: ["السعودية", "الإمارات", "مصر", "الخليج", "عام"],
    categories: ["أزياء", "مأكولات", "عطور", "مجوهرات"],
  },
  {
    id: "eid_alfitr",
    name: "عيد الفطر المبارك",
    date: "2025-03-30",
    endDate: "2025-04-02",
    type: "religious",
    intensity: 3,
    ideas: [
      "تخفيضات العيد تصل إلى 50% على المنتجات المختارة",
      "حملة 'عيديتك منا' — كوبون هدية لكل مشترك جديد",
      "مجموعة ملابس العيد — شحن سريع يصل قبل صلاة العيد",
    ],
    hashtags: ["#عيد_الفطر", "#عيد_مبارك", "#عروض_العيد", "#كل_عام_وانتم_بخير"],
    markets: ["السعودية", "الإمارات", "مصر", "الخليج", "عام"],
    categories: ["أزياء", "مجوهرات", "عطور", "صحة"],
  },
  {
    id: "founding_day",
    name: "يوم التأسيس السعودي",
    date: "2025-02-22",
    type: "national",
    intensity: 2,
    ideas: [
      "تصميم منتجات بألوان الهوية الوطنية (أخضر وذهبي)",
      "حملة 'فخر التأسيس' — خصم 22% تيمناً بتاريخ اليوم",
      "محتوى تعليمي عن تاريخ المملكة مع ربطه بمنتجاتك",
    ],
    hashtags: ["#يوم_التأسيس", "#يوم_التأسيس_السعودي", "#فخر_المملكة", "#1727"],
    markets: ["السعودية"],
    categories: ["أزياء", "إلكترونيات", "كتب"],
  },
  {
    id: "womens_day",
    name: "اليوم العالمي للمرأة",
    date: "2025-03-08",
    type: "global",
    intensity: 2,
    ideas: [
      "تجربة التسوق النسائية — قسم مخصص بمنتجات تختارها نساء للنساء",
      "حملة 'قوتها قوتنا' — تبرع بجزء من المبيعات لصالح مبادرة نسائية",
      "مقالات إلهامية عن رائدات الأعمال مع عروض حصرية للسيدات",
    ],
    hashtags: ["#يوم_المرأة", "#اليوم_العالمي_للمرأة", "#المرأة_السعودية", "#قوة_المرأة"],
    markets: ["السعودية", "الإمارات", "مصر", "عام"],
    categories: ["أزياء", "مجوهرات", "عطور", "صحة"],
  },
  {
    id: "eid_aladha",
    name: "عيد الأضحى المبارك",
    date: "2025-06-06",
    endDate: "2025-06-09",
    type: "religious",
    intensity: 3,
    ideas: [
      "عروض الأضحى — خصومات تصل 40% على منتجات الأسرة",
      "مجموعة هدايا الأضحى — تغليف فاخر وتوصيل لضيوفك",
      "حملة 'العيد أجمل معنا' — مسابقة صور بجوائز قيّمة",
    ],
    hashtags: ["#عيد_الأضحى", "#عيد_أضحى_مبارك", "#عروض_الأضحى", "#أيام_التشريق"],
    markets: ["السعودية", "الإمارات", "مصر", "الخليج", "عام"],
    categories: ["أزياء", "مجوهرات", "مأكولات", "عطور"],
  },
  {
    id: "national_day",
    name: "اليوم الوطني السعودي",
    date: "2025-09-23",
    type: "national",
    intensity: 3,
    ideas: [
      "مجموعة 'ثمانية وتسعون' — 98 منتجاً بتصاميم وطنية حصرية",
      "حملة 'أخضر للأبد' — خصم 23% يوم 23 سبتمبر فقط",
      "فيديو قصصي عن رحلة علامتك التجارية في السوق السعودي",
    ],
    hashtags: ["#اليوم_الوطني", "#اليوم_الوطني_94", "#وطني_فخري", "#23_سبتمبر"],
    markets: ["السعودية"],
    categories: ["أزياء", "إلكترونيات", "عطور"],
  },
  {
    id: "mothers_day",
    name: "عيد الأم",
    date: "2025-03-21",
    type: "global",
    intensity: 2,
    ideas: [
      "مجموعة 'أغلى إنسانة' — هدايا مميزة للأمهات",
      "خدمة الإهداء المجاني مع رسالة مكتوبة بخط اليد",
      "مسابقة 'صورتي مع أمي' على السوشيال ميديا",
    ],
    hashtags: ["#عيد_الأم", "#أمي_حياتي", "#هدية_أمي", "#يوم_الأم"],
    markets: ["السعودية", "الإمارات", "مصر", "الخليج", "عام"],
    categories: ["مجوهرات", "عطور", "أزياء", "صحة"],
  },
  {
    id: "childrens_day",
    name: "يوم الطفل العالمي",
    date: "2025-11-20",
    type: "global",
    intensity: 1,
    ideas: [
      "ركن الأطفال — تشكيلة منتجات مخصصة للأعمار 3-12",
      "عروض 'فرحة الطفل' — اشترِ منتج للطفل واحصل على هدية مجانية",
      "محتوى تعليمي وترفيهي للأطفال مع ربطه بمنتجاتك",
    ],
    hashtags: ["#يوم_الطفل", "#الطفولة", "#أطفالنا_زهورنا"],
    markets: ["السعودية", "الإمارات", "مصر", "عام"],
    categories: ["رياضة", "كتب", "صحة"],
  },
  {
    id: "white_friday",
    name: "الجمعة البيضاء (Black Friday)",
    date: "2025-11-28",
    type: "global",
    intensity: 3,
    ideas: [
      "إطلاق مبكر — أسبوع كامل من العروض قبل الجمعة البيضاء",
      "خصومات تراكمية — كلما اشتريت أكثر وفّرت أكثر",
      "قائمة الانتظار الحصرية — سجّل مسبقاً للوصول المبكر",
    ],
    hashtags: ["#الجمعة_البيضاء", "#بلاك_فرايدي", "#WhiteFriday", "#تخفيضات"],
    markets: ["السعودية", "الإمارات", "الخليج", "عام"],
    categories: ["إلكترونيات", "أزياء", "عطور", "رياضة", "صحة"],
  },
  {
    id: "riyadh_season",
    name: "موسم الرياض",
    date: "2025-10-01",
    endDate: "2026-02-28",
    type: "seasonal",
    intensity: 3,
    ideas: [
      "حملة 'الرياض تتألق' — منتجات مستوحاة من أجواء الموسم",
      "عروض خاصة للزوار — بطاقة ترحيب مع أول طلب",
      "شراكات مع الفعاليات — كود خصم حصري لحضور الموسم",
    ],
    hashtags: ["#موسم_الرياض", "#Riyadh_Season", "#موسم_الرياض_2025"],
    markets: ["السعودية"],
    categories: ["أزياء", "إلكترونيات", "عطور", "مجوهرات"],
  },
  {
    id: "jeddah_season",
    name: "موسم جدة",
    date: "2025-07-01",
    endDate: "2025-08-31",
    type: "seasonal",
    intensity: 2,
    ideas: [
      "مجموعة صيف جدة — منتجات عصرية تناسب أجواء الكورنيش",
      "عروض المطاعم والكافيهات المشاركة — كولاب مع المطاعم المحلية",
      "مسابقة صور موسم جدة — جوائز قيّمة للمشاركين",
    ],
    hashtags: ["#موسم_جدة", "#Jeddah_Season", "#جدة_2025"],
    markets: ["السعودية"],
    categories: ["أزياء", "مأكولات", "عطور"],
  },
  {
    id: "back_to_school",
    name: "موسم العودة للمدارس",
    date: "2025-08-15",
    endDate: "2025-09-07",
    type: "seasonal",
    intensity: 2,
    ideas: [
      "حقيبة المدرسة الكاملة — باقة متكاملة بسعر مميز",
      "مسابقة 'مستعد للمدرسة' — صور الأطفال باليوم الأول",
      "عروض للطلاب — خصم إضافي بإبراز الهوية الطلابية",
    ],
    hashtags: ["#العودة_للمدارس", "#back2school", "#موسم_المدارس", "#العام_الدراسي"],
    markets: ["السعودية", "الإمارات", "مصر", "الخليج"],
    categories: ["إلكترونيات", "أزياء", "كتب", "صحة", "رياضة"],
  },
  {
    id: "new_year",
    name: "رأس السنة الميلادية",
    date: "2025-01-01",
    type: "global",
    intensity: 2,
    ideas: [
      "عروض بداية العام — 'جدد حياتك' بمنتجات جديدة",
      "حملة النوايا — شارك هدفك لعام 2026 واربح كوبون خصم",
      "سيل نهاية العام — تصفية المخزون بأسعار استثنائية",
    ],
    hashtags: ["#رأس_السنة", "#2026", "#سنة_جديدة", "#happy_new_year"],
    markets: ["السعودية", "الإمارات", "مصر", "الخليج", "عام"],
    categories: ["أزياء", "إلكترونيات", "رياضة", "صحة"],
  },
  {
    id: "super_sunday",
    name: "سوبر سانداي",
    date: "2025-02-09",
    type: "global",
    intensity: 2,
    ideas: [
      "ليلة المباراة — سلة تسوق لحفلات المشاهدة مع العائلة",
      "عروض 'الفوز معك' — خصم مفاجئ كل ربع ساعة",
      "بث مباشر للتسوق — مضيف يعرض المنتجات أثناء المباراة",
    ],
    hashtags: ["#سوبر_سانداي", "#SuperSunday", "#مباراة_اليوم"],
    markets: ["السعودية", "الإمارات", "الخليج"],
    categories: ["إلكترونيات", "مأكولات", "رياضة"],
  },
  {
    id: "youtuber_day",
    name: "يوم اليوتيوبر",
    date: "2025-07-31",
    type: "global",
    intensity: 1,
    ideas: [
      "كولاب مع يوتيوبر سعودي — عرض حصري لجمهوره",
      "ابتكر محتوى مع يوتيوبر ناشئ — دعم صناع المحتوى المحليين",
      "قصة نجاح متجرك في فيديو وثائقي قصير",
    ],
    hashtags: ["#يوم_اليوتيوبر", "#يوتيوب", "#YouTube_Day", "#صناع_المحتوى"],
    markets: ["السعودية", "الإمارات", "عام"],
    categories: ["إلكترونيات", "أزياء", "صحة"],
  },
  {
    id: "packing_deals",
    name: "باكينج ديلز (نهاية الموسم)",
    date: "2025-12-26",
    endDate: "2025-12-31",
    type: "seasonal",
    intensity: 2,
    ideas: [
      "تصفية نهاية الموسم — خصومات تصل 70%",
      "حقيبة المفاجآت — صندوق عشوائي بسعر ثابت وقيمة أعلى",
      "عروض الكميات — اشتر 3 وادفع لـ 2",
    ],
    hashtags: ["#باكينج_ديلز", "#PackingDeals", "#نهاية_الموسم", "#تصفية"],
    markets: ["السعودية", "الإمارات", "الخليج", "عام"],
    categories: ["أزياء", "إلكترونيات", "عطور"],
  },
  {
    id: "new_year_2026",
    name: "رأس السنة الميلادية 2026",
    date: "2026-01-01",
    type: "global",
    intensity: 2,
    ideas: [
      "إطلاق المجموعة الجديدة لعام 2026 — كن أول من يحصل عليها",
      "عروض الاشتراك السنوي — وفّر أكثر مع الاشتراكات المسبقة",
      "حملة 'أهداف 2026' — تحدّيات تسوق شهرية مع مكافآت",
    ],
    hashtags: ["#2026", "#سنة_جديدة_سعيدة", "#رأس_السنة_2026", "#happy_new_year_2026"],
    markets: ["السعودية", "الإمارات", "مصر", "الخليج", "عام"],
    categories: ["أزياء", "إلكترونيات", "رياضة", "صحة"],
  },
]

// ─── Config ────────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<EventType, { label: string; color: string; bg: string; border: string; dot: string }> = {
  religious: { label: "ديني",    color: "text-amber-300",  bg: "bg-amber-500/15",  border: "border-amber-500/30",  dot: "bg-amber-400" },
  national:  { label: "وطني",   color: "text-green-300",  bg: "bg-green-500/15",  border: "border-green-500/30",  dot: "bg-green-400" },
  global:    { label: "عالمي",  color: "text-blue-300",   bg: "bg-blue-500/15",   border: "border-blue-500/30",   dot: "bg-blue-400" },
  seasonal:  { label: "موسمي",  color: "text-violet-300", bg: "bg-violet-500/15", border: "border-violet-500/30", dot: "bg-violet-400" },
}

const CATEGORIES: CategoryKey[] = [
  "أزياء", "إلكترونيات", "مأكولات", "عطور",
  "مجوهرات", "رياضة", "كتب", "صحة",
]

const MONTH_NAMES = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
]

const DAY_NAMES_SHORT = ["أحد","اثن","ثلث","أرب","خمس","جمع","سبت"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatArabicDate(dateStr: string): string {
  const d = parseDate(dateStr)
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

function isEventOnDate(event: SeasonEvent, year: number, month: number, day: number): boolean {
  const date = new Date(year, month, day)
  const start = parseDate(event.date)
  const end = event.endDate ? parseDate(event.endDate) : start
  return date >= start && date <= end
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = parseDate(dateStr)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function IntensityStars({ intensity }: { intensity: 1 | 2 | 3 }) {
  if (intensity === 3) return <Flame className="w-3.5 h-3.5 text-orange-400" />
  if (intensity === 2) return <Star className="w-3.5 h-3.5 text-yellow-400" />
  return null
}

// ─── Event Sheet/Panel ────────────────────────────────────────────────────────

function EventSheet({
  event,
  open,
  onClose,
}: {
  event: SeasonEvent | null
  open: boolean
  onClose: () => void
}) {
  if (!event) return null
  const cfg = TYPE_CONFIG[event.type]

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent
        side="left"
        className="bg-gray-900 border-gray-800 w-full sm:max-w-md overflow-y-auto"
        dir="rtl"
      >
        <SheetHeader className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} text-xs`}>
              {cfg.label}
            </Badge>
            {event.intensity >= 2 && (
              <IntensityStars intensity={event.intensity} />
            )}
          </div>
          <SheetTitle className="text-white text-xl font-bold text-right">
            {event.name}
          </SheetTitle>
          <div className="flex items-center gap-1.5 text-gray-400 text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatArabicDate(event.date)}</span>
            {event.endDate && (
              <>
                <span>—</span>
                <span>{formatArabicDate(event.endDate)}</span>
              </>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-5">
          {/* Campaign ideas */}
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
            <p className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
              <Lightbulb className="w-4 h-4 text-violet-400" />
              أفكار للحملات
            </p>
            {event.ideas.map((idea, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-2 items-start"
              >
                <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  {i + 1}
                </span>
                <p className="text-gray-300 text-sm leading-relaxed">{idea}</p>
              </motion.div>
            ))}
          </div>

          {/* Hashtags */}
          <div>
            <p className="text-white font-semibold text-sm flex items-center gap-2 mb-3">
              <Hash className="w-4 h-4 text-blue-400" />
              الهاشتاقات المقترحة
            </p>
            <div className="flex flex-wrap gap-2">
              {event.hashtags.map((tag, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/25 text-xs cursor-pointer hover:bg-blue-500/25 transition-colors">
                    {tag}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Intensity */}
          <div className="flex items-center gap-3 p-3 bg-gray-800/40 rounded-xl">
            <div className="flex gap-1">
              {[1, 2, 3].map(n => (
                <Star
                  key={n}
                  className={`w-4 h-4 ${n <= event.intensity ? "text-yellow-400 fill-yellow-400" : "text-gray-700"}`}
                />
              ))}
            </div>
            <p className="text-gray-400 text-sm">
              {event.intensity === 3 ? "أهمية تجارية عالية جداً" :
               event.intensity === 2 ? "أهمية تجارية متوسطة" :
               "أهمية تجارية منخفضة"}
            </p>
          </div>

          {/* CTA */}
          <Button
            asChild
            className="w-full h-11 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold gap-2"
          >
            <a href="/dashboard/tools/social-plan">
              <ExternalLink className="w-4 h-4" />
              أنشئ خطة محتوى لهذه المناسبة
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Calendar Month Cell ──────────────────────────────────────────────────────

function MonthGrid({
  year,
  month,
  events,
  onSelectEvent,
}: {
  year: number
  month: number
  events: SeasonEvent[]
  onSelectEvent: (e: SeasonEvent) => void
}) {
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-3">
      <p className="text-white text-sm font-semibold text-center mb-2">
        {MONTH_NAMES[month]}
      </p>

      {/* Day header */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="text-center text-[9px] text-gray-600 font-medium py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} />
          }

          const dayEvents = events.filter(e => isEventOnDate(e, year, month, day))
          const hasEvents = dayEvents.length > 0

          return (
            <div key={day} className="relative">
              <div
                className={`
                  text-center text-[10px] py-0.5 rounded transition-colors
                  ${hasEvents ? "font-bold text-white cursor-pointer" : "text-gray-600"}
                `}
              >
                {day}
              </div>

              {/* Event pills */}
              {dayEvents.slice(0, 2).map((ev, i) => {
                const cfg = TYPE_CONFIG[ev.type]
                return (
                  <button
                    key={ev.id}
                    title={ev.name}
                    onClick={() => onSelectEvent(ev)}
                    className={`
                      w-full text-[8px] leading-none px-0.5 py-0.5 rounded
                      truncate block text-center mt-0.5
                      ${cfg.bg} ${cfg.color} hover:opacity-80 transition-opacity
                    `}
                    style={{ marginTop: i === 0 ? 1 : 0 }}
                  >
                    {ev.intensity === 3 ? "🔥" : ev.intensity === 2 ? "⭐" : ""}
                    {ev.name.slice(0, 4)}
                  </button>
                )
              })}
              {dayEvents.length > 2 && (
                <button
                  onClick={() => onSelectEvent(dayEvents[2])}
                  className="w-full text-[7px] text-gray-500 text-center"
                >
                  +{dayEvents.length - 2}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── List View ────────────────────────────────────────────────────────────────

function ListView({
  events,
  onSelectEvent,
}: {
  events: SeasonEvent[]
  onSelectEvent: (e: SeasonEvent) => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, SeasonEvent[]>()
    const sorted = [...events].sort(
      (a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime()
    )
    sorted.forEach(ev => {
      const d = parseDate(ev.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ev)
    })
    return map
  }, [events])

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        لا توجد مناسبات تطابق الفلاتر المحددة
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {Array.from(grouped.entries()).map(([key, monthEvents]) => {
        const [year, month] = key.split("-").map(Number)
        return (
          <div key={key}>
            <h3 className="text-gray-400 text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              {MONTH_NAMES[month]} {year}
            </h3>
            <div className="space-y-2">
              {monthEvents.map((ev, i) => {
                const cfg = TYPE_CONFIG[ev.type]
                const daysUntil = getDaysUntil(ev.date)
                return (
                  <motion.button
                    key={ev.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => onSelectEvent(ev)}
                    className="
                      w-full text-right bg-gray-900/80 border border-gray-800 rounded-xl
                      px-4 py-3 flex items-center gap-3
                      hover:border-gray-700 hover:bg-gray-800/60 transition-all
                    "
                  >
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium text-sm truncate">{ev.name}</p>
                        <IntensityStars intensity={ev.intensity} />
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">{formatArabicDate(ev.date)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge className={`${cfg.bg} ${cfg.color} ${cfg.border} text-xs`}>
                        {cfg.label}
                      </Badge>
                      {daysUntil >= 0 && daysUntil <= 30 && (
                        <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/25 text-xs">
                          {daysUntil === 0 ? "اليوم!" : `${daysUntil} يوم`}
                        </Badge>
                      )}
                    </div>
                    <ChevronLeft className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  </motion.button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({
  events,
  onSelectEvent,
}: {
  events: SeasonEvent[]
  onSelectEvent: (e: SeasonEvent) => void
}) {
  const columns: { type: EventType; events: SeasonEvent[] }[] = [
    { type: "religious", events: events.filter(e => e.type === "religious") },
    { type: "national",  events: events.filter(e => e.type === "national") },
    { type: "global",    events: events.filter(e => e.type === "global") },
    { type: "seasonal",  events: events.filter(e => e.type === "seasonal") },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map(col => {
        const cfg = TYPE_CONFIG[col.type]
        return (
          <div key={col.type} className="space-y-3">
            <div className={`flex items-center gap-2 p-3 rounded-xl border ${cfg.bg} ${cfg.border}`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <p className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</p>
              <Badge className={`mr-auto text-xs ${cfg.bg} ${cfg.color} ${cfg.border}`}>
                {col.events.length}
              </Badge>
            </div>

            <div className="space-y-2 min-h-16">
              {col.events.length === 0 && (
                <div className="text-center py-8 text-gray-700 text-sm border border-dashed border-gray-800 rounded-xl">
                  لا توجد مناسبات
                </div>
              )}
              {col.events.map((ev, i) => (
                <motion.button
                  key={ev.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={() => onSelectEvent(ev)}
                  className="
                    w-full text-right bg-gray-900/80 border border-gray-800 rounded-xl
                    px-3 py-3 space-y-1.5 group
                    hover:border-gray-700 hover:bg-gray-800/60 transition-all
                  "
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-sm font-medium leading-snug text-right flex-1">
                      {ev.name}
                    </p>
                    <IntensityStars intensity={ev.intensity} />
                  </div>
                  <p className="text-gray-500 text-xs">{formatArabicDate(ev.date)}</p>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft className="w-3 h-3 text-gray-500" />
                    <span className="text-gray-500 text-xs">عرض التفاصيل</span>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Upcoming Panel ───────────────────────────────────────────────────────────

function UpcomingPanel({
  events,
  onSelectEvent,
}: {
  events: SeasonEvent[]
  onSelectEvent: (e: SeasonEvent) => void
}) {
  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const in30 = new Date(today)
    in30.setDate(today.getDate() + 30)

    return events
      .filter(ev => {
        const d = parseDate(ev.date)
        return d >= today && d <= in30
      })
      .sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime())
      .slice(0, 6)
  }, [events])

  return (
    <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-4 space-y-3">
      <p className="text-white font-semibold text-sm flex items-center gap-2">
        <Clock className="w-4 h-4 text-orange-400" />
        القادمة خلال 30 يوم
      </p>

      {upcoming.length === 0 && (
        <p className="text-gray-600 text-xs text-center py-4">
          لا توجد مناسبات قادمة خلال 30 يوم
        </p>
      )}

      {upcoming.map((ev, i) => {
        const cfg = TYPE_CONFIG[ev.type]
        const daysUntil = getDaysUntil(ev.date)
        return (
          <motion.button
            key={ev.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
            onClick={() => onSelectEvent(ev)}
            className="
              w-full text-right flex items-center gap-2.5
              p-2.5 rounded-xl hover:bg-gray-800/60 transition-colors
            "
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{ev.name}</p>
              <p className="text-gray-500 text-[10px]">{formatArabicDate(ev.date)}</p>
            </div>
            <Badge className="bg-orange-500/15 text-orange-300 border-orange-500/25 text-[10px] flex-shrink-0">
              {daysUntil === 0 ? "اليوم" : `${daysUntil}ي`}
            </Badge>
          </motion.button>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SeasonsCalendarPage() {
  const [market, setMarket] = useState<Market>("السعودية")
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryKey>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>("calendar")
  const [religiousOnly, setReligiousOnly] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<SeasonEvent | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const currentYear = new Date().getFullYear()

  function toggleCategory(cat: CategoryKey) {
    setSelectedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const filteredEvents = useMemo(() => {
    return ALL_EVENTS.filter(ev => {
      if (religiousOnly && ev.type !== "religious") return false
      if (market !== "عام" && !ev.markets.includes(market)) return false
      if (selectedCategories.size > 0) {
        const hasCategory = ev.categories.some(c => selectedCategories.has(c))
        if (!hasCategory) return false
      }
      return true
    })
  }, [market, selectedCategories, religiousOnly])

  function openEvent(ev: SeasonEvent) {
    setSelectedEvent(ev)
    setSheetOpen(true)
  }

  const viewButtons: { mode: ViewMode; icon: React.ReactNode; label: string }[] = [
    { mode: "calendar", icon: <Calendar className="w-3.5 h-3.5" />, label: "تقويم" },
    { mode: "list",     icon: <List className="w-3.5 h-3.5" />,     label: "قائمة" },
    { mode: "kanban",   icon: <LayoutDashboard className="w-3.5 h-3.5" />, label: "Kanban" },
  ]

  return (
    <div className="min-h-screen bg-gray-950 p-4 md:p-8" dir="rtl">

      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2.5 bg-violet-500/15 rounded-xl border border-violet-500/20">
            <Calendar className="w-5 h-5 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">تقويم المواسم التسويقية</h1>
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
            {filteredEvents.length} مناسبة
          </Badge>
        </div>
        <p className="text-gray-500 text-sm mr-14">
          خطط لحملاتك التسويقية مسبقاً مع جميع المناسبات والمواسم الهامة
        </p>
      </motion.div>

      {/* ─── Filter Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="max-w-7xl mx-auto mb-6"
      >
        <Card className="bg-gray-900/80 border-gray-800 rounded-2xl">
          <CardContent className="px-5 pt-4 pb-4">
            <div className="flex flex-wrap gap-4 items-center">

              {/* Market select */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <Select value={market} onValueChange={v => setMarket(v as Market)}>
                  <SelectTrigger className="bg-gray-800/80 border-gray-700 text-white h-9 rounded-xl w-36 text-sm focus:border-violet-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-gray-700 text-white rounded-xl">
                    {(["السعودية","الإمارات","مصر","الخليج","عام"] as Market[]).map(m => (
                      <SelectItem key={m} value={m} className="focus:bg-violet-500/20 focus:text-white rounded-lg text-sm">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Category multi-select badges */}
              <div className="flex flex-wrap gap-1.5 flex-1">
                {CATEGORIES.map(cat => {
                  const active = selectedCategories.has(cat)
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`
                        px-3 py-1 rounded-full text-xs font-medium border transition-all
                        ${active
                          ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                          : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600"}
                      `}
                    >
                      {cat}
                    </button>
                  )
                })}
                {selectedCategories.size > 0 && (
                  <button
                    onClick={() => setSelectedCategories(new Set())}
                    className="px-3 py-1 rounded-full text-xs font-medium border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all"
                  >
                    مسح
                  </button>
                )}
              </div>

              {/* Religious only toggle */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Label className="text-gray-400 text-xs">ديني فقط</Label>
                <Switch
                  checked={religiousOnly}
                  onCheckedChange={setReligiousOnly}
                  className="data-[state=checked]:bg-amber-500"
                />
              </div>

              {/* View toggle */}
              <div className="flex bg-gray-800/80 rounded-xl p-1 gap-1 flex-shrink-0">
                {viewButtons.map(btn => (
                  <button
                    key={btn.mode}
                    onClick={() => setViewMode(btn.mode)}
                    className={`
                      flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all
                      ${viewMode === btn.mode
                        ? "bg-violet-600 text-white"
                        : "text-gray-400 hover:text-gray-300"}
                    `}
                  >
                    {btn.icon}
                    {btn.label}
                  </button>
                ))}
              </div>

            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ─── Main Content ─── */}
      <div className="max-w-7xl mx-auto">
        <div className={`flex gap-5 ${viewMode === "calendar" ? "flex-col xl:flex-row" : ""}`}>

          {/* Main view area */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">

              {/* Calendar View */}
              {viewMode === "calendar" && (
                <motion.div
                  key="calendar"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MonthGrid
                      key={i}
                      year={currentYear}
                      month={i}
                      events={filteredEvents}
                      onSelectEvent={openEvent}
                    />
                  ))}
                </motion.div>
              )}

              {/* List View */}
              {viewMode === "list" && (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <ListView events={filteredEvents} onSelectEvent={openEvent} />
                </motion.div>
              )}

              {/* Kanban View */}
              {viewMode === "kanban" && (
                <motion.div
                  key="kanban"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                >
                  <KanbanView events={filteredEvents} onSelectEvent={openEvent} />
                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* Upcoming sidebar — only in calendar view */}
          {viewMode === "calendar" && (
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="xl:w-64 flex-shrink-0"
            >
              <UpcomingPanel events={filteredEvents} onSelectEvent={openEvent} />
            </motion.div>
          )}

        </div>
      </div>

      {/* ─── Event Sheet ─── */}
      <EventSheet
        event={selectedEvent}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

    </div>
  )
}
