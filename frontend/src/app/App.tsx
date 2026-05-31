import { useEffect, useMemo, useRef, useState } from "react";

import backgroundImage from "../assets/jjk-background.png";
import { FaqView } from "../features/faq/FaqView";
import { LobbyView } from "../features/lobby/LobbyView";
import { MatchView } from "../features/match/MatchView";
import {
  connectMatchSocket,
  createBotMatch,
  createGuestSession,
  createRoom,
  fetchHistory,
  fetchReplay,
  joinRoom,
  requestLegalActions,
  requestSync,
} from "../lib/api";
import { getPlayerDisplayNames } from "../lib/presentation";
import { loadProfile, saveProfile, type PlayerProfile } from "../lib/profile";
import type { GameAction, MatchState, Side } from "../lib/types";

type HistoryItem = {
  match_id: string;
  status: string;
  winner: string | null;
  updated_at: string;
  room_code: string | null;
};

export function App() {
  const [profile, setProfile] = useState<PlayerProfile | null>(() => loadProfile());
  const [session, setSession] = useState<{ guest_id: string; token: string; display_name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [playerSide, setPlayerSide] = useState<Side>("white");
  const [opponentKind, setOpponentKind] = useState<"bot" | "pvp">("pvp");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [state, setState] = useState<MatchState | null>(null);
  const [legalActions, setLegalActions] = useState<Record<string, GameAction[]>>({});
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [replayLog, setReplayLog] = useState<Array<Record<string, unknown>>>([]);
  const [showFaq, setShowFaq] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const sessionReady = Boolean(session);

  useEffect(() => {
    if (!profile) {
      return;
    }
    createGuestSession(profile.nickname).then(setSession);
  }, [profile]);

  useEffect(() => {
    if (!session) {
      return;
    }
    fetchHistory(session.token).then(setHistory);
  }, [session]);

  useEffect(() => {
    return () => {
      if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) {
        socketRef.current.close();
      }
      socketRef.current = null;
    };
  }, []);

  const openSocket = (nextMatchId: string, token: string) => {
    if (socketRef.current && socketRef.current.readyState < WebSocket.CLOSING) {
      socketRef.current.close();
    }

    const nextSocket = connectMatchSocket(nextMatchId, token, {
      onSnapshot: (nextState) => {
        setState(nextState);
        setReplayLog(nextState.event_log);
      },
      onLegalActions: (pieceId, actions) => setLegalActions((current) => ({ ...current, [pieceId]: actions })),
      onActionResolved: (nextState) => {
        setState(nextState);
        setReplayLog(nextState.event_log);
        setLegalActions({});
      },
      onInvalidAction: (message) => {
        window.alert(`Ошибка хода: ${message}`);
      },
    });

    nextSocket.onopen = () => {
      requestSync(nextSocket);
    };
    nextSocket.onclose = () => {
      if (socketRef.current === nextSocket) {
        socketRef.current = null;
        setSocket(null);
      }
    };

    socketRef.current = nextSocket;
    setSocket(nextSocket);
  };

  const handleCreateRoom = async () => {
    if (!session) {
      return;
    }
    setLoading(true);
    setOpponentKind("pvp");
    const room = await createRoom(session.token, session.display_name);
    setMatchId(room.match_id);
    setPlayerSide(room.side);
    setSelectedPieceId(null);
    setLegalActions({});
    setShowFaq(false);
    openSocket(room.match_id, session.token);
    setLoading(false);
  };

  const handleJoinRoom = async (roomCode: string) => {
    if (!session) {
      return;
    }
    setLoading(true);
    setOpponentKind("pvp");
    const room = await joinRoom(session.token, roomCode, session.display_name);
    setMatchId(room.match_id);
    setPlayerSide(room.side);
    setSelectedPieceId(null);
    setLegalActions({});
    setShowFaq(false);
    openSocket(room.match_id, session.token);
    setLoading(false);
  };

  const handleBotMatch = async (side: Side) => {
    if (!session) {
      return;
    }
    setLoading(true);
    setOpponentKind("bot");
    const match = await createBotMatch(session.token, session.display_name, side);
    setMatchId(match.match_id);
    setPlayerSide(match.side);
    setSelectedPieceId(null);
    setLegalActions({});
    setShowFaq(false);
    openSocket(match.match_id, session.token);
    setLoading(false);
  };

  const handleLoadReplay = async (nextMatchId: string) => {
    const replay = await fetchReplay(nextMatchId);
    setReplayLog(replay.replay_log);
  };

  const topbarName = session?.display_name ?? profile?.nickname ?? "Игрок";
  const topbarStatus = state && matchId ? "в матче" : showFaq ? "справочник" : "в лобби";

  const playerNames = useMemo(() => {
    const nickname = profile?.nickname ?? "Игрок";
    return getPlayerDisplayNames(nickname, playerSide, opponentKind === "bot");
  }, [opponentKind, playerSide, profile]);

  return (
    <main
      className="app-shell"
      style={{ backgroundImage: `linear-gradient(180deg, rgba(5, 6, 14, 0.88), rgba(7, 8, 17, 0.96)), url(${backgroundImage})` }}
    >
      <header className="topbar topbar--game">
        <div className="topbar__brand">
          <div className="topbar__title">JJK All-Stars Chess</div>
          <div className="topbar__subtitle">{showFaq ? "Справочник" : "Тактическое лобби"}</div>
        </div>
        <div className="topbar__summary">
          {!state ? (
            <button className="ghost topbar__faq-button" onClick={() => setShowFaq((current) => !current)}>
              {showFaq ? "К лобби" : "FAQ"}
            </button>
          ) : null}
          <span>{topbarName}</span>
          {session ? <span>Код: {session.guest_id.slice(0, 8)}</span> : null}
          <span>Статус: {topbarStatus}</span>
        </div>
      </header>

      <div className={`content-grid ${!state ? "content-grid--lobby" : ""}`}>
        <div className="primary-column">
          {state && matchId ? (
            <MatchView
              matchId={matchId}
              state={state}
              legalActions={legalActions}
              selectedPieceId={selectedPieceId}
              playerSide={playerSide}
              playerNames={playerNames}
              socket={socket}
              onSelectPiece={setSelectedPieceId}
              onRequestLegalActions={(pieceId) => socket && requestLegalActions(socket, pieceId)}
              onLeave={() => {
                socketRef.current?.close();
                socketRef.current = null;
                setSocket(null);
                setMatchId(null);
                setState(null);
                setLegalActions({});
                setSelectedPieceId(null);
              }}
            />
          ) : showFaq ? (
            <FaqView onBack={() => setShowFaq(false)} />
          ) : (
            <LobbyView
              profile={profile}
              onSubmitProfile={(nextProfile) => {
                saveProfile(nextProfile);
                setSession(null);
                setProfile(nextProfile);
              }}
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onBotMatch={handleBotMatch}
              onLoadReplay={handleLoadReplay}
              history={history}
              replayLog={replayLog}
              loading={loading}
              sessionReady={sessionReady}
            />
          )}
        </div>
      </div>
    </main>
  );
}
