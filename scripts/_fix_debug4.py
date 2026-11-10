p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """    console.log('BEFORE ticker, track=', !!giftTickerTrack, 'snapshot=', !!currentSnapshot);
    updateGiftTickerImpl();
    console.log('AFTER ticker, trackLen=', giftTickerTrack?.innerHTML?.length);"""
new = "    updateGiftTickerImpl();"
assert old in s
s = s.replace(old, new, 1)

# remove the console.log inside updateGiftTickerImpl
old2 = "    console.log('updateGiftTicker called, track=', !!giftTickerTrack, 'snapshot=', !!currentSnapshot);\n    if (!giftTickerTrack) return;"
new2 = "    if (!giftTickerTrack) return;"
assert old2 in s
s = s.replace(old2, new2, 1)

# rename updateGiftTickerImpl back to updateGiftTicker for clarity? Keep as is, but update calls
# Actually rename function back
s = s.replace("  window.__updateGiftTicker = function() { try { updateGiftTickerImpl(); } catch(e){ console.error('ticker err', e); } };\n  function updateGiftTickerImpl() {",
              "  function updateGiftTicker() {")
s = s.replace("      updateGiftTickerImpl();", "      updateGiftTicker();")
open(p, 'w', encoding='utf-8').write(s)
print('done')
PY