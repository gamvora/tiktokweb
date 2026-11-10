p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
# expose updateGiftTicker globally
old = "  function updateGiftTicker() {"
new = "  window.__updateGiftTicker = function() { try { updateGiftTickerImpl(); } catch(e){ console.error('ticker err', e); } };\n  function updateGiftTickerImpl() {"
assert old in s
s = s.replace(old, new, 1)
# rename calls to updateGiftTicker() -> window.__updateGiftTicker() won't work since local. Instead keep name but add try/catch inside.
# Actually simpler: wrap body. Let's just add console.log at start.
old2 = "  function updateGiftTickerImpl() {\n    if (!giftTickerTrack) return;"
new2 = "  function updateGiftTickerImpl() {\n    console.log('updateGiftTicker called, track=', !!giftTickerTrack, 'snapshot=', !!currentSnapshot);\n    if (!giftTickerTrack) return;"
assert old2 in s
s = s.replace(old2, new2, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
PY