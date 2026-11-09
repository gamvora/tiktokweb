p = 'index.html'
lines = open(p, encoding='utf-8').read().splitlines(keepends=True)
# find the submit button line
idx = None
for i, l in enumerate(lines):
    if 'type="submit" class="drawer-btn drawer-btn-primary"' in l:
        idx = i
        break
print('submit idx', idx)
# insert before idx
insert = '''               <div class="drawer-form-group" style="margin-top:10px;">
                 <label class="drawer-label">صورة صاحب البث (URL):</label>
                 <input type="text" id="setDrawerStreamerAvatar" class="drawer-input" placeholder="https://.../avatar.png">
               </div>
               <div class="drawer-form-group" style="margin-top:10px;">
                 <label class="drawer-label">اسم صاحب البث:</label>
                 <input type="text" id="setDrawerStreamerName" class="drawer-input" placeholder="اسمك">
               </div>
'''
lines.insert(idx, insert)
open(p, 'w', encoding='utf-8').write(''.join(lines))
print('done')
