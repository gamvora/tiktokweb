// Complete 25-step Scenario Verification Script
const fs = require('fs');
const os = require('os');
const path = require('path');

// مجلد بيانات مؤقت حتى لا تُلمس حالة اللعبة الحقيقية أثناء الاختبار
const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'tiktok-roulette-scenario-'));
process.env.DATA_DIR = TEST_DATA_DIR;

const { GameState, GameStates } = require('./server/state/gameState');
const config = require('./server/config');

function cleanup() {
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch (e) {}
}

async function runScenarioTest() {
  console.log('🚀 Starting Complete 25-Step TikTok Live Roulette Scenario Test...\n');

  const game = new GameState();
  // Clear any existing state for fresh test
  game.resetGame();

  let passedSteps = 0;
  function assert(condition, stepNum, description) {
    if (condition) {
      console.log(`✅ [Step ${stepNum}] PASSED: ${description}`);
      passedSteps++;
    } else {
      console.error(`❌ [Step ${stepNum}] FAILED: ${description}`);
      process.exit(1);
    }
  }

  // 1 & 2. 20 players join and receive numbers 1 to 20
  for (let i = 1; i <= 20; i++) {
    const res = game.addPlayer({
      userId: `user_id_${i}`,
      uniqueId: `player_${i}`,
      nickname: `لاعب ${i}`,
      profilePictureUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${i}`
    });
    if (!res.success) {
      throw new Error(`Failed to add player ${i}: ${res.reason}`);
    }
  }
  assert(game.players.length === 20, '1-2', '20 players joined with unique IDs and numbers 1..20');
  const numbers = game.players.map(p => p.playerNumber);
  const uniqueNums = new Set(numbers);
  assert(uniqueNums.size === 20 && numbers.includes(1) && numbers.includes(20), '1-2b', 'All numbers from 1 to 20 are unique');

  // 3. Admin closes join
  game.settings.isJoinOpen = false;
  const joinAttempt = game.addPlayer({ userId: 'late_user', uniqueId: 'late_user', nickname: 'متأخر' });
  assert(!joinAttempt.success && game.settings.isJoinOpen === false, '3', 'Admin closed join; late join attempt was rejected');

  // 4. Admin starts roulette
  const spinRes = game.startRoulette();
  assert(spinRes.success && game.state === GameStates.SPINNING, '4', 'Admin started roulette; state changed to SPINNING');

  // 5 & 6. Simulate wheel landing on player #7
  const player7 = game.getPlayerByNumber(7);
  game.chosenPlayer = player7;
  game.landRoulette();
  assert(game.chosenPlayer.playerNumber === 7, '5-6', 'Wheel landed on Player #7; turn announced');

  // 7. Target selection timer starts
  game.beginTargetSelection();
  assert(game.state === GameStates.SELECTING_TARGET && game.timer.active, '7', 'Target selection countdown started for Player #7');

  // Test negative cases:
  // Non-chosen player tries to select target -> REJECTED
  const illegalComment = game.handleChatComment({
    userId: 'user_id_3',
    uniqueId: 'player_3',
    nickname: 'لاعب 3',
    commentText: '12'
  });
  assert(illegalComment === null && game.targetPlayer === null, '8-prep-a', 'Comment from non-chosen player was completely ignored');

  // Player #7 tries to target self -> REJECTED
  const selfTarget = game.handleChatComment({
    userId: player7.userId,
    uniqueId: player7.uniqueId,
    nickname: player7.nickname,
    commentText: '7'
  });
  assert(selfTarget && !selfTarget.success, '8-prep-b', 'Player #7 targeting self was rejected');

  // 8, 9, 10, 11, 12. Player #7 writes '12' in chat -> recognized, locks in Player #12 as target!
  const validTarget = game.handleChatComment({
    userId: player7.userId,
    uniqueId: player7.uniqueId,
    nickname: player7.nickname,
    commentText: '12'
  });
  assert(validTarget && validTarget.success && game.targetPlayer.playerNumber === 12, '8-12', 'Player #7 selected #12 in chat; Player #12 is locked as elimination target');
  assert(game.state === GameStates.ELIMINATION_WARNING, '11-12', 'Confrontation modal activated (Selector #7 VS Target #12)');

  // 13. Defense timer begins
  game.state = GameStates.DEFENDING;
  game.startTimer('defense', 30);
  assert(game.state === GameStates.DEFENDING && game.timer.active && game.timer.type === 'defense', '13', 'Defense timer started for Player #12');

  // 14 & 15. Player #12 sends defense gift -> Saved! Elimination canceled!
  const defHandled = game.handleDefenseGift({
    userId: game.targetPlayer.userId,
    uniqueId: game.targetPlayer.uniqueId,
    giftId: 'rose',
    giftName: 'وردة',
    diamonds: 1,
    repeatCount: 1,
    eventId: 'evt_def_1'
  });
  assert(defHandled === true && game.state === GameStates.SAVED, '14-15', 'Player #12 sent defense gift; elimination canceled and state set to SAVED');
  assert(game.getPlayerByNumber(12).status === 'active', '15b', 'Player #12 remains active in the game');

  // 16. Admin starts next round and starts roulette again
  game.nextRound();
  assert(game.roundNumber === 2 && game.state === GameStates.READY, '16', 'Round advanced to #2; state is READY');

  // 17. Wheel lands on player #3, selects #5
  const spinRes2 = game.startRoulette();
  const player3 = game.getPlayerByNumber(3);
  const player5 = game.getPlayerByNumber(5);
  game.chosenPlayer = player3;
  game.landRoulette();
  game.beginTargetSelection();
  game.selectTargetByNumber(5, player3);
  assert(game.targetPlayer.playerNumber === 5, '17', 'Round 2: Player #3 selected Player #5 for elimination');

  // 18. Defense timer expires without gift -> Player #5 is eliminated!
  game.state = GameStates.DEFENDING;
  game.handleDefenseTimeout();
  assert(player5.status === 'eliminated' && game.state === GameStates.ELIMINATED, '18', 'Player #5 did not defend in time and was eliminated to graveyard');

  // 19. Player #5 rejoins by paying 5 coins
  const rejoinRes = game.handleRejoin({
    userId: player5.userId,
    uniqueId: player5.uniqueId,
    giftId: 'heart',
    giftName: 'قلب الحب',
    coins: 5,
    eventId: 'evt_rejoin_1'
  });
  assert(rejoinRes === true && player5.status === 'active', '19', 'Player #5 successfully rejoined the game with 5 coins');

  // 20. Another player (#9) gets eliminated, then Player #1 helps/rescues them with 16 coins
  const player9 = game.getPlayerByNumber(9);
  player9.status = 'eliminated';
  const helpRes = game.handleHelp({
    helperUserId: 'helper_user',
    helperName: 'المشاهد الكريم',
    targetPlayerNumber: 9,
    giftId: 'cap',
    giftName: 'كاب تيك توك',
    coins: 16,
    eventId: 'evt_help_1'
  });
  assert(helpRes === true && player9.status === 'active' && player9.coins >= 5, '20', 'Player #9 was helped by a viewer for 16 coins and restored with 5 coins');

  // 21. Player #2 activates Shield / Immunity (30 coins)
  const player2 = game.getPlayerByNumber(2);
  const shieldRes = game.handleShieldGift({
    userId: player2.userId,
    uniqueId: player2.uniqueId,
    giftId: 'sunglasses',
    giftName: 'نظارات شمسية',
    coins: 30,
    eventId: 'evt_shield_1'
  });
  assert(shieldRes === true && player2.hasShield === true, '21', 'Player #2 activated immunity shield');

  // Verify that a shielded player CAN be targeted (shield acts as hearts, not immunity)
  game.state = GameStates.SELECTING_TARGET;
  game.chosenPlayer = player7;
  const targetedShielded = game.selectTargetByNumber(2, player7);
  assert(targetedShielded.success === true, '21b', 'Shielded Player #2 can be targeted (shield is a heart)');

  // 22. Round progression decrements shield
  game.nextRound();
  assert(player2.hasShield === false, '22', 'After round progression, shield duration expired as designed');

  // 23 & 24. Final Round activation & Winner Declaration
  game.startFinalRound();
  assert(game.state === GameStates.FINAL_ROUND, '23', 'Final Round activated by admin');

  // Simulate final round gift
  game.handleFinalRoundGift({
    userId: player7.userId,
    uniqueId: player7.uniqueId,
    nickname: player7.nickname,
    giftId: 'rocket',
    giftName: 'صاروخ',
    coins: 500,
    eventId: 'evt_final_1'
  });
  game.resolveFinalRound();
  assert(game.state === GameStates.FINISHED && game.winner.id === player7.id, '24', 'Player #7 won the Final Round and became Champion');

  // 25. Winner Challenge: Challenger challenges the champion
  const challenger = game.getPlayerByNumber(4);
  game.startWinnerChallenge(challenger);
  assert(game.state === GameStates.CHALLENGE && game.challenger.id === challenger.id, '25', 'Challenger started Winner Challenge against the champion');

  // Cleanup any lingering timers
  game.stopTimer();
  cleanup();

  console.log(`\n🎉 ALL 25 SCENARIOS AND LOGIC TESTS PASSED SUCCESSFULLY! (${passedSteps}/25+ checks passed)\n`);
  process.exit(0);
}

runScenarioTest().catch(err => {
  console.error('Test failed with error:', err);
  cleanup();
  process.exit(1);
});
