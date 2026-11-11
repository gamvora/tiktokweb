// ============================================================
// شاشة اختيار نمط اللعبة عند الدخول: 2D أو 3D
// • الاختيار يُحفظ في localStorage (tt_roulette_mode)
// • النسخة 2D تكمل عملها بشكل طبيعي خلف الشاشة
// • اختيار 3D ينقل إلى game3d.html مع نفس المعاملات
// ============================================================
(function () {
  'use strict';

  const MODE_KEY = 'tt_roulette_mode';

  function go3D() {
    // نحن بالفعل في صفحة 3D — لا تعيد التوجيه (يمنع حلقة إعادة التحميل)
    if (location.pathname.indexOf('game3d') !== -1) return;
    const params = new URLSearchParams(location.search);
    const q = params.toString();
    // لا نمرر user=demo — يوزر التجربة لا يفيد الصفحة الأخرى
    params.delete('user');
    const qs = params.toString();
    location.href = '/game3d' + (qs ? '?' + qs : '');
  }

  function choose(mode, remember) {
    if (remember !== false) {
      try { localStorage.setItem(MODE_KEY, mode); } catch (e) {}
    }
    if (mode === '3d') go3D();
    else closeChooser();
  }

  function closeChooser() {
    const m = document.getElementById('modeChooserModal');
    if (m) m.classList.remove('active');
  }

  window.__go3D = go3D;
  window.__chooseMode = choose;
  window.__openModeChooser = function () {
    const m = document.getElementById('modeChooserModal');
    if (m) m.classList.add('active');
  };

  document.addEventListener('DOMContentLoaded', () => {
    let stored = null;
    try { stored = localStorage.getItem(MODE_KEY); } catch (e) {}

    // من لديه نمط محفوظ 3d وفتح الصفحة 2D بالخطأ → ننقله للـ 3D
    if (stored === '3d') { go3D(); return; }

    // أول مرة (لا يوجد نمط محفوظ) → اعرض شاشة الاختيار
    if (stored !== '2d') {
      const modal = document.getElementById('modeChooserModal');
      if (modal) {
        modal.classList.add('active');
        const b2d = document.getElementById('btnChoose2D');
        const b3d = document.getElementById('btnChoose3D');
        if (b2d) b2d.addEventListener('click', () => choose('2d'));
        if (b3d) b3d.addEventListener('click', () => choose('3d'));
        const later = document.getElementById('btnChooseLater');
        if (later) later.addEventListener('click', () => closeChooser());
      }
    }
  });
})();
