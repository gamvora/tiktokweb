p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
# Remove demo mode banner announcements
old1 = "    setBanner('⚡ وضع Demo - اضغط [تدوير الروليت] لتجربة اللعبة!');"
new1 = ""
old2 = "        setBanner('⚡ وضع التجربة — اضغط [تدوير الروليت] لتجربة اللعبة');"
new2 = ""
for old, new in [(old1,new1),(old2,new2)]:
    if old in s:
        s = s.replace(old, new, 1)
        print('removed:', old[:40])
    else:
        print('NOT FOUND:', old[:40])
open(p, 'w', encoding='utf-8').write(s)
print('done')
PY