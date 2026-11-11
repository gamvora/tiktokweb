# -*- coding: utf-8 -*-
# يولّد game3d.html من index.html مع تعديلات موضعية فقط:
# العنوان + مركز الاستاد 3D + زر العودة 2D + سكربتات three/adapter
import io

src = io.open('index.html', encoding='utf-8').read()

# 1) العنوان
src = src.replace(
    '<title>🎡 روليت تيك توك لايف - شاشة العرض والبث المباشر</title>',
    '<title>🏟️ روليت تيك توك لايف 3D - الاستاد الحقيقي</title>'
)

# 2) رابط CSS الخاص بصفحة 3D
src = src.replace(
    '<link rel="stylesheet" href="css/design-tokens.css">',
    '<link rel="stylesheet" href="css/design-tokens.css">\n  <link rel="stylesheet" href="css/game3d.css">'
)

# 3) شعار/عنوان الترويسة + زر العودة إلى 2D
src = src.replace(
    '<h1 class="brand-title">روليت تيك توك لايف</h1>',
    '<h1 class="brand-title">روليت تيك توك لايف <span style="color:#a78bfa;">3D</span></h1>'
)
src = src.replace(
    '''      <div class="header-controls">
        <button id="btnToggleSound" class="header-btn" title="كتم / تشغيل المؤثرات الصوتية">🔊</button>''',
    '''      <div class="header-controls">
        <button id="btnGo2D" class="header-btn" title="العودة إلى النسخة الكلاسيكية 2D" style="font-size:12px;">↩ 2D</button>
        <button id="btnToggleSound" class="header-btn" title="كتم / تشغيل المؤثرات الصوتية">🔊</button>'''
)

# 4) المركز: استاد 3D بدل كانفس العجلة
old_center = '''      <!-- Center Arena: Roulette Wheel + Prominent Spin Button -->
      <section class="center-arena">
        <div class="wheel-container">
          <canvas id="rouletteCanvas" width="600" height="600"></canvas>
        </div>'''
new_center = '''      <!-- Center Arena: استاد ثلاثي الأبعاد + زر التدوير -->
      <section class="center-arena">
        <div id="rouletteCanvas" class="wheel-container g3-stage">
          <!-- Three.js يركّب الاستاد هنا (الأشكال/الجمهور/العجلة الدوارة) -->
        </div>'''
assert old_center in src, 'center arena block not found'
src = src.replace(old_center, new_center)

# 5) السكربتات: arena3d + game3d قبل overlay.js
old_scripts = '''  <script src="js/roulette.js"></script>
  <script src="js/celebration3d.js"></script>
  <script src="js/overlay.js"></script>'''
new_scripts = '''  <script src="js/roulette.js"></script>
  <script src="js/celebration3d.js"></script>
  <script src="js/arena3d.js"></script>
  <script src="js/game3d.js"></script>
  <script src="js/overlay.js"></script>'''
assert old_scripts in src, 'scripts block not found'
src = src.replace(old_scripts, new_scripts)

io.open('game3d.html', 'w', encoding='utf-8', newline='\n').write(src)
print('game3d.html written, len =', len(src))
