p = 'index.html'
s = open(p, encoding='utf-8').read()

# 1. script tags
old = """  <script src="js/backend.js"></script>
  <script src="js/audio.js"></script>
  <script src="js/roulette.js"></script>
  <script src="js/overlay.js"></script>"""
new = """  <script src="js/backend.js"></script>
  <script src="js/game-config.js"></script>
  <script src="js/game-engine.js"></script>
  <script src="js/tiktok-live.js"></script>
  <script src="js/audio.js"></script>
  <script src="js/roulette.js"></script>
  <script src="js/overlay.js"></script>"""
assert old in s
s = s.replace(old, new)

# 2. gift ticker after header
old = """  </header>
"""
new = """  </header>

  <!-- Gift Ticker -->
  <div id="giftTicker" class="gift-ticker">
    <div id="giftTickerTrack" class="gift-ticker-track"></div>
  </div>
"""
assert old in s
s = s.replace(old, new, 1)

# 3. drawer buttons after status text
old = """              <div id="drawerTiktokStatusText" style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">
                ⚪ غير متصل بالبث المباشر
              </div>"""
new = """              <div id="drawerTiktokStatusText" style="margin-top: 8px; font-size: 13px; color: var(--text-muted);">
                ⚪ غير متصل بالبث المباشر
              </div>
              <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                <button id="btnCopyObsLinkDrawer" class="drawer-btn" style="flex:1; font-size:12px;">📋 نسخ رابط OBS</button>
                <button id="btnDrawerChangeAccount" class="drawer-btn" style="flex:1; font-size:12px;">🔄 تغيير الحساب</button>
              </div>"""
assert old in s
s = s.replace(old, new)

# 4. welcome modal before Scripts
old = """  <!-- Scripts -->"""
new = """  <!-- Welcome / Connect Modal -->
  <div id="welcomeModal" class="overlay-modal welcome-modal">
    <div class="welcome-content">
      <div class="welcome-logo">🎡</div>
      <h2 class="welcome-title">روليت تيك توك لايف</h2>
      <p class="welcome-sub">أدخل اسم المستخدم (بدون @) للتحقق من البث وربط الأحداث تلقائياً.</p>
      <div class="welcome-row">
        <input type="text" id="welcomeUsername" class="drawer-input" placeholder="therealadhamyy" dir="ltr" style="text-align:left;">
        <button id="btnWelcomeConnect" class="drawer-btn drawer-btn-primary" style="white-space:nowrap;">🔗 ربط بالبث</button>
      </div>
      <div id="welcomeStatus" style="margin-top:10px; font-size:13px;"></div>
      <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
        <button id="btnWelcomeDemo" class="drawer-btn" style="flex:1;">⚡ تجربة بدون بث</button>
      </div>
      <div id="obsLinkBox" style="display:none; margin-top:14px;">
        <label class="drawer-label">رابط OBS (انسخه في المتصفح أو OBS):</label>
        <div class="welcome-row">
          <input type="text" id="obsLinkInput" class="drawer-input" readonly dir="ltr" style="text-align:left; font-size:12px;">
          <button id="btnCopyObsLink" class="drawer-btn" style="white-space:nowrap;">📋 نسخ</button>
        </div>
      </div>
    </div>
  </div>

  <!-- Scripts -->"""
assert old in s
s = s.replace(old, new)

open(p, 'w', encoding='utf-8').write(s)
print('done')
