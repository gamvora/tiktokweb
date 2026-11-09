p = 'js/overlay.js'
s = open(p, encoding='utf-8').read()
old = """  function showWinnerModal(winner) {
    if (!winnerModal || !winner) return;
    if (winnerAvatar) winnerAvatar.src = winner.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner.playerNumber}`;
    if (winnerName) winnerName.textContent = winner.nickname;
    if (winnerUser) winnerUser.textContent = `@${winner.uniqueId}`;
    if (winnerNum) winnerNum.textContent = `#${winner.playerNumber}`;
    winnerModal.classList.add('active');
  }"""
new = """  function showWinnerModal(winner) {
    if (!winnerModal || !winner) return;
    if (winnerAvatar) winnerAvatar.src = winner.profilePictureUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${winner.playerNumber}`;
    if (winnerName) winnerName.textContent = winner.nickname;
    if (winnerUser) winnerUser.textContent = `@${winner.uniqueId}`;
    if (winnerNum) winnerNum.textContent = `#${winner.playerNumber}`;
    // show challenge gift info
    const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
    const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
    const wBox = document.getElementById('winnerChallengeBox');
    const wImg = document.getElementById('winnerChallengeGiftImg');
    const wText = document.getElementById('winnerChallengeText');
    if (wImg) wImg.src = wInfo.image;
    if (wText) wText.textContent = `أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) لتحدي البطل`;
    if (wBox) wBox.style.display = 'flex';
    winnerModal.classList.add('active');
  }"""
assert old in s
s = s.replace(old, new, 1)

# winner_challenge_started handler: show challenge box + countdown
old2 = """    socket.on('winner_challenge_started', ({ challenger, winner }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.siren();
      showResultModal('⚔️ تحدي الفائز!',
        `${challenger?.nickname || 'متحدٍ'} يتحدى ${winner?.nickname || 'الفائز'}!`, '⚔️', '#a855f7');
    });"""
new2 = """    socket.on('winner_challenge_started', ({ challenger, winner, duration }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.siren();
      const wConf = currentSnapshot?.settings?.gifts?.winnerChallenge;
      const wInfo = getGiftInfo(wConf?.giftId || wConf?.giftName || 'crown');
      const secs = duration || 30;
      showResultModal('⚔️ تحدي الفائز!',
        `${challenger?.nickname || 'متحدٍ'} يتحدى ${winner?.nickname || 'الفائز'}! أرسل [${wConf?.giftName || wInfo.nameAr}] (${wConf?.minCoins || wInfo.coins || 100} عملة) خلال ${secs} ثانية.`, '⚔️', '#a855f7');
      // countdown
      let remaining = secs;
      const timerEl = document.getElementById('winnerChallengeTimer');
      if (timerEl) timerEl.textContent = remaining;
      const iv = setInterval(() => {
        remaining--;
        if (timerEl) timerEl.textContent = Math.max(0, remaining);
        if (remaining <= 0) clearInterval(iv);
      }, 1000);
    });"""
assert old2 in s
s = s.replace(old2, new2, 1)

# player_eliminated: trigger kick animation
old3 = """    socket.on('player_eliminated', ({ player, by }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.eliminatedGong();
      showEliminationModal(player, by);
    });"""
new3 = """    socket.on('player_eliminated', ({ player, by }) => {
      hideAllModals();
      if (window.soundEngine) window.soundEngine.eliminatedGong();
      showKickAnimation(player, by);
      showEliminationModal(player, by);
    });"""
assert old3 in s
s = s.replace(old3, new3, 1)

# add showKickAnimation function after showEliminationModal? We'll add before showWinnerModal
old4 = """  function showWinnerModal(winner) {"""
new4 = """  function showKickAnimation(player, by) {
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

  function showWinnerModal(winner) {"""
assert old4 in s
s = s.replace(old4, new4, 1)

open(p, 'w', encoding='utf-8').write(s)
print('done')
