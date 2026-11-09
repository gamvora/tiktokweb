p = 'js/roulette.js'
s = open(p, encoding='utf-8').read()
s = s.replace(
 "const fontSize = Math.max(14, Math.min(26, Math.floor(220 / Math.sqrt(numSlices))));",
 "const fontSize = Math.max(16, Math.min(28, Math.floor(240 / Math.sqrt(numSlices))));")
s = s.replace(
 "const smallFont = Math.max(9, Math.min(13, Math.floor(130 / Math.sqrt(numSlices))));",
 "const smallFont = Math.max(11, Math.min(15, Math.floor(150 / Math.sqrt(numSlices))));")
s = s.replace(
 "const avatarSize = Math.min(32, Math.max(16, Math.floor(radius / (numSlices * 0.35))));",
 "const avatarSize = Math.min(38, Math.max(20, Math.floor(radius / (numSlices * 0.3))));")
open(p, 'w', encoding='utf-8').write(s)
print('done')
