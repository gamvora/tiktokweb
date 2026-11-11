// ============================================================
// 3D Celebration — Three.js (lazy-loaded, fully disposed after use)
// Applied patterns from the threejs-animation skill:
//   • Timer/delta pattern: frame-rate independent motion
//   • renderer.setAnimationLoop() instead of manual rAF
//   • Procedural motion (sway/camera drift), full resource disposal
// Costs nothing until a win: three.js is dynamic-imported on demand.
// ============================================================
(function () {
  'use strict';

  const state = { running: false, cleanup: null };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async function loadTHREE() {
    if (window.__THREE_MODULE__) return window.__THREE_MODULE__;
    const urls = [
      'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js',
      'https://unpkg.com/three@0.180.0/build/three.module.js'
    ];
    for (const url of urls) {
      try { window.__THREE_MODULE__ = await import(url); return window.__THREE_MODULE__; } catch (e) { /* try next */ }
    }
    return null;
  }

  function makeConfetti(THREE, colors, count) {
    const geo = new THREE.PlaneGeometry(0.55, 0.9);
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const dummy = new THREE.Object3D();
    const data = [];
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      data.push({
        x: (Math.random() * 2 - 1) * 26,
        y: 16 + Math.random() * 22,
        z: (Math.random() * 2 - 1) * 8,
        vy: -(3.5 + Math.random() * 4.5),
        vx: (Math.random() * 2 - 1) * 1.4,
        rx: Math.random() * Math.PI,
        ry: Math.random() * Math.PI,
        wx: (Math.random() * 2 - 1) * 3.2,
        wy: (Math.random() * 2 - 1) * 3.2,
        sway: Math.random() * Math.PI * 2,
        swayAmp: 0.6 + Math.random() * 1.3,
        scale: 0.7 + Math.random() * 0.7
      });
      mesh.setColorAt(i, c.set(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return { mesh, dummy, data };
  }

  function makeFirework(THREE, color, origin) {
    const n = 110;
    const positions = new Float32Array(n * 3);
    const velocities = [];
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1;
      const th = Math.random() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const v = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)).multiplyScalar(7 + Math.random() * 7);
      velocities.push(v);
      positions[i * 3] = origin.x;
      positions[i * 3 + 1] = origin.y;
      positions[i * 3 + 2] = origin.z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color, size: 0.5, transparent: true, opacity: 1,
      blending: THREE.AdditiveBlending, depthWrite: false
    });
    return { pts: new THREE.Points(geo, mat), velocities, life: 0, maxLife: 1.7 };
  }

  async function start(mode) {
    mode = mode || 'win';
    if (state.running || reducedMotion()) return;
    state.running = true;

    const THREE = await loadTHREE();
    if (!THREE) { state.running = false; return; } // offline: CSS confetti in the modal still plays

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // perf rule from the skill
    renderer.setSize(window.innerWidth, window.innerHeight);
    const canvas = renderer.domElement;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:950;pointer-events:none;opacity:1;transition:opacity 0.6s ease;';
    document.body.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 30);
    camera.lookAt(0, 4, 0);

    const colors = ['#fbbf24', '#a855f7', '#ef4444', '#10b981', '#3b82f6', '#ffffff'];
    const confetti = makeConfetti(THREE, colors, mode === 'win' ? 320 : 160);
    scene.add(confetti.mesh);

    const fireworks = [];
    const burstCount = mode === 'win' ? 5 : 2;
    let nextBurst = 0.5;

    const total = mode === 'win' ? 9 : 3.5;
    let elapsed = 0;
    let last = performance.now();
    const getDelta = () => {
      const now = performance.now();
      const d = Math.min((now - last) / 1000, 0.05);
      last = now;
      return d;
    };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    function frame() {
      const dt = getDelta();
      elapsed += dt;

      // Confetti: frame-rate independent fall + tumble + sway
      const { mesh, dummy, data } = confetti;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        d.y += d.vy * dt;
        d.sway += dt * 1.6;
        d.x += (d.vx + Math.sin(d.sway) * d.swayAmp) * dt;
        d.rx += d.wx * dt;
        d.ry += d.wy * dt;
        if (d.y < -18) { d.y = 18 + Math.random() * 8; d.x = (Math.random() * 2 - 1) * 26; }
        dummy.position.set(d.x, d.y, d.z);
        dummy.rotation.set(d.rx, d.ry, 0);
        dummy.scale.setScalar(d.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;

      // Fireworks: spawn staggered bursts, expand with gravity + drag, fade out
      nextBurst -= dt;
      if (nextBurst <= 0 && fireworks.length < burstCount && elapsed < total * 0.7) {
        const f = makeFirework(THREE, colors[fireworks.length % colors.length], {
          x: (Math.random() * 2 - 1) * 14,
          y: 4 + Math.random() * 8,
          z: 0
        });
        scene.add(f.pts);
        fireworks.push(f);
        nextBurst = 0.9 + Math.random() * 0.8;
      }
      for (let i = fireworks.length - 1; i >= 0; i--) {
        const f = fireworks[i];
        f.life += dt;
        const pos = f.pts.geometry.attributes.position;
        for (let j = 0; j < f.velocities.length; j++) {
          const v = f.velocities[j];
          pos.array[j * 3] += v.x * dt;
          pos.array[j * 3 + 1] += v.y * dt;
          pos.array[j * 3 + 2] += v.z * dt;
          v.y -= 6 * dt;
          v.multiplyScalar(Math.max(0, 1 - 0.9 * dt));
        }
        pos.needsUpdate = true;
        f.pts.material.opacity = Math.max(0, 1 - f.life / f.maxLife);
        if (f.life > f.maxLife) {
          scene.remove(f.pts);
          f.pts.geometry.dispose();
          f.pts.material.dispose();
          fireworks.splice(i, 1);
        }
      }

      // Gentle procedural camera drift
      camera.position.x = Math.sin(elapsed * 0.3) * 2.2;
      camera.position.y = 0.5 + Math.sin(elapsed * 0.21) * 1.2;
      camera.lookAt(0, 4, 0);

      renderer.render(scene, camera);
      if (elapsed >= total) finish();
    }

    function finish() {
      if (!state.running) return;
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      canvas.style.opacity = '0';
      setTimeout(() => {
        try {
          confetti.mesh.geometry.dispose();
          confetti.mesh.material.dispose();
          fireworks.forEach((f) => { f.pts.geometry.dispose(); f.pts.material.dispose(); });
          renderer.dispose();
          canvas.remove();
        } catch (e) { /* ignore */ }
        state.running = false;
        state.cleanup = null;
      }, 650);
    }

    renderer.setAnimationLoop(frame); // per the skill: setAnimationLoop over manual rAF
    state.cleanup = finish;
    setTimeout(() => { if (state.running) finish(); }, (total + 2.5) * 1000); // hard safety cap
  }

  window.celebration3D = {
    start,
    stop: () => { if (state.cleanup) state.cleanup(); }
  };
})();
