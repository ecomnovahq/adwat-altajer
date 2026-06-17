"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp, TrendingDown, Users, DollarSign, Star,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock,
  Lightbulb, Zap, AlertCircle,
} from "lucide-react"
import { api } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────
interface PatternIssue {
  id: string
  severity: "critical" | "high" | "medium" | "low"
  category: string
  title: string
  description: string
  monthlyLoss: number
  fixDifficulty: number
  fixTimeHours: number
  fixSteps: string[]
  sources?: string[]
  actionStatus?: "suggested" | "in_progress" | "done" | "dismissed"
}

interface SnapshotComparison {
  scoreDelta: number
  lossDelta: number
  daysBetween: number
  previousScore?: number
  previousLoss?: number
}

interface V5DashboardProps {
  result: {
    overallScore: number
    storeName?: string
    totalMonthlyLoss?: number
    totalYearlyLoss?: number
    estimatedVisitors?: number
    patternIssues?: PatternIssue[]
    industryTips?: string[]
    industryKey?: string
    snapshotComparison?: SnapshotComparison | null
  }
  storeUrl: string
  onShowFullReport: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high:     "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium:   "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low:      "bg-blue-500/20 text-blue-400 border-blue-500/30",
}

const SEVERITY_AR: Record<string, string> = {
  critical: "حرج", high: "عالي", medium: "متوسط", low: "منخفض",
}

function formatSAR(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K ريال`
  return `${n} ريال`
}

function DifficultyBar({ level }: { level: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className={`h-1.5 w-4 rounded-full ${i <= level ? "bg-purple-500" : "bg-white/10"}`}
        />
      ))}
    </div>
  )
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({
  icon: Icon, label, value, delta, deltaLabel, valueClass = "",
}: {
  icon: React.ElementType
  label: string
  value: string
  delta?: number | null
  deltaLabel?: string
  valueClass?: string
}) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-purple-400" />
          <span className="text-xs text-white/50">{label}</span>
        </div>
        <div className={`text-2xl font-bold ${valueClass || "text-white"}`}>{value}</div>
        {delta != null && (
          <div className={`flex items-center gap-1 mt-1 text-xs ${delta > 0 ? "text-green-400" : delta < 0 ? "text-red-400" : "text-white/40"}`}>
            {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            <span>{delta > 0 ? "+" : ""}{delta} {deltaLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({
  issue, rank, storeUrl, onStatusChange,
}: {
  issue: PatternIssue
  rank: number
  storeUrl: string
  onStatusChange: (id: string, status: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)

  const updateStatus = async (status: string) => {
    setLoading(status)
    try {
      await api.post("/tools/action-status", {
        storeUrl, issueId: issue.id, issueTitle: issue.title,
        status, monthlyLossSaved: status === "done" ? issue.monthlyLoss : 0,
      })
      onStatusChange(issue.id, status)
    } catch { /* non-fatal */ }
    setLoading(null)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
    >
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 text-sm font-bold shrink-0 mt-0.5">
            {rank}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-semibold text-white text-sm">{issue.title}</span>
              <Badge className={`text-[10px] border ${SEVERITY_COLOR[issue.severity]}`}>
                {SEVERITY_AR[issue.severity]}
              </Badge>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{issue.description}</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 mr-10 flex-wrap">
          <div className="flex items-center gap-1 text-red-400 text-xs font-medium">
            <DollarSign className="w-3 h-3" />
            <span>+{formatSAR(issue.monthlyLoss)}/شهر</span>
          </div>
          <div className="flex items-center gap-1.5 text-white/40 text-xs">
            <Clock className="w-3 h-3" />
            <span>{issue.fixTimeHours < 1 ? "أقل من ساعة" : `${issue.fixTimeHours} ساعة`}</span>
          </div>
          <DifficultyBar level={issue.fixDifficulty} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mt-3 mr-10 flex-wrap">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            خطوات التنفيذ
          </button>
          <button
            onClick={() => updateStatus("done")}
            disabled={!!loading}
            className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-3 h-3" />
            {loading === "done" ? "..." : "طبّقتها"}
          </button>
          <button
            onClick={() => updateStatus("dismissed")}
            disabled={!!loading}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-3 h-3" />
            تخطّى
          </button>
        </div>
      </div>

      {/* Steps panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <ol className="space-y-1.5" dir="rtl">
                {issue.fixSteps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-white/60">
                    <span className="w-4 h-4 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── V5Dashboard ──────────────────────────────────────────────────────────────
export default function V5Dashboard({ result, storeUrl, onShowFullReport }: V5DashboardProps) {
  const {
    overallScore, totalMonthlyLoss, estimatedVisitors,
    patternIssues = [], industryTips = [], snapshotComparison,
  } = result

  const [actionStatuses, setActionStatuses] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {}
    for (const issue of patternIssues) {
      if (issue.actionStatus) map[issue.id] = issue.actionStatus
    }
    return map
  })

  const visibleIssues = patternIssues
    .filter(i => actionStatuses[i.id] !== "done" && actionStatuses[i.id] !== "dismissed")
    .slice(0, 3)

  const handleStatusChange = (id: string, status: string) => {
    setActionStatuses(prev => ({ ...prev, [id]: status }))
  }

  const scoreDelta = snapshotComparison?.scoreDelta ?? null
  const lossDelta  = snapshotComparison ? -(snapshotComparison.lossDelta) : null

  return (
    <div className="space-y-6" dir="rtl">
      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={Star}
          label="تقييم المتجر"
          value={`${overallScore}/100`}
          delta={scoreDelta}
          deltaLabel={snapshotComparison ? `(${snapshotComparison.daysBetween} يوم)` : ""}
          valueClass={overallScore >= 75 ? "text-green-400" : overallScore >= 55 ? "text-yellow-400" : "text-red-400"}
        />
        <MetricCard
          icon={DollarSign}
          label="خسارة شهرية مقدّرة"
          value={totalMonthlyLoss ? formatSAR(totalMonthlyLoss) : "—"}
          delta={lossDelta}
          deltaLabel="ريال"
          valueClass="text-red-400"
        />
        <MetricCard
          icon={Users}
          label="زوار شهرياً (تقدير)"
          value={estimatedVisitors ? estimatedVisitors.toLocaleString("ar-SA") : "—"}
        />
      </div>

      {/* Top 3 Actions */}
      {visibleIssues.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-semibold text-white">أهم 3 إجراءات مرتبة بالعائد</h3>
          </div>
          <div className="space-y-3">
            {visibleIssues.map((issue, idx) => (
              <ActionCard
                key={issue.id}
                issue={issue}
                rank={idx + 1}
                storeUrl={storeUrl}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        </div>
      )}

      {visibleIssues.length === 0 && (
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-sm text-green-300">أحسنت! طبّقت كل التوصيات الرئيسية. نفّذ تحليلاً جديداً لرؤية تحسينات إضافية.</p>
          </CardContent>
        </Card>
      )}

      {/* Industry Tips */}
      {industryTips.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">نصائح لصناعتك</h3>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 space-y-2">
            {industryTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/65">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                {tip}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full report toggle */}
      <div className="text-center pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onShowFullReport}
          className="text-white/40 hover:text-white/70 text-xs gap-1"
        >
          <ChevronDown className="w-3 h-3" />
          عرض التقرير الكامل (17 تبويب)
        </Button>
      </div>
    </div>
  )
}
