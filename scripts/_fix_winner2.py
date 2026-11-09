p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """    socket.on('winner_declared', ({ winner }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.victory();
      showWinnerModal(winner);
    });"""
new = """    let winnerChallengeTimerId = null;
    socket.on('winner_declared', ({ winner }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.victory();
      showWinnerModal(winner);
      // 30s challenge window
      const timerEl = document.getElementById('winnerChallengeTimer');
      let remaining = 30;
      if (timerEl) timerEl.textContent = remaining;
      if (winnerChallengeTimerId) clearInterval(winnerChallengeTimerId);
      winnerChallengeTimerId = setInterval(() => {
        remaining--;
        if (timerEl) timerEl.textContent = Math.max(0, remaining);
        if (remaining <= 0) {
          clearInterval(winnerChallengeTimerId);
          winnerChallengeTimerId = null;
          if (winnerModal) winnerModal.classList.remove('active');
          setBanner(`🏆 ${winner?.nickname || 'الفائز'} هو البطل! (انتهت مهلة التحدي)`);
        }
      }, 1000);
    });

    socket.on('winner_challenge_started', ({ challenger, winner, duration }) => {
      if (winnerChallengeTimerId) { clearInterval(winnerChallengeTimerId); winnerChallengeTimerId = null; }
      hideAllModals();
      if (window.soundEngine) window.soundEngine.siren();
      const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
      const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
      const secs = duration || 30;
      showResultModal('⚔️ تحدي الفائز!',
        `${challenger?.nickname || 'متحدٍ'} يتحدى ${winner?.nickname || 'الفائز'}! أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) خلال ${secs} ثانية.`, '⚔️', '#a855f7');
    });"""
# replace the existing winner_declared and winner_challenge_started handlers
old2 = """    socket.on('winner_declared', ({ winner }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.victory();
      showWinnerModal(winner);
    });

    socket.on('winner_challenge_started', ({ challenger, winner, duration } = {}) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.siren();
      const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
      const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
      const secs = duration || 30;
      showResultModal('⚔️ تحدي الفائز!',
        `${challenger?.nickname || 'متحدٍ'} يتحدى ${winner?.nickname || 'الفائز'}! أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) خلال ${secs} ثانية.`, '⚔️', '#a855f7');
    });"""
assert old2 in s, 'handler block not found'
s = s.replace(old2, new, 1)
open(p, 'w', encoding='utf-8').write(s)
print('done')
