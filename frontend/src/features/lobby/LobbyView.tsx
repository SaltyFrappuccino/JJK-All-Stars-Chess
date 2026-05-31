import { useEffect, useMemo, useState } from "react";

import { formatEventFeedItem, formatSide } from "../../lib/presentation";
import type { PlayerProfile } from "../../lib/profile";
import type { Side } from "../../lib/types";

type HistoryItem = {
  match_id: string;
  status: string;
  winner: string | null;
  updated_at: string;
  room_code: string | null;
};

type Props = {
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onBotMatch: (side: "white" | "black") => void;
  onSubmitProfile: (profile: PlayerProfile) => void;
  onLoadReplay: (matchId: string) => void;
  profile: PlayerProfile | null;
  loading: boolean;
  sessionReady: boolean;
  history: HistoryItem[];
  replayLog: Array<Record<string, unknown>>;
};

function formatHistoryStamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function modeLabel(item: HistoryItem) {
  return item.room_code ? "PvP" : "Матч";
}

function resultTone(item: HistoryItem) {
  if (!item.winner) {
    return "muted";
  }
  return item.winner === "white" ? "success" : "danger";
}

function resultLabel(item: HistoryItem) {
  if (!item.winner) {
    return "В процессе";
  }
  return "Победа";
}

function HeroIllustration() {
  return (
    <svg viewBox="0 0 420 280" className="hero-art-svg" aria-hidden="true">
      <defs>
        <radialGradient id="heroHaloPink" cx="40%" cy="44%" r="55%">
          <stop offset="0%" stopColor="rgba(255,109,170,0.95)" />
          <stop offset="40%" stopColor="rgba(255,109,170,0.28)" />
          <stop offset="100%" stopColor="rgba(255,109,170,0)" />
        </radialGradient>
        <radialGradient id="heroHaloBlue" cx="66%" cy="42%" r="48%">
          <stop offset="0%" stopColor="rgba(100,232,255,0.9)" />
          <stop offset="42%" stopColor="rgba(100,232,255,0.24)" />
          <stop offset="100%" stopColor="rgba(100,232,255,0)" />
        </radialGradient>
        <linearGradient id="heroLinePink" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#ff73b4" />
          <stop offset="100%" stopColor="#ffb2d2" />
        </linearGradient>
        <linearGradient id="heroLineBlue" x1="0%" x2="100%">
          <stop offset="0%" stopColor="#6fe8ff" />
          <stop offset="100%" stopColor="#8fb8ff" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="420" height="280" rx="24" fill="rgba(10,13,22,0.82)" />
      <ellipse cx="160" cy="102" rx="112" ry="92" fill="url(#heroHaloPink)" />
      <ellipse cx="270" cy="96" rx="120" ry="108" fill="url(#heroHaloBlue)" />
      {[78, 102, 126, 150].map((radius) => (
        <circle key={`pink-${radius}`} cx="212" cy="104" r={radius} fill="none" stroke="rgba(255,110,169,0.14)" strokeWidth="1.2" />
      ))}
      {[86, 118, 146].map((radius) => (
        <circle key={`blue-${radius}`} cx="240" cy="108" r={radius} fill="none" stroke="rgba(100,232,255,0.12)" strokeWidth="1.1" />
      ))}
      <rect x="0" y="196" width="420" height="84" fill="rgba(6,8,14,0.8)" />
      <path d="M130 160 C152 148 162 138 178 122 C198 102 214 90 246 86 C274 82 304 90 336 112" fill="none" stroke="rgba(111,232,255,0.24)" strokeWidth="2.4" />
      <g transform="translate(138 90)">
        <circle cx="34" cy="110" r="28" fill="rgba(255,109,170,0.1)" />
        <path d="M18 14 H50 L56 24 V90 H12 V24 Z" fill="none" stroke="url(#heroLinePink)" strokeWidth="4" />
        <path d="M24 90 H44 L50 108 H18 Z" fill="none" stroke="url(#heroLinePink)" strokeWidth="4" />
      </g>
      <g transform="translate(194 28)">
        <circle cx="58" cy="160" r="34" fill="rgba(255,109,170,0.12)" />
        <path d="M34 20 H82 L92 36 V140 H24 V36 Z" fill="none" stroke="url(#heroLinePink)" strokeWidth="5" />
        <path d="M40 140 H76 L86 168 H30 Z" fill="none" stroke="url(#heroLinePink)" strokeWidth="5" />
        <path d="M48 0 H68 L72 12 H44 Z" fill="none" stroke="url(#heroLinePink)" strokeWidth="4" />
      </g>
      <g transform="translate(282 72)">
        <circle cx="44" cy="118" r="26" fill="rgba(100,232,255,0.12)" />
        <path d="M24 14 H60 L68 28 V98 H16 V28 Z" fill="none" stroke="url(#heroLineBlue)" strokeWidth="4" />
        <path d="M28 98 H56 L62 116 H22 Z" fill="none" stroke="url(#heroLineBlue)" strokeWidth="4" />
      </g>
      <path d="M74 248 H350" stroke="rgba(255,255,255,0.06)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ProfileSigil() {
  return (
    <svg viewBox="0 0 112 112" aria-hidden="true">
      <defs>
        <radialGradient id="profileGlow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="rgba(255,112,179,0.26)" />
          <stop offset="100%" stopColor="rgba(255,112,179,0)" />
        </radialGradient>
      </defs>
      <circle cx="56" cy="56" r="52" fill="url(#profileGlow)" />
      <circle cx="56" cy="56" r="46" fill="rgba(11, 14, 23, 0.88)" stroke="#ff76b7" strokeWidth="2.4" />
      <path d="M46 24 H66 L74 34 V82 H38 V34 Z" fill="none" stroke="#ff9fd0" strokeWidth="4" />
      <path d="M50 14 H62" stroke="#ff9fd0" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function ModeArt({ tone }: { tone: "pink" | "blue" }) {
  const stroke = tone === "blue" ? "#84ecff" : "#ff81be";
  const glow = tone === "blue" ? "rgba(132,236,255,0.18)" : "rgba(255,129,190,0.18)";

  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="44" fill={glow} />
      <circle cx="60" cy="60" r="34" fill="none" stroke={tone === "blue" ? "rgba(132,236,255,0.22)" : "rgba(255,129,190,0.22)"} strokeWidth="1.8" />
      {tone === "pink" ? (
        <>
          <path d="M42 22 H78 L86 34 V90 H34 V34 Z" fill="none" stroke={stroke} strokeWidth="4" />
          <path d="M46 90 H74 L80 104 H40 Z" fill="none" stroke={stroke} strokeWidth="4" />
        </>
      ) : (
        <>
          <circle cx="60" cy="34" r="12" fill="none" stroke={stroke} strokeWidth="4" />
          <path d="M46 92 H74 L70 50 H50 Z" fill="none" stroke={stroke} strokeWidth="4" />
        </>
      )}
    </svg>
  );
}

function EmptyHistoryArt() {
  return (
    <svg viewBox="0 0 360 140" className="history-empty__art" aria-hidden="true">
      <rect x="18" y="24" width="324" height="92" rx="20" fill="rgba(12, 15, 24, 0.7)" stroke="rgba(255,255,255,0.05)" />
      {[0, 1, 2].map((index) => (
        <g key={index} transform={`translate(38 ${42 + index * 24})`}>
          <rect width="68" height="12" rx="6" fill="rgba(87, 235, 255, 0.16)" />
          <rect x="82" width="46" height="12" rx="6" fill="rgba(255, 122, 183, 0.16)" />
          <rect x="144" width="122" height="12" rx="6" fill="rgba(255,255,255,0.08)" />
        </g>
      ))}
    </svg>
  );
}

function ReplayBoardPreview() {
  return (
    <svg className="replay-preview__board" viewBox="0 0 280 280" aria-hidden="true">
      <defs>
        <linearGradient id="replayStroke" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#59e1ff" />
          <stop offset="100%" stopColor="#ff5da2" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="264" height="264" rx="14" fill="#111522" stroke="url(#replayStroke)" strokeWidth="1.2" />
      {Array.from({ length: 8 }).map((_, y) =>
        Array.from({ length: 8 }).map((__, x) => (
          <rect
            key={`${x}-${y}`}
            x={16 + x * 31}
            y={16 + y * 31}
            width="31"
            height="31"
            fill={(x + y) % 2 === 0 ? "#1b2432" : "#2a1730"}
          />
        )),
      )}
      <path d="M136 190 C136 170 140 150 144 134 C151 104 168 93 185 88" fill="none" stroke="#79efff" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <path d="M182 79 L192 87 L179 91 Z" fill="#79efff" />
      <circle cx="143" cy="188" r="9" fill="#ffffff" />
      <circle cx="143" cy="157" r="9" fill="#ffffff" />
      <circle cx="143" cy="126" r="9" fill="#ffffff" />
      {["24,24", "55,24", "86,24", "117,24", "148,24", "179,24", "210,24", "241,24"].map((point) => {
        const [cx, cy] = point.split(",").map(Number);
        return <circle key={point} cx={cx} cy={cy} r="8" fill="#4c0f28" stroke="#ff6aa6" strokeWidth="1.5" />;
      })}
      {["24,55", "55,55", "86,55", "148,55", "179,55", "241,55"].map((point) => {
        const [cx, cy] = point.split(",").map(Number);
        return <circle key={point} cx={cx} cy={cy} r="7" fill="#4c0f28" stroke="#ff6aa6" strokeWidth="1.3" />;
      })}
      {["24,210", "55,210", "86,210", "117,210", "148,210", "179,210", "210,210", "241,210"].map((point) => {
        const [cx, cy] = point.split(",").map(Number);
        return <circle key={point} cx={cx} cy={cy} r="8" fill="#f5eff4" stroke="#86ebff" strokeWidth="1.3" />;
      })}
      {["24,241", "55,241", "86,241", "117,241", "148,241", "179,241", "210,241", "241,241"].map((point) => {
        const [cx, cy] = point.split(",").map(Number);
        return <circle key={point} cx={cx} cy={cy} r="8" fill="#f5eff4" stroke="#86ebff" strokeWidth="1.3" />;
      })}
      {Array.from({ length: 8 }).map((_, index) => (
        <text key={`x-${index}`} x={27 + index * 31} y={266} fill="#9ba8bf" fontSize="9" textAnchor="middle">
          {String.fromCharCode(65 + index)}
        </text>
      ))}
      {Array.from({ length: 8 }).map((_, index) => (
        <text key={`y-${index}`} x={10} y={28 + index * 31} fill="#9ba8bf" fontSize="9">
          {8 - index}
        </text>
      ))}
    </svg>
  );
}

export function LobbyView({
  onCreateRoom,
  onJoinRoom,
  onBotMatch,
  onSubmitProfile,
  onLoadReplay,
  profile,
  loading,
  sessionReady,
  history,
  replayLog,
}: Props) {
  const [roomCode, setRoomCode] = useState("");
  const [nickname, setNickname] = useState(profile?.nickname ?? "");
  const [selectedReplayId, setSelectedReplayId] = useState<string | null>(null);

  useEffect(() => {
    setNickname(profile?.nickname ?? "");
  }, [profile]);

  useEffect(() => {
    if (!selectedReplayId && history.length > 0) {
      setSelectedReplayId(history[0].match_id);
    }
  }, [history, selectedReplayId]);

  const selectedHistoryItem = useMemo(
    () => history.find((item) => item.match_id === selectedReplayId) ?? history[0] ?? null,
    [history, selectedReplayId],
  );

  const profileReady = nickname.trim().length >= 2;
  const canStartGame = Boolean(profile) && sessionReady && !loading;
  const stats = useMemo(() => {
    const total = history.length;
    const wins = history.filter((item) => item.winner === "white" || item.winner === "black").length;
    return { total, wins };
  }, [history]);

  const handleReplayLoad = (matchId: string) => {
    setSelectedReplayId(matchId);
    onLoadReplay(matchId);
  };

  return (
    <section className="lobby-shell lobby-shell--game">
      <div className="lobby-layout-ref">
        <div className="lobby-row-ref lobby-row-ref--top">
          <section className="panel panel--major lobby-hero-ref">
            <div className="lobby-hero-ref__copy">
              <div className="lobby-hero-ref__eyebrow">Шахматы 2</div>
              <h1>JJK All-Stars Chess</h1>
              <p>Тактические шахматы с техниками, расширениями территории и энергией.</p>
              <div className="lobby-hero-ref__actions">
                <button className="accent-button" onClick={onCreateRoom} disabled={!canStartGame}>
                  Создать PvP-Комнату
                </button>
                <button onClick={() => onJoinRoom(roomCode)} disabled={!canStartGame || roomCode.length < 4}>
                  Присоединиться
                </button>
              </div>
              {!sessionReady && profile ? <div className="status-banner status-banner--muted">Подключение к серверу...</div> : null}
            </div>
            <div className="lobby-hero-ref__art">
              <HeroIllustration />
            </div>
          </section>

          <section className="panel panel--major lobby-profile-ref">
            <div className="section-head">
              <h2>Профиль Игрока</h2>
            </div>
            <div className="profile-ref__header">
              <div className="profile-ref__avatar">
                <ProfileSigil />
              </div>
              <div className="profile-ref__identity">
                <div className="profile-ref__name">{profile?.nickname ?? "Без Ника"}</div>
                <div className="profile-ref__stats">
                  <span>Матчей: {stats.total}</span>
                  <span>Побед: {stats.wins}</span>
                </div>
              </div>
            </div>
            <div className="profile-ref__editor">
              <label className="field">
                <span>Ник</span>
                <input value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="@Игрок" maxLength={24} />
              </label>
              <button className="accent-button" onClick={() => onSubmitProfile({ nickname: nickname.trim() })} disabled={loading || !profileReady}>
                Сохранить
              </button>
            </div>
          </section>
        </div>

        <div className="lobby-row-ref lobby-row-ref--middle">
          <section className="panel panel--major lobby-quick-ref">
            <div className="section-head">
              <h2>Быстрый Старт</h2>
            </div>
            <div className="mode-card-grid-ref">
              <article className="card mode-card-ref mode-card-ref--pink">
                <div className="mode-card-ref__visual">
                  <ModeArt tone="pink" />
                </div>
                <div className="card__eyebrow"><span>PvP-Комната</span></div>
                <h3>Играть Онлайн</h3>
                <p>Создайте комнату и отправьте код сопернику.</p>
                <button className="accent-button" onClick={onCreateRoom} disabled={!canStartGame}>
                  Создать
                </button>
              </article>

              <article className="card mode-card-ref mode-card-ref--blue">
                <div className="mode-card-ref__visual">
                  <ModeArt tone="blue" />
                </div>
                <div className="card__eyebrow"><span>Бот</span></div>
                <h3>Играть За Белых</h3>
                <p>Вы ходите первыми и задаёте темп партии.</p>
                <button onClick={() => onBotMatch("white")} disabled={!canStartGame}>
                  Начать
                </button>
              </article>

              <article className="card mode-card-ref mode-card-ref--pink">
                <div className="mode-card-ref__visual">
                  <ModeArt tone="pink" />
                </div>
                <div className="card__eyebrow"><span>Бот</span></div>
                <h3>Играть За Чёрных</h3>
                <p>Бот открывает игру, вы отвечаете вторым номером.</p>
                <button onClick={() => onBotMatch("black")} disabled={!canStartGame}>
                  Начать
                </button>
              </article>
            </div>
          </section>

          <section className="panel panel--major lobby-join-ref">
            <div className="section-head">
              <h2>Присоединиться По Коду</h2>
            </div>
            <p className="lobby-join-ref__copy">Введите код комнаты, чтобы сразу подключиться к приватной партии.</p>
            <div className="lobby-join-ref__form">
              <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="Код комнаты" />
              <button className="accent-button" onClick={() => onJoinRoom(roomCode)} disabled={!canStartGame || roomCode.length < 4}>
                Войти
              </button>
            </div>
          </section>
        </div>

        <div className="lobby-row-ref lobby-row-ref--bottom">
          <section className="panel panel--major lobby-history-ref">
            <div className="section-head">
              <h2>Последние Матчи</h2>
            </div>
            {history.length > 0 ? (
              <div className="history-list-ref">
                {history.map((item) => (
                  <button key={item.match_id} className="history-item-ref" onClick={() => handleReplayLoad(item.match_id)}>
                    <span className={`history-badge history-badge--${resultTone(item)}`}>{resultLabel(item)}</span>
                    <span className="history-item-ref__mode">{modeLabel(item)}</span>
                    <span className="history-item-ref__side">{item.winner ? formatSide(item.winner as Side) : "—"}</span>
                    <span className="history-item-ref__vs">vs</span>
                    <span className="history-item-ref__opponent">{item.room_code ? `Комната ${item.room_code}` : "Приватный матч"}</span>
                    <span className="history-item-ref__stamp">{formatHistoryStamp(item.updated_at)}</span>
                    <span className="history-item-ref__action">Повтор</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="history-empty history-empty--wide">
                <EmptyHistoryArt />
                <div className="history-empty__title">У вас пока нет завершённых матчей</div>
                <div className="history-empty__text">Сыграйте первую партию, чтобы здесь появилась история.</div>
              </div>
            )}
          </section>

          <section className="panel panel--major replay-card-ref">
            <div className="section-head">
              <h2>Просмотр Повтора</h2>
            </div>
            <ReplayBoardPreview />
            {selectedHistoryItem ? (
              <>
                <div className="replay-card-ref__meta">
                  <span className={`history-badge history-badge--${resultTone(selectedHistoryItem)}`}>{resultLabel(selectedHistoryItem)}</span>
                  <span>{modeLabel(selectedHistoryItem)} · {formatHistoryStamp(selectedHistoryItem.updated_at)}</span>
                </div>
                <div className="replay-card-ref__summary">
                  <div>{selectedHistoryItem.winner ? `${formatSide(selectedHistoryItem.winner as Side)} победили` : "Матч в процессе"}</div>
                  <div>{selectedHistoryItem.room_code ? `Комната ${selectedHistoryItem.room_code}` : "Приватный матч"}</div>
                </div>
                <div className="replay-card-ref__events">
                  {replayLog.length > 0 ? (
                    replayLog.slice(-3).reverse().map((event, index) => {
                      const item = formatEventFeedItem(event);
                      return (
                        <div key={`${String(event.kind)}-${index}`} className="replay-card-ref__event">
                          <span>{item.label}</span>
                          <strong>{item.title}</strong>
                        </div>
                      );
                    })
                  ) : (
                    <div className="empty-note">Для этого матча ещё нет загруженных событий.</div>
                  )}
                </div>
                <button className="accent-button replay-card-ref__button" onClick={() => handleReplayLoad(selectedHistoryItem.match_id)}>
                  Смотреть Повтор
                </button>
              </>
            ) : (
              <div className="replay-card-ref__placeholder">
                <div className="empty-note">Выберите матч, чтобы открыть повтор.</div>
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
}
