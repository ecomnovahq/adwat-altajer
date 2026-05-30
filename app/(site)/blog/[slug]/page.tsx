"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";

interface BlogPost {
  id: number;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  category?: string;
  author?: string;
  published_at?: string;
  read_time?: number;
}

export default function BlogPostPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api.getBlogPost(slug)
      .then((d) => { setPost(d as BlogPost); setLoading(false); })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  if (loading) return (
    <div style={{ padding: "6rem 2rem", maxWidth: 800, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
      <div className="skeleton" style={{ height: 40, width: "60%", borderRadius: 8, marginBottom: "1rem" }} />
      <div className="skeleton" style={{ height: 20, width: "30%", borderRadius: 8, marginBottom: "2rem" }} />
      {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 16, borderRadius: 8, marginBottom: "0.75rem" }} />)}
    </div>
  );

  if (notFound || !post) return (
    <div style={{ padding: "6rem 2rem", textAlign: "center", fontFamily: "var(--font-arabic)" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📄</div>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>المقال غير موجود</h2>
      <p style={{ color: "var(--ink-dim)", marginBottom: "2rem" }}>قد يكون المقال محذوفاً أو الرابط خاطئاً</p>
      <Link href="/blog" className="btn-primary">العودة للمدونة</Link>
    </div>
  );

  return (
    <article style={{ padding: "4rem 2rem 6rem", maxWidth: 800, margin: "0 auto", fontFamily: "var(--font-arabic)" }}>
      <Link href="/blog" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--ink-dim)", textDecoration: "none", fontSize: "0.88rem", marginBottom: "2rem" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l7-7-7-7"/></svg>
        العودة للمدونة
      </Link>

      {post.category && (
        <span style={{ display: "inline-block", fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", background: "var(--accent-soft)", border: "1px solid var(--line-accent)", borderRadius: 99, padding: "0.2rem 0.6rem", marginBottom: "1.25rem" }}>{post.category}</span>
      )}

      <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.8rem)", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "1rem" }}>{post.title}</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", fontSize: "0.82rem", color: "var(--ink-mid)", marginBottom: "3rem", paddingBottom: "2rem", borderBottom: "1px solid var(--line)" }}>
        {post.author && <span>{post.author}</span>}
        {post.read_time && <span>· {post.read_time} دقائق قراءة</span>}
        {post.published_at && <span>· {new Date(post.published_at).toLocaleDateString("ar-SA")}</span>}
      </div>

      {post.content ? (
        <div style={{ fontSize: "1.05rem", lineHeight: 1.9, color: "var(--ink)" }} dangerouslySetInnerHTML={{ __html: post.content }} />
      ) : post.excerpt ? (
        <p style={{ fontSize: "1.05rem", lineHeight: 1.9, color: "var(--ink)" }}>{post.excerpt}</p>
      ) : (
        <p style={{ color: "var(--ink-dim)" }}>المحتوى غير متاح.</p>
      )}
    </article>
  );
}
