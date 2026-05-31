import { useEffect, useMemo, useState } from "react";

import { PhaserBoard } from "../../game/phaser/PhaserBoard";
import { submitAction } from "../../lib/api";
import {
  formatDomainName,
  formatEventFeedItem,
  formatPieceName,
  formatRole,
  formatSide,
  formatStatus,
  getDomainInfo,
  getDomainUnavailableReason,
  getPieceImage,
  getStatusDescription,
  getTechniqueInfo,
  getTechniqueUnavailableReason,
  groupActionCounts,
} from "../../lib/presentation";
import type { GameAction, MatchState, Side } from "../../lib/types";

type Props = {
  matchId: string;
  state: MatchState;
  legalActions: Record<string, GameAction[]>;
  selectedPieceId: string | null;
  playerSide: Side;
  playerNames: Record<Side, string>;
  socket: WebSocket | null;
  onSelectPiece: (pieceId: string) => void;
  onRequestLegalActions: (pieceId: string) => void;
  onLeave: () => void;
};

type ActionMode = "normal_move" | "technique_cast" | "domain_cast";

function renderEnergyRow(side: Side, energy: number) {
  return (
    <div className={`energy-track energy-track--${side}`}>
      {Array.from({ length: 10 }, (_, index) => (
        <span key={index} className={`energy-node${index < energy ? " energy-node--filled" : ""}`} />
      ))}
    </div>
  );
}

function winnerReasonLabel(reason: string | null) {
  if (reason === "sukuna_captured") {
    return "Сукуна захвачен обычным ходом.";
  }
  if (reason === "resign") {
    return "Соперник сдался.";
  }
  return "Партия завершена.";
}

function compactReason(reason: string | null, sideToMove: Side) {
  if (!reason) {
    return "Готово к действию";
  }
  if (reason.startsWith("Сейчас не ход")) {
    return `Сейчас ход ${formatSide(sideToMove).toLowerCase()}`;
  }
  if (reason.startsWith("Недостаточно энергии")) {
    return "Недостаточно энергии";
  }
  if (reason.startsWith("Сейчас нет доступной цели")) {
    return "Нет цели";
  }
  if (reason.startsWith("Глобальный откат")) {
    return "РТ на откате";
  }
  if (reason.startsWith("Техника на перезарядке")) {
    return "Перезарядка";
  }
  if (reason.startsWith("Пешечная техника")) {
    return "Техника потрачена";
  }
  if (reason.startsWith("Эта РТ уже")) {
    return "РТ потрачена";
  }
  if (reason.startsWith("Пока на доске")) {
    return "Другая РТ уже активна";
  }
  if (reason.startsWith("Сначала Юта")) {
    return "Сначала скопируйте технику";
  }
  if (reason.startsWith("У пешек")) {
    return "РТ отсутствует";
  }
  if (reason.startsWith("Фигура сейчас")) {
    return "Действие заблокировано";
  }
  return reason;
}

function statusTone(reason: string | null) {
  if (!reason) {
    return "ready";
  }
  if (reason.startsWith("Недостаточно энергии") || reason.startsWith("Фигура сейчас")) {
    return "danger";
  }
  return "muted";
}

export function MatchView({
  matchId,
  state,
  legalActions,
  selectedPieceId,
  playerSide,
  playerNames,
  socket,
  onSelectPiece,
  onRequestLegalActions,
  onLeave,
}: Props) {
  const [message, setMessage] = useState("");
  const [actionMode, setActionMode] = useState<ActionMode>("normal_move");
  const [hoveredPieceId, setHoveredPieceId] = useState<string | null>(null);

  const selectedPiece = selectedPieceId ? state.pieces[selectedPieceId] : null;
  const hoveredPiece = hoveredPieceId ? state.pieces[hoveredPieceId] : null;
  const selectedActions = selectedPieceId ? legalActions[selectedPieceId] ?? [] : [];
  const moveActions = useMemo(() => selectedActions.filter((item) => item.kind === "normal_move"), [selectedActions]);
  const techniqueActions = useMemo(() => selectedActions.filter((item) => item.kind === "technique_cast"), [selectedActions]);
  const domainActions = useMemo(() => selectedActions.filter((item) => item.kind === "domain_cast"), [selectedActions]);
  const displayedActions = useMemo(() => selectedActions.filter((item) => item.kind === actionMode), [actionMode, selectedActions]);
  const visibleEvents = useMemo(() => state.event_log.slice(-24).reverse(), [state.event_log]);
  const actionCounts = useMemo(() => groupActionCounts(selectedActions), [selectedActions]);
  const selectedStatuses = selectedPiece ? state.statuses[selectedPiece.id] ?? [] : [];
  const hoveredStatuses = hoveredPiece ? state.statuses[hoveredPiece.id] ?? [] : [];
  const technique = selectedPiece ? getTechniqueInfo(selectedPiece) : null;
  const domain = selectedPiece ? getDomainInfo(selectedPiece) : null;
  const techniqueReason = selectedPiece ? getTechniqueUnavailableReason(selectedPiece, state, techniqueActions) : null;
  const domainReason = selectedPiece ? getDomainUnavailableReason(selectedPiece, state, domainActions) : null;
  const isPlayerWinner = state.winner === playerSide;

  const activeReason = useMemo(() => {
    if (message) {
      return message;
    }
    if (!selectedPiece) {
      return "Выберите фигуру";
    }
    if (actionMode === "technique_cast") {
      return techniqueReason;
    }
    if (actionMode === "domain_cast") {
      return domainReason;
    }
    if (!moveActions.length && selectedPiece.side === state.side_to_move) {
      return "Нет хода";
    }
    if (selectedPiece.side !== state.side_to_move) {
      return `Сейчас ход ${formatSide(state.side_to_move).toLowerCase()}`;
    }
    return null;
  }, [actionMode, domainReason, message, moveActions.length, selectedPiece, state.side_to_move, techniqueReason]);

  useEffect(() => {
    if (!selectedActions.length) {
      return;
    }
    if (selectedActions.some((item) => item.kind === actionMode)) {
      return;
    }
    const fallback = (["normal_move", "technique_cast", "domain_cast"] as ActionMode[]).find((kind) =>
      selectedActions.some((item) => item.kind === kind),
    );
    if (fallback) {
      setActionMode(fallback);
    }
  }, [actionMode, selectedActions]);

  useEffect(() => {
    setMessage("");
    setActionMode("normal_move");
  }, [selectedPieceId]);

  const handleSelectPiece = (pieceId: string) => {
    setMessage("");
    onSelectPiece(pieceId);
    onRequestLegalActions(pieceId);
  };

  const handleCellAction = (x: number, y: number) => {
    if (!socket || !selectedPieceId) {
      return;
    }

    const action = displayedActions.find((candidate) => {
      if (candidate.to) {
        return candidate.to[0] === x && candidate.to[1] === y;
      }
      if (candidate.cells) {
        return candidate.cells.some((cell) => cell[0] === x && cell[1] === y);
      }
      if (candidate.targets) {
        return candidate.targets.some((targetId) => {
          const target = state.pieces[targetId];
          return target && target.x === x && target.y === y;
        });
      }
      return false;
    });

    if (!action) {
      setMessage("Нет цели");
      return;
    }

    if (!submitAction(socket, action)) {
      setMessage("Соединение потеряно");
      return;
    }

    setMessage("");
  };

  return (
    <>
      <section className="match-shell">
        <aside className="match-column match-column--left">
          <section className="panel panel--major inspector-panel inspector-panel--game">
            <div className="section-head">
              <h2>Фигура</h2>
              {selectedPiece ? <span className="ui-chip ui-chip--side">{formatSide(selectedPiece.side)}</span> : null}
            </div>

            {selectedPiece ? (
              <>
                <div className="piece-hero">
                  <div className={`piece-hero__art piece-hero__art--${selectedPiece.side}`}>
                    <img src={getPieceImage(selectedPiece)} alt={formatPieceName(selectedPiece.name)} />
                  </div>
                  <div className="piece-hero__body">
                    <h3>{formatPieceName(selectedPiece.name)}</h3>
                    <div className="piece-hero__meta">
                      {formatRole(selectedPiece.role)} · {formatSide(selectedPiece.side)} · Перезарядка {selectedPiece.cooldown}
                    </div>
                    <div className={`status-banner status-banner--${statusTone(activeReason)}`}>
                      {compactReason(activeReason, state.side_to_move)}
                    </div>
                  </div>
                </div>

                <div className="action-bar">
                  <button
                    className={actionMode === "normal_move" ? "action-button action-button--selected" : "action-button"}
                    disabled={!moveActions.length}
                    onClick={() => setActionMode("normal_move")}
                    title={!moveActions.length ? "Нет хода" : ""}
                  >
                    Ход
                  </button>
                  <button
                    className={actionMode === "technique_cast" ? "action-button action-button--selected" : "action-button"}
                    disabled={!techniqueActions.length}
                    onClick={() => setActionMode("technique_cast")}
                    title={techniqueReason ?? ""}
                  >
                    Техника
                  </button>
                  <button
                    className={actionMode === "domain_cast" ? "action-button action-button--selected" : "action-button"}
                    disabled={!domainActions.length}
                    onClick={() => setActionMode("domain_cast")}
                    title={domainReason ?? ""}
                  >
                    РТ
                  </button>
                </div>

                <div className="chip-row chip-row--spaced">
                  {actionCounts.map((item) => (
                    <span key={item.kind} className="ui-chip ui-chip--count">
                      {item.kind}: {item.count}
                    </span>
                  ))}
                </div>

                <div className="detail-stack">
                  {technique ? (
                    <section className={`card card--detail${actionMode === "technique_cast" ? " card--active" : ""}`}>
                      <div className="card__eyebrow">
                        <span>Техника</span>
                        <strong>{technique.cost === null ? "Без Затрат" : `${technique.cost} Энергии`}</strong>
                      </div>
                      <h4>{technique.label}</h4>
                      <p>{technique.summary}</p>
                    </section>
                  ) : null}

                  {domain ? (
                    <section className={`card card--detail card--domain${actionMode === "domain_cast" ? " card--active" : ""}`}>
                      <div className="card__eyebrow">
                        <span>РТ</span>
                        <strong>{domain.cost === null ? "Без Затрат" : `${domain.cost} Энергии`}</strong>
                      </div>
                      <h4>{domain.label}</h4>
                      <p>{domain.summary}</p>
                    </section>
                  ) : null}
                </div>

                <section className="card card--status-list">
                  <div className="card__eyebrow">
                    <span>Статусы</span>
                  </div>
                  {selectedStatuses.length > 0 ? (
                    <div className="status-list">
                      {selectedStatuses.map((status) => (
                        <div key={`${status.kind}-${status.turns}`} className="status-item">
                          <div className="status-item__head">
                            <span>{formatStatus(status.kind)}</span>
                            <strong>{status.turns} ход</strong>
                          </div>
                          <div className="status-item__body">{getStatusDescription(status.kind)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-note">Статусы отсутствуют</div>
                  )}
                </section>
              </>
            ) : (
              <section className="card card--empty">
                <h3>Выберите фигуру</h3>
                <p>Нажмите на свою фигуру на доске, чтобы открыть действия и техники.</p>
              </section>
            )}
          </section>
        </aside>

        <main className="match-column match-column--center">
          <section className="panel panel--major stage-panel">
            <div className="stage-toolbar">
              <div className="meta-pill">
                <span>Матч</span>
                <strong>{matchId.slice(0, 8)}</strong>
              </div>
              <div className="meta-pill">
                <span>Ваш цвет</span>
                <strong>{formatSide(playerSide)}</strong>
              </div>
              <div className="meta-pill">
                <span>Ход</span>
                <strong>{formatSide(state.side_to_move)}</strong>
              </div>
              <button className="ghost" onClick={onLeave}>
                Выйти
              </button>
            </div>

            <div className="player-banner player-banner--top">
              <div className="player-banner__identity">
                <span className="player-banner__label">Верх</span>
                <strong>{playerNames.black}</strong>
              </div>
              <div className="player-banner__stats">
                {renderEnergyRow("black", state.energy.black)}
                <div className="player-banner__meta">
                  <span>Энергия {state.energy.black}</span>
                  <span>РТ {state.global_domain_lock.black}</span>
                </div>
              </div>
            </div>

            <div className="board-center">
              <PhaserBoard
                state={state}
                selectedPieceId={selectedPieceId}
                legalActions={displayedActions}
                onSelectPiece={handleSelectPiece}
                onHoverPiece={setHoveredPieceId}
                onCellAction={handleCellAction}
              />
            </div>

            <div className="player-banner player-banner--bottom">
              <div className="player-banner__identity">
                <span className="player-banner__label">Низ</span>
                <strong>{playerNames.white}</strong>
              </div>
              <div className="player-banner__stats">
                {renderEnergyRow("white", state.energy.white)}
                <div className="player-banner__meta">
                  <span>Энергия {state.energy.white}</span>
                  <span>РТ {state.global_domain_lock.white}</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside className="match-column match-column--right">
          <section className="panel panel--major feed-panel feed-panel--game">
            <div className="section-head">
              <h2>Ход Партии</h2>
            </div>

            <div className="journal-rail">
              {state.active_domain ? (
                <div className="ui-chip ui-chip--domain">Активная РТ: {formatDomainName(state.active_domain.name)}</div>
              ) : null}
              {state.technique_check ? (
                <div className="status-banner status-banner--danger">
                  Шах техникой: под угрозой {formatSide(state.technique_check.target_side)}
                </div>
              ) : null}
              {hoveredPiece ? (
                <div className="card card--hover-status">
                  <div className="card__eyebrow">
                    <span>Под курсором</span>
                  </div>
                  <h4>{formatPieceName(hoveredPiece.name)}</h4>
                  {hoveredStatuses.length > 0 ? (
                    <div className="status-list">
                      {hoveredStatuses.map((status) => (
                        <div key={`${hoveredPiece.id}-${status.kind}-${status.turns}`} className="status-item status-item--compact">
                          <div className="status-item__head">
                            <span>{formatStatus(status.kind)}</span>
                            <strong>{status.turns} ход</strong>
                          </div>
                          <div className="status-item__body">{getStatusDescription(status.kind)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-note">Эффекты отсутствуют</div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="log-list log-list--match">
              {visibleEvents.map((event, index) => {
                const item = formatEventFeedItem(event);
                return (
                  <div key={`${String(event.kind)}-${index}`} className={`log-item log-item--event log-item--${item.tone}`}>
                    <div className="log-item__label">{item.label}</div>
                    <div className="log-item__title">{item.title}</div>
                    {item.detail ? <div className="log-item__detail">{item.detail}</div> : null}
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </section>

      {state.winner ? (
        <div className="match-result-modal">
          <div className="match-result-modal__backdrop" />
          <div className="match-result-modal__card">
            <div className="match-result-modal__eyebrow">Партия завершена</div>
            <h2>{isPlayerWinner ? "Победа" : "Поражение"}</h2>
            <p>{winnerReasonLabel(state.winner_reason)}</p>
            <div className="match-result-modal__meta">Победитель: {formatSide(state.winner)}</div>
            <div className="match-result-modal__actions">
              <button className="accent-button" onClick={onLeave}>
                В лобби
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
