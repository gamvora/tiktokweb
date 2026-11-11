# -*- coding: utf-8 -*-
# overlay.css v4: replace KICK v2 + DEFENSE TAUNT blocks with the unified
# CINEMATIC SCENES system (7s lifetime) and append modal polish v4.
import io

P = 'css/overlay.css'
s = io.open(P, encoding='utf-8').read()

start = s.find('/* ============================================================\n   KICK ANIMATION v2')
end = s.find('/* Mobile responsiveness */')
assert start != -1 and end != -1 and start < end, (start, end)

scenes = r'''/* ============================================================
   CINEMATIC SCENES v4 — unified 7-second animation system
   Kick / Defense taunt / Rejoin / Shield aura / Shield break /
   Final-round announce. transform/opacity only (GPU-safe).
   ============================================================ */
.fx-overlay {
  position: fixed;
  inset: 0;
  z-index: 950;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  animation: fx-fade 7s ease-out forwards;
  contain: layout style;
}
.fx-overlay.shaking { animation: fx-fade 7s ease-out forwards, screen-shake 0.4s ease-in-out 1.65s 4; }
.fx-scene {
  position: relative;
  width: min(94vw, 620px);
  height: 320px;
  animation: fx-scene-pop 0.55s var(--ease-spring);
}
/* 7s master fade: fully visible for 5.8s, graceful exit */
@keyframes fx-fade {
  0% { opacity: 0; }
  3% { opacity: 1; }
  83% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes fx-scene-pop {
  0% { transform: scale(0.62); opacity: 0; }
  60% { transform: scale(1.04); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes screen-shake {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-8px, 5px); }
  50% { transform: translate(7px, -6px); }
  75% { transform: translate(-5px, 3px); }
}
@keyframes fx-text-pop {
  0% { opacity: 0; transform: translateX(-50%) translateY(30px) scale(0.7); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}
@keyframes fx-pop {
  0% { opacity: 0; transform: translateY(20px) scale(0.7); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fx-burst {
  0% { opacity: 0; transform: scale(0.2) rotate(-30deg); }
  35% { opacity: 1; transform: scale(1.4) rotate(8deg); }
  75% { opacity: 0.9; transform: scale(1.6) rotate(0); }
  100% { opacity: 0; transform: scale(1.9); }
}
@keyframes fx-idle-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-14px); }
}

/* ── KICK v4 — kicker runs in, telegraphs, strikes, celebrates ── */
.fx-kick {
  background: radial-gradient(circle at 55% 55%, rgba(239, 68, 68, 0.22), transparent 65%);
}
.kick-scene-v4 { width: min(94vw, 640px); height: 330px; }
.kick-warning-stripe {
  position: absolute; inset: 0; z-index: 1; border-radius: 24px; opacity: 0;
  background: repeating-linear-gradient(45deg, rgba(239,68,68,0.14) 0 22px, transparent 22px 44px);
  animation: stripe-warn 1.7s ease-in-out 0.3s 1 forwards;
}
@keyframes stripe-warn {
  0% { opacity: 0; transform: translateX(60px); }
  25% { opacity: 1; }
  80% { opacity: 1; transform: translateX(-20px); }
  100% { opacity: 0; }
}
.kick-kicker {
  position: absolute; right: 4px; top: 74px;
  width: 92px; height: 92px; border-radius: 50%;
  border: 3px solid #fbbf24; object-fit: cover; z-index: 3;
  box-shadow: var(--shadow-glow-gold);
  animation: kicker-run 0.8s var(--ease-out) both, kicker-victory 0.6s ease-in-out 2.5s 6;
}
@keyframes kicker-run {
  0% { transform: translateX(-260px) scale(0.6) rotate(-12deg); opacity: 0; }
  70% { transform: translateX(16px) scale(1.02); opacity: 1; }
  100% { transform: translateX(0) scale(1); opacity: 1; }
}
@keyframes kicker-victory {
  0%, 100% { transform: translateY(0) rotate(0); }
  30% { transform: translateY(-18px) rotate(-5deg); }
  60% { transform: translateY(0) rotate(3deg); }
}
.kick-leg {
  position: absolute; right: 64px; top: 96px; font-size: 82px; z-index: 4;
  transform-origin: 80% 18%;
  animation: leg-windup 0.9s ease-in 0.7s both, leg-kick 0.22s cubic-bezier(0.2, 0, 0.1, 1) 1.62s both, leg-hold 4.4s ease-in-out 1.9s both;
}
@keyframes leg-windup {
  0% { transform: rotate(-100deg) translateX(-70px); opacity: 0; }
  55% { opacity: 1; }
  75% { transform: rotate(-100deg) translateX(-6px); }
  100% { transform: rotate(-88deg) translateX(0); opacity: 1; }
}
@keyframes leg-kick {
  0% { transform: rotate(-88deg); }
  55% { transform: rotate(34deg) scale(1.2); }
  100% { transform: rotate(20deg); }
}
@keyframes leg-hold {
  0% { transform: rotate(20deg); opacity: 1; }
  88% { opacity: 1; }
  100% { transform: rotate(20deg) translateY(20px); opacity: 0; }
}
.kick-boot {
  position: absolute; right: 40px; top: 154px; font-size: 60px; z-index: 5;
  animation: boot-hit 0.2s cubic-bezier(0.2, 0, 0.1, 1) 1.62s both, boot-wiggle 0.5s ease-in-out 1.9s 3;
}
@keyframes boot-hit {
  0% { transform: translate(140px, -86px) rotate(-60deg); opacity: 0.6; }
  100% { transform: translate(-6px, 10px) rotate(18deg); opacity: 1; }
}
@keyframes boot-wiggle {
  0%, 100% { transform: translate(-6px, 10px) rotate(18deg); }
  50% { transform: translate(-2px, 2px) rotate(34deg); }
}
.kick-victim {
  position: absolute; left: 66px; top: 70px;
  width: 100px; height: 100px; border-radius: 50%;
  border: 3px solid #ef4444; object-fit: cover; z-index: 2;
  animation: victim-scared 0.7s ease-in-out 0.5s both, victim-fly 2.9s cubic-bezier(0.3, 0.4, 0.45, 1) 1.72s forwards;
}
@keyframes victim-scared {
  0%, 100% { transform: translateX(0) rotate(0) scale(1); }
  20% { transform: translateX(-10px) rotate(-7deg) scale(0.96); }
  45% { transform: translateX(10px) rotate(7deg) scale(0.96); }
  70% { transform: translateX(-9px) rotate(-6deg) scale(0.94); }
}
@keyframes victim-fly {
  0% { transform: translate(0, 0) rotate(0) scale(1); opacity: 1; }
  10% { transform: translate(-40px, -90px) rotate(55deg) scale(1.12); }
  32% { transform: translate(-190px, -170px) rotate(210deg) scale(1); opacity: 1; }
  55% { transform: translate(-360px, -140px) rotate(430deg) scale(0.8); opacity: 1; }
  80% { transform: translate(-62vw, -22vh) rotate(640deg) scale(0.42); opacity: 0.85; }
  100% { transform: translate(-96vw, -34vh) rotate(780deg) scale(0.2); opacity: 0; }
}
.kick-impact {
  position: absolute; left: 138px; top: 60px; font-size: 96px; z-index: 6; opacity: 0;
  animation: fx-burst 0.75s var(--ease-out) 1.62s forwards;
}
.kick-flash {
  position: absolute; left: 90px; top: 30px; width: 200px; height: 200px;
  border-radius: 50%; z-index: 5; opacity: 0;
  background: radial-gradient(circle, rgba(255, 246, 214, 0.9), rgba(239, 68, 68, 0.4) 45%, transparent 70%);
  animation: flash-pop 0.65s ease-out 1.6s forwards;
}
@keyframes flash-pop {
  0% { opacity: 0; transform: scale(0.3); }
  30% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0; transform: scale(1.6); }
}
.kick-stars { position: absolute; inset: 0; z-index: 5; pointer-events: none; }
.kick-stars span { position: absolute; opacity: 0; animation: star-fly 1.4s ease-out forwards; }
.kick-stars span:nth-child(1) { left: 8px;  top: 160px; font-size: 32px; --sx: -130px; --sy: -110px; animation-delay: 1.72s; }
.kick-stars span:nth-child(2) { left: 165px; top: 64px;  font-size: 26px; --sx: 90px;   --sy: -120px; animation-delay: 1.78s; }
.kick-stars span:nth-child(3) { left: 118px; top: 184px; font-size: 28px; --sx: -80px;  --sy: 70px;   animation-delay: 1.84s; }
.kick-stars span:nth-child(4) { left: 44px;  top: 44px;  font-size: 24px; --sx: -50px;  --sy: -90px;  animation-delay: 1.9s; }
.kick-stars span:nth-child(5) { left: 196px; top: 140px; font-size: 30px; --sx: 120px;  --sy: 40px;   animation-delay: 1.86s; }
.kick-stars span:nth-child(6) { left: 92px;  top: 96px;  font-size: 26px; --sx: -140px; --sy: -30px;  animation-delay: 1.95s; }
@keyframes star-fly {
  0% { opacity: 0; transform: translate(0, 0) scale(0.4) rotate(0); }
  25% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--sx, -90px), var(--sy, -80px)) scale(1.3) rotate(260deg); }
}
.kick-dust { position: absolute; left: 44px; top: 138px; font-size: 48px; opacity: 0; z-index: 1; animation: dust-puff 1.6s ease-out 1.9s forwards; }
.kick-dust.d2 { left: 12px; top: 164px; font-size: 38px; animation-delay: 2.15s; }
@keyframes dust-puff {
  0% { opacity: 0; transform: translateX(0) scale(0.5); }
  20% { opacity: 0.95; }
  100% { opacity: 0; transform: translateX(-180px) scale(1.8); }
}
.kick-text {
  position: absolute; bottom: 8px; left: 50%;
  transform: translateX(-50%);
  font-size: clamp(16px, 3vw, 24px); font-weight: 900; color: #fff;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9);
  background: rgba(239, 68, 68, 0.24);
  border: 1px solid rgba(239, 68, 68, 0.55);
  padding: 9px 22px; border-radius: var(--radius-pill);
  white-space: nowrap; max-width: 94vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-text-pop 0.55s var(--ease-spring) 1.95s forwards;
}
.kick-sub {
  position: absolute; bottom: 64px; left: 50%;
  transform: translateX(-50%);
  font-size: clamp(13px, 2.4vw, 17px); font-weight: 800; color: #fca5a5;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
  white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-text-pop 0.55s var(--ease-spring) 2.2s forwards;
}

/* ── DEFENSE TAUNT v4 — block + long mocking rebound ── */
.fx-taunt {
  background: radial-gradient(circle at 50% 45%, rgba(16, 185, 129, 0.2), transparent 65%);
}
.dt-scene-v4 { width: min(94vw, 560px); height: 300px; }
.dt-defender {
  position: absolute; right: 28px; top: 78px;
  width: 104px; height: 104px; border-radius: 50%;
  border: 3px solid #10b981; object-fit: cover; z-index: 3;
  box-shadow: 0 0 20px rgba(16, 185, 129, 0.55);
  animation: defender-pop 0.6s var(--ease-spring) both, defender-flex 0.6s ease-in-out 2.4s 5;
}
@keyframes defender-pop {
  0% { transform: scale(0.3) translateY(44px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
@keyframes defender-flex {
  0%, 100% { transform: scale(1) rotate(0); }
  40% { transform: scale(1.14) rotate(-4deg); }
}
.dt-shield {
  position: absolute; right: 6px; top: 44px; font-size: 68px; z-index: 4;
  transform-origin: 60% 90%;
  animation: shield-block 0.35s cubic-bezier(0.2, 0, 0.1, 1) 1.45s both, shield-gloat 0.7s ease-in-out 2s 5;
}
@keyframes shield-block {
  0% { transform: rotate(-80deg) scale(0.3); opacity: 0; }
  100% { transform: rotate(16deg) scale(1.22); opacity: 1; }
}
@keyframes shield-gloat {
  0%, 100% { transform: rotate(16deg) scale(1.22); }
  50% { transform: rotate(-14deg) scale(1.32); }
}
.dt-shoe {
  position: absolute; left: 4px; top: 112px; font-size: 72px; z-index: 2;
  animation: shoe-attack 0.9s cubic-bezier(0.3, 0, 0.2, 1) 0.55s both, shoe-rebound 2.1s cubic-bezier(0.2, 0.55, 0.35, 1) 1.62s forwards;
}
@keyframes shoe-attack {
  0% { transform: translateX(-46vw) rotate(-50deg); opacity: 0; }
  60% { opacity: 1; }
  100% { transform: translateX(0) rotate(0); opacity: 1; }
}
@keyframes shoe-rebound {
  0% { transform: translateX(0) rotate(0); opacity: 1; }
  14% { transform: translateX(44px) rotate(-24deg) scale(1.08); }
  60% { transform: translateX(-44vw) rotate(-420deg) scale(0.6); opacity: 1; }
  100% { transform: translateX(-96vw) rotate(-780deg) scale(0.24); opacity: 0; }
}
.dt-spark {
  position: absolute; right: 40px; top: 38px; font-size: 56px; z-index: 5; opacity: 0;
  animation: fx-burst 0.6s var(--ease-out) 1.5s forwards;
}
.dt-bubble {
  position: absolute; left: 0; top: 6px;
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.6);
  color: #fff; font-weight: 900; font-size: clamp(15px, 2.6vw, 21px);
  padding: 9px 18px; border-radius: var(--radius-pill);
  white-space: nowrap; max-width: 58vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-pop 0.45s var(--ease-spring) 2.1s forwards;
}
.dt-bubble-tail { position: absolute; left: 52px; top: 58px; font-size: 28px; color: rgba(16,185,129,0.8); opacity: 0; animation: fx-pop 0.35s ease-out 2.25s forwards; }
.dt-info {
  position: absolute; bottom: 2px; left: 50%; transform: translateX(-50%);
  background: rgba(16, 185, 129, 0.22);
  border: 1px solid rgba(16, 185, 129, 0.55);
  color: #d1fae5; font-weight: 800; font-size: clamp(13px, 2.4vw, 17px);
  padding: 9px 20px; border-radius: var(--radius-pill);
  white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-text-pop 0.45s var(--ease-spring) 2.5s forwards;
}

/* ── REJOIN v4 — the eliminated player climbs back out ── */
.fx-rejoin {
  background: radial-gradient(circle at 50% 68%, rgba(59, 130, 246, 0.2), transparent 64%);
}
.rj-scene { width: min(94vw, 540px); height: 310px; }
.rj-portal {
  position: absolute; bottom: 6px; left: 50%;
  width: 190px; height: 78px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(59,130,246,0.5), rgba(37,99,235,0.25) 55%, transparent 75%);
  animation: portal-open 1.4s var(--ease-out) both, portal-glow 1.6s ease-in-out 1.6s 3;
}
@keyframes portal-open {
  0% { opacity: 0; transform: translateX(-50%) scaleX(0.1) scaleY(0.2); }
  60% { opacity: 1; transform: translateX(-50%) scaleX(1.1) scaleY(0.9); }
  100% { transform: translateX(-50%) scaleX(1) scaleY(1); opacity: 1; }
}
@keyframes portal-glow {
  0%, 100% { opacity: 0.75; }
  50% { opacity: 1; }
}
.rj-portal-ring {
  position: absolute; bottom: 0; left: 50%; width: 210px; height: 100px;
  transform: translateX(-50%);
  border: 3px dashed rgba(96, 165, 250, 0.65); border-radius: 50%;
  animation: ring-spin 5s linear infinite;
}
@keyframes ring-spin {
  from { transform: translateX(-50%) rotate(0); }
  to { transform: translateX(-50%) rotate(360deg); }
}
.rj-player {
  position: absolute; left: 50%; top: 96px;
  width: 108px; height: 108px; border-radius: 50%;
  border: 3px solid #3b82f6; object-fit: cover; z-index: 3;
  margin-left: -54px;
  animation: player-rise 2.1s cubic-bezier(0.3, 1.1, 0.4, 1) 1.0s both, player-proud 1.1s ease-in-out 3.4s 3;
}
@keyframes player-rise {
  0% { transform: translateY(150px) scale(0.4); opacity: 0; }
  40% { opacity: 1; }
  62% { transform: translateY(34px) scale(0.92); }
  78% { transform: translateY(-16px) scale(1.06); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes player-proud {
  0%, 100% { transform: translateY(0) rotate(0); }
  30% { transform: translateY(-12px) rotate(-4deg); }
  60% { transform: translateY(0) rotate(3deg); }
}
.rj-hand {
  position: absolute; left: 50%; top: 128px; font-size: 54px; z-index: 2;
  margin-left: -18px;
  animation: hand-reach 1.3s ease-in-out 0.5s 1 both;
}
@keyframes hand-reach {
  0% { transform: translateY(70px) scale(0.5); opacity: 0; }
  45% { opacity: 1; }
  70% { transform: translateY(6px) scale(1.05); }
  100% { transform: translateY(90px) scale(0.6); opacity: 0; }
}
.rj-sparkles span { position: absolute; opacity: 0; animation: star-fly 1.6s ease-out forwards; }
.rj-sparkles span:nth-child(1) { left: 118px; top: 84px; font-size: 30px; --sx: 70px;  --sy: -80px; animation-delay: 2.5s; }
.rj-sparkles span:nth-child(2) { left: 370px; top: 70px; font-size: 26px; --sx: -60px; --sy: -90px; animation-delay: 2.7s; }
.rj-sparkles span:nth-child(3) { left: 148px; top: 190px; font-size: 28px; --sx: 90px; --sy: 40px;  animation-delay: 2.9s; }
.rj-sparkles span:nth-child(4) { left: 330px; top: 200px; font-size: 24px; --sx: -80px; --sy: -50px; animation-delay: 3.1s; }
.rj-ghost {
  position: absolute; left: 46%; top: 34px; font-size: 44px; opacity: 0; z-index: 1;
  animation: ghost-flee 2.2s ease-out 1.0s forwards;
}
@keyframes ghost-flee {
  0% { opacity: 0; transform: translate(0, 20px) scale(0.7); }
  25% { opacity: 0.85; }
  100% { opacity: 0; transform: translate(190px, -110px) scale(1.1) rotate(18deg); }
}
.rj-bubble {
  position: absolute; left: 50%; top: 2px;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.2);
  border: 1px solid rgba(96, 165, 250, 0.6);
  color: #fff; font-weight: 900; font-size: clamp(15px, 2.6vw, 21px);
  padding: 9px 20px; border-radius: var(--radius-pill);
  white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-pop 0.5s var(--ease-spring) 2.6s forwards;
}
.rj-info {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.22);
  border: 1px solid rgba(96, 165, 250, 0.55);
  color: #dbeafe; font-weight: 800; font-size: clamp(13px, 2.4vw, 17px);
  padding: 9px 20px; border-radius: var(--radius-pill);
  white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-text-pop 0.45s var(--ease-spring) 3.0s forwards;
}

/* ── SHIELD AURA v4 — immunity dome + rotating rune rings ── */
.fx-shield {
  background: radial-gradient(circle at 50% 55%, rgba(59, 130, 246, 0.24), transparent 66%);
}
.sh-scene { width: min(94vw, 480px); height: 330px; }
.sh-player {
  position: absolute; left: 50%; top: 96px;
  width: 118px; height: 118px; border-radius: 50%;
  border: 3px solid #60a5fa; object-fit: cover; z-index: 2;
  margin-left: -59px;
  animation: sh-player-in 0.9s var(--ease-spring) both, fx-idle-bounce 2s ease-in-out 1.4s 3;
}
@keyframes sh-player-in {
  0% { transform: scale(0.2) translateY(70px); opacity: 0; }
  100% { transform: scale(1) translateY(0); opacity: 1; }
}
.sh-num {
  position: absolute; left: 50%; top: 176px;
  background: #3b82f6; color: #fff; font-weight: 900; font-size: 16px;
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid #fff; z-index: 3;
  margin-left: -20px;
  animation: fx-pop 0.4s var(--ease-spring) 0.7s both;
}
.sh-dome {
  position: absolute; left: 50%; top: 52px;
  width: 210px; height: 210px; border-radius: 50%; z-index: 4;
  margin-left: -105px;
  background: radial-gradient(circle, transparent 55%, rgba(96, 165, 250, 0.35) 66%, rgba(59, 130, 246, 0.15) 78%, transparent 88%);
  animation: dome-drop 1.3s var(--ease-spring) 0.9s both, dome-pulse 1.6s ease-in-out 2.4s 3;
}
@keyframes dome-drop {
  0% { opacity: 0; transform: translateY(-150px) scale(0.3); }
  65% { opacity: 1; transform: translateY(6px) scale(1.08); }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes dome-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.07); }
}
.sh-ring {
  position: absolute; left: 50%; top: 52px;
  width: 210px; height: 210px; border-radius: 50%; z-index: 5;
  margin-left: -105px;
  border: 2px dashed rgba(147, 197, 253, 0.75);
  animation: sh-ring-spin 4s linear infinite;
}
.sh-ring.r2 {
  width: 178px; height: 178px; margin-left: -89px; top: 68px;
  border-color: rgba(59, 130, 246, 0.5);
  animation: sh-ring-spin 2.7s linear infinite reverse;
}
@keyframes sh-ring-spin {
  from { transform: rotate(0); }
  to { transform: rotate(360deg); }
}
.sh-glyph {
  position: absolute; left: 50%; top: 0; font-size: 54px; z-index: 6;
  transform: translateX(-50%);
  animation: sh-glyph-drop 0.9s var(--ease-spring) 0.4s both;
}
@keyframes sh-glyph-drop {
  0% { transform: translateX(-50%) translateY(-90px) scale(0.4); opacity: 0; }
  70% { transform: translateX(-50%) translateY(8px) scale(1.15); opacity: 1; }
  100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
}
.sh-sparks span { position: absolute; font-size: 22px; color: #93c5fd; opacity: 0; animation: spark-orbit 2.4s ease-in-out infinite; }
.sh-sparks span:nth-child(1) { left: 74px; top: 92px; animation-delay: 1.4s; }
.sh-sparks span:nth-child(2) { left: 366px; top: 100px; animation-delay: 1.8s; }
.sh-sparks span:nth-child(3) { left: 92px; top: 224px; animation-delay: 2.2s; }
.sh-sparks span:nth-child(4) { left: 352px; top: 218px; animation-delay: 2.6s; }
@keyframes spark-orbit {
  0% { opacity: 0; transform: scale(0.4) rotate(0); }
  35% { opacity: 1; transform: scale(1.2) rotate(90deg); }
  100% { opacity: 0; transform: scale(0.5) rotate(200deg); }
}
.sh-title {
  position: absolute; bottom: 52px; left: 50%;
  transform: translateX(-50%);
  font-size: clamp(19px, 3vw, 27px); font-weight: 900; color: #93c5fd;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  opacity: 0; animation: fx-text-pop 0.55s var(--ease-spring) 1.5s forwards;
}
.sh-info {
  position: absolute; bottom: 2px; left: 50%;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.22);
  border: 1px solid rgba(96, 165, 250, 0.55);
  color: #dbeafe; font-weight: 800; font-size: clamp(13px, 2.4vw, 17px);
  padding: 9px 20px; border-radius: var(--radius-pill);
  white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-text-pop 0.45s var(--ease-spring) 1.9s forwards;
}

/* ── SHIELD BREAK v4 — crack, shatter, survive ── */
.fx-shield-break {
  background: radial-gradient(circle at 50% 55%, rgba(99, 102, 241, 0.2), transparent 66%);
}
.sb-scene { width: min(94vw, 480px); height: 330px; }
.sb-player {
  position: absolute; left: 50%; top: 96px;
  width: 118px; height: 118px; border-radius: 50%;
  border: 3px solid #60a5fa; object-fit: cover; z-index: 2;
  margin-left: -59px;
  animation: sh-player-in 0.8s var(--ease-spring) both, sb-relief-shake 0.5s ease-in-out 2.4s 3;
}
@keyframes sb-relief-shake {
  0%, 100% { transform: scale(1) rotate(0); }
  33% { transform: scale(1.06) rotate(-4deg); }
  66% { transform: scale(1.04) rotate(4deg); }
}
.sb-shield {
  position: absolute; left: 50%; top: 40px; font-size: 88px; z-index: 4;
  transform: translateX(-50%);
  animation: sb-shield-in 0.8s var(--ease-spring) 0.4s both, sb-shield-shake 0.35s ease-in-out 1.5s 3;
}
@keyframes sb-shield-in {
  0% { transform: translateX(-50%) translateY(-110px) scale(0.5); opacity: 0; }
  100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
}
@keyframes sb-shield-shake {
  0%, 100% { transform: translateX(-50%) rotate(0); }
  33% { transform: translateX(-54%) rotate(-7deg); }
  66% { transform: translateX(-46%) rotate(7deg); }
}
.sb-crack { position: absolute; font-size: 44px; z-index: 5; opacity: 0; }
.sb-crack.c1 { left: 42%; top: 52px; animation: crack-appear 0.4s var(--ease-out) 1.6s forwards; }
.sb-crack.c2 { left: 54%; top: 74px; font-size: 36px; animation: crack-appear 0.4s var(--ease-out) 2.0s forwards; }
.sb-crack.c3 { left: 48%; top: 40px; font-size: 52px; animation: crack-appear 0.4s var(--ease-out) 2.4s forwards; }
@keyframes crack-appear {
  0% { opacity: 0; transform: scale(2.4); }
  55% { opacity: 1; transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
}
.sb-shards span { position: absolute; left: 50%; top: 60px; font-size: 30px; opacity: 0; animation: shard-fly 1.6s ease-out 2.9s forwards; }
.sb-shards span:nth-child(1) { --sx: -150px; --sy: -120px; }
.sb-shards span:nth-child(2) { --sx: 140px;  --sy: -140px; }
.sb-shards span:nth-child(3) { --sx: -110px; --sy: 90px; }
.sb-shards span:nth-child(4) { --sx: 160px;  --sy: 70px; }
.sb-shards span:nth-child(5) { --sx: -30px;  --sy: -180px; }
@keyframes shard-fly {
  0% { opacity: 0; transform: translate(0, 0) scale(0.6) rotate(0); }
  15% { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(1) rotate(300deg); }
}
.sb-relief {
  position: absolute; right: 78px; top: 66px; font-size: 46px; z-index: 5; opacity: 0;
  animation: fx-pop 0.5s var(--ease-spring) 3.5s forwards;
}
.sb-title {
  position: absolute; bottom: 52px; left: 50%;
  transform: translateX(-50%);
  font-size: clamp(18px, 3vw, 26px); font-weight: 900; color: #a5b4fc;
  text-shadow: 0 3px 12px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  opacity: 0; animation: fx-text-pop 0.55s var(--ease-spring) 2.5s forwards;
}
.sb-info {
  position: absolute; bottom: 2px; left: 50%;
  transform: translateX(-50%);
  background: rgba(99, 102, 241, 0.22);
  border: 1px solid rgba(129, 140, 248, 0.55);
  color: #e0e7ff; font-weight: 800; font-size: clamp(13px, 2.4vw, 17px);
  padding: 9px 20px; border-radius: var(--radius-pill);
  white-space: nowrap; max-width: 92vw; overflow: hidden; text-overflow: ellipsis;
  opacity: 0; animation: fx-text-pop 0.45s var(--ease-spring) 2.9s forwards;
}

/* ── FINAL ROUND v4 — theatrical announcement ── */
.fx-final {
  background: radial-gradient(circle at 50% 50%, rgba(168, 85, 247, 0.26), transparent 70%);
}
.fin-scene { width: min(96vw, 640px); height: 360px; }
.fin-spotlight {
  position: absolute; top: -60px; width: 210px; height: 460px; z-index: 1; opacity: 0;
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.28), transparent 78%);
  clip-path: polygon(46% 0, 54% 0, 92% 100%, 8% 100%);
  transform-origin: 50% 0;
}
.fin-spotlight.sl1 { right: 12%; animation: spot-sweep 3.2s ease-in-out 0.2s 2 alternate forwards; }
.fin-spotlight.sl2 { left: 12%;  animation: spot-sweep 3.2s ease-in-out 0.2s 2 alternate-reverse forwards; }
@keyframes spot-sweep {
  0% { opacity: 0; transform: rotate(-24deg); }
  25% { opacity: 1; }
  100% { opacity: 0.85; transform: rotate(24deg); }
}
.fin-rays {
  position: absolute; left: 50%; top: 90px;
  width: 420px; height: 420px; z-index: 1;
  margin-left: -210px;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(251, 191, 36, 0.14) 12deg, transparent 24deg, transparent 45deg, rgba(251, 191, 36, 0.14) 57deg, transparent 69deg, transparent 90deg, rgba(251, 191, 36, 0.14) 102deg, transparent 114deg, transparent 135deg, rgba(251, 191, 36, 0.14) 147deg, transparent 159deg, transparent 180deg, rgba(251, 191, 36, 0.14) 192deg, transparent 204deg, transparent 225deg, rgba(251, 191, 36, 0.14) 237deg, transparent 249deg, transparent 270deg, rgba(251, 191, 36, 0.14) 282deg, transparent 294deg, transparent 315deg, rgba(251, 191, 36, 0.14) 327deg, transparent 339deg);
  border-radius: 50%;
  animation: ring-spin 14s linear infinite;
}
.fin-stamp {
  position: absolute; left: 50%; top: 16px; font-size: 84px; z-index: 3;
  transform: translateX(-50%);
  animation: fin-stamp-slam 0.75s cubic-bezier(0.2, 1.3, 0.4, 1) 0.25s both, fx-idle-bounce 2.2s ease-in-out 1.6s 3;
}
@keyframes fin-stamp-slam {
  0% { transform: translateX(-50%) translateY(-180px) scale(2.2); opacity: 0; }
  60% { transform: translateX(-50%) translateY(0) scale(0.92); opacity: 1; }
  100% { transform: translateX(-50%) translateY(0) scale(1); opacity: 1; }
}
.fin-title {
  position: absolute; left: 50%; top: 122px;
  transform: translateX(-50%);
  font-size: clamp(34px, 6.5vw, 58px); font-weight: 900; z-index: 3;
  color: #fff;
  text-shadow: 0 4px 18px rgba(0, 0, 0, 0.95), 0 0 34px rgba(251, 191, 36, 0.55);
  white-space: nowrap;
  animation: fin-title-slam 0.7s var(--ease-spring) 0.75s both, fin-title-glow 1.5s ease-in-out 2s 3;
}
@keyframes fin-title-slam {
  0% { transform: translateX(-50%) scale(2.6); opacity: 0; letter-spacing: 0.35em; }
  60% { transform: translateX(-50%) scale(0.94); opacity: 1; letter-spacing: 0.02em; }
  100% { transform: translateX(-50%) scale(1); opacity: 1; }
}
@keyframes fin-title-glow {
  0%, 100% { transform: translateX(-50%) scale(1); }
  50% { transform: translateX(-50%) scale(1.045); }
}
.fin-sub {
  position: absolute; left: 50%; top: 196px;
  transform: translateX(-50%);
  font-size: clamp(14px, 2.6vw, 20px); font-weight: 800; color: #fde68a; z-index: 3;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  opacity: 0; animation: fx-pop 0.5s var(--ease-spring) 1.3s forwards;
}
.fin-gift-row {
  position: absolute; bottom: 26px; left: 50%;
  transform: translateX(-50%);
  display: flex; align-items: center; gap: 12px; z-index: 3;
  opacity: 0; animation: fx-pop 0.55s var(--ease-spring) 1.8s forwards;
}
.fin-gift-img { width: 64px; height: 64px; object-fit: contain; animation: fx-idle-bounce 1.6s ease-in-out 2.6s 3; }
.fin-gift-pill {
  background: rgba(168, 85, 247, 0.24);
  border: 1.5px solid rgba(216, 180, 254, 0.65);
  color: #f3e8ff; font-weight: 900; font-size: clamp(13px, 2.4vw, 17px);
  padding: 10px 18px; border-radius: var(--radius-pill);
  white-space: nowrap;
}
.fin-timer-pill {
  background: rgba(239, 68, 68, 0.24);
  border: 1.5px solid rgba(252, 165, 165, 0.65);
  color: #fecaca; font-weight: 900; font-size: clamp(13px, 2.4vw, 17px);
  padding: 10px 18px; border-radius: var(--radius-pill);
  white-space: nowrap;
}

'''

s = s[:start] + scenes + s[end:]

# Fix the small-screen scene scaler for new class names
s = s.replace(
    '@media (max-width: 640px) {\n  .kick-scene { transform: scale(0.74); transform-origin: center; }\n  .dt-scene { transform: scale(0.8); transform-origin: center; }\n}',
    '@media (max-width: 640px) {\n  .fx-scene { transform: scale(0.78); transform-origin: center; }\n}'
)
s = s.replace('  .kick-scene { transform: scale(0.8); }\n', '')

# ------------------------------------------------------------
# MODAL POLISH v4 — elimination + winner redesign (transform/opacity only)
# ------------------------------------------------------------
v4 = r'''

/* ============================================================
   DESIGN SYSTEM v4 — elimination & winner modal cinematics
   ============================================================ */

/* Elimination modal: danger frame + layered entrance */
.elimination-modal-content {
  animation: shakeCard 0.5s var(--ease-out);
}
.elimination-modal-content::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(135deg, rgba(239, 68, 68, 0.07) 0 26px, transparent 26px 52px);
  border-radius: inherit;
}
.elim-header-badge {
  animation: elim-badge-pop 0.7s var(--ease-spring) 0.2s both;
}
@keyframes elim-badge-pop {
  0% { transform: scale(0.3) rotate(-6deg); opacity: 0; }
  70% { transform: scale(1.12) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0); opacity: 1; }
}
.elim-avatar {
  animation: elim-avatar-slam 0.65s var(--ease-spring) 0.35s both;
}
@keyframes elim-avatar-slam {
  0% { transform: scale(1.9); opacity: 0; }
  60% { transform: scale(0.94); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.elim-skull-badge { animation: fx-idle-bounce 1.8s ease-in-out 0.8s 4; }
.elim-status-tag { animation: fx-pop 0.5s var(--ease-spring) 1.0s both; }
.elim-by-box { animation: fx-pop 0.5s var(--ease-spring) 0.9s both; }
.elim-rejoin-notice { animation: fx-pop 0.55s var(--ease-spring) 1.3s both; }
.elim-rejoin-img { animation: fx-idle-bounce 1.6s ease-in-out 1.8s 3; }

/* Winner modal: rotating rays behind the champion */
.winner-modal-content::before {
  content: '';
  position: absolute;
  left: 50%; top: 110px;
  width: 430px; height: 430px;
  margin-left: -215px;
  z-index: 0;
  pointer-events: none;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(251, 191, 36, 0.16) 10deg, transparent 20deg, transparent 40deg, rgba(251, 191, 36, 0.16) 50deg, transparent 60deg, transparent 90deg, rgba(251, 191, 36, 0.16) 100deg, transparent 110deg, transparent 135deg, rgba(251, 191, 36, 0.16) 145deg, transparent 155deg, transparent 180deg, rgba(251, 191, 36, 0.16) 190deg, transparent 200deg, transparent 225deg, rgba(251, 191, 36, 0.16) 235deg, transparent 245deg, transparent 270deg, rgba(251, 191, 36, 0.16) 280deg, transparent 290deg, transparent 315deg, rgba(251, 191, 36, 0.16) 325deg, transparent 335deg);
  animation: ring-spin 16s linear infinite;
}
.winner-avatar-stage { z-index: 1; }
.winner-crown-top {
  animation: crown-drop 1.1s cubic-bezier(0.3, 1.5, 0.5, 1) 0.55s both;
}
@keyframes crown-drop {
  0% { transform: translateX(-50%) translateY(-160px) scale(1.8) rotate(-20deg); opacity: 0; }
  65% { transform: translateX(-50%) translateY(10px) scale(0.94) rotate(4deg); opacity: 1; }
  100% { transform: translateX(-50%) translateY(0) scale(1) rotate(0); opacity: 1; }
}
.winner-avatar-img { animation: elim-avatar-slam 0.7s var(--ease-spring) 0.3s both; }
.winner-name-text { animation: fx-pop 0.55s var(--ease-spring) 0.9s both; }
.winner-user-text { animation: fx-pop 0.55s var(--ease-spring) 1.1s both; }
.winner-stats-badge { animation: fx-pop 0.55s var(--ease-spring) 1.3s both; }
.winner-challenge-box { animation: fx-pop 0.55s var(--ease-spring) 1.5s both; }
.winner-confetti-icon { animation: fx-idle-bounce 1.7s ease-in-out 0.6s 3; }
'''

s = s.rstrip() + '\n' + v4
io.open(P, 'w', encoding='utf-8', newline='\n').write(s)
print('done, len =', len(s))
