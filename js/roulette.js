// Enhanced HTML5 Canvas Roulette Wheel with Player Avatars & Customization
class RouletteWheel {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    this.options = {
      spinDuration: 6500,
      colors: [
        '#dc2626', '#2563eb', '#16a34a', '#9333ea',
        '#d97706', '#0284c7', '#e11d48', '#4f46e5'
      ],
      theme: 'casino',
      rimColor: '#f59e0b',
      hubColor: '#dc2626',
      showPlayerAvatars: true,
      showPlayerNames: true,
      ...options
    };

    this.players = [];
    this.currentRotation = 0;
    this.isSpinning = false;
    this.pointerAngle = -Math.PI / 2;
    this.lastTickIndex = -1;
    this.pointerBounce = 0;

    // Avatar image cache
    this._avatarCache = {};
    this._avatarLoadQueue = new Set();

    this.initCanvas();
    window.addEventListener('resize', () => this.initCanvas());
  }

  initCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(rect.width || 600, rect.height || 600);

    this.width = size;
    this.height = size;
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.scale(dpr, dpr);

    this.centerX = size / 2;
    this.centerY = size / 2;
    this.radius = (size / 2) - 25;

    this.draw();
  }

  updateConfig(config) {
    if (!config) return;
    if (config.colors) this.options.colors = config.colors;
    if (config.theme) this.options.theme = config.theme;
    if (config.rimColor) this.options.rimColor = config.rimColor;
    if (config.hubColor) this.options.hubColor = config.hubColor;
    if (config.spinDuration) this.options.spinDuration = config.spinDuration;
    if (config.showPlayerAvatars !== undefined) this.options.showPlayerAvatars = config.showPlayerAvatars;
    if (config.showPlayerNames !== undefined) this.options.showPlayerNames = config.showPlayerNames;
    this.draw();
  }

  setPlayers(players) {
    this.players = players.filter(p => p.status === 'active' || p.status === 'immune');
    // Pre-load avatars
    this.players.forEach(p => this._preloadAvatar(p));
    this.draw();
  }

  _preloadAvatar(player) {
    const url = player.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.playerNumber}`;
    if (this._avatarCache[url] || this._avatarLoadQueue.has(url)) return;

    this._avatarLoadQueue.add(url);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this._avatarCache[url] = img;
      this._avatarLoadQueue.delete(url);
      if (!this.isSpinning) this.draw();
    };
    img.onerror = () => {
      this._avatarLoadQueue.delete(url);
    };
    img.src = url;
  }

  _getAvatarImage(player) {
    const url = player.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.playerNumber}`;
    return this._avatarCache[url] || null;
  }

  _getThemeColors() {
    const t = this.options.theme;
    if (t === 'neon') {
      return {
        rimGradient: ['#0f0f23', '#00ff88', '#00ffcc', '#00ff88', '#0f0f23'],
        hubGradient: ['#00ffcc', '#00aa88', '#005544', '#0f0f23'],
        hubInner: ['#ff00ff', '#aa00aa', '#440044'],
        boltColors: ['#00ff88', '#ff00ff'],
        sliceDark: '#0a0a1a',
        lineColor: 'rgba(0, 255, 136, 0.6)',
        pointerGradient: ['#00ffcc', '#00ff88', '#005544'],
        textColor: '#00ffcc',
        numberColor: '#ffffff'
      };
    } else if (t === 'classic') {
      return {
        rimGradient: ['#2c1810', '#8B4513', '#D2691E', '#8B4513', '#2c1810'],
        hubGradient: ['#D2691E', '#8B4513', '#5c2a0a', '#1a0a02'],
        hubInner: ['#ffd700', '#daa520', '#8B6914'],
        boltColors: ['#ffd700', '#ffffff'],
        sliceDark: '#1a0a02',
        lineColor: 'rgba(210, 105, 30, 0.6)',
        pointerGradient: ['#ffd700', '#daa520', '#8B6914'],
        textColor: '#ffd700',
        numberColor: '#ffffff'
      };
    } else if (t === 'dark') {
      return {
        rimGradient: ['#0a0a0a', '#333333', '#555555', '#333333', '#0a0a0a'],
        hubGradient: ['#555555', '#333333', '#1a1a1a', '#0a0a0a'],
        hubInner: ['#ef4444', '#dc2626', '#7f1d1d'],
        boltColors: ['#ef4444', '#ffffff'],
        sliceDark: '#050505',
        lineColor: 'rgba(239, 68, 68, 0.4)',
        pointerGradient: ['#ef4444', '#dc2626', '#7f1d1d'],
        textColor: '#ef4444',
        numberColor: '#ffffff'
      };
    }
    // Default: casino
    return {
      rimGradient: ['#78350f', '#f59e0b', '#fef08a', '#d97706', '#451a03'],
      hubGradient: ['#fef08a', '#d97706', '#78350f', '#18181b'],
      hubInner: ['#fda4af', '#dc2626', '#881337'],
      boltColors: ['#ffffff', '#fde047'],
      sliceDark: '#18181b',
      lineColor: 'rgba(251, 191, 36, 0.6)',
      pointerGradient: ['#fef08a', '#f59e0b', '#b45309'],
      textColor: '#fef08a',
      numberColor: '#ffffff'
    };
  }

  draw() {
    const { ctx, centerX, centerY, radius, currentRotation } = this;
    if (!ctx) return;

    ctx.clearRect(0, 0, this.width, this.height);

    if (this.players.length === 0) {
      this.drawEmptyWheel();
      this.drawPointer();
      return;
    }

    const theme = this._getThemeColors();
    const numSlices = this.players.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    // 1. Outer rim
    ctx.save();
    ctx.translate(centerX, centerY);

    const rimGrad = ctx.createRadialGradient(0, 0, radius - 5, 0, 0, radius + 22);
    theme.rimGradient.forEach((c, i) => rimGrad.addColorStop(i / (theme.rimGradient.length - 1), c));

    ctx.beginPath();
    ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
    ctx.fillStyle = rimGrad;
    ctx.shadowColor = `${this.options.rimColor}66`;
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Outer rim bolts / LEDs
    const numBolts = Math.max(24, numSlices * 2);
    for (let i = 0; i < numBolts; i++) {
      const bAngle = (i * Math.PI * 2) / numBolts;
      const bx = Math.cos(bAngle) * (radius + 10);
      const by = Math.sin(bAngle) * (radius + 10);
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = theme.boltColors[i % 2];
      ctx.fill();
    }

    // 2. Wheel Slices with rotation
    ctx.rotate(currentRotation);

    for (let i = 0; i < numSlices; i++) {
      const startAngle = i * sliceAngle;
      const endAngle = startAngle + sliceAngle;
      const player = this.players[i];
      const color = this.options.colors[i % this.options.colors.length];

      // Slice wedge
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngle, endAngle);
      ctx.closePath();

      const wedgeGrad = ctx.createRadialGradient(0, 0, 30, 0, 0, radius);
      wedgeGrad.addColorStop(0, theme.sliceDark);
      wedgeGrad.addColorStop(0.4, color);
      wedgeGrad.addColorStop(1, '#09090b');

      ctx.fillStyle = wedgeGrad;
      ctx.fill();

      // Slice dividing line
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(startAngle) * radius, Math.sin(startAngle) * radius);
      ctx.strokeStyle = theme.lineColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Content inside slice
      ctx.save();
      const midAngle = startAngle + sliceAngle / 2;
      ctx.rotate(midAngle);

      const avatarImg = this.options.showPlayerAvatars ? this._getAvatarImage(player) : null;
      const fontSize = Math.max(14, Math.min(26, Math.floor(220 / Math.sqrt(numSlices))));
      const smallFont = Math.max(9, Math.min(13, Math.floor(130 / Math.sqrt(numSlices))));

      if (avatarImg && sliceAngle > 0.15) {
        // Draw circular avatar in the slice
        const avatarSize = Math.min(32, Math.max(16, Math.floor(radius / (numSlices * 0.35))));
        const avatarX = radius - avatarSize - 8;
        const avatarY = -avatarSize / 2;

        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, 0, avatarSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();

        // White border around avatar
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, 0, avatarSize / 2 + 1, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Player number next to avatar
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.numberColor;
        ctx.font = `bold ${fontSize}px 'Tajawal', sans-serif`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(`#${player.playerNumber}`, avatarX - 6, 0);

        // Player name
        if (this.options.showPlayerNames && sliceAngle > 0.25) {
          ctx.font = `600 ${smallFont}px 'Tajawal', sans-serif`;
          ctx.fillStyle = theme.textColor;
          const cleanNick = (player.nickname || player.uniqueId || '').substring(0, 8);
          ctx.fillText(cleanNick, avatarX - 6 - (fontSize * 1.5), 0);
        }
      } else {
        // Fallback: number + name only
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = theme.numberColor;
        ctx.font = `bold ${fontSize}px 'Tajawal', sans-serif`;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 6;
        ctx.fillText(`#${player.playerNumber}`, radius - 15, 0);

        if (this.options.showPlayerNames) {
          ctx.font = `600 ${smallFont}px 'Tajawal', sans-serif`;
          ctx.fillStyle = theme.textColor;
          const cleanNick = (player.nickname || player.uniqueId || '').substring(0, 9);
          ctx.fillText(cleanNick, radius - 65, 0);
        }
      }

      ctx.restore();
    }

    // 3. Center Hub
    ctx.restore();
    ctx.save();
    ctx.translate(centerX, centerY);

    const hubGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, 50);
    theme.hubGradient.forEach((c, i) => hubGrad.addColorStop(i / (theme.hubGradient.length - 1), c));

    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 12;
    ctx.fill();

    const gemGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, 32);
    theme.hubInner.forEach((c, i) => gemGrad.addColorStop(i / (theme.hubInner.length - 1), c));

    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = gemGrad;
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎡', 0, 0);

    ctx.restore();

    // 4. Fixed Top Pointer
    this.drawPointer();
  }

  drawEmptyWheel() {
    const { ctx, centerX, centerY, radius } = this;
    ctx.save();
    ctx.translate(centerX, centerY);

    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = '#18181b';
    ctx.strokeStyle = this.options.rimColor;
    ctx.lineWidth = 6;
    ctx.stroke();
    ctx.fill();

    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 18px "Tajawal", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('في انتظار انضمام اللاعبين...', 0, 0);

    ctx.restore();
  }

  drawPointer() {
    const { ctx, centerX, centerY, radius } = this;
    const theme = this._getThemeColors();

    ctx.save();
    ctx.translate(centerX, centerY);

    const bounceAngle = (this.pointerBounce * Math.PI) / 180;
    ctx.rotate(bounceAngle);

    const topY = -radius - 12;

    ctx.beginPath();
    ctx.moveTo(0, topY + 38);
    ctx.lineTo(-14, topY - 14);
    ctx.lineTo(0, topY - 8);
    ctx.lineTo(14, topY - 14);
    ctx.closePath();

    const pointerGrad = ctx.createLinearGradient(0, topY - 14, 0, topY + 38);
    theme.pointerGradient.forEach((c, i) => pointerGrad.addColorStop(i / (theme.pointerGradient.length - 1), c));

    ctx.fillStyle = pointerGrad;
    ctx.shadowColor = `${this.options.rimColor}ee`;
    ctx.shadowBlur = 15;
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, topY - 5, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.restore();
  }

  spinToPlayer(chosenPlayer, onComplete) {
    if (this.players.length === 0 || this.isSpinning) return;

    this.isSpinning = true;
    const playerIndex = this.players.findIndex(p => p.playerNumber === chosenPlayer.playerNumber || p.id === chosenPlayer.id);
    if (playerIndex === -1) {
      console.warn('[RouletteWheel] Player not in wheel list:', chosenPlayer);
      this.isSpinning = false;
      return;
    }

    const numSlices = this.players.length;
    const sliceAngle = (Math.PI * 2) / numSlices;

    const targetSliceCenter = (playerIndex * sliceAngle) + (sliceAngle / 2);
    const pointerPos = (3 * Math.PI) / 2;

    const fullRotations = 6 + Math.floor(Math.random() * 3);
    const targetFinalAngle = (fullRotations * Math.PI * 2) + (pointerPos - targetSliceCenter);

    const startRotation = this.currentRotation % (Math.PI * 2);
    const totalRotationToCover = targetFinalAngle - startRotation;

    const startTime = performance.now();
    const duration = this.options.spinDuration;

    const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuint(progress);

      this.currentRotation = startRotation + (totalRotationToCover * easedProgress);

      const normalizedRot = (this.currentRotation % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const angleUnderPointer = ((pointerPos - normalizedRot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const currentSliceIndex = Math.floor(angleUnderPointer / sliceAngle) % numSlices;

      if (currentSliceIndex !== this.lastTickIndex) {
        this.lastTickIndex = currentSliceIndex;
        if (window.soundEngine) {
          const speedFactor = Math.max(0.6, 1.8 * (1 - progress));
          window.soundEngine.tick(speedFactor);
        }
        this.pointerBounce = (Math.random() - 0.5) * 6 * (1 - progress);
      } else {
        this.pointerBounce *= 0.8;
      }

      this.draw();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isSpinning = false;
        this.pointerBounce = 0;
        this.draw();

        if (window.soundEngine) {
          window.soundEngine.playerSelected();
        }

        if (typeof onComplete === 'function') {
          onComplete(chosenPlayer);
        }
      }
    };

    requestAnimationFrame(animate);
  }
}

window.RouletteWheel = RouletteWheel;
