p = 'index.html'
s = open(p, encoding='utf-8').read()
old = """         <div class="instruction-box" style="margin-top: 18px; font-size: 16px; border-color: #f59e0b;">
           ?s"?,? U?U, USO3O??USO1 O?O-O_ O?O-O_US O?U,O"O?U,OY O?O?O3U, U?O_USOc O?U,O?O-O_US U,U.U^O?U??O?? U?US O?U^U,Oc O?O_USO_Oc!
         </div>"""
# fallback: match by id winnerModal instruction-box line contains instruction-box
import re
# simpler: insert before closing of winner-modal-content (the </div> after instruction-box)
marker = "       </div>\n     </div>\n\n     <!--"
# We'll instead insert a challenge info block after winner-stats-badge line
old2 = '        <div id="winnerUser" class="winner-user-text">@username</div>\n'
new2 = '        <div id="winnerUser" class="winner-user-text">@username</div>\n\n        <div id="winnerChallengeBox" class="winner-challenge-box" style="display:none; margin-top:14px;">\n          <img id="winnerChallengeGiftImg" src="" alt="" style="width:48px;height:48px;object-fit:contain;">\n          <div>\n            <div style="font-weight:800; color:#fbbf24;">⚔️ تحدي الفائز!</div>\n            <div id="winnerChallengeText" style="font-size:13px; color:#cbd5e1;">أرسل [هدية] لتحدي البطل (${30} ثانية)</div>\n            <div id="winnerChallengeTimer" style="font-size:22px; font-weight:900; color:#ef4444;">30</div>\n          </div>\n        </div>\n'
assert old2 in s
s = s.replace(old2, new2, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
