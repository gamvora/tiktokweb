p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """      const updated = {
        joinKeyword: setDrawerJoinKw?.value?.trim() || 'تم',
        maxPlayers: parseInt(setDrawerMaxPlayers?.value || '30', 10),
        timeoutBehavior: setDrawerTimeout?.value || 'skip',
        timers: {
          targetSelectDuration: parseInt(setDrawerTargetSec?.value || '20', 10),
          defenseDuration: parseInt(setDrawerDefSec?.value || '30', 10)
        }
      };"""
new = """      const updated = {
        joinKeyword: setDrawerJoinKw?.value?.trim() || 'تم',
        maxPlayers: parseInt(setDrawerMaxPlayers?.value || '30', 10),
        timeoutBehavior: setDrawerTimeout?.value || 'skip',
        streamerAvatar: setDrawerStreamerAvatar?.value?.trim() || '',
        streamerName: setDrawerStreamerName?.value?.trim() || '',
        timers: {
          targetSelectDuration: parseInt(setDrawerTargetSec?.value || '20', 10),
          defenseDuration: parseInt(setDrawerDefSec?.value || '30', 10)
        }
      };"""
assert old in s
s = s.replace(old, new, 1)
# wheel center image update
old2 = """      if (BACKEND_URL || STANDALONE_MODE) {
        await apiPost('/settings', updated);
      } else {"""
new2 = """      if (BACKEND_URL || STANDALONE_MODE) {
        await apiPost('/settings', updated);
        if (wheel && updated.streamerAvatar) wheel.setCenterImage(updated.streamerAvatar);
      } else {"""
assert old2 in s
s = s.replace(old2, new2, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
