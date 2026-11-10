p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """    renderAll();
    updateGiftTickerImpl();
    applyBackground(currentSnapshot?.settings?.background);"""
new = """    renderAll();
    console.log('BEFORE ticker, track=', !!giftTickerTrack, 'snapshot=', !!currentSnapshot);
    updateGiftTickerImpl();
    console.log('AFTER ticker, trackLen=', giftTickerTrack?.innerHTML?.length);
    applyBackground(currentSnapshot?.settings?.background);"""
assert old in s
s = s.replace(old, new, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
PY