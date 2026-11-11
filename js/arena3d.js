// ============================================================
// Arena3D — استاد لعبة روليت ثلاثي الأبعاد (Three.js)
// يستضيف: عجلة دوارة + أشكال اللاعبين + جمهور متفاعل + سهرات
// إضاءة مسرحية + سداحل كوميديا (الرفسة/الدرع/البوابة/الاحتفال)
//
// الأنماط المطبقة من مهارة threejs-animation:
//   • Timer/delta pattern (frame-rate independent motion)
//   • renderer.setAnimationLoop() + تخلص كامل من الموارد
//   • InstancedMesh للجمهور + DPR ≤ 2 + إيقاف عند إخفاء التبويب
// ============================================================
(function () {
  'use strict';

  const THREE_URLS = [
    'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
    'https://unpkg.com/three@0.180.0/build/three.module.js'
  ];

  const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
  const dampAngle = (cur, target, lambda, dt) => {
    let d = target - cur;
    const TWO_PI = Math.PI * 2;
    while (d > Math.PI) d -= TWO_PI;
    while (d < -Math.PI) d += TWO_PI;
    return cur + d * (1 - Math.exp(-lambda * dt));
  };
  const easeOutQuint = (t) => 1 - Math.pow(1 - t, 5);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  async function loadTHREE() {
    if (window.__THREE_MODULE__) return window.__THREE_MODULE__;
    for (const url of THREE_URLS) {
      try { window.__THREE_MODULE__ = await import(url); return window.__THREE_MODULE__; } catch (e) { /* next */ }
    }
    return null;
  }

  // ── لوحات كانفس (صورة اللاعب الدائرية + الاسم) ──────────────
  function circleAvatarCanvas(player) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.clearRect(0, 0, 256, 256);
    // white ring
    g.beginPath(); g.arc(128, 128, 122, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,255,255,0.96)'; g.fill();
    // inner image
    g.save();
    g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.clip();
    const img = window.__g3AvatarCache && window.__g3AvatarCache[player.profilePictureUrl];
    if (img) g.drawImage(img, 16, 16, 224, 224);
    else {
      const grad = g.createLinearGradient(0, 0, 256, 256);
      grad.addColorStop(0, '#312e81'); grad.addColorStop(1, '#6d28d9');
      g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#fff'; g.font = '900 110px Tajawal, Arial';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`#${player.playerNumber}`, 128, 132);
    }
    g.restore();
    // number badge
    g.beginPath(); g.arc(196, 196, 34, 0, Math.PI * 2);
    g.fillStyle = '#0f172a'; g.fill();
    g.lineWidth = 5; g.strokeStyle = '#fbbf24'; g.stroke();
    g.fillStyle = '#fff'; g.font = '900 38px Tajawal, Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(`${player.playerNumber}`, 196, 199);
    return c;
  }

  function nameSpriteCanvas(player) {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 112;
    const g = c.getContext('2d');
    const nick = (player.nickname || player.uniqueId || 'لاعب').slice(0, 12);
    g.fillStyle = 'rgba(10, 8, 24, 0.82)';
    const r = 44;
    g.beginPath();
    g.moveTo(20 + r, 10); g.arcTo(492, 10, 492, 102, r); g.arcTo(492, 102, 20, 102, r);
    g.arcTo(20, 102, 20, 10, r); g.arcTo(20, 10, 492, 10, r); g.closePath();
    g.fill();
    g.lineWidth = 5; g.strokeStyle = 'rgba(251,191,36,0.8)'; g.stroke();
    g.fillStyle = '#fff'; g.font = '900 54px Tajawal, Arial';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(nick, 256, 58);
    return c;
  }

  function emojiSprite(emoji, size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.font = `${Math.floor(size * 0.72)}px "Segoe UI Emoji", sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(emoji, size / 2, size / 2 + size * 0.04);
    return c;
  }

  // ── محمّل صور اللاعبين مع سلسلة بدائل (CORS آمن) ────────────
  function loadAvatar(url, seed) {
    return new Promise((resolve) => {
      const done = (img) => resolve(img);
      if (!url) { loadDicebear(seed, done); return; }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => done(img);
      img.onerror = () => loadDicebear(seed, done);
      img.src = url;
    });
  }
  function loadDicebear(seed, done) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(seed || 'x')}`;
  }

  // ══════════════════════════════════════════════════════════
  //                      Arena3D
  // ══════════════════════════════════════════════════════════
  class Arena3D {
    constructor(THREE, mount) {
      this.THREE = THREE;
      this.mount = mount;
      this.players = [];
      this.figures = new Map();   // playerNumber -> figure record
      this.motionScale = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ? 0.15 : 1;
      this.cheer = 0;             // 0..1 crowd excitement
      this.cheerTarget = 0;
      this.spin = null;           // active spin state
      this.flights = [];          // kicked figures
      this.shards = [];
      this.bursts = [];
      this.shake = 0;
      this.spotTimer = 0;
      this.cameraPreset = { pos: new THREE.Vector3(0, 8.3, 15.0), look: new THREE.Vector3(0, 2.5, 0), fov: 55 };
      this._camPos = this.cameraPreset.pos.clone();
      this._camLook = this.cameraPreset.look.clone();
      this._focus = null;         // {figure, dist, height}
      this._clock = performance.now();
      this._elapsed = 0;
      this._hidden = false;

      this._buildRenderer();
      this._buildScene();
      this._buildStage();
      this._buildCrowd();
      this._bindEvents();

      this._lastTickSeg = -1;
      this.renderer.setAnimationLoop(() => this._tick());
    }

    // ── الأساسيات ────────────────────────────────────────────
    _buildRenderer() {
      const T = this.THREE;
      this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = T.SRGBColorSpace;
      this.renderer.toneMapping = T.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.3;
      const rect = this.mount.getBoundingClientRect();
      this.renderer.setSize(rect.width || 800, rect.height || 560);
      this.renderer.domElement.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;display:block;';
      this.mount.appendChild(this.renderer.domElement);
      this.canvas = this.renderer.domElement;
    }

    _buildScene() {
      const T = this.THREE;
      this.scene = new T.Scene();
      this.scene.background = new T.Color('#0a0718');
      this.scene.fog = new T.Fog('#0a0718', 22, 58);

      this.camera = new T.PerspectiveCamera(this.cameraPreset.fov, (this.mount.clientWidth || 800) / (this.mount.clientHeight || 560), 0.1, 140);
      this.camera.position.copy(this._camPos);

      // إضاءة: سماوي + مفتاح دافئ + حافة سماوية
      const hemi = new T.HemisphereLight('#8b7cf6', '#14101f', 1.05);
      this.scene.add(hemi);
      const key = new T.DirectionalLight('#ffe6b0', 2.2);
      key.position.set(6, 14, 9);
      this.scene.add(key);
      const rim = new T.DirectionalLight('#38bdf8', 1.0);
      rim.position.set(-8, 7, -10);
      this.scene.add(rim);

      // ضوء مركزي ذهبي فوق العجلة
      this.topSpot = new T.SpotLight('#ffd166', 320, 26, 0.5, 0.45, 1.6);
      this.topSpot.position.set(0, 13, 0);
      this.topSpot.target.position.set(0, 0, 0);
      this.scene.add(this.topSpot, this.topSpot.target);

      // أضواء تركيز (صاحب القرار / الهدف)
      this.spotGold = this._makeFocusSpot('#fbbf24');
      this.spotRed = this._makeFocusSpot('#f87171');
      this.spotPink = this._makeFocusSpot('#f472b6');
    }

    _makeFocusSpot(color) {
      const T = this.THREE;
      const s = new T.SpotLight(color, 0, 30, 0.36, 0.5, 1.4);
      s.position.set(0, 12, 0);
      s.target.position.set(0, 0, 0);
      this.scene.add(s, s.target);
      // مخروط ضوئي مرئي
      const cone = new T.Mesh(
        new T.ConeGeometry(1.5, 11, 24, 1, true),
        new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })
      );
      cone.visible = false;
      this.scene.add(cone);
      return { light: s, cone };
    }

    _aimSpot(spot, from, to) {
      const T = this.THREE;
      spot.light.position.copy(from);
      spot.light.target.position.copy(to);
      spot.light.target.updateMatrixWorld();
      // مخروط من الأعلى نحو الهدف
      const dir = new T.Vector3().subVectors(to, from);
      const len = dir.length();
      const mid = new T.Vector3().addVectors(from, to).multiplyScalar(0.5);
      spot.cone.position.copy(mid);
      spot.cone.scale.set(1, len / 11, 1);
      const up = new T.Vector3(0, 1, 0);
      const q = new T.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
      spot.cone.quaternion.copy(q);
      spot.cone.visible = true;
    }

    _hideSpot(spot) {
      spot.cone.visible = false;
      spot.light.intensity = 0;
    }

    _buildStage() {
      const T = this.THREE;

      // قبة السماء بتدرج + نجوم
      const skyCanvas = document.createElement('canvas');
      skyCanvas.width = 16; skyCanvas.height = 256;
      const sg = skyCanvas.getContext('2d');
      const grad = sg.createLinearGradient(0, 0, 0, 256);
      grad.addColorStop(0, '#241a4d');
      grad.addColorStop(0.55, '#150f2e');
      grad.addColorStop(1, '#070510');
      sg.fillStyle = grad; sg.fillRect(0, 0, 16, 256);
      const skyTex = new T.CanvasTexture(skyCanvas);
      skyTex.colorSpace = T.SRGBColorSpace;
      const sky = new T.Mesh(
        new T.SphereGeometry(64, 24, 16),
        new T.MeshBasicMaterial({ map: skyTex, side: T.BackSide, fog: false })
      );
      this.scene.add(sky);

      // نجوم
      const starGeo = new T.BufferGeometry();
      const starN = 320;
      const sp = new Float32Array(starN * 3);
      for (let i = 0; i < starN; i++) {
        const th = Math.random() * Math.PI * 2;
        const ph = Math.acos(rand(0.15, 0.95));
        const r = 58;
        sp[i * 3] = r * Math.sin(ph) * Math.cos(th);
        sp[i * 3 + 1] = r * Math.cos(ph);
        sp[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
      }
      starGeo.setAttribute('position', new T.BufferAttribute(sp, 3));
      this.scene.add(new T.Points(starGeo, new T.PointsMaterial({ color: '#c7bfff', size: 0.35, fog: false })));

      // أرضية الاستاد
      const floor = new T.Mesh(
        new T.CircleGeometry(17, 64),
        new T.MeshStandardMaterial({ color: '#161228', roughness: 0.9, metalness: 0.15 })
      );
      floor.rotation.x = -Math.PI / 2;
      this.scene.add(floor);

      // حلقة ذهبية حول منطقة العجلة
      const ring = new T.Mesh(
        new T.TorusGeometry(7.4, 0.09, 12, 90),
        new T.MeshStandardMaterial({ color: '#fbbf24', emissive: '#b45309', emissiveIntensity: 1.3, roughness: 0.35, metalness: 0.8 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.06;
      this.scene.add(ring);

      // مدرجات (3 حلقات سلالم)
      this.bleachers = [];
      const stepSpecs = [
        { r: 9.9, y: 0.45 }, { r: 12.1, y: 1.35 }, { r: 14.3, y: 2.25 }
      ];
      stepSpecs.forEach((s) => {
        const step = new T.Mesh(
          new T.CylinderGeometry(s.r, s.r + 0.35, 0.9, 72, 1, false),
          new T.MeshStandardMaterial({ color: '#1b1730', roughness: 0.95 })
        );
        step.position.y = s.y - 0.45 + 0.45;
        step.position.y = s.y;
        this.scene.add(step);
        this.bleachers.push(step);
      });

      // أبراج إضاءة (4 زوايا)
      this.towerCones = [];
      const poleMat = new T.MeshStandardMaterial({ color: '#2a2440', roughness: 0.6, metalness: 0.5 });
      [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([sx, sz]) => {
        const pole = new T.Mesh(new T.CylinderGeometry(0.16, 0.22, 10, 10), poleMat);
        pole.position.set(sx * 13.4, 5, sz * 13.4);
        this.scene.add(pole);
        const head = new T.Mesh(new T.BoxGeometry(1.1, 0.5, 0.7), new T.MeshStandardMaterial({ color: '#444', emissive: '#fff7d6', emissiveIntensity: 0.7 }));
        head.position.set(sx * 13.4, 10.1, sz * 13.4);
        head.lookAt(0, 2, 0);
        this.scene.add(head);
        // شعاع ضوئي مخروطي
        const beam = new T.Mesh(
          new T.ConeGeometry(3.4, 14, 18, 1, true),
          new T.MeshBasicMaterial({ color: '#ffe9b8', transparent: true, opacity: 0.07, side: T.DoubleSide, depthWrite: false, blending: T.AdditiveBlending })
        );
        beam.position.set(sx * 13.4, 3.4, sz * 13.4);
        const dir = new T.Vector3(0, 0, 0).sub(new T.Vector3(sx * 13.4, 10.4, sz * 13.4)).normalize();
        const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, -1, 0), dir);
        beam.quaternion.copy(q);
        this.scene.add(beam);
        this.towerCones.push(beam);
      });

      // ── مجموعة العجلة الدوارة ──
      this.wheelGroup = new T.Group();
      this.wheelGroup.position.y = 0.5;
      this.scene.add(this.wheelGroup);

      // قاعدة ذهبية أسطوانية
      const base = new T.Mesh(
        new T.CylinderGeometry(6.35, 6.55, 0.5, 64),
        new T.MeshStandardMaterial({ color: '#d4a017', roughness: 0.35, metalness: 0.4, emissive: '#6b4a00', emissiveIntensity: 0.5 })
      );
      base.position.y = 0.25;
      this.wheelGroup.add(base);

      // شريط LED دوار حول الحافة
      this.ledRing = new T.Mesh(
        new T.TorusGeometry(6.42, 0.07, 10, 96),
        new T.MeshStandardMaterial({ color: '#fde047', emissive: '#fbbf24', emissiveIntensity: 2.2, roughness: 0.3 })
      );
      this.ledRing.rotation.x = -Math.PI / 2;
      this.ledRing.position.y = 0.52;
      this.wheelGroup.add(this.ledRing);

      // مركز العجلة (Hub)
      const hub = new T.Mesh(
        new T.CylinderGeometry(1.05, 1.2, 0.5, 32),
        new T.MeshStandardMaterial({ color: '#e11d48', roughness: 0.3, metalness: 0.3, emissive: '#7f1d1d', emissiveIntensity: 0.45 })
      );
      hub.position.y = 0.55;
      this.wheelGroup.add(hub);
      const gem = new T.Mesh(
        new T.SphereGeometry(0.62, 20, 14),
        new T.MeshStandardMaterial({ color: '#fda4af', emissive: '#e11d48', emissiveIntensity: 1.4, roughness: 0.2 })
      );
      gem.position.y = 0.95;
      this.wheelGroup.add(gem);
      const hubEmoji = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(emojiSprite('🎡')), transparent: true }));
      hubEmoji.scale.setScalar(1.15);
      hubEmoji.position.y = 1.75;
      this.wheelGroup.add(hubEmoji);

      // حاوية القطاعات + حاوية الأشكال (تدور مع العجلة)
      this.wedgeGroup = new T.Group();
      this.figuresGroup = new T.Group();
      this.wheelGroup.add(this.wedgeGroup, this.figuresGroup);

      // منع أي استبعاد خاطئ (frustum culling) لأجزاء العجلة المركزية
      this.wheelGroup.traverse((o) => { o.frustumCulled = false; });

      // المؤشر الثابت (عند الكاميرا)
      const pointerGroup = new T.Group();
      const ptrMat = new T.MeshStandardMaterial({ color: '#fde047', emissive: '#f59e0b', emissiveIntensity: 1.6, roughness: 0.3, metalness: 0.6 });
      const arrow = new T.Mesh(new T.ConeGeometry(0.3, 0.95, 4), ptrMat);
      arrow.rotation.x = Math.PI;
      arrow.position.set(0, 1.95, 7.35);
      pointerGroup.add(arrow);
      const plate = new T.Mesh(new T.CylinderGeometry(0.34, 0.34, 0.16, 20), ptrMat);
      plate.position.set(0, 2.55, 7.35);
      pointerGroup.add(plate);
      const stick = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.6, 8), ptrMat);
      stick.position.set(0, 2.28, 7.35);
      pointerGroup.add(stick);
      this.pointer = pointerGroup;
      this.pointerBounce = 0;
      pointerGroup.traverse((o) => { o.frustumCulled = false; });
      this.scene.add(pointerGroup);
    }

    _buildCrowd() {
      const T = this.THREE;
      const SHIRTS = ['#7c3aed', '#2563eb', '#059669', '#dc2626', '#d97706', '#db2777', '#0891b2', '#4f46e5', '#16a34a', '#b45309'];
      const SKIN = ['#f5cbaa', '#eab78b', '#d69a68', '#b97a4e', '#8d5a33', '#6b4226'];

      // فتحة أمام الكاميرا (منطقة البث) — لا جمهور بين العدسة والعجلة
      const rings = [
        { r: 9.35, y: 0.9, n: 54, gap: 0.95 },
        { r: 11.55, y: 1.8, n: 66, gap: 0.6 },
        { r: 13.75, y: 2.7, n: 78, gap: 0.42 }
      ];
      this.crowdData = [];
      rings.forEach((ring, ri) => {
        for (let i = 0; i < ring.n; i++) {
          const a = (i / ring.n) * Math.PI * 2 + (ri % 2 ? 0.045 : 0);
          const aWrap = Math.atan2(Math.sin(a), Math.cos(a)); // -π..π
          if (Math.abs(aWrap) < ring.gap) continue; // الفتحة الأمامية
          const jitterR = rand(-0.28, 0.28);
          this.crowdData.push({
            x: Math.sin(a) * (ring.r + jitterR),
            z: Math.cos(a) * (ring.r + jitterR),
            y: ring.y + 0.42,
            phase: Math.random() * Math.PI * 2,
            speed: rand(0.9, 1.7),
            size: rand(0.85, 1.18)
          });
        }
      });

      const total = this.crowdData.length;

      // أجساد الجلوسين (رأس + جذع فقط — الجسم السفلي خلف السلم)
      this.crowdBody = new T.InstancedMesh(
        new T.CapsuleGeometry(0.27, 0.52, 4, 10),
        new T.MeshStandardMaterial({ roughness: 0.85 }),
        total
      );
      this.crowdHead = new T.InstancedMesh(
        new T.SphereGeometry(0.23, 10, 8),
        new T.MeshStandardMaterial({ roughness: 0.7 }),
        total
      );
      this.crowdBody.instanceMatrix.setUsage(T.DynamicDrawUsage);
      this.crowdHead.instanceMatrix.setUsage(T.DynamicDrawUsage);

      const dummy = new T.Object3D();
      const col = new T.Color();
      this.crowdData.forEach((d, idx) => {
        dummy.position.set(d.x, d.y, d.z);
        dummy.scale.setScalar(d.size);
        dummy.rotation.set(0, Math.atan2(-d.x, -d.z) + rand(-0.2, 0.2), 0);
        dummy.updateMatrix();
        this.crowdBody.setMatrixAt(idx, dummy.matrix);
        dummy.position.set(d.x, d.y + 0.62 * d.size, d.z);
        dummy.updateMatrix();
        this.crowdHead.setMatrixAt(idx, dummy.matrix);
        this.crowdBody.setColorAt(idx, col.set(pick(SHIRTS)));
        this.crowdHead.setColorAt(idx, col.set(pick(SKIN)));
      });
      this.crowdBody.instanceMatrix.needsUpdate = true;
      this.crowdHead.instanceMatrix.needsUpdate = true;
      if (this.crowdBody.instanceColor) this.crowdBody.instanceColor.needsUpdate = true;
      if (this.crowdHead.instanceColor) this.crowdHead.instanceColor.needsUpdate = true;
      this.scene.add(this.crowdBody, this.crowdHead);

      // سحابة تراب/انطباع مضيء خفيف حول الاستاد
      const glow = new T.Mesh(
        new T.TorusGeometry(15.4, 0.25, 8, 80),
        new T.MeshBasicMaterial({ color: '#7c3aed', transparent: true, opacity: 0.12, blending: T.AdditiveBlending, depthWrite: false })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 3.2;
      this.scene.add(glow);
    }

    _bindEvents() {
      window.addEventListener('resize', () => this._resize());
      if (window.ResizeObserver) {
        this._ro = new ResizeObserver(() => this._resize());
        this._ro.observe(this.mount);
      }
      document.addEventListener('visibilitychange', () => {
        this._hidden = document.hidden;
      });
    }

    _resize() {
      const w = this.mount.clientWidth || 800;
      const h = this.mount.clientHeight || 560;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }

    // ── اللاعبون ─────────────────────────────────────────────
    setPlayers(players) {
      this.players = (players || []).filter(p => p.status === 'active' || p.status === 'immune');
      this._rebuildFigures();
    }

    async _rebuildFigures() {
      const T = this.THREE;
      const N = Math.max(this.players.length, 1);
      const slice = (Math.PI * 2) / N;
      const keep = new Set(this.players.map(p => p.playerNumber));

      // إزالة الأشكال المحذوفة
      for (const [num, rec] of [...this.figures]) {
        if (!keep.has(num)) {
          this.figuresGroup.remove(rec.group);
          rec.group.traverse((o) => {
            if (o.geometry) o.geometry.dispose();
            if (o.material && o.material.map) o.material.map.dispose();
            if (o.material) o.material.dispose();
          });
          this.figures.delete(num);
        }
      }

      // بناء/تحديث الأشكال
      for (let i = 0; i < this.players.length; i++) {
        const p = this.players[i];
        const angleCanvas = i * slice; // نفس ترتيب القطاعات
        let rec = this.figures.get(p.playerNumber);
        if (!rec) {
          rec = await this._makeFigure(p, i, N);
          this.figures.set(p.playerNumber, rec);
          this.figuresGroup.add(rec.group);
        }
        rec.sliceIndex = i;
        rec.angleCanvas = angleCanvas;
        rec.angleWorld = angleCanvas + Math.PI / 2 + slice / 2;
        this._placeFigure(rec);
        this._applyFigureState(rec, p);
      }
      this._rebuildWedges();
    }

    _rebuildWedges() {
      const T = this.THREE;
      // تنظيف
      while (this.wedgeGroup.children.length) {
        const m = this.wedgeGroup.children.pop();
        m.geometry.dispose();
        m.material.dispose();
      }
      const N = Math.max(this.players.length, 1);
      const slice = (Math.PI * 2) / N;
      const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#d97706', '#0284c7', '#e11d48', '#4f46e5'];
      const R = 6.28;
      for (let i = 0; i < this.players.length; i++) {
        const a0 = i * slice;
        const a1 = a0 + slice;
        const shape = new T.Shape();
        shape.moveTo(0, 0);
        shape.absarc(0, 0, R, a0, a1, false);
        shape.lineTo(0, 0);
        const geo = new T.ExtrudeGeometry(shape, { depth: 0.34, bevelEnabled: false });
        geo.rotateX(-Math.PI / 2);
        const color = COLORS[i % COLORS.length];
        const mat = new T.MeshStandardMaterial({
          color, roughness: 0.5, metalness: 0.05,
          emissive: color, emissiveIntensity: 0.3
        });
        const mesh = new T.Mesh(geo, mat);
        mesh.position.y = 0.5;
        mesh.frustumCulled = false; // القطاعات قرب المركز دائماً — نمنع أي استبعاد خاطئ
        this.wedgeGroup.add(mesh);
      }
    }

    async _makeFigure(player, index, total) {
      const T = this.THREE;
      const group = new T.Group();
      const jersey = pick(['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#d97706', '#0ea5e9', '#db2777', '#4f46e5']);
      const skin = pick(['#f5cbaa', '#eab78b', '#d69a68', '#b97a4e', '#8d5a33']);

      // قاعدة (منصة) — تجلس فوق سطح القطاع (0.84 محلياً)
      const pedestal = new T.Mesh(
        new T.CylinderGeometry(0.52, 0.62, 0.34, 20),
        new T.MeshStandardMaterial({ color: '#2a2440', roughness: 0.5, metalness: 0.6 })
      );
      pedestal.position.y = 1.01;
      group.add(pedestal);

      // أرجل + جذع + ذراعان + رأس (شخصية صغيرة كرتونية-واقعية)
      const legs = new T.Mesh(
        new T.CylinderGeometry(0.17, 0.2, 0.5, 10),
        new T.MeshStandardMaterial({ color: '#1e1b31', roughness: 0.8 })
      );
      legs.position.y = 1.39;
      group.add(legs);

      const torsoMat = new T.MeshStandardMaterial({ color: jersey, roughness: 0.65 });
      const torso = new T.Mesh(
        new T.CapsuleGeometry(0.3, 0.5, 4, 12),
        torsoMat
      );
      torso.position.y = 1.96;
      group.add(torso);

      // ذراعان مرفوعتان (تشجيع دائم)
      const armGeo = new T.CapsuleGeometry(0.09, 0.34, 4, 8);
      [-1, 1].forEach((s) => {
        const arm = new T.Mesh(armGeo, torsoMat);
        arm.position.set(s * 0.4, 2.02, 0.05);
        arm.rotation.z = s * 0.55;
        group.add(arm);
      });

      const head = new T.Mesh(
        new T.SphereGeometry(0.28, 16, 12),
        new T.MeshStandardMaterial({ color: skin, roughness: 0.55 })
      );
      head.position.y = 2.52;
      group.add(head);

      // صورة اللاعب الدائرية (لوح يطفو فوق الرأس ويواجه الكاميرا)
      const avatarTex = new T.CanvasTexture(circleAvatarCanvas(player));
      avatarTex.colorSpace = T.SRGBColorSpace;
      const plate = new T.Mesh(
        new T.PlaneGeometry(1.45, 1.45),
        new T.MeshBasicMaterial({ map: avatarTex, transparent: true, depthWrite: false })
      );
      plate.position.y = 3.45;
      group.add(plate);

      // اسم اللاعب (Sprite)
      const nameTex = new T.CanvasTexture(nameSpriteCanvas(player));
      nameTex.colorSpace = T.SRGBColorSpace;
      const nameSpr = new T.Sprite(new T.SpriteMaterial({ map: nameTex, transparent: true, depthWrite: false }));
      nameSpr.scale.set(2.6, 0.58, 1);
      nameSpr.position.y = 4.35;
      group.add(nameSpr);

      // تاج صاحب القرار (مخفي)
      const crownSpr = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(emojiSprite('👑', 96)), transparent: true, depthWrite: false }));
      crownSpr.scale.setScalar(0.95);
      crownSpr.position.y = 5.15;
      crownSpr.visible = false;
      group.add(crownSpr);

      // علامة الهدف (حلقة حمراء، مخفية)
      const warnRing = new T.Mesh(
        new T.TorusGeometry(1.05, 0.08, 10, 40),
        new T.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.95 })
      );
      warnRing.rotation.x = -Math.PI / 2;
      warnRing.position.y = 1.2;
      warnRing.visible = false;
      group.add(warnRing);

      // قبة الدرع (مخفية)
      const dome = new T.Mesh(
        new T.SphereGeometry(1.6, 24, 16),
        new T.MeshPhongMaterial({ color: '#60a5fa', transparent: true, opacity: 0.3, emissive: '#1d4ed8', emissiveIntensity: 0.4, shininess: 90 })
      );
      dome.position.y = 2.0;
      dome.visible = false;
      group.add(dome);
      const domeRing = new T.Mesh(
        new T.TorusGeometry(1.65, 0.045, 8, 48),
        new T.MeshBasicMaterial({ color: '#93c5fd', transparent: true, opacity: 0.85 })
      );
      domeRing.rotation.x = -Math.PI / 2;
      domeRing.position.y = 1.25;
      domeRing.visible = false;
      group.add(domeRing);

      const rec = {
        group, plate, torso, head, crownSpr, warnRing, dome, domeRing,
        player, sliceIndex: index, angleCanvas: 0, angleWorld: 0,
        bounce: 0, bounceV: 0, rise: 0, // rise: 0=عادي, >0 ارتفاع متحرك
        selected: false, targeted: false, shielded: false
      };

      // تحميل الصورة الحقيقية ثم تحديث اللوحة
      loadAvatar(player.profilePictureUrl, player.uniqueId || player.playerNumber).then((img) => {
        if (!img) return;
        window.__g3AvatarCache = window.__g3AvatarCache || {};
        window.__g3AvatarCache[player.profilePictureUrl] = img;
        const tex = new T.CanvasTexture(circleAvatarCanvas(player));
        tex.colorSpace = T.SRGBColorSpace;
        plate.material.map.dispose();
        plate.material.map = tex;
        plate.material.needsUpdate = true;
      });

      return rec;
    }

    _placeFigure(rec) {
      const R = 5.15;
      const a = rec.angleWorld;
      rec.group.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
      rec.group.rotation.y = a; // يواجه للخارج
    }

    _applyFigureState(rec, p) {
      rec.player = p;
      rec.shielded = !!p.hasShield;
      rec.dome.visible = rec.shielded && rec.dome.scale.x > 0.01;
      rec.domeRing.visible = rec.dome.visible;
      if (!rec.shielded) rec.dome.scale.setScalar(0.001);
      else rec.dome.scale.setScalar(1);
    }

    getFigure(playerNumber) {
      return this.figures.get(playerNumber) || null;
    }

    figureWorldPos(rec) {
      const v = new this.THREE.Vector3();
      rec.group.getWorldPosition(v);
      return v;
    }

    // ── الدوران ──────────────────────────────────────────────
    spinToPlayer(chosenPlayer, onComplete, opts = {}) {
      const rec = this.getFigure(chosenPlayer?.playerNumber);
      if (!rec) {
        // لم نجد اللاعب — أكمل مباشرة
        if (typeof onComplete === 'function') onComplete(chosenPlayer);
        return;
      }
      const duration = Math.max(2500, opts.duration || 6500) * (this.motionScale < 0.5 ? 0.35 : 1);
      const slice = (Math.PI * 2) / Math.max(this.players.length, 1);
      const centerCanvas = rec.sliceIndex * slice + slice / 2;
      // المطلوب: زاوية العالم للقطاع تحت المؤشر (زاوية 0 → +Z نحو الكاميرا)
      // زاوية العالم = زاوية الكانفس + π/2 + دوران العجلة  φ
      // ⇒ φ_final ≡ -(centerCanvas + π/2) (mod 2π)
      let phiFinal = -(centerCanvas + Math.PI / 2) % (Math.PI * 2);
      const fulls = 5 + Math.floor(Math.random() * 3);
      const startPhi = this.wheelGroup.rotation.y % (Math.PI * 2);
      let total = phiFinal - startPhi;
      total += fulls * Math.PI * 2;

      this.spin = {
        startPhi,
        total,
        duration,
        t: 0,
        chosenRec: rec,
        onComplete: typeof onComplete === 'function' ? onComplete : null
      };
      this._lastTickSeg = -1;
      this.cheerTarget = 0.5;
      if (window.soundEngine) window.soundEngine.playSpin();
      this._hideSpot(this.spotGold);
      this._hideSpot(this.spotRed);
      this._hideSpot(this.spotPink);
      // إزالة التاج عن الجميع
      for (const [, r] of this.figures) r.crownSpr.visible = false;
    }

    _updateSpin(dt) {
      const s = this.spin;
      if (!s) return;
      s.t += dt;
      const progress = Math.min(s.t / (s.duration / 1000), 1);
      const eased = easeOutQuint(progress);
      this.wheelGroup.rotation.y = s.startPhi + s.total * eased;

      // صوت التكت عند عبور كل قطاع
      const N = Math.max(this.players.length, 1);
      const slice = (Math.PI * 2) / N;
      const pointerWorld = 0; // زاوية المؤشر
      const under = ((pointerWorld - (Math.PI / 2) - this.wheelGroup.rotation.y) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const segIdx = Math.floor(under / slice) % N;
      if (segIdx !== this._lastTickSeg) {
        this._lastTickSeg = segIdx;
        if (window.soundEngine) {
          const speedFactor = Math.max(0.6, 1.9 * (1 - progress));
          window.soundEngine.tick(speedFactor);
        }
        this.pointerBounce = (Math.random() - 0.5) * 0.14 * (1 - progress);
      } else {
        this.pointerBounce = damp(this.pointerBounce, 0, 10, dt);
      }

      // ارتداد المؤشر
      this.pointer.rotation.z = this.pointerBounce;

      if (progress >= 1) {
        this.spin = null;
        this.cheerTarget = 0.85;
        if (window.soundEngine) window.soundEngine.playerSelected();
        // وميض القطاع الفائز
        this._pulseWinner(s.chosenRec);
        const cb = s.onComplete;
        if (cb) cb(s.chosenRec.player);
      }
    }

    _pulseWinner(rec) {
      const T = this.THREE;
      const mesh = this.wedgeGroup.children[rec.sliceIndex];
      if (!mesh) return;
      const base = mesh.material.color.getHex();
      mesh.material.emissive = new T.Color(base);
      let t = 0;
      const pulse = () => {
        t += 0.05;
        mesh.material.emissiveIntensity = Math.max(0, 1.4 - t * 0.12);
        if (t < 12) requestAnimationFrame(pulse);
        else { mesh.material.emissiveIntensity = 0; }
      };
      pulse();
    }

    // ── التركيز/الكاميرا ─────────────────────────────────────
    focusChooser(player) {
      const rec = this.getFigure(player?.playerNumber);
      if (!rec) return;
      for (const [, r] of this.figures) {
        r.crownSpr.visible = false;
        r.selected = false;
        r.targeted = false;
        r.warnRing.visible = false;
      }
      rec.crownSpr.visible = true;
      rec.selected = true;
      rec.bounceV = 5.2 * this.motionScale;
      this._focus = { rec, dist: 7.2, height: 4.2 };
      this.cheerTarget = 0.9;
      this._aimSpot(this.spotGold, new this.THREE.Vector3(0, 12, 0), this.figureWorldPos(rec).setY(2));
      this.spotGold.light.intensity = 260;
    }

    markTarget(player) {
      const rec = this.getFigure(player?.playerNumber);
      if (!rec) return;
      for (const [, r] of this.figures) { r.targeted = false; r.warnRing.visible = false; }
      rec.targeted = true;
      rec.warnRing.visible = true;
      this._aimSpot(this.spotRed, new this.THREE.Vector3(0, 12, 0), this.figureWorldPos(rec).setY(1.4));
      this.spotRed.light.intensity = 240;
      this.cheerTarget = 0.75;
    }

    clearMarks() {
      for (const [, r] of this.figures) {
        r.targeted = false; r.selected = false;
        r.warnRing.visible = false; r.crownSpr.visible = false;
      }
      this._hideSpot(this.spotGold);
      this._hideSpot(this.spotRed);
      this._hideSpot(this.spotPink);
      this._focus = null;
    }

    focusWide() {
      this._focus = null;
      this._hideSpot(this.spotGold);
      this._hideSpot(this.spotRed);
      this._hideSpot(this.spotPink);
    }

    // ── سداحل كوميديا ────────────────────────────────────────
    _spawnBoot(worldPos) {
      const T = this.THREE;
      const boot = new T.Group();
      const mat = new T.MeshStandardMaterial({ color: '#8b4513', roughness: 0.6 });
      const sole = new T.Mesh(new T.BoxGeometry(1.1, 0.32, 1.9), mat);
      sole.position.y = -0.15;
      boot.add(sole);
      const upper = new T.Mesh(new T.CapsuleGeometry(0.42, 0.55, 4, 10), mat);
      upper.rotation.x = Math.PI / 2;
      upper.position.set(0, 0.45, -0.55);
      boot.add(upper);
      boot.position.set(worldPos.x, worldPos.y + 9, worldPos.z);
      boot.lookAt(worldPos.x, 0, worldPos.z);
      this.scene.add(boot);
      return boot;
    }

    defenseBlock(player) {
      const rec = this.getFigure(player?.playerNumber);
      if (!rec || this.motionScale < 0.3) return;
      const T = this.THREE;
      const pos = this.figureWorldPos(rec);
      const boot = this._spawnBoot(pos);
      const state = { boot, t: 0, rec, phase: 'drop', recBounce: 0 };
      this._bootAttack = state;
      this.cheerTarget = 1;

      // الدرع يظهر مؤقتاً للصد
      rec.dome.visible = true;
      rec.dome.scale.setScalar(1);
    }

    kickPlayer(player, by) {
      const rec = this.getFigure(player?.playerNumber);
      if (!rec) return;
      const T = this.THREE;
      const pos = this.figureWorldPos(rec);
      this.clearMarks();
      this.cheerTarget = 1;

      if (this.motionScale < 0.3) {
        // بدون حركة: إخفاء مباشر
        this.figuresGroup.remove(rec.group);
        this.figures.delete(player.playerNumber);
        return;
      }

      const boot = this._spawnBoot(pos);
      this._kick = { boot, t: 0, rec, pos: pos.clone(), phase: 'drop' };
      if (window.soundEngine) setTimeout(() => window.soundEngine.eliminatedGong(), 620);
    }

    _launchVictim(rec) {
      const T = this.THREE;
      // فصل الشكل إلى المشهد ليطير عالمياً
      this.scene.attach(rec.group);
      const dir = new T.Vector3(rand(-1, 1), 0, rand(-1, 1)).normalize();
      if (dir.lengthSq() < 0.01) dir.set(1, 0, 0);
      const flight = {
        rec,
        vel: new T.Vector3(dir.x * 7, 9.5, dir.z * 7),
        spin: new T.Vector3(rand(-9, 9), rand(-6, 6), rand(7, 12)),
        life: 0
      };
      this.flights.push(flight);
      this.figures.delete(rec.player.playerNumber);
      // وميض + حلقة صدمة
      this._impactRing(rec.group.position.clone());
      this.shake = Math.min(1, this.shake + 0.85);
      this._confettiBurst(rec.group.position.clone().setY(2), 60);
    }

    _impactRing(pos) {
      const T = this.THREE;
      const ring = new T.Mesh(
        new T.TorusGeometry(0.6, 0.08, 8, 40),
        new T.MeshBasicMaterial({ color: '#fff7d6', transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(pos).setY(0.9);
      this.scene.add(ring);
      this.bursts.push({ mesh: ring, life: 0, max: 0.7, kind: 'ring' });
    }

    _confettiBurst(pos, count = 50) {
      const T = this.THREE;
      const geo = new T.BufferGeometry();
      const colors = ['#fbbf24', '#ef4444', '#3b82f6', '#a855f7', '#10b981', '#ffffff'];
      const positions = new Float32Array(count * 3);
      const vels = [];
      for (let i = 0; i < count; i++) {
        positions[i * 3] = pos.x; positions[i * 3 + 1] = pos.y; positions[i * 3 + 2] = pos.z;
        const v = new T.Vector3(rand(-1, 1), rand(0.4, 1.4), rand(-1, 1)).normalize().multiplyScalar(rand(4, 9));
        vels.push(v);
      }
      geo.setAttribute('position', new T.BufferAttribute(positions, 3));
      const pts = new T.Points(geo, new T.PointsMaterial({ color: pick(colors), size: 0.34, transparent: true, opacity: 1, depthWrite: false }));
      this.scene.add(pts);
      this.bursts.push({ mesh: pts, life: 0, max: 1.4, kind: 'burst', vels });
    }

    shieldDome(player, on = true) {
      const rec = this.getFigure(player?.playerNumber);
      if (!rec) return;
      if (on) {
        rec.shielded = true;
        rec.dome.visible = true;
        rec.domeRing.visible = true;
        rec.dome.scale.setScalar(0.001);
        rec._domeAnim = 0; // ينمو في _tick
        if (window.soundEngine) window.soundEngine.savedFanfare();
        this.cheerTarget = 0.8;
      } else {
        rec.shielded = false;
        rec.dome.visible = false;
        rec.domeRing.visible = false;
      }
    }

    breakShield(player) {
      const rec = this.getFigure(player?.playerNumber);
      if (!rec) return;
      const T = this.THREE;
      if (this.motionScale > 0.3) {
        // شظايا متطايرة
        const pos = this.figureWorldPos(rec).setY(1.8);
        for (let i = 0; i < 12; i++) {
          const shard = new T.Mesh(
            new T.TetrahedronGeometry(rand(0.12, 0.3)),
            new T.MeshBasicMaterial({ color: pick(['#93c5fd', '#60a5fa', '#dbeafe']), transparent: true, opacity: 1 })
          );
          shard.position.copy(pos);
          this.scene.add(shard);
          this.shards.push({
            mesh: shard,
            vel: new T.Vector3(rand(-1, 1), rand(0.4, 1), rand(-1, 1)).normalize().multiplyScalar(rand(4, 8)),
            rot: new T.Vector3(rand(-8, 8), rand(-8, 8), rand(-8, 8)),
            life: 0
          });
        }
        this.shake = Math.min(1, this.shake + 0.4);
      }
      rec.shielded = false;
      rec.dome.visible = false;
      rec.domeRing.visible = false;
      this.cheerTarget = 0.7;
    }

    async rejoinPlayer(player) {
      const T = this.THREE;
      // اللاعب عاد إلى active — setPlayers سيعيد بناء شكله؛ نضيف حلقة بوابة
      const existing = this.getFigure(player?.playerNumber);
      const target = existing || await new Promise((res) => {
        const check = () => {
          const r = this.getFigure(player?.playerNumber);
          if (r) res(r); else setTimeout(check, 120);
        };
        check();
        setTimeout(() => res(this.getFigure(player?.playerNumber)), 2500);
      });
      if (!target) return;
      if (this.motionScale > 0.3) {
        target.rise = 1; // يصعد من تحت الأرض
        target.group.position.y = -3.4;
        // حلقة بوابة زرقاء
        const portal = new T.Mesh(
          new T.TorusGeometry(1.15, 0.09, 10, 44),
          new T.MeshBasicMaterial({ color: '#3b82f6', transparent: true, opacity: 0.95 })
        );
        portal.rotation.x = -Math.PI / 2;
        portal.position.copy(target.group.position).setY(0.12);
        this.scene.add(portal);
        this.bursts.push({ mesh: portal, life: 0, max: 1.6, kind: 'portal' });
        this._confettiBurst(target.group.position.clone().setY(2), 34);
      }
      this.cheerTarget = 1;
      if (window.soundEngine) window.soundEngine.rejoin();
    }

    giftBurst(player) {
      const rec = player ? this.getFigure(player.playerNumber) : null;
      const T = this.THREE;
      const pos = rec ? this.figureWorldPos(rec).setY(3.2)
        : new T.Vector3(0, 4, 6);
      if (this.motionScale > 0.3) {
        for (let i = 0; i < 7; i++) {
          const spr = new T.Sprite(new T.SpriteMaterial({
            map: new T.CanvasTexture(emojiSprite(pick(['❤️', '🌟', '💛', '🎁']), 96)),
            transparent: true, depthWrite: false
          }));
          spr.scale.setScalar(rand(0.55, 0.95));
          spr.position.copy(pos).add(new T.Vector3(rand(-0.8, 0.8), rand(-0.3, 0.6), rand(-0.5, 0.5)));
          this.scene.add(spr);
          this.shards.push({
            mesh: spr, sprite: true,
            vel: new T.Vector3(rand(-0.7, 0.7), rand(1.6, 2.6), rand(-0.7, 0.7)),
            rot: null, life: 0
          });
        }
      }
      this.cheerTarget = Math.min(1, this.cheerTarget + 0.35);
    }

    finalShow() {
      this.cheerTarget = 1;
      this.spotTimer = 6;
      if (window.soundEngine) window.soundEngine.victory();
      if (this.motionScale > 0.3) {
        // أعمدة نارية فوق الاستاد
        const T = this.THREE;
        for (let i = 0; i < 3; i++) {
          setTimeout(() => this._firework(new T.Vector3(rand(-8, 8), rand(7, 12), rand(-5, 5))), i * 550);
        }
      }
    }

    _firework(origin) {
      const T = this.THREE;
      const n = 90;
      const positions = new Float32Array(n * 3);
      const vels = [];
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        vels.push(new T.Vector3(s * Math.cos(th), u, s * Math.sin(th)).multiplyScalar(rand(5, 9)));
        positions[i * 3] = origin.x; positions[i * 3 + 1] = origin.y; positions[i * 3 + 2] = origin.z;
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(positions, 3));
      const pts = new T.Points(geo, new T.PointsMaterial({
        color: pick(['#fbbf24', '#f472b6', '#38bdf8', '#a78bfa']),
        size: 0.4, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false
      }));
      this.scene.add(pts);
      this.bursts.push({ mesh: pts, life: 0, max: 1.6, kind: 'firework', vels });
    }

    winShow(player) {
      const rec = this.getFigure(player?.playerNumber);
      this.cheerTarget = 1;
      if (rec) {
        this._focus = { rec, dist: 6.4, height: 3.2, orbit: true };
        // كأس ينزل فوق البطل
        const T = this.THREE;
        const trophy = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(emojiSprite('🏆', 160)), transparent: true, depthWrite: false }));
        trophy.scale.setScalar(2.4);
        const pos = this.figureWorldPos(rec);
        trophy.position.set(pos.x, 10, pos.z);
        this.scene.add(trophy);
        this.bursts.push({ mesh: trophy, life: 0, max: 5.5, kind: 'trophy', targetY: 6.6 });
        this._aimSpot(this.spotGold, new T.Vector3(0, 12, 0), pos.setY(2));
        this.spotGold.light.intensity = 320;
      }
      if (this.motionScale > 0.3) {
        // مطر ذهبي
        const T = this.THREE;
        const count = 220;
        const geo = new T.BufferGeometry();
        const positions = new Float32Array(count * 3);
        this._goldRainVels = [];
        for (let i = 0; i < count; i++) {
          positions[i * 3] = rand(-14, 14);
          positions[i * 3 + 1] = rand(10, 22);
          positions[i * 3 + 2] = rand(-14, 14);
          this._goldRainVels.push(rand(2.5, 4.5));
        }
        geo.setAttribute('position', new T.BufferAttribute(positions, 3));
        this.goldRain = new T.Points(geo, new T.PointsMaterial({ color: '#fde047', size: 0.3, transparent: true, opacity: 0.95, depthWrite: false }));
        this.scene.add(this.goldRain);
        this.goldRainLife = 0;
        for (let i = 0; i < 4; i++) {
          setTimeout(() => this._firework(new T.Vector3(rand(-9, 9), rand(8, 13), rand(-6, 6))), i * 700);
        }
      }
      if (window.soundEngine) window.soundEngine.victory();
    }

    reset() {
      this.clearMarks();
      this.flights.forEach(f => {
        this.scene.remove(f.rec.group);
      });
      this.flights = [];
      this._focus = null;
      this.cheerTarget = 0;
      this.wheelGroup.rotation.y = 0;
      if (this.goldRain) {
        this.scene.remove(this.goldRain);
        this.goldRain.geometry.dispose();
        this.goldRain = null;
      }
    }

    // ── الحلقة الرئيسية ──────────────────────────────────────
    _tick() {
      if (this._hidden) return;
      const T = this.THREE;
      const now = performance.now();
      const dt = Math.min((now - this._clock) / 1000, 0.05);
      this._clock = now;
      this._elapsed += dt;

      // حيوية الجمهور
      this.cheer = damp(this.cheer, this.cheerTarget, 1.6, dt);
      this.cheerTarget = damp(this.cheerTarget, 0.08, 0.35, dt); // يهدأ تدريجياً

      this._updateSpin(dt);
      this._updateCrowd(dt);
      this._updateFigures(dt);
      this._updateFlights(dt);
      this._updateShards(dt);
      this._updateBursts(dt);
      this._updateBootAttacks(dt);
      this._updateCamera(dt);
      this._updateLights(dt);

      this.renderer.render(this.scene, this.camera);
    }

    _updateCrowd(dt) {
      const T = this.THREE;
      const dummy = new T.Object3D();
      const cheer = this.cheer * this.motionScale;
      for (let i = 0; i < this.crowdData.length; i++) {
        const d = this.crowdData[i];
        const idle = Math.sin(this._elapsed * d.speed + d.phase) * 0.05;
        const jump = cheer > 0.15 ? Math.abs(Math.sin(this._elapsed * (2.1 + d.speed) + d.phase)) * cheer * 0.55 : 0;
        const y = d.y + idle + jump;
        const tilt = Math.sin(this._elapsed * 1.4 + d.phase) * 0.06 * cheer;
        dummy.position.set(d.x, y, d.z);
        dummy.scale.setScalar(d.size);
        dummy.rotation.set(0, Math.atan2(-d.x, -d.z) + Math.PI, tilt);
        dummy.updateMatrix();
        this.crowdBody.setMatrixAt(i, dummy.matrix);
        dummy.position.y = y + 0.62 * d.size;
        dummy.updateMatrix();
        this.crowdHead.setMatrixAt(i, dummy.matrix);
      }
      this.crowdBody.instanceMatrix.needsUpdate = true;
      this.crowdHead.instanceMatrix.needsUpdate = true;
    }

    _updateFigures(dt) {
      const T = this.THREE;
      for (const [, rec] of this.figures) {
        // قفزات الوجه (bounce physics)
        if (rec.bounceV !== 0 || rec.bounce !== 0) {
          rec.bounce += rec.bounceV * dt;
          rec.bounceV -= 16 * dt;
          if (rec.bounce <= 0) { rec.bounce = 0; rec.bounceV *= -0.45; if (Math.abs(rec.bounceV) < 0.4) rec.bounceV = 0; }
        }
        // صعود البوابة (عودة)
        if (rec.rise > 0) {
          rec.rise = damp(rec.rise, 0, 2.4, dt);
          rec.group.position.y = -3.4 * rec.rise;
          if (rec.rise < 0.02) { rec.rise = 0; rec.group.position.y = 0; }
        } else if (!this.flights.some(f => f.rec === rec)) {
          rec.group.position.y = rec.bounce;
        }
        // نبض حلقة التحذير
        if (rec.warnRing.visible) {
          const s = 1 + Math.sin(this._elapsed * 6) * 0.12;
          rec.warnRing.scale.setScalar(s);
        }
        // دوران حلقة الدرع
        if (rec.domeRing.visible) {
          rec.domeRing.rotation.z += dt * 1.6;
        }
        // نمو قبة الدرع
        if (rec.dome.visible && rec.dome.scale.x < 0.99) {
          rec._domeAnim = (rec._domeAnim || 0) + dt * 2.2;
          const s = Math.min(1, rec._domeAnim);
          rec.dome.scale.setScalar(0.001 + s * (1.02 - 0.001));
          if (s >= 1) rec.dome.scale.setScalar(1);
        }
        // تأرجح حماسي للشخصية
        if (rec.selected && this.motionScale > 0.3) {
          rec.group.rotation.z = Math.sin(this._elapsed * 5) * 0.05;
        } else {
          rec.group.rotation.z = damp(rec.group.rotation.z, 0, 6, dt);
        }
        // اللوحات تواجه الكاميرا
        const camPos = this.camera.position;
        rec.plate.lookAt(camPos);
      }
    }

    _updateFlights(dt) {
      for (let i = this.flights.length - 1; i >= 0; i--) {
        const f = this.flights[i];
        f.life += dt;
        f.vel.y -= 15 * dt;
        f.rec.group.position.addScaledVector(f.vel, dt);
        f.rec.group.rotation.x += f.spin.x * dt;
        f.rec.group.rotation.y += f.spin.y * dt;
        f.rec.group.rotation.z += f.spin.z * dt;
        const k = Math.max(0.05, 1 - f.life / 2.2);
        f.rec.group.scale.setScalar(k);
        if (f.life > 2.3) {
          this.scene.remove(f.rec.group);
          this.flights.splice(i, 1);
        }
      }
    }

    _updateShards(dt) {
      for (let i = this.shards.length - 1; i >= 0; i--) {
        const s = this.shards[i];
        s.life += dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        if (!s.sprite) s.vel.y -= 9 * dt;
        if (s.rot) {
          s.mesh.rotation.x += s.rot.x * dt;
          s.mesh.rotation.y += s.rot.y * dt;
        }
        s.mesh.material.transparent = true;
        s.mesh.material.opacity = Math.max(0, 1 - s.life / (s.sprite ? 1.6 : 1.3));
        if (s.life > (s.sprite ? 1.6 : 1.3)) {
          this.scene.remove(s.mesh);
          this.shards.splice(i, 1);
        }
      }
    }

    _updateBursts(dt) {
      const T = this.THREE;
      for (let i = this.bursts.length - 1; i >= 0; i--) {
        const b = this.bursts[i];
        b.life += dt;
        const k = b.life / b.max;
        if (b.kind === 'ring') {
          b.mesh.scale.setScalar(1 + k * 6);
          b.mesh.material.opacity = 1 - k;
        } else if (b.kind === 'burst' || b.kind === 'firework') {
          const pos = b.mesh.geometry.attributes.position;
          for (let j = 0; j < b.vels.length; j++) {
            const v = b.vels[j];
            pos.array[j * 3] += v.x * dt;
            pos.array[j * 3 + 1] += v.y * dt;
            pos.array[j * 3 + 2] += v.z * dt;
            if (b.kind === 'firework') { v.y -= 6 * dt; v.multiplyScalar(1 - 0.9 * dt); }
            else { v.y -= 10 * dt; }
          }
          pos.needsUpdate = true;
          b.mesh.material.opacity = 1 - k;
        } else if (b.kind === 'portal') {
          b.mesh.scale.setScalar(1 + Math.sin(b.life * 9) * 0.1 + k * 0.8);
          b.mesh.material.opacity = 0.95 * (1 - k);
        } else if (b.kind === 'trophy') {
          b.mesh.position.y = damp(b.mesh.position.y, b.targetY, 2, dt);
          b.mesh.position.x += Math.sin(b.life * 2) * 0.003;
        }
        if (b.life >= b.max) {
          this.scene.remove(b.mesh);
          if (b.mesh.geometry) b.mesh.geometry.dispose();
          if (b.mesh.material) b.mesh.material.dispose();
          this.bursts.splice(i, 1);
        }
      }
      // مطر ذهبي الفوز
      if (this.goldRain) {
        this.goldRainLife += dt;
        const pos = this.goldRain.geometry.attributes.position;
        for (let i = 0; i < this._goldRainVels.length; i++) {
          pos.array[i * 3 + 1] -= this._goldRainVels[i] * dt;
          if (pos.array[i * 3 + 1] < 0.1) pos.array[i * 3 + 1] = rand(10, 22);
        }
        pos.needsUpdate = true;
        if (this.goldRainLife > 9) {
          this.scene.remove(this.goldRain);
          this.goldRain.geometry.dispose();
          this.goldRain = null;
        }
      }
    }

    _updateBootAttacks(dt) {
      const T = this.THREE;
      // هجوم الدفاع (يرتد بالدرع)
      if (this._bootAttack) {
        const s = this._bootAttack;
        s.t += dt;
        const target = this.figureWorldPos(s.rec);
        if (s.phase === 'drop') {
          const k = Math.min(s.t / 0.7, 1);
          s.boot.position.y = damp(s.boot.position.y, target.y + 1.6, 6, dt);
          if (s.t > 0.75) {
            s.phase = 'rebound';
            s.t = 0;
            this.shake = Math.min(1, this.shake + 0.25);
            this._impactRing(target.clone().setY(1));
          }
        } else if (s.phase === 'rebound') {
          s.boot.position.x += (s.boot.position.x - 0) * 0 + 26 * dt; // يطير عكسياً
          s.boot.position.y += 8 * dt;
          s.boot.rotation.z -= 10 * dt;
          if (s.t > 1.2) {
            this.scene.remove(s.boot);
            this._bootAttack = null;
            // الدرع يبقى (اللاعب محمي أصلاً) أو يخفى إن لم يكن له درع دائم
          }
        }
      }
      // الرفسة القاتلة
      if (this._kick) {
        const s = this._kick;
        s.t += dt;
        const target = s.pos;
        if (s.phase === 'drop') {
          s.boot.position.y = damp(s.boot.position.y, target.y + 1.35, 5.5, dt);
          if (s.t > 0.62) {
            s.phase = 'done';
            this.shake = Math.min(1, this.shake + 1);
            this._impactRing(target.clone().setY(1));
            if (window.soundEngine) window.soundEngine.eliminatedGong();
            this._launchVictim(s.rec);
            this._confettiBurst(target.clone().setY(2), 40);
            setTimeout(() => {
              if (this._kick && this._kick.boot) this.scene.remove(this._kick.boot);
              this._kick = null;
            }, 500);
          }
        }
      }
    }

    _updateCamera(dt) {
      const T = this.THREE;
      let targetPos, targetLook;
      if (this._focus && this._focus.rec) {
        const pos = this.figureWorldPos(this._focus.rec);
        const dirOut = new T.Vector3(pos.x, 0, pos.z);
        if (dirOut.lengthSq() < 0.01) dirOut.set(0, 0, 1);
        dirOut.normalize();
        if (this._focus.orbit) {
          const a = this._elapsed * 0.5;
          targetPos = new T.Vector3(
            pos.x + Math.sin(a) * this._focus.dist,
            pos.y + this._focus.height,
            pos.z + Math.cos(a) * this._focus.dist
          );
        } else {
          targetPos = new T.Vector3(
            pos.x + dirOut.x * this._focus.dist * 0.7 + dirOut.z * this._focus.dist * 0.6,
            pos.y + this._focus.height,
            pos.z + dirOut.z * this._focus.dist * 0.7 - dirOut.x * this._focus.dist * 0.6
          );
        }
        targetLook = pos.clone().setY(pos.y + 1.6);
      } else {
        const p = this.cameraPreset;
        targetPos = p.pos;
        targetLook = p.look;
      }
      this._camPos.x = damp(this._camPos.x, targetPos.x, 2.6, dt);
      this._camPos.y = damp(this._camPos.y, targetPos.y, 2.6, dt);
      this._camPos.z = damp(this._camPos.z, targetPos.z, 2.6, dt);
      this._camLook.x = damp(this._camLook.x, targetLook.x, 3.2, dt);
      this._camLook.y = damp(this._camLook.y, targetLook.y, 3.2, dt);
      this._camLook.z = damp(this._camLook.z, targetLook.z, 3.2, dt);

      this.camera.position.copy(this._camPos);
      // اهتزاز الكاميرا
      if (this.shake > 0.01 && this.motionScale > 0.3) {
        this.shake = damp(this.shake, 0, 3.5, dt);
        this.camera.position.x += rand(-1, 1) * 0.35 * this.shake;
        this.camera.position.y += rand(-1, 1) * 0.28 * this.shake;
      }
      this.camera.lookAt(this._camLook);
    }

    _updateLights(dt) {
      // مسح الأضواء في الحسم النهائي
      if (this.spotTimer > 0) {
        this.spotTimer -= dt;
        const a = this._elapsed * 1.4;
        this.towerCones.forEach((c, i) => {
          c.rotation.z = Math.sin(a + i * 1.6) * 0.16;
          c.material.opacity = 0.1 + Math.abs(Math.sin(a * 1.3 + i)) * 0.1;
        });
        if (this.spotTimer <= 0) {
          this.towerCones.forEach(c => { c.rotation.z = 0; c.material.opacity = 0.07; });
        }
      }
      // نبض شريط LED مع الحماس
      this.ledRing.material.emissiveIntensity = 1.6 + this.cheer * 2.4 + Math.sin(this._elapsed * 6) * 0.4;
    }
  }

  window.Arena3DLoader = {
    async create(mount) {
      const THREE = await loadTHREE();
      if (!THREE) return null;
      return new Arena3D(THREE, mount);
    }
  };
})();
