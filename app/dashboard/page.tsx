"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Calculator,
  Store,
  CalendarDays,
  FileText,
  BarChart3,
  MessageCircle,
  Shield,
  Share2,
  Image,
  Rocket,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

const TOOLS = [
  {
    href: "/dashboard/tools/profit-calculator",
    label: "حاسبة الربح",
    desc: "احسب هامش الربح، تكلفة الشحن، والعائد قبل أي قرار بيعي",
    icon: Calculator,
    color: "text-green-400",
    bg: "bg-green-900/20",
    border: "border-green-800/40",
    hover: "hover:border-green-600/60",
    badge: "مجاني",
    badgeColor: "bg-green-900/40 text-green-400",
    ai: "JavaScript",
  },
  {
    href: "/dashboard/tools/store-analyzer",
    label: "محلل المتجر",
    desc: "حلل أي متجر إلكتروني وافهم نقاط قوته وضعفه بالذكاء الاصطناعي",
    icon: Store,
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    border: "border-blue-800/40",
    hover: "hover:border-blue-600/60",
    badge: "Gemini",
    badgeColor: "bg-blue-900/40 text-blue-400",
    ai: "Firecrawl + Gemini",
  },
  {
    href: "/dashboard/tools/seasons-calendar",
    label: "تقويم المواسم",
    desc: "تقويم المواسم التجارية السعودية مع أفكار محتوى لكل موسم",
    icon: CalendarDays,
    color: "text-orange-400",
    bg: "bg-orange-900/20",
    border: "border-orange-800/40",
    hover: "hover:border-orange-600/60",
    badge: "Gemini",
    badgeColor: "bg-orange-900/40 text-orange-400",
    ai: "Gemini Flash",
  },
  {
    href: "/dashboard/tools/product-description",
    label: "أوصاف المنتجات",
    desc: "اكتب أوصافاً احترافية لمنتجاتك بالعربي والإنجليزي تزيد المبيعات",
    icon: FileText,
    color: "text-violet-400",
    bg: "bg-violet-900/20",
    border: "border-violet-800/40",
    hover: "hover:border-violet-600/60",
    badge: "Gemini",
    badgeColor: "bg-violet-900/40 text-violet-400",
    ai: "Gemini 2.5 Flash",
  },
  {
    href: "/dashboard/tools/competitor-analyzer",
    label: "محلل المنافسين",
    desc: "قارن متجرك بمنافسيك واكتشف الفرص والتهديدات",
    icon: BarChart3,
    color: "text-red-400",
    bg: "bg-red-900/20",
    border: "border-red-800/40",
    hover: "hover:border-red-600/60",
    badge: "Gemini Pro",
    badgeColor: "bg-red-900/40 text-red-400",
    ai: "Firecrawl + Gemini Pro",
  },
  {
    href: "/dashboard/tools/whatsapp-templates",
    label: "رسائل واتساب",
    desc: "قوالب رسائل واتساب احترافية لمتجرك بأسرع وقت",
    icon: MessageCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-900/20",
    border: "border-emerald-800/40",
    hover: "hover:border-emerald-600/60",
    badge: "سريع ⚡",
    badgeColor: "bg-emerald-900/40 text-emerald-400",
    ai: "Groq Llama 3.3",
  },
  {
    href: "/dashboard/tools/store-policies",
    label: "سياسات المتجر",
    desc: "أنشئ سياسات متجرك القانونية: الإرجاع، الشحن، الخصوصية، وأكثر",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-900/20",
    border: "border-amber-800/40",
    hover: "hover:border-amber-600/60",
    badge: "Gemini",
    badgeColor: "bg-amber-900/40 text-amber-400",
    ai: "Gemini 2.5 Flash",
  },
  {
    href: "/dashboard/tools/social-plan",
    label: "محتوى سوشيال",
    desc: "خطة محتوى سوشيال ميديا شهرية مع تقويم نشر لكل المنصات",
    icon: Share2,
    color: "text-pink-400",
    bg: "bg-pink-900/20",
    border: "border-pink-800/40",
    hover: "hover:border-pink-600/60",
    badge: "Gemini",
    badgeColor: "bg-pink-900/40 text-pink-400",
    ai: "Gemini + SDXL",
  },
  {
    href: "/dashboard/tools/product-images",
    label: "صور المنتجات",
    desc: "ولّد صور منتجات احترافية بالذكاء الاصطناعي بدون كاميرا أو استوديو",
    icon: Image,
    color: "text-cyan-400",
    bg: "bg-cyan-900/20",
    border: "border-cyan-800/40",
    hover: "hover:border-cyan-600/60",
    badge: "Flux",
    badgeColor: "bg-cyan-900/40 text-cyan-400",
    ai: "Hugging Face Flux",
  },
  {
    href: "/dashboard/tools/launch-campaign",
    label: "حملة الإطلاق",
    desc: "استراتيجية إطلاق متكاملة لمنتجك: محتوى، جدول، ميزانية",
    icon: Rocket,
    color: "text-purple-400",
    bg: "bg-purple-900/20",
    border: "border-purple-800/40",
    hover: "hover:border-purple-600/60",
    badge: "Pro",
    badgeColor: "bg-purple-900/40 text-purple-400",
    ai: "Gemini Pro",
  },
];

const STATS = [
  { label: "أداة ذكاء اصطناعي", value: "10", icon: Sparkles },
  { label: "تاجر يستخدم المنصة", value: "2,400+", icon: TrendingUp },
  { label: "نموذج AI مختلف", value: "5", icon: Zap },
];

export default function DashboardPage() {
  return (
    <div className="min-h-full bg-gray-950 p-6" dir="rtl">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-violet-800/30 bg-gradient-to-br from-violet-900/20 via-gray-900/80 to-purple-900/20 p-8"
        >
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-700/40 bg-violet-900/20 px-3 py-1 text-xs text-violet-300">
                <Sparkles className="h-3 w-3" />
                مدعوم بأحدث نماذج الذكاء الاصطناعي
              </div>
              <h1 className="text-3xl font-black text-white sm:text-4xl">
                مرحباً بك في <br />
                <span className="text-violet-400">أدوات التاجر</span>
              </h1>
              <p className="mt-3 max-w-lg text-gray-400">
                منصة متكاملة من 10 أدوات ذكاء اصطناعي مصممة خصيصاً للتاجر
                السعودي — من حساب الربح إلى إطلاق الحملات التسويقية
              </p>
            </div>
            <div className="hidden sm:grid grid-cols-3 gap-4">
              {STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-gray-800 bg-gray-900/80 p-4 text-center min-w-[100px]"
                  >
                    <Icon className="mx-auto mb-1 h-5 w-5 text-violet-400" />
                    <div className="text-xl font-black text-white">{stat.value}</div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Tools grid */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-white">
            جميع الأدوات
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {TOOLS.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <motion.div
                  key={tool.href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    href={tool.href}
                    className={`group flex flex-col h-full rounded-2xl border ${tool.border} ${tool.hover} ${tool.bg} p-5 transition-all hover:shadow-xl hover:shadow-black/20`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className={`rounded-xl bg-gray-900/60 p-2.5 ${tool.color}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${tool.badgeColor}`}>
                        {tool.badge}
                      </span>
                    </div>
                    <h3 className="font-bold text-white mb-1.5">{tool.label}</h3>
                    <p className="text-sm text-gray-400 flex-1 leading-relaxed">
                      {tool.desc}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-gray-600">{tool.ai}</span>
                      <span className={`flex items-center gap-1 text-sm font-medium transition group-hover:gap-2 ${tool.color}`}>
                        افتح الأداة
                        <ArrowLeft className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center text-sm text-gray-600 pb-6">
          أدوات التاجر — مدعوم بـ Gemini، Groq، Hugging Face، و Firecrawl
        </div>
      </div>
    </div>
  );
}
