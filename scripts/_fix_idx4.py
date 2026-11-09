p = 'index.html'
lines = open(p, encoding='utf-8').read().splitlines(keepends=True)
# find line with setDrawerDefSec input
idx = None
for i, l in enumerate(lines):
    if 'setDrawerDefSec' in l:
        idx = i
        break
print('idx', idx, lines[idx])
# insert after the closing </div> of that form-group: find next '</div>' after idx
j = idx
while j < len(lines) and '</div>' not in lines[j]:
    j += 1
# j now at first </div> after input; move to next </div> (row close) maybe
k = j + 1
while k < len(lines) and '</div>' not in lines[k]:
    k += 1
print('row close idx', k)
insert = '''               <div class="drawer-form-group" style="margin-top:10px;">
                 <label class="drawer-label">صورة صاحب البث (URL):</label>
                 <input type="text" id="setDrawerStreamerAvatar" class="drawer-input" placeholder="https://.../avatar.png">
               </div>
               <div class="drawer-form-group" style="margin-top:10px;">
                 <label class="drawer-label">اسم صاحب البث:</label>
                 <input type="text" id="setDrawerStreamerName" class="drawer-input" placeholder="اسمك">
               </div>
'''
lines.insert(k+1, insert)
# ticker after header: find </header>
h = None
for i, l in enumerate(lines):
    if '</header>' in l:
        h = i
        break
print('header idx', h)
ticker = '''\n  <!-- Gift Ticker -->\n  <div id="giftTicker" class="gift-ticker">\n    <div id="giftTickerTrack" class="gift-ticker-track"></div>\n  </div>\n'''
lines.insert(h+1, ticker)
open(p, 'w', encoding='utf-8').write(''.join(lines))
print('done')
