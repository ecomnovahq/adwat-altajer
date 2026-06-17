"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  Sparkles,
  LogOut,
  Settings,
  Home,
} from "lucide-react";

const TOOLS = [
  {
    href: "/dashboard/tools/profit-calculator",
    label: "حاسبة الربح",
    icon: Calculator,
    color: "text-green-400",
    bg: "bg-green-900/20",
    badge: "مجاني",
  },
  {
    href: "/dashboard/tools/store-analyzer",
    label: "محلل المتجر",
    icon: Store,
    color: "text-blue-400",
    bg: "bg-blue-900/20",
    badge: "AI",
  },
  {
    href: "/dashboard/tools/seasons-calendar",
    label: "تقويم المواسم",
    icon: CalendarDays,
    color: "text-orange-400",
    bg: "bg-orange-900/20",
    badge: "AI",
  },
  {
    href: "/dashboard/tools/product-description",
    label: "أوصاف المنتجات",
    icon: FileText,
    color: "text-violet-400",
    bg: "bg-violet-900/20",
    badge: "AI",
  },
  {
    href: "/dashboard/tools/competitor-analyzer",
    label: "محلل المنافسين",
    icon: BarChart3,
    color: "text-red-400",
    bg: "bg-red-900/20",
    badge: "AI",
  },
  {
    href: "/dashboard/tools/whatsapp-templates",
    label: "رسائل واتساب",
    icon: MessageCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-900/20",
    badge: "سريع",
  },
  {
    href: "/dashboard/tools/store-policies",
    label: "سياسات المتجر",
    icon: Shield,
    color: "text-amber-400",
    bg: "bg-amber-900/20",
    badge: "AI",
  },
  {
    href: "/dashboard/tools/social-plan",
    label: "محتوى سوشيال",
    icon: Share2,
    color: "text-pink-400",
    bg: "bg-pink-900/20",
    badge: "AI",
  },
  {
    href: "/dashboard/tools/product-images",
    label: "صور المنتجات",
    icon: Image,
    color: "text-cyan-400",
    bg: "bg-cyan-900/20",
    badge: "AI",
  },
  {
    href: "/dashboard/tools/launch-campaign",
    label: "حملة الإطلاق",
    icon: Rocket,
    color: "text-purple-400",
    bg: "bg-purple-900/20",
    badge: "Pro",
  },
];

function Sidebar({
  collapsed,
  onToggle,
  mobile,
  onClose,
}: {
  collapsed: boolean;
  onToggle: () => void;
  mobile?: boolean;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-full bg-gray-900 border-l border-gray-800 transition-all duration-300 ${
        mobile ? "w-72" : collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-gray-800">
        {(!collapsed || mobile) && (
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-violet-600 p-2">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-black text-white leading-none">أدوات التاجر</div>
              <div className="text-xs text-gray-500 mt-0.5">منصة الذكاء الاصطناعي</div>
            </div>
          </div>
        )}
        {collapsed && !mobile && (
          <div className="mx-auto rounded-xl bg-violet-600 p-2">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
        )}
        {mobile ? (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition"
          >
            {collapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      {/* Dashboard link */}
      <div className="px-3 pt-3">
        <Link
          href="/dashboard"
          onClick={onClose}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all ${
            pathname === "/dashboard" || pathname === null
              ? "bg-violet-600/20 text-violet-300"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          } ${collapsed && !mobile ? "justify-center" : ""}`}
        >
          <Home className="h-4 w-4 flex-shrink-0" />
          {(!collapsed || mobile) && <span>الرئيسية</span>}
        </Link>
      </div>

      {/* Tools label */}
      {(!collapsed || mobile) && (
        <div className="px-6 pt-4 pb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">
            الأدوات
          </span>
        </div>
      )}

      {/* Tool links */}
      <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = pathname === tool.href || (pathname?.startsWith(tool.href) ?? false);
          return (
            <Link
              key={tool.href}
              href={tool.href}
              onClick={onClose}
              title={collapsed && !mobile ? tool.label : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all group ${
                active
                  ? `${tool.bg} ${tool.color} font-medium`
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              } ${collapsed && !mobile ? "justify-center" : ""}`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {(!collapsed || mobile) && (
                <span className="flex-1 truncate">{tool.label}</span>
              )}
              {(!collapsed || mobile) && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    tool.badge === "مجاني"
                      ? "bg-green-900/40 text-green-400"
                      : tool.badge === "سريع"
                      ? "bg-cyan-900/40 text-cyan-400"
                      : tool.badge === "Pro"
                      ? "bg-purple-900/40 text-purple-400"
                      : "bg-violet-900/40 text-violet-400"
                  }`}
                >
                  {tool.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-800 p-3 space-y-1">
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition ${
            collapsed && !mobile ? "justify-center" : ""
          }`}
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
          {(!collapsed || mobile) && <span>الإعدادات</span>}
        </Link>
      </div>
    </aside>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-shrink-0">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-50 lg:hidden"
            >
              <Sidebar
                collapsed={false}
                onToggle={() => {}}
                mobile
                onClose={() => setMobileOpen(false)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="flex lg:hidden items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-violet-600 p-1.5">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-white">أدوات التاجر</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
