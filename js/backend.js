// ═══════════════════════════════════════════════════════════════
// إعداد عنوان خادم الباك إند (Backend URL) — ملف مشترك
// يعمل على Railway / Render / Fly / VPS وأي استضافة بنفس النطاق،
// وعلى GitHub Pages / Vercel يمكن تمرير العنوان عبر:
//   ?backend=https://your-app.up.railway.app
// أو حفظه من داخل لوحة التحكم (يُخزَّن في localStorage).
// ═══════════════════════════════════════════════════════════════
(function () {
  const STORAGE_KEY = 'tiktok_roulette_backend_url';
  const STATIC_HOSTS = /(^|\.)(github\.io|githubusercontent\.com|vercel\.app|netlify\.app|pages\.dev|surge\.sh|web\.app)$/i;

  function normalize(url) {
    if (!url) return '';
    let value = String(url).trim();
    if (!value) return '';
    if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
    return value.replace(/\/+$/, '');
  }

  function readStored() {
    try {
      return normalize(localStorage.getItem(STORAGE_KEY) || '');
    } catch (e) {
      return '';
    }
  }

  function resolveBackendUrl() {
    // 1) أولوية للرابط الممرَّر في عنوان الصفحة (ويُحفظ تلقائياً)
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.has('backend') || params.has('server') || params.has('api')) {
        const fromQuery = normalize(params.get('backend') || params.get('server') || params.get('api') || '');
        try { localStorage.setItem(STORAGE_KEY, fromQuery); } catch (e) {}
        return fromQuery;
      }
    } catch (e) {}

    // 2) الرابط المحفوظ من واجهة الإعدادات
    const stored = readStored();
    if (stored) return stored;

    // 3) قيمة مضبوطة يدوياً في الصفحة
    const explicit = normalize(window.__RAILWAY_URL__ || '');
    if (explicit) return explicit;

    const host = window.location.hostname;

    // 4) تشغيل محلي
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '') {
      return `${window.location.protocol}//${host || 'localhost'}:3001`;
    }

    // 5) استضافة ثابتة (GitHub Pages / Vercel) بدون خادم مرفق
    if (STATIC_HOSTS.test(host)) return '';

    // 6) نشر بنفس النطاق (Railway/Render/Fly/VPS)
    return window.location.origin;
  }

  window.__BACKEND_STORAGE_KEY__ = STORAGE_KEY;
  window.BACKEND_URL = resolveBackendUrl();

  window.getBackendUrl = function () {
    return window.BACKEND_URL || '';
  };

  window.setBackendUrl = function (url) {
    const value = normalize(url);
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    window.BACKEND_URL = value;
    window.location.reload();
  };

  window.normalizeBackendUrl = normalize;
})();
