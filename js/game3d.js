// ============================================================
// محوّل النسخة ثلاثية الأبعاد — ThreeDWheel
// يحقق نفس واجهة RouletteWheel بالضبط (setPlayers / spinToPlayer /
// updateConfig / setCenterImage) لكنه يعرض استاد Three.js حقيقي.
// يُحقن قبل overlay.js عبر window.__RouletteWheelClass، لذا كل
// منطق اللعبة والاتصال والإعدادات يبقى هو نفسه 100%.
// ============================================================
(function () {
  'use strict';

  window.__IS_3D = true;

  // حفظ نمط اللعب (للاختيار عند الدخول)
  try { localStorage.setItem('tt_roulette_mode', '3d'); } catch (e) {}

  class ThreeDWheel {
    constructor(canvasId, options = {}) {
      this.canvasId = canvasId;
      this.options = options || {};
      this.players = [];
      this.isSpinning = false;
      this.ready = false;
      this.arena = null;
      this._queue = [];
      this._spinDuration = (this.options && this.options.spinDuration) || 6500;

      const mount = document.getElementById(canvasId);
      if (!mount) {
        console.error('[3D] لم أجد حاوية الاستاد #' + canvasId);
        return;
      }
      this.mount = mount;
      this._startLoading();
      window.Arena3DLoader.create(mount).then((arena) => {
        this.arena = arena;
        this.ready = true;
        this._stopLoading();
        window.__arena3d = arena;
        arena.setPlayers(this.players);
        // تنفيذ أي دوران مؤجل
        if (this._pendingSpin) {
          const { player, onComplete } = this._pendingSpin;
          this._pendingSpin = null;
          this.spinToPlayer(player, onComplete);
        }
        this._queue.forEach(fn => fn());
        this._queue = [];
      }).catch((e) => {
        console.error('[3D] فشل تحميل الاستاد:', e);
        this._stopLoading();
      });
    }

    _startLoading() {
      const el = document.createElement('div');
      el.id = 'g3Loading';
      el.innerHTML = `
        <div class="g3-loading-inner">
          <div class="g3-loading-wheel">🎡</div>
          <div class="g3-loading-text">🏟️ جاري تجهيز الاستاد ثلاثي الأبعاد...</div>
          <div class="g3-loading-sub">الجمهور في مقاعده وانتظروا المفاجآت!</div>
        </div>`;
      this.mount.appendChild(el);
      this._loadingEl = el;
    }

    _stopLoading() {
      if (this._loadingEl) {
        this._loadingEl.style.opacity = '0';
        setTimeout(() => { if (this._loadingEl) this._loadingEl.remove(); this._loadingEl = null; }, 500);
      }
    }

    // ── واجهة RouletteWheel ─────────────────────────────────
    setPlayers(players) {
      this.players = (players || []).filter(p => p.status === 'active' || p.status === 'immune');
      if (this.arena) this.arena.setPlayers(this.players);
    }

    updateConfig(config) {
      if (!config) return;
      if (config.spinDuration) {
        this._spinDuration = config.spinDuration;
        if (this.arena) this.arena.spinDurationHint = config.spinDuration;
      }
    }

    setCenterImage(url) { /* المركز في 3D مبني داخل المشهد */ }

    spinToPlayer(chosenPlayer, onComplete) {
      if (!this.arena || !this.ready) {
        // الاستاد لم يجهز بعد — نؤجل بصرياً ونضمن استمرار اللعبة
        this._pendingSpin = { player: chosenPlayer, onComplete };
        this.isSpinning = true;
        setTimeout(() => {
          if (this._pendingSpin) { // ما زال مؤجلاً (فشل تحميل مثلاً)
            this._pendingSpin = null;
            this.isSpinning = false;
            if (typeof onComplete === 'function') onComplete(chosenPlayer);
          }
        }, 6500);
        return;
      }
      this.isSpinning = true;
      this.arena.spinToPlayer(chosenPlayer, (player) => {
        this.isSpinning = false;
        // سهرات صاحب القرار: تاج + ضوء ذهبي + قفزة
        try { this.arena.focusChooser(player); } catch (e) {}
        if (typeof onComplete === 'function') onComplete(player);
      }, { duration: this._spinDuration });
    }
  }

  window.__RouletteWheelClass = ThreeDWheel;

  // ── ربط سهرات 3D بأحداث اللعبة (يستدعيه overlay.js) ──────
  window.__fx3d = function (event, payload) {
    const arena = window.__arena3d;
    if (!arena) return;
    try {
      switch (event) {
        case 'gift':
          arena.giftBurst(payload && payload.playerNumber ? payload : null);
          break;
        case 'target_selected':
          arena.clearMarks();
          arena.focusChooser(payload && payload.selector);
          arena.markTarget(payload && payload.target);
          break;
        case 'player_saved':
          arena.defenseBlock(payload && payload.player);
          break;
        case 'player_eliminated':
          arena.kickPlayer(payload && payload.player, payload && payload.by);
          break;
        case 'player_shield_activated':
          arena.shieldDome(payload && payload.player, true);
          break;
        case 'player_shield_consumed':
          arena.breakShield(payload && payload.player);
          break;
        case 'player_rejoined':
          arena.rejoinPlayer(payload && payload.player);
          break;
        case 'player_helped':
          arena.rejoinPlayer(payload && payload.target);
          break;
        case 'final_round_started':
          arena.finalShow();
          break;
        case 'final_round_score_updated':
          arena.giftBurst(payload && payload.player);
          break;
        case 'winner_declared':
          arena.clearMarks();
          arena.winShow(payload && payload.winner);
          break;
        case 'game_reset':
          arena.reset();
          break;
        case 'round_advanced':
          arena.clearMarks();
          arena.focusWide();
          break;
      }
    } catch (e) { console.error('[3D] fx3d:', event, e); }
  };

  // ── زر العودة إلى النسخة 2D ──────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('btnGo2D');
    if (btn) {
      btn.addEventListener('click', () => {
        try { localStorage.setItem('tt_roulette_mode', '2d'); } catch (e) {}
        const params = new URLSearchParams(location.search);
        location.href = '/overlay' + (params.toString() ? '?' + params.toString() : '');
      });
    }
  });
})();
