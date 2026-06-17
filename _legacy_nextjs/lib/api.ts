// ─── Auth Helpers ─────────────────────────────────────────────────────────────
export const auth = {
  getToken: (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("tajer-token");
  },
  getUser: (): Record<string, unknown> | null => {
    if (typeof window === "undefined") return null;
    try {
      const s = localStorage.getItem("tajer-user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  },
  setSession: (token: string, user: Record<string, unknown>) => {
    localStorage.setItem("tajer-token", token);
    localStorage.setItem("tajer-user", JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem("tajer-token");
    localStorage.removeItem("tajer-user");
  },
  isLoggedIn: (): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("tajer-token");
  },
  isAdmin: (): boolean => {
    const u = auth.getUser();
    return !!(u && u.is_admin);
  },
};

// ─── Core Request ─────────────────────────────────────────────────────────────
async function apiRequest<T = unknown>(
  method: string,
  endpoint: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = auth.getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`/api${endpoint}`, {
    method,
    headers,
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `خطأ ${res.status}`);
    (err as Error & Record<string, unknown>).code = data.code;
    (err as Error & Record<string, unknown>).toolName = data.toolName;
    (err as Error & Record<string, unknown>).displayName = data.displayName;
    (err as Error & Record<string, unknown>).limit = data.limit;
    (err as Error & Record<string, unknown>).used = data.used;
    throw err;
  }
  return data as T;
}

// ─── API Object ───────────────────────────────────────────────────────────────
export const api = {
  get: <T = unknown>(ep: string) => apiRequest<T>("GET", ep),
  post: <T = unknown>(ep: string, body?: unknown) =>
    apiRequest<T>("POST", ep, body),
  put: <T = unknown>(ep: string, body?: unknown) =>
    apiRequest<T>("PUT", ep, body),
  delete: <T = unknown>(ep: string) => apiRequest<T>("DELETE", ep),

  // ─── Auth ──────────────────────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: Record<string, unknown> }>(
      "POST",
      "/auth/login",
      { email, password }
    );
    auth.setSession(data.token, data.user);
    return data;
  },
  register: async (name: string, email: string, password: string) => {
    const data = await apiRequest<{ token: string; user: Record<string, unknown> }>(
      "POST",
      "/auth/register",
      { name, email, password }
    );
    auth.setSession(data.token, data.user);
    return data;
  },
  logout: () => {
    auth.clear();
    window.location.href = "/";
  },

  // ─── Tools ─────────────────────────────────────────────────────────────────
  analyze: (storeUrl: string, category: string) =>
    apiRequest("POST", "/tools/analyze", { storeUrl, category }),
  generate: (data: unknown) => apiRequest("POST", "/tools/generate", data),
  generateImage: (data: unknown) =>
    apiRequest("POST", "/tools/generate-image", data),
  getToolSettings: () => apiRequest("GET", "/tools/settings"),
  requestToolAccess: (toolName: string, reason: string) =>
    apiRequest("POST", "/tools/request-access", { toolName, reason }),
  chat: (message: string, history: unknown[]) =>
    apiRequest("POST", "/tools/chat", { message, history }),
  whatsapp: (data: unknown) => apiRequest("POST", "/tools/whatsapp", data),
  competitor: (data: unknown) =>
    apiRequest("POST", "/tools/competitor", data),
  socialPlan: (data: unknown) =>
    apiRequest("POST", "/tools/social-plan", data),
  storePolicies: (data: unknown) =>
    apiRequest("POST", "/tools/store-policies", data),
  launchCampaign: (data: unknown) =>
    apiRequest("POST", "/tools/launch-campaign", data),

  // ─── Account ───────────────────────────────────────────────────────────────
  myBookings: () => apiRequest("GET", "/bookings/my"),
  myRequests: () => apiRequest("GET", "/tools/my-requests"),
  toolHistory: () => apiRequest("GET", "/tools/history"),

  // ─── Public ────────────────────────────────────────────────────────────────
  getCoupons: (params: Record<string, string> = {}) =>
    apiRequest("GET", `/coupons?${new URLSearchParams(params)}`),
  getWorks: (category?: string) =>
    apiRequest("GET", `/works${category ? `?category=${category}` : ""}`),
  getReviews: () => apiRequest("GET", "/reviews"),
  submitBooking: (data: unknown) => apiRequest("POST", "/bookings", data),

  // ─── Blog ──────────────────────────────────────────────────────────────────
  getBlogPosts: (params: Record<string, string> = {}) =>
    apiRequest("GET", `/blog?${new URLSearchParams(params)}`),
  getBlogPost: (slug: string) => apiRequest("GET", `/blog/post/${slug}`),

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: {
    dashboard: () => apiRequest("GET", "/admin/dashboard"),
    users: () => apiRequest("GET", "/admin/users"),
    toggleAdmin: (id: number) =>
      apiRequest("PUT", `/admin/users/${id}/toggle-admin`),
    deleteUser: (id: number) => apiRequest("DELETE", `/admin/users/${id}`),
    updateUserTools: (id: number, tools_access: unknown) =>
      apiRequest("PUT", `/admin/users/${id}/tools-access`, { tools_access }),
    logs: (tool?: string) =>
      apiRequest("GET", `/admin/logs${tool ? `?tool=${tool}` : ""}`),
    toolSettings: () => apiRequest("GET", "/admin/tool-settings"),
    updateToolSettings: (name: string, data: unknown) =>
      apiRequest("PUT", `/admin/tool-settings/${name}`, data),
    toolRequests: () => apiRequest("GET", "/admin/tool-requests"),
    updateToolRequest: (id: number, data: unknown) =>
      apiRequest("PUT", `/admin/tool-requests/${id}`, data),
    allCoupons: () => apiRequest("GET", "/coupons/admin/all"),
    createCoupon: (data: unknown) => apiRequest("POST", "/coupons", data),
    updateCoupon: (id: number, data: unknown) =>
      apiRequest("PUT", `/coupons/${id}`, data),
    deleteCoupon: (id: number) => apiRequest("DELETE", `/coupons/${id}`),
    allWorks: () => apiRequest("GET", "/works/admin/all"),
    createWork: (data: unknown) => apiRequest("POST", "/works", data),
    updateWork: (id: number, data: unknown) =>
      apiRequest("PUT", `/works/${id}`, data),
    deleteWork: (id: number) => apiRequest("DELETE", `/works/${id}`),
    allReviews: () => apiRequest("GET", "/reviews/admin/all"),
    createReview: (data: unknown) => apiRequest("POST", "/reviews", data),
    updateReview: (id: number, data: unknown) =>
      apiRequest("PUT", `/reviews/${id}`, data),
    deleteReview: (id: number) => apiRequest("DELETE", `/reviews/${id}`),
    allBookings: (status?: string) =>
      apiRequest("GET", `/bookings${status ? `?status=${status}` : ""}`),
    updateBooking: (id: number, data: unknown) =>
      apiRequest("PUT", `/bookings/${id}`, data),
    deleteBooking: (id: number) => apiRequest("DELETE", `/bookings/${id}`),
    allBlogPosts: () => apiRequest("GET", "/blog/admin/all"),
    createBlogPost: (data: unknown) => apiRequest("POST", "/blog", data),
    updateBlogPost: (id: number, data: unknown) =>
      apiRequest("PUT", `/blog/${id}`, data),
    deleteBlogPost: (id: number) => apiRequest("DELETE", `/blog/${id}`),
  },
};

export const WHATSAPP_NUMBER = "966500000000";
