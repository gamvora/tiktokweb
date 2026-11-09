p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """    applyWheelConfigFromSnapshot();
    if (wheel && currentSnapshot?.settings?.streamerAvatar) wheel.setCenterImage(currentSnapshot.settings.streamerAvatar);
    renderAll();"""
new = """    applyWheelConfigFromSnapshot();
    if (wheel && currentSnapshot?.settings?.streamerAvatar) wheel.setCenterImage(currentSnapshot.settings.streamerAvatar);
    renderAll();
    updateGiftTicker();"""
assert old in s
s = s.replace(old, new, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
