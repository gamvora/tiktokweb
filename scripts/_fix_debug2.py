p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
s = s.replace("      updateGiftTicker();", "      updateGiftTickerImpl();", 1)
s = s.replace("    updateGiftTicker();\n    applyBackground", "    updateGiftTickerImpl();\n    applyBackground", 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
PY