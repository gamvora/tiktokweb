p = 'js/game-engine.js'
lines = open(p, encoding='utf-8').read().splitlines(keepends=True)
start = None
for i, l in enumerate(lines):
    if '// Cannot target immune player' in l:
        start = i
        break
print('start', start)
if start is not None:
    del lines[start:start+6]
    lines.insert(start, "    // Shield acts as hearts: allow targeting shielded players\n")
    lines.insert(start+1, "    // (shield is consumed if they fail to defend)\n")
    open(p, 'w', encoding='utf-8').write(''.join(lines))
    print('done')
else:
    print('not found')
