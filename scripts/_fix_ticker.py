p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """  function updateSpinButtonState() {"""
new = """  function updateGiftTicker() {
    if (!giftTickerTrack) return;
    const gifts = currentSnapshot?.settings?.gifts || {};
    const cats = [
      { key: 'defense', label: '🛡️ دفاع عن النفس', desc: 'يلغي الإقصاء فوراً' },
      { key: 'shield', label: '🛡️ حصانة (قلب)', desc: 'قلب إضافي — يُستهلك عند الإقصاء' },
      { key: 'rejoin', label: '🔄 عودة للعبة', desc: 'إعادة لاعب مستبعد' },
      { key: 'help', label: '❤️ مساعدة/إنقاذ', desc: 'إنقاذ لاعب مستبعد' },
      { key: 'finalRound', label: '🚀 حسم الجولة', desc: 'حسم الجولة النهائية' },
      { key: 'winnerChallenge', label: '👑 تحدي الفائز', desc: 'تحدي البطل' }
    ];
    const items = cats.map(c => {
      const conf = gifts[c.key];
      const info = getGiftInfo(conf?.giftId || conf?.giftName || 'rose');
      const img = info.image;
      const name = conf?.giftName || info.nameAr;
      const coins = conf?.minCoins || info.coins || 1;
      return `<div class="ticker-item"><img src="${img}" alt=""><span class="ticker-name">${name}</span><span class="ticker-coins">${coins} عملة</span><span class="ticker-desc">${c.label} — ${c.desc}</span></div>`;
    }).join('');
    // duplicate for seamless loop
    giftTickerTrack.innerHTML = items + items;
  }

  function updateSpinButtonState() {"""
assert old in s
s = s.replace(old, new, 1)
# call updateGiftTicker in state_updated handler and init
old2 = """    socket.on('state_updated', (snapshot) => {
      currentSnapshot = snapshot;"""
new2 = """    socket.on('state_updated', (snapshot) => {
      currentSnapshot = snapshot;
      updateGiftTicker();"""
assert old2 in s
s = s.replace(old2, new2, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
