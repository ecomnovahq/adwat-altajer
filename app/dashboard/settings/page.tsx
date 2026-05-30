"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, Key, Bell, Globe, Shield, Save, Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleKey = (key: string) =>
    setShowKey((prev) => ({ ...prev, [key]: !prev[key] }));

  const apiKeys = [
    { id: "gemini", label: "Gemini API Key", badge: "Google AI", color: "text-blue-400" },
    { id: "groq", label: "Groq API Key", badge: "Groq", color: "text-orange-400" },
    { id: "firecrawl", label: "Firecrawl API Key", badge: "Firecrawl", color: "text-green-400" },
    { id: "hf", label: "Hugging Face Token", badge: "HuggingFace", color: "text-yellow-400" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-6" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gray-800 p-3">
            <Settings className="h-6 w-6 text-gray-300" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">الإعدادات</h1>
            <p className="text-sm text-gray-400">إدارة مفاتيح الـ API والتفضيلات</p>
          </div>
        </div>

        {/* API Keys */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-5">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Key className="h-4 w-4 text-violet-400" />
            مفاتيح الـ API
          </h2>
          <p className="text-sm text-gray-400">
            المفاتيح محفوظة في ملف <code className="text-violet-400">.env.local</code> على الـ backend.
            لتغييرها، عدّل الملف مباشرة وأعد تشغيل الـ backend.
          </p>
          {apiKeys.map((k) => (
            <div key={k.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="text-gray-300">{k.label}</Label>
                <Badge variant="outline" className={`text-xs border-gray-700 ${k.color}`}>
                  {k.badge}
                </Badge>
              </div>
              <div className="relative">
                <Input
                  type={showKey[k.id] ? "text" : "password"}
                  placeholder="sk-..."
                  className="border-gray-700 bg-gray-800 text-white pr-10"
                  readOnly
                  value="••••••••••••••••••••••••"
                />
                <button
                  onClick={() => toggleKey(k.id)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showKey[k.id] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-amber-600/30 bg-amber-900/10 p-4 text-sm text-amber-300">
            لتغيير المفاتيح: افتح <code>backend/.env</code> وعدّل القيم ثم أعد تشغيل السيرفر.
          </div>
        </div>

        {/* Backend status */}
        <div className="rounded-2xl border border-gray-800 bg-gray-900/80 p-6 space-y-4">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-400" />
            حالة الخدمات
          </h2>
          <div className="space-y-3">
            {[
              { label: "Frontend (Next.js)", port: "3000", status: "يعمل" },
              { label: "Backend (Express)", port: "3001", status: "يعمل" },
              { label: "قاعدة البيانات (PostgreSQL)", port: "5432", status: "متصل" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-800/50 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-white">{s.label}</div>
                  <div className="text-xs text-gray-500">port {s.port}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm text-green-400">{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
