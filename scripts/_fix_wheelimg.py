p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """  function applyWheelConfigFromSnapshot() {
    const wc = currentSnapshot?.settings?.wheelConfig;
    if (wc) {
      wheel.updateConfig(wc);
      if (wheelThemeSelect) wheelThemeSelect.value = wc.theme || 'casino';
      if (wheelSpinDuration) wheelSpinDuration.value = wc.spinDuration || 6500;
    }
  }"""
new = """  function applyWheelConfigFromSnapshot() {
    const wc = currentSnapshot?.settings?.wheelConfig;
    if (wc) {
      wheel.updateConfig(wc);
      if (wheelThemeSelect) wheelThemeSelect.value = wc.theme || 'casino';
      if (wheelSpinDuration) wheelSpinDuration.value = wc.spinDuration || 6500;
    }
    const avatar = currentSnapshot?.settings?.streamerAvatar;
    if (avatar && wheel && wheel.setCenterImage) wheel.setCenterImage(avatar);
  }"""
assert old in s
s = s.replace(old, new, 1)
# also in startStandaloneMode after applyWheelConfigFromSnapshot call, ensure center image
old2 = """    currentSnapshot = localEngine.getSnapshot();
    allPlayers = localEngine.players || [];
    applyWheelConfigFromSnapshot();
    renderAll();"""
new2 = """    currentSnapshot = localEngine.getSnapshot();
    allPlayers = localEngine.players || [];
    applyWheelConfigFromSnapshot();
    if (wheel && currentSnapshot?.settings?.streamerAvatar) wheel.setCenterImage(currentSnapshot.settings.streamerAvatar);
    renderAll();"""
assert old2 in s
s = s.replace(old2, new2, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
