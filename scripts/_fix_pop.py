p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """    if (setDrawerDefSec) setDrawerDefSec.value = s.timers?.defenseDuration || 30;
  }"""
new = """    if (setDrawerDefSec) setDrawerDefSec.value = s.timers?.defenseDuration || 30;
    if (setDrawerStreamerAvatar) setDrawerStreamerAvatar.value = s.streamerAvatar || '';
    if (setDrawerStreamerName) setDrawerStreamerName.value = s.streamerName || '';
  }"""
assert old in s
s = s.replace(old, new, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
