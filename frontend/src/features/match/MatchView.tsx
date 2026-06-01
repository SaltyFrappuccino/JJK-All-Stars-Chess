import { useEffect, useMemo, useState } from "react";

import { PhaserBoard } from "../../game/phaser/PhaserBoard";
import { findActionForCell, isDirectAction } from "../../lib/actions";
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
    return "РЎСѓРєСѓРЅР° Р·Р°С…РІР°С‡РµРЅ РѕР±С‹С‡РЅС‹Рј С…РѕРґРѕРј.";
  }
  if (reason === "resign") {
    return "РЎРѕРїРµСЂРЅРёРє СЃРґР°Р»СЃСЏ.";
  }
  return "РџР°СЂС‚РёСЏ Р·Р°РІРµСЂС€РµРЅР°.";
}

function compactReason(reason: string | null, sideToMove: Side) {
  if (!reason) {
    return "Р“РѕС‚РѕРІРѕ Рє РґРµР№СЃС‚РІРёСЋ";
  }
  if (reason.startsWith("РЎРµР№С‡Р°СЃ РЅРµ С…РѕРґ")) {
    return `РЎРµР№С‡Р°СЃ С…РѕРґ ${formatSide(sideToMove).toLowerCase()}`;
  }
  if (reason.startsWith("РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ СЌРЅРµСЂРіРёРё")) {
    return "РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ СЌРЅРµСЂРіРёРё";
  }
  if (reason.startsWith("РЎРµР№С‡Р°СЃ РЅРµС‚ РґРѕСЃС‚СѓРїРЅРѕР№ С†РµР»Рё")) {
    return "РќРµС‚ С†РµР»Рё";
  }
  if (reason.startsWith("Р“Р»РѕР±Р°Р»СЊРЅС‹Р№ РѕС‚РєР°С‚")) {
    return "Р Рў РЅР° РѕС‚РєР°С‚Рµ";
  }
  if (reason.startsWith("РўРµС…РЅРёРєР° РЅР° РїРµСЂРµР·Р°СЂСЏРґРєРµ")) {
    return "РџРµСЂРµР·Р°СЂСЏРґРєР°";
  }
  if (reason.startsWith("РџРµС€РµС‡РЅР°СЏ С‚РµС…РЅРёРєР°")) {
    return "РўРµС…РЅРёРєР° РїРѕС‚СЂР°С‡РµРЅР°";
  }
  if (reason.startsWith("Р­С‚Р° Р Рў СѓР¶Рµ")) {
    return "Р Рў РїРѕС‚СЂР°С‡РµРЅР°";
  }
  if (reason.startsWith("РџРѕРєР° РЅР° РґРѕСЃРєРµ")) {
    return "Р”СЂСѓРіР°СЏ Р Рў СѓР¶Рµ Р°РєС‚РёРІРЅР°";
  }
  if (reason.startsWith("РЎРЅР°С‡Р°Р»Р° Р®С‚Р°")) {
    return "РЎРЅР°С‡Р°Р»Р° СЃРєРѕРїРёСЂСѓР№С‚Рµ С‚РµС…РЅРёРєСѓ";
  }
  if (reason.startsWith("РЈ РїРµС€РµРє")) {
    return "Р Рў РѕС‚СЃСѓС‚СЃС‚РІСѓРµС‚";
  }
  if (reason.startsWith("Р¤РёРіСѓСЂР° СЃРµР№С‡Р°СЃ")) {
    return "Р”РµР№СЃС‚РІРёРµ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅРѕ";
  }
  return reason;
}

function statusTone(reason: string | null) {
  if (!reason) {
    return "ready";
  }
  if (reason.startsWith("РќРµРґРѕСЃС‚Р°С‚РѕС‡РЅРѕ СЌРЅРµСЂРіРёРё") || reason.startsWith("Р¤РёРіСѓСЂР° СЃРµР№С‡Р°СЃ")) {
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
  const directAction = useMemo(() => displayedActions.find((item) => isDirectAction(item)) ?? null, [displayedActions]);
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
      return "Р’С‹Р±РµСЂРёС‚Рµ С„РёРіСѓСЂСѓ";
    }
    if (actionMode === "technique_cast") {
      return techniqueReason;
    }
    if (actionMode === "domain_cast") {
      return domainReason;
    }
    if (!moveActions.length && selectedPiece.side === state.side_to_move) {
      return "РќРµС‚ С…РѕРґР°";
    }
    if (selectedPiece.side !== state.side_to_move) {
      return `РЎРµР№С‡Р°СЃ С…РѕРґ ${formatSide(state.side_to_move).toLowerCase()}`;
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

    const action = findActionForCell(displayedActions, x, y, state.pieces);
    if (!action) {
      setMessage("РќРµС‚ С†РµР»Рё");
      return;
    }

    if (!submitAction(socket, action)) {
      setMessage("РЎРѕРµРґРёРЅРµРЅРёРµ РїРѕС‚РµСЂСЏРЅРѕ");
      return;
    }

    setMessage("");
  };

  const handleDirectAction = () => {
    if (!socket || !directAction) {
      return;
    }
    if (!submitAction(socket, directAction)) {
      setMessage("РЎРѕРµРґРёРЅРµРЅРёРµ РїРѕС‚РµСЂСЏРЅРѕ");
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
              <h2>Р¤РёРіСѓСЂР°</h2>
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
                      {formatRole(selectedPiece.role)} В· {formatSide(selectedPiece.side)} В· РџРµСЂРµР·Р°СЂСЏРґРєР° {selectedPiece.cooldown}
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
                    title={!moveActions.length ? "РќРµС‚ С…РѕРґР°" : ""}
                  >
                    РҐРѕРґ
                  </button>
                  <button
                    className={actionMode === "technique_cast" ? "action-button action-button--selected" : "action-button"}
                    disabled={!techniqueActions.length}
                    onClick={() => setActionMode("technique_cast")}
                    title={techniqueReason ?? ""}
                  >
                    РўРµС…РЅРёРєР°
                  </button>
                  <button
                    className={actionMode === "domain_cast" ? "action-button action-button--selected" : "action-button"}
                    disabled={!domainActions.length}
                    onClick={() => setActionMode("domain_cast")}
                    title={domainReason ?? ""}
                  >
                    Р Рў
                  </button>
                </div>

                {directAction ? (
                  <div className="chip-row chip-row--spaced">
                    <button className="ghost" onClick={handleDirectAction}>
                      Применить
                    </button>
                  </div>
                ) : null}

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
                        <span>РўРµС…РЅРёРєР°</span>
                        <strong>{technique.cost === null ? "Р‘РµР· Р—Р°С‚СЂР°С‚" : `${technique.cost} Р­РЅРµСЂРіРёРё`}</strong>
                      </div>
                      <h4>{technique.label}</h4>
                      <p>{technique.summary}</p>
                    </section>
                  ) : null}

                  {domain ? (
                    <section className={`card card--detail card--domain${actionMode === "domain_cast" ? " card--active" : ""}`}>
                      <div className="card__eyebrow">
                        <span>Р Рў</span>
                        <strong>{domain.cost === null ? "Р‘РµР· Р—Р°С‚СЂР°С‚" : `${domain.cost} Р­РЅРµСЂРіРёРё`}</strong>
                      </div>
                      <h4>{domain.label}</h4>
                      <p>{domain.summary}</p>
                    </section>
                  ) : null}
                </div>

                <section className="card card--status-list">
                  <div className="card__eyebrow">
                    <span>РЎС‚Р°С‚СѓСЃС‹</span>
                  </div>
                  {selectedStatuses.length > 0 ? (
                    <div className="status-list">
                      {selectedStatuses.map((status) => (
                        <div key={`${status.kind}-${status.turns}`} className="status-item">
                          <div className="status-item__head">
                            <span>{formatStatus(status.kind)}</span>
                            <strong>{status.turns} С…РѕРґ</strong>
                          </div>
                          <div className="status-item__body">{getStatusDescription(status.kind)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-note">РЎС‚Р°С‚СѓСЃС‹ РѕС‚СЃСѓС‚СЃС‚РІСѓСЋС‚</div>
                  )}
                </section>
              </>
            ) : (
              <section className="card card--empty">
                <h3>Р’С‹Р±РµСЂРёС‚Рµ С„РёРіСѓСЂСѓ</h3>
                <p>РќР°Р¶РјРёС‚Рµ РЅР° СЃРІРѕСЋ С„РёРіСѓСЂСѓ РЅР° РґРѕСЃРєРµ, С‡С‚РѕР±С‹ РѕС‚РєСЂС‹С‚СЊ РґРµР№СЃС‚РІРёСЏ Рё С‚РµС…РЅРёРєРё.</p>
              </section>
            )}
          </section>
        </aside>

        <main className="match-column match-column--center">
          <section className="panel panel--major stage-panel">
            <div className="stage-toolbar">
              <div className="meta-pill">
                <span>РњР°С‚С‡</span>
                <strong>{matchId.slice(0, 8)}</strong>
              </div>
              <div className="meta-pill">
                <span>Р’Р°С€ С†РІРµС‚</span>
                <strong>{formatSide(playerSide)}</strong>
              </div>
              <div className="meta-pill">
                <span>РҐРѕРґ</span>
                <strong>{formatSide(state.side_to_move)}</strong>
              </div>
              <button className="ghost" onClick={onLeave}>
                Р’С‹Р№С‚Рё
              </button>
            </div>

            <div className="player-banner player-banner--top">
              <div className="player-banner__identity">
                <span className="player-banner__label">Р’РµСЂС…</span>
                <strong>{playerNames.black}</strong>
              </div>
              <div className="player-banner__stats">
                {renderEnergyRow("black", state.energy.black)}
                <div className="player-banner__meta">
                  <span>Р­РЅРµСЂРіРёСЏ {state.energy.black}</span>
                  <span>Р Рў {state.global_domain_lock.black}</span>
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
                <span className="player-banner__label">РќРёР·</span>
                <strong>{playerNames.white}</strong>
              </div>
              <div className="player-banner__stats">
                {renderEnergyRow("white", state.energy.white)}
                <div className="player-banner__meta">
                  <span>Р­РЅРµСЂРіРёСЏ {state.energy.white}</span>
                  <span>Р Рў {state.global_domain_lock.white}</span>
                </div>
              </div>
            </div>
          </section>
        </main>

        <aside className="match-column match-column--right">
          <section className="panel panel--major feed-panel feed-panel--game">
            <div className="section-head">
              <h2>РҐРѕРґ РџР°СЂС‚РёРё</h2>
            </div>

            <div className="journal-rail">
              {state.active_domain ? (
                <div className="ui-chip ui-chip--domain">РђРєС‚РёРІРЅР°СЏ Р Рў: {formatDomainName(state.active_domain.name)}</div>
              ) : null}
              {state.technique_check ? (
                <div className="status-banner status-banner--danger">
                  РЁР°С… С‚РµС…РЅРёРєРѕР№: РїРѕРґ СѓРіСЂРѕР·РѕР№ {formatSide(state.technique_check.target_side)}
                </div>
              ) : null}
              {hoveredPiece ? (
                <div className="card card--hover-status">
                  <div className="card__eyebrow">
                    <span>РџРѕРґ РєСѓСЂСЃРѕСЂРѕРј</span>
                  </div>
                  <h4>{formatPieceName(hoveredPiece.name)}</h4>
                  {hoveredStatuses.length > 0 ? (
                    <div className="status-list">
                      {hoveredStatuses.map((status) => (
                        <div key={`${hoveredPiece.id}-${status.kind}-${status.turns}`} className="status-item status-item--compact">
                          <div className="status-item__head">
                            <span>{formatStatus(status.kind)}</span>
                            <strong>{status.turns} С…РѕРґ</strong>
                          </div>
                          <div className="status-item__body">{getStatusDescription(status.kind)}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-note">Р­С„С„РµРєС‚С‹ РѕС‚СЃСѓС‚СЃС‚РІСѓСЋС‚</div>
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
            <div className="match-result-modal__eyebrow">РџР°СЂС‚РёСЏ Р·Р°РІРµСЂС€РµРЅР°</div>
            <h2>{isPlayerWinner ? "РџРѕР±РµРґР°" : "РџРѕСЂР°Р¶РµРЅРёРµ"}</h2>
            <p>{winnerReasonLabel(state.winner_reason)}</p>
            <div className="match-result-modal__meta">РџРѕР±РµРґРёС‚РµР»СЊ: {formatSide(state.winner)}</div>
            <div className="match-result-modal__actions">
              <button className="accent-button" onClick={onLeave}>
                Р’ Р»РѕР±Р±Рё
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
