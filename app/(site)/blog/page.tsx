"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  excerpt?: string;
  category?: string;
  author?: string;
  published_at?: string;
  read_time?: number;
  cover_color?: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params: Record<string, string> = {};
    if (search) params.search = search;
    api.getBlogPosts(params).then((d) => { setPosts(d as BlogPost[]); setLoading(false); }).catch(() => setLoading(false));
  }, [search]);

  return (
    <>
      <section style={{ padding: "5rem 2rem 3rem", background: "var(--bg-alt)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <span style={{ display: "inline-flex", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: "var(--radius-full)", padding: "0.3rem 0.85rem", letterSpacing: "0.08em", marginBottom: "1.5rem" }}>
            المدونة
          </span>
          <h1 style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            مقالات تفيد <em style={{ fontStyle: "normal", color: "var(--accent)" }}>التاجر</em>
          </h1>
          <p style={{ color: "var(--ink-dim)", fontSize: "1.05rem", maxWidth: 600, lineHeight: 1.7 }}>نصائح، استراتيجيات، وتحليلات من عالم التجارة الإلكترونية السعودية.</p>
        </div>
      </section>

      <section style={{ padding: "2rem", background: "var(--bg-card)", borderBottom: "1px solid var(--line)", fontFamily: "var(--font-arabic)" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto" }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث في المقالات..." className="field-input" style={{ maxWidth: 400 }} />
        </div>
      </section>

      <section style={{ padding: "2.5rem 2rem 6rem", maxWidth: 1400, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }} className="blog-grid-resp">
            {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" style={{ height: 280, borderRadius: "var(--radius-lg)" }} />)}
          </div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "6rem 2rem", color: "var(--ink-dim)" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📝</div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>لا توجد مقالات بعد</h3>
            <p>تابعنا لمتابعة أحدث المقالات</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1.5rem" }} className="blog-grid-resp">
            {posts.map((post) => (
              <Link key={post.id} href={`/blog/${post.slug}`} style={{ background: "var(--bg-card)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden", textDecoration: "none", color: "inherit", display: "block", transition: "all var(--transition)" }} className="blog-card">
                <div style={{ height: 150, background: post.cover_color || "linear-gradient(135deg, var(--accent-2), var(--accent))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div style={{ padding: "1.5rem" }}>
                  {post.category && (
                    <span style={{ display: "inline-block", fontSize: "0.7rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: 99, padding: "0.2rem 0.6rem", marginBottom: "0.75rem" }}>{post.category}</span>
                  )}
                  <h3 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "0.5rem", lineHeight: 1.4 }}>{post.title}</h3>
                  {post.excerpt && <p style={{ fontSize: "0.83rem", color: "var(--ink-dim)", lineHeight: 1.65, marginBottom: "1rem" }}>{post.excerpt.slice(0, 100)}...</p>}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", fontSize: "0.75rem", color: "var(--ink-mid)" }}>
                    {post.author && <span>{post.author}</span>}
                    {post.read_time && <span>· {post.read_time} دقائق قراءة</span>}
                    {post.published_at && <span>· {new Date(post.published_at).toLocaleDateString("ar-SA")}</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <style>{`
        @media (max-width:900px) { .blog-grid-resp { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width:580px) { .blog-grid-resp { grid-template-columns: 1fr !important; } }
        .blog-card:hover { border-color: var(--line-accent) !important; transform: translateY(-4px) !important; box-shadow: 0 16px 48px rgba(168,85,247,0.12) !important; }
      `}</style>
    </>
  );
}
