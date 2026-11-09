p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """  function applyWheelConfigFromSnapshot() {
    const wc = currentSnapshot?.settings?.wheelConfig;
    if (wc) {
      wheel.updateConfig(wc);
      if (wheelThemeSelect) wheelThemeSelect.value = wc.theme || 'casino';
      if (wheelSpinDuration) wheelSpinDuration.value = wc.spinDuration || 6500;
      if (wheelShowAvatars) wheelShowAvatars.checked = wc.showPlayerAvatars !== false;
      if (wheelShowNames) wheelShowNames.checked = wc.showPlayerNames !== false;
    }
  }"""
new = """  function applyWheelConfigFromSnapshot() {
    const wc = currentSnapshot?.settings?.wheelConfig;
    if (wc) {
      wheel.updateConfig(wc);
      if (wheelThemeSelect) wheelThemeSelect.value = wc.theme || 'casino';
      if (wheelSpinDuration) wheelSpinDuration.value = wc.spinDuration || 6500;
      if (wheelShowAvatars) wheelShowAvatars.checked = wc.showPlayerAvatars !== false;
      if (wheelShowNames) wheelShowNames.checked = wc.showPlayerNames !== false;
    }
    const avatar = currentSnapshot?.settings?.streamerAvatar;
    if (avatar && wheel && wheel.setCenterImage) wheel.setCenterImage(avatar);
  }"""
assert old in s
s = s.replace(old, new, 1)

old2 = """    currentSnapshot = localEngine.getSnapshot();
    allPlayers = localEngine.players || [];
    applyWheelConfigFromSnapshot();
    renderAll();"""
new2 = """    currentSnapshot = localEngine.getSnapshot();
    allPlayers = localEngine.players || [];
    applyWheelConfigFromSnapshot();
    if (wheel && currentSnapshot?.settings?.streamerAvatar) wheel.setCenterImage(currentSnapshot.settings.streamerAvatar);
    renderAll();"""
# this may or may not exist; only replace if present
if old2 in s:
    s = s.replace(old2, new2, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
