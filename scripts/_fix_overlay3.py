p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
# 1. showWinnerModal replacement (real text present? check)
old = "  function showWinnerModal(winner) {"
assert old in s
# We'll do replacements one by one using unique markers
# Replace showWinnerModal block
import re
# Find from '  function showWinnerModal(winner) {' to next '  }' after it
start = s.index('  function showWinnerModal(winner) {')
end = s.index('\n  }\n', start) + len('\n  }\n')
block = s[start:end]
print('block found, len', len(block))
new_block = """  function showKickAnimation(player, by) {
    if (!player) return;
    const container = document.createElement('div');
    container.className = 'kick-animation-overlay';
    const kicker = by ? (by.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${by.playerNumber}`) : '';
    const victim = player.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${player.playerNumber}`;
    container.innerHTML = `
      <div class="kick-scene">
        ${kicker ? `<img class="kick-kicker" src="${kicker}" alt="">` : ''}
        <div class="kick-boot">👟</div>
        <img class="kick-victim" src="${victim}" alt="">
        <div class="kick-text">💥 ${player.nickname} تم إقصاؤه!</div>
      </div>`;
    document.body.appendChild(container);
    setTimeout(() => { container.classList.add('kick-out'); }, 10);
    setTimeout(() => { container.remove(); }, 1800);
  }

  function showWinnerModal(winner) {
    if (!winnerModal || !winner) return;
    if (winnerAvatar) winnerAvatar.src = winner.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner.playerNumber}`;
    if (winnerName) winnerName.textContent = winner.nickname;
    if (winnerUser) winnerUser.textContent = `@${winner.uniqueId}`;
    if (winnerNum) winnerNum.textContent = `#${winner.playerNumber}`;
    const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
    const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
    const wBox = document.getElementById('winnerChallengeBox');
    const wImg = document.getElementById('winnerChallengeGiftImg');
    const wText = document.getElementById('winnerChallengeText');
    if (wImg) wImg.src = wInfo.image;
    if (wText) wText.textContent = `أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) لتحدي البطل`;
    if (wBox) wBox.style.display = 'flex';
    winnerModal.classList.add('active');
  }
"""
s = s[:start] + new_block + s[end:]

# Replace player_eliminated handler
old_pe = "    socket.on('player_eliminated', ({ player, by }) => {"
assert old_pe in s
start_pe = s.index(old_pe)
end_pe = s.index('\n    });\n', start_pe) + len('\n    });\n')
pe_block = s[start_pe:end_pe]
new_pe = """    socket.on('player_eliminated', ({ player, by }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.eliminatedGong();
      showKickAnimation(player, by);
      showEliminationModal(player, by);
    });
"""
s = s[:start_pe] + new_pe + s[end_pe:]

# Replace winner_challenge_started handler
old_wc = "    socket.on('winner_challenge_started', ({ challenger, winner } = {}) => {"
assert old_wc in s
start_wc = s.index(old_wc)
end_wc = s.index('\n    });\n', start_wc) + len('\n    });\n')
wc_block = s[start_wc:end_wc]
new_wc = """    socket.on('winner_challenge_started', ({ challenger, winner, duration } = {}) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.siren();
      const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
      const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
      const secs = duration || 30;
      showResultModal('⚔️ تحدي الفائز!',
        `${challenger?.nickname || 'متحدٍ'} يتحدى ${winner?.nickname || 'الفائز'}! أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) خلال ${secs} ثانية.`, '⚔️', '#a855f7');
    });
"""
s = s[:start_wc] + new_wc + s[end_wc:]

open(p, 'w', encoding='utf-8').write(s)
print('done')
