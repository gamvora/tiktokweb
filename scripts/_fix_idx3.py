p = 'index.html'
s = open(p, encoding='utf-8').read()

# gift ticker after header
old = "  </header>\n"
new = "  </header>\n\n  <!-- Gift Ticker -->\n  <div id=\"giftTicker\" class=\"gift-ticker\">\n    <div id=\"giftTickerTrack\" class=\"gift-ticker-track\"></div>\n  </div>\n"
assert old in s
s = s.replace(old, new, 1)

# streamer avatar inputs before settings submit button (second occurrence)
# find by id setDrawerDefSec then insert after its closing div
old = """                 <input type="number" id="setDrawerDefSec" class="drawer-input" value="30">
                 </div>
               </div>"""
new = """                 <input type="number" id="setDrawerDefSec" class="drawer-input" value="30">
                 </div>
               </div>
               <div class="drawer-form-group" style="margin-top:10px;">
                 <label class="drawer-label">صورة صاحب البث (URL):</label>
                 <input type="text" id="setDrawerStreamerAvatar" class="drawer-input" placeholder="https://.../avatar.png">
               </div>
               <div class="drawer-form-group" style="margin-top:10px;">
                 <label class="drawer-label">اسم صاحب البث:</label>
                 <input type="text" id="setDrawerStreamerName" class="drawer-input" placeholder="اسمك">
               </div>"""
assert old in s
s = s.replace(old, new, 1)

open(p, 'w', encoding='utf-8').write(s)
print('done')
