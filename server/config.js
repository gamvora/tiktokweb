const path = require('path');

const config = {
  PORT: process.env.PORT || 3001,
  DATA_DIR: path.join(__dirname, '..', 'data'),
  DATA_FILE: path.join(__dirname, '..', 'data', 'game_state.json'),
  LOGS_FILE: path.join(__dirname, '..', 'data', 'activity_logs.json'),

  // Official TikTok Live Gift Catalog with Real Photos
  giftCatalog: [
    { id: 'rose', nameAr: 'وردة', nameEn: 'Rose', emoji: '🌹', coins: 1, image: '/assets/gifts/rose.png' },
    { id: 'heart', nameAr: 'قلب الحب', nameEn: 'Heart', emoji: '💖', coins: 49, image: '/assets/gifts/heart.png' },
    { id: 'finger_heart', nameAr: 'قلب بالأصابع', nameEn: 'Finger Heart', emoji: '🫰', coins: 5, image: '/assets/gifts/finger_heart.png' },
    { id: 'hand_heart', nameAr: 'قلب باليدين', nameEn: 'Hand Hearts', emoji: '💗', coins: 100, image: '/assets/gifts/hand_heart.png' },
    { id: 'sunglasses', nameAr: 'نظارات شمسية', nameEn: 'Sunglasses', emoji: '🕶️', coins: 199, image: '/assets/gifts/sunglasses.png' },
    { id: 'cap', nameAr: 'كاب تيك توك', nameEn: 'Cap', emoji: '🧢', coins: 99, image: '/assets/gifts/cap.png' },
    { id: 'perfume', nameAr: 'عطر فاخر', nameEn: 'Perfume', emoji: '🧴', coins: 20, image: '/assets/gifts/perfume.png' },
    { id: 'car', nameAr: 'سيارة رياضية', nameEn: 'Sports Car', emoji: '🏎️', coins: 10000, image: '/assets/gifts/car.png' },
    { id: 'lion', nameAr: 'أسد تيك توك', nameEn: 'Lion', emoji: '🦁', coins: 29999, image: '/assets/gifts/lion.png' },
    { id: 'crown', nameAr: 'تاج ذهبي', nameEn: 'Team Crown', emoji: '👑', coins: 1000, image: '/assets/gifts/crown.png' },
    { id: 'rocket', nameAr: 'طائرة نفاثة / صاروخ', nameEn: 'Private Jet', emoji: '🚀', coins: 4888, image: '/assets/gifts/rocket.png' },
    { id: 'galaxy', nameAr: 'مجرة كونية', nameEn: 'Interstellar', emoji: '🌌', coins: 10000, image: '/assets/gifts/galaxy.png' },
    { id: 'trophy', nameAr: 'كأس البطولة', nameEn: 'Team Trophy', emoji: '🏆', coins: 7000, image: '/assets/gifts/trophy.png' },
    { id: 'pearl', nameAr: 'لؤلؤة البحر', nameEn: 'Pearl', emoji: '🦪', coins: 800, image: '/assets/gifts/pearl.png' },
    { id: 'gold_mine', nameAr: 'كنز الذهب', nameEn: 'Gold Mine', emoji: '🪙', coins: 1000, image: '/assets/gifts/gold_mine.png' },
    { id: 'ferris_wheel', nameAr: 'عجلة الملاهي', nameEn: 'Ferris Wheel', emoji: '🎡', coins: 3000, image: '/assets/gifts/ferris_wheel.png' },
    { id: 'motorcycle', nameAr: 'دراجة نارية', nameEn: 'Motorcycle', emoji: '🏍️', coins: 2988, image: '/assets/gifts/motorcycle.png' },
    { id: 'speedboat', nameAr: 'يخت سريع', nameEn: 'Speedboat', emoji: '🚤', coins: 1888, image: '/assets/gifts/speedboat.png' },
    { id: 'confetti', nameAr: 'احتفال ملون', nameEn: 'Confetti', emoji: '🎉', coins: 100, image: '/assets/gifts/confetti.png' },
    { id: 'tiktok', nameAr: 'شعار تيك توك', nameEn: 'TikTok', emoji: '🎵', coins: 1, image: '/assets/gifts/tiktok.png' }
  ],

  defaultSettings: {
    // Streamer TikTok Live username
    tiktokUsername: '',

    // Join configuration
    joinKeyword: 'تم',
    maxPlayers: 30,
    isJoinOpen: true,

    // Timers in seconds
    timers: {
      joinDuration: 60,
      targetSelectDuration: 20,
      defenseDuration: 30,
      challengeDuration: 45,
      finalRoundDuration: 60
    },

    // What happens if player doesn't select a target in time:
    // 'skip' = تخطي الدور, 'respin' = إعادة تدوير العجلة, 'random' = اختيار عشوائي كهدف
    timeoutBehavior: 'skip',

    // Gifts configuration referencing real photos
    gifts: {
      defense: {
        giftName: 'وردة',
        giftId: 'rose',
        minCoins: 1,
        count: 1,
        labelAr: 'هدية الدفاع عن النفس'
      },
      rejoin: {
        giftName: 'قلب الحب',
        giftId: 'heart',
        minCoins: 5,
        count: 1,
        keepPreviousNumber: true,
        allowMidRound: true,
        labelAr: 'هدية العودة إلى اللعبة'
      },
      help: {
        giftName: 'كاب تيك توك',
        giftId: 'cap',
        minCoins: 16,
        count: 1,
        beneficiaryCoins: 5,
        labelAr: 'هدية المساعدة / الإنقاذ'
      },
      shield: {
        giftName: 'نظارات شمسية',
        giftId: 'sunglasses',
        minCoins: 30,
        count: 1,
        durationRounds: 1,
        labelAr: 'هدية الحصانة / الدرع'
      },
      finalRound: {
        giftName: 'طائرة نفاثة / صاروخ',
        giftId: 'rocket',
        minCoins: 100,
        count: 1,
        rule: 'highest_gifts',
        labelAr: 'هدية حسم الجولة'
      },
      winnerChallenge: {
        giftName: 'تاج ذهبي',
        giftId: 'crown',
        minCoins: 100,
        count: 1,
        labelAr: 'هدية تحدي الفائز'
      }
    },

    // Wheel appearance settings
    wheelConfig: {
      theme: 'casino',        // 'casino' | 'neon' | 'classic' | 'dark'
      colors: ['#dc2626', '#2563eb', '#16a34a', '#9333ea', '#d97706', '#0284c7', '#e11d48', '#4f46e5'],
      rimColor: '#f59e0b',
      hubColor: '#dc2626',
      showPlayerAvatars: true,
      showPlayerNames: true,
      spinDuration: 6500
    },

    soundEnabled: true
  }
};

module.exports = config;
