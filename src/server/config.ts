import type { EngineOpts } from '../engine/types.js';

export interface Config {
  port: number;
  host: string;
  production: boolean;
  cookieSecret: string;
  cookieSecure: boolean;
  allowedOrigins: string[];
  store: 'memory' | 'mariadb';
  db: { host: string; port: number; user: string; password: string; database: string };
  maxRoomsPerUser: number;
  maxBotRoomsPerUser: number;
  maxConnectionsPerUser: number;
  roomTtlMs: number;
  /** حجز مقعد اللاعب بعد انقطاع آخر اتصال، افتراضيًا دقيقتان. */
  reconnectGraceMs?: number;
  serverSessionsFile?: string;
  /** مهلة الإيقاف النظيف (ms) لمحاولة حفظ المعلّق عند SIGTERM */
  shutdownTimeoutMs: number;
  tickMs: number;
  botSpeed: number;
  engine: EngineOpts;
  /** عدد طلبات إنشاء الجلسة المسموحة دفعة وحدة لكل IP */
  sessionBurst: number;
  /** المباريات برسوم تتطلب حساباً مربوطاً بـ Google (يفعَّل صراحةً؛ لا يعمل لو Google غير مضبوط) */
  requireGoogleForStakes: boolean;
  /** حدود تعديل الأرصدة الإدارية لغير المالك: للعملية الواحدة وللإجمالي اليومي لكل منفّذ. فوقها = طلب بموافقة المالك */
  adminAdjust: { opCoins: number; opGems: number; dayCoins: number; dayGems: number; /** تعديل المالك الأكبر من هذا يحتاج تأكيداً صريحاً بالمبلغ (حماية من خطأ الإدخال، ليست حداً) */ confirmCoins: number; confirmGems: number };
  /** أقصى حسابات مجهولة جديدة لكل شبكة (IP) باليوم؛ 0 = بلا حد */
  /** عدد الحسابات الجديدة من شبكة واحدة باليوم الذي بعده يُسجَّل «نشاط شبكة مرتفع» كإشارة للمراجعة (لا يمنع أحداً)؛ 0 = إيقاف الإشارة */
  newAccountsSignalPerNetDay: number;
  /** ملف حفظ الصدارة الأسبوعية (اختياري؛ بدونه تبقى بالذاكرة) */
  leaderboardFile: string;
  walletFile: string;
  economyFile?: string;
  /** ملف مستقل لنقاط ورتب LEVEL/VIP/NOBLE؛ لا يُفعّل أنظمة غير معتمدة تلقائياً. */
  progressionFile?: string;
  accountsFile: string;
  avatarsDir: string;
  identitiesFile: string;
  /** المجتمع: ملف المنشورات/التعليقات/المتابعات/الإشعارات/البلاغات، ومجلد صور المنشورات (افتراضياً بجانب ملف المحفظة) */
  communityFile: string;
  communityMediaDir: string;
  googleClientId: string;
  /** إضافات وظيفية اختيارية، افتراضيًا بجانب المحفظة؛ لا ترحّل ملفات الحسابات القديمة. */
  accountToolsFile?: string;
  socialPrivateFile?: string;
  rankRewardsFile?: string;
  /** نطاق اجتماعي مستقل عن غرف الألعاب؛ لا يغيّر مخطط MariaDB الحالي. */
  socialRoomsFile?: string;
  /** وسيط صوت خاص بالخادم، ولا يُفعّل من الواجهة أو بمفاتيح اختبار. */
  socialVoice?: { enabled: boolean; upstream: string; apiKey: string; apiSecret: string };
  vipMembershipFile?: string;
  missionsFile?: string;
  supportNotificationsFile?: string;
  functionalOutboxFile?: string;
  /** حماية تشغيل كاتب واحد على مجلد البيانات؛ لا تعني دعم عدة كتّاب. */
  dataDirectoryLock?: boolean;
  /** بوابة مؤقتة لباقات النقد المجانية مرة واحدة لكل حساب؛ لا تغيّر أسعار المتجر الافتراضية. */
  complimentaryPurchases?: boolean;
  /** أسرار خادم فقط؛ لا تدخل إعدادات العرض أو استجابة اللاعب. */
  payments?: { mode: 'disabled' | 'test' | 'live'; provider: string; secretKey: string; merchantId: string; publicBaseUrl: string; file: string; liveApproved: boolean; licenseApproved: boolean; merchantApproved: boolean };
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && v !== undefined && v !== '' ? n : d;
};

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const production = env.NODE_ENV === 'production';
  let secret = env.COOKIE_SECRET ?? '';
  if (!secret) {
    if (production) throw new Error('COOKIE_SECRET مطلوب في وضع الإنتاج');
    secret = 'dev-only-secret-' + Math.random().toString(36).slice(2);
  }
  if (production && env.STORE !== 'mariadb') throw new Error('الإنتاج يحتاج STORE=mariadb لحفظ الغرف بشكل دائم');
  if (production && !env.WALLET_FILE) throw new Error('WALLET_FILE مطلوب لحفظ الجلسات والحسابات بشكل دائم');
  const paymentMode = env.PAYMENTS_MODE ?? 'disabled';
  if (!['disabled', 'test', 'live'].includes(paymentMode)) throw new Error('PAYMENTS_MODE غير صالح؛ الدفع ما تفعّل.');
  if (production && paymentMode === 'test') throw new Error('مفاتيح ووضع Test ممنوعين على الإنتاج.');
  return {
    port: num(env.PORT, 3000),
    host: env.HOST ?? '0.0.0.0',
    production,
    cookieSecret: secret,
    cookieSecure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : production,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim()).filter(Boolean),
    store: env.STORE === 'mariadb' ? 'mariadb' : 'memory',
    db: {
      host: env.DB_HOST ?? '127.0.0.1',
      port: num(env.DB_PORT, 3306),
      user: env.DB_USER ?? 'qawwi',
      password: env.DB_PASSWORD ?? '',
      database: env.DB_NAME ?? 'qawwi',
    },
    maxRoomsPerUser: num(env.MAX_ROOMS_PER_USER, 3),
    maxBotRoomsPerUser: num(env.MAX_BOT_ROOMS_PER_USER, 1),
    maxConnectionsPerUser: num(env.MAX_CONNECTIONS_PER_USER, 5),
    roomTtlMs: num(env.ROOM_TTL_MINUTES, 120) * 60_000,
    reconnectGraceMs: Math.min(86_400_000,Math.max(100,num(env.RECONNECT_GRACE_SECONDS,120)*1000)),
    serverSessionsFile: env.SERVER_SESSIONS_FILE ?? '',
    shutdownTimeoutMs: Math.min(60_000, Math.max(1_000, num(env.SHUTDOWN_TIMEOUT_MS, 10_000))),
    tickMs: num(env.TICK_MS, 500),
    botSpeed: num(env.BOT_SPEED, 1),
    sessionBurst: num(env.SESSION_BURST, 10),
    requireGoogleForStakes: env.REQUIRE_GOOGLE_FOR_STAKES === 'true',
    adminAdjust: {
      opCoins: Math.max(1, Math.floor(num(env.ADMIN_ADJUST_OP_COINS, 5_000))), opGems: Math.max(1, Math.floor(num(env.ADMIN_ADJUST_OP_GEMS, 200))),
      dayCoins: Math.max(1, Math.floor(num(env.ADMIN_ADJUST_DAY_COINS, 20_000))), dayGems: Math.max(1, Math.floor(num(env.ADMIN_ADJUST_DAY_GEMS, 1_000))),
      confirmCoins: Math.max(1, Math.floor(num(env.ADMIN_OWNER_CONFIRM_COINS, 100_000))), confirmGems: Math.max(1, Math.floor(num(env.ADMIN_OWNER_CONFIRM_GEMS, 10_000))),
    },
    newAccountsSignalPerNetDay: Math.max(0, Math.floor(num(env.NEW_ACCOUNTS_SIGNAL_PER_NET_DAY, 30))),
    leaderboardFile: env.LEADERBOARD_FILE ?? '',
    walletFile: env.WALLET_FILE ?? '',
    economyFile: env.ECONOMY_FILE ?? '',
    progressionFile: env.PROGRESSION_FILE ?? '',
    accountsFile: env.ACCOUNTS_FILE ?? '',
    avatarsDir: env.AVATARS_DIR ?? '',
    identitiesFile: env.IDENTITIES_FILE ?? '',
    communityFile: env.COMMUNITY_FILE ?? '',
    communityMediaDir: env.COMMUNITY_MEDIA_DIR ?? '',
    // معرّف العميل عام (يظهر في الواجهة بطبيعته). اضبط GOOGLE_CLIENT_ID=none لتعطيل الدخول بـ Google.
    googleClientId: env.GOOGLE_CLIENT_ID === 'none' ? '' : (env.GOOGLE_CLIENT_ID ?? '122506681992-rfqqr0ji8l7srsbfl1jj6pl5qknsa6jb.apps.googleusercontent.com'),
    accountToolsFile: env.ACCOUNT_TOOLS_FILE ?? '',
    socialPrivateFile: env.SOCIAL_PRIVATE_FILE ?? '',
    rankRewardsFile: env.RANK_REWARDS_FILE ?? '',
    socialRoomsFile: env.SOCIAL_ROOMS_FILE ?? '',
    socialVoice: { enabled: env.SOCIAL_VOICE_ENABLED === 'true', upstream: env.SOCIAL_VOICE_UPSTREAM ?? '', apiKey: env.SOCIAL_VOICE_API_KEY ?? '', apiSecret: env.SOCIAL_VOICE_API_SECRET ?? '' },
    vipMembershipFile: env.VIP_MEMBERSHIP_FILE ?? '',
    missionsFile: env.MISSIONS_FILE ?? '',
    supportNotificationsFile: env.SUPPORT_NOTIFICATIONS_FILE ?? '',
    functionalOutboxFile: env.FUNCTIONAL_OUTBOX_FILE ?? '',
    dataDirectoryLock: env.DATA_DIRECTORY_LOCK === 'true' || (production && env.DATA_DIRECTORY_LOCK !== 'false'),
    complimentaryPurchases: env.COMPLIMENTARY_PURCHASES_ENABLED === 'true',
    payments: { mode: paymentMode as 'disabled' | 'test' | 'live', provider: env.PAYMENTS_PROVIDER ?? 'tap', secretKey: env.TAP_SECRET_KEY ?? '', merchantId: env.TAP_MERCHANT_ID ?? '', publicBaseUrl: env.PAYMENTS_PUBLIC_BASE_URL ?? '', file: env.PAYMENTS_FILE ?? '', liveApproved: env.PAYMENTS_LIVE_APPROVED === 'true', licenseApproved: env.PAYMENTS_LICENSE_APPROVED === 'true', merchantApproved: env.PAYMENTS_MERCHANT_APPROVED === 'true' },
    engine: {
      ...(env.ROUNDS ? { rounds: num(env.ROUNDS, 3) } : {}),
      turnMs: num(env.TURN_SECONDS, 30) * 1000,
      voteMs: num(env.VOTE_SECONDS, 40) * 1000,
      clueMs: num(env.CLUE_SECONDS, 30) * 1000,
      questionMs: num(env.QUESTION_SECONDS, 15) * 1000,
      answerMs: num(env.ANSWER_SECONDS, 60) * 1000,
      resultMs: num(env.RESULT_SECONDS, 12) * 1000,
      firstDoneMs: num(env.FIRST_DONE_SECONDS, 10) * 1000,
    },
  };
}
