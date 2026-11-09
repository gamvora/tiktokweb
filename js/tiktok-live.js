// ═══════════════════════════════════════════════════════════════
// عميل TikTok Live للمتصفح
// يتصل بدالة Vercel (/api/live) عبر Server-Sent Events، ويعيد
// الاتصال تلقائياً عند انتهاء مدة الدالة (5 دقائق على Hobby).
// ═══════════════════════════════════════════════════════════════
(function (root) {
  'use strict';

  class TikTokLiveClient {
    constructor(options = {}) {
      this.baseUrl = options.baseUrl || '';
      this.handlers = Object.create(null);
      this.es = null;
      this.username = '';
      this.shouldConnect = false;
      this.status = 'disconnected';
      this.retryDelay = 1000;
      this.reconnectTimer = null;
    }

    on(event, handler) {
      if (typeof handler !== 'function') return this;
      (this.handlers[event] || (this.handlers[event] = [])).push(handler);
      return this;
    }

    off(event, handler) {
      const list = this.handlers[event];
      if (!list) return this;
      this.handlers[event] = list.filter((fn) => fn !== handler);
      return this;
    }

    emit(event, payload) {
      const list = this.handlers[event];
      if (!list) return;
      for (const fn of list.slice()) {
        try {
          fn(payload);
        } catch (err) {
          console.error('[TikTokLive] handler error:', err);
        }
      }
    }

    setStatus(status, extra = {}) {
      this.status = status;
      this.emit('status', {
        status,
        username: this.username,
        ...extra
      });
    }

    async check(username) {
      const clean = String(username || '').trim().replace(/^@+/, '');
      if (!clean) return { live: false, error: 'اكتب اسم مستخدم تيك توك أولاً.' };

      const response = await fetch(
        `${this.baseUrl}/api/check?username=${encodeURIComponent(clean)}`,
        { headers: { Accept: 'application/json' }, cache: 'no-store' }
      );

      if (!response.ok) {
        throw new Error(`تعذر الوصول إلى خدمة التحقق (${response.status})`);
      }

      return response.json();
    }

    connect(username) {
      const clean = String(username || '').trim().replace(/^@+/, '');
      if (!clean) return;

      this.stopStream();
      this.username = clean;
      this.shouldConnect = true;
      this.retryDelay = 1000;
      this.openStream();
    }

    openStream() {
      if (!this.shouldConnect) return;

      this.setStatus('connecting');

      const url = `${this.baseUrl}/api/live?username=${encodeURIComponent(this.username)}`;
      let source;
      try {
        source = new EventSource(url);
      } catch (err) {
        this.scheduleReconnect();
        return;
      }

      this.es = source;

      source.addEventListener('status', (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (e) {
          return;
        }

        if (data.status === 'connected') {
          this.retryDelay = 1000;
          this.setStatus('connected', {
            roomId: data.roomId,
            roomInfo: { viewerCount: data.viewerCount || 0, title: data.title || '' },
            viewerCount: data.viewerCount || 0
          });
        } else if (data.status === 'error' || data.status === 'ended') {
          this.shouldConnect = false;
          this.stopStream();
          this.setStatus(data.status, {
            error: data.error || (data.status === 'ended' ? 'انتهى البث المباشر.' : 'تعذر الاتصال بالبث.'),
            lastError: data.error || (data.status === 'ended' ? 'انتهى البث المباشر.' : 'تعذر الاتصال بالبث.')
          });
        } else {
          this.setStatus(data.status, data);
        }
      });

      source.addEventListener('chat', (event) => {
        try {
          this.emit('chat', JSON.parse(event.data));
        } catch (e) {}
      });

      source.addEventListener('gift', (event) => {
        try {
          this.emit('gift', JSON.parse(event.data));
        } catch (e) {}
      });

      source.addEventListener('room_info', (event) => {
        try {
          this.emit('room_info', JSON.parse(event.data));
        } catch (e) {}
      });

      source.onerror = () => {
        this.closeStream();
        if (!this.shouldConnect) return;
        // انتهت مدة دالة Vercel أو انقطع الاتصال — نعيد المحاولة
        this.setStatus('reconnecting');
        this.scheduleReconnect();
      };
    }

    scheduleReconnect() {
      clearTimeout(this.reconnectTimer);
      const delay = this.retryDelay;
      this.retryDelay = Math.min(this.retryDelay * 2, 15000);
      this.reconnectTimer = setTimeout(() => this.openStream(), delay);
    }

    closeStream() {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
      if (this.es) {
        try {
          this.es.close();
        } catch (e) {}
        this.es = null;
      }
    }

    stopStream() {
      this.shouldConnect = false;
      this.closeStream();
    }

    disconnect() {
      this.stopStream();
      this.setStatus('disconnected');
    }
  }

  root.TikTokLiveClient = TikTokLiveClient;
})(typeof window !== 'undefined' ? window : globalThis);
