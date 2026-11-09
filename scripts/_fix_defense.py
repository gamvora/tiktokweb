p = 'js/game-engine.js'
s = open(p, encoding='utf-8').read()
old = """  handleDefenseTimeout() {
    if (this.state !== GameStates.DEFENDING || !this.targetPlayer) return;

    const eliminated = this.targetPlayer;
    eliminated.status = 'eliminated';"""
new = """  handleDefenseTimeout() {
    if (this.state !== GameStates.DEFENDING || !this.targetPlayer) return;

    const target = this.targetPlayer;

    // Shield acts as hearts: consume one shield instead of eliminating
    if (target.hasShield) {
      target.hasShield = false;
      target.shieldRoundsRemaining = 0;
      if (target.status === 'immune') target.status = 'active';
      this.state = GameStates.SAVED;
      this.persist();
      this.logActivity('SHIELD_CONSUMED', `🛡️ استخدم ${target.nickname} (#${target.playerNumber}) حصانة (قلب) للبقاء في اللعبة!`, { player: target });
      this.emit('player_shield_consumed', { player: target });
      this.emit('players_updated', this.players);
      this.emit('state_updated', this.getSnapshot());
      return;
    }

    const eliminated = target;
    eliminated.status = 'eliminated';"""
assert old in s, 'old not found'
s = s.replace(old, new)
open(p, 'w', encoding='utf-8').write(s)
print('done')
