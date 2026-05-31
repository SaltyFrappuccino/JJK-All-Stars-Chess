import Phaser from "phaser";
import { useEffect, useRef } from "react";

import { formatPieceName, formatStatus, getStatusDescription, pieceImageMap } from "../../lib/presentation";
import type { GameAction, MatchState } from "../../lib/types";

type Props = {
  state: MatchState;
  selectedPieceId: string | null;
  legalActions: GameAction[];
  onSelectPiece: (pieceId: string) => void;
  onHoverPiece: (pieceId: string | null) => void;
  onCellAction: (x: number, y: number) => void;
};

const BOARD_SIZE = 760;
const CELL = 92;
const OFFSET = 12;

class BoardScene extends Phaser.Scene {
  private snapshot: MatchState | null = null;
  private selectedPieceId: string | null = null;
  private legalActions: GameAction[] = [];
  private onSelectPiece: (pieceId: string) => void = () => undefined;
  private onHoverPiece: (pieceId: string | null) => void = () => undefined;
  private onCellAction: (x: number, y: number) => void = () => undefined;
  private ready = false;
  private selectedSprite: Phaser.GameObjects.Image | null = null;
  private selectedContainer: Phaser.GameObjects.Container | null = null;
  private hoverTooltip: Phaser.GameObjects.Container | null = null;
  private hoveredPieceId: string | null = null;
  private dragPieceId: string | null = null;
  private dragOrigin: { x: number; y: number } | null = null;

  constructor() {
    super("board");
  }

  preload() {
    Object.entries(pieceImageMap).forEach(([key, image]) => {
      if (!this.textures.exists(key)) {
        this.load.image(key, image);
      }
    });
  }

  create() {
    this.ready = true;
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("gameout", () => {
      this.onHoverPiece(null);
      this.hideHoverTooltip();
    });
    this.renderBoard();
  }

  sync(
    state: MatchState,
    selectedPieceId: string | null,
    legalActions: GameAction[],
    onSelectPiece: (pieceId: string) => void,
    onHoverPiece: (pieceId: string | null) => void,
    onCellAction: (x: number, y: number) => void,
  ) {
    this.snapshot = state;
    this.selectedPieceId = selectedPieceId;
    this.legalActions = legalActions;
    this.onSelectPiece = onSelectPiece;
    this.onHoverPiece = onHoverPiece;
    this.onCellAction = onCellAction;
    if (this.ready) {
      this.renderBoard();
    }
  }

  private renderActionMarker(x: number, y: number, kind: GameAction["kind"]) {
    const cx = OFFSET + x * CELL + CELL / 2;
    const cy = OFFSET + y * CELL + CELL / 2;
    if (kind === "normal_move") {
      this.add.circle(cx, cy, 10, 0x76f3ff, 0.96);
      this.add.circle(cx, cy, 20).setStrokeStyle(2, 0x76f3ff, 0.5);
      return;
    }
    if (kind === "technique_cast") {
      this.add.circle(cx, cy, 28).setStrokeStyle(3, 0xff5b97, 0.95);
      this.add.circle(cx, cy, 18, 0xff5b97, 0.14);
      return;
    }
    if (kind === "domain_cast") {
      const diamond = this.add.polygon(cx, cy, [0, -22, 22, 0, 0, 22, -22, 0], 0xffd166, 0.16);
      diamond.setStrokeStyle(3, 0xffd166, 0.95);
    }
  }

  private collectActionAtCell(x: number, y: number): GameAction | null {
    const actions = this.legalActions.filter((action) => {
      if (action.to) {
        return action.to[0] === x && action.to[1] === y;
      }
      if (action.cells) {
        return action.cells.some((cell) => cell[0] === x && cell[1] === y);
      }
      if (action.targets) {
        return action.targets.some((targetId) => {
          const target = this.snapshot?.pieces[targetId];
          return target && target.x === x && target.y === y;
        });
      }
      return false;
    });
    return actions[0] ?? null;
  }

  private toBoardCell(worldX: number, worldY: number): [number, number] | null {
    const x = Math.floor((worldX - OFFSET) / CELL);
    const y = Math.floor((worldY - OFFSET) / CELL);
    if (x < 0 || x > 7 || y < 0 || y > 7) {
      return null;
    }
    return [x, y];
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer) {
    if (this.dragPieceId && this.selectedContainer) {
      this.selectedContainer.x = pointer.x;
      this.selectedContainer.y = pointer.y;
    }

    if (!this.selectedSprite || !this.selectedContainer) {
      if (this.hoverTooltip && this.hoveredPieceId) {
        this.positionHoverTooltip(pointer.x, pointer.y);
      }
      return;
    }
    const offsetX = Phaser.Math.Clamp((pointer.x - this.selectedContainer.x) / 34, -1, 1);
    const offsetY = Phaser.Math.Clamp((pointer.y - this.selectedContainer.y) / 34, -1, 1);
    this.selectedSprite.x = offsetX * 12;
    this.selectedSprite.y = offsetY * 6;
    this.selectedSprite.setFlipX(pointer.x > this.selectedContainer.x);
    this.selectedContainer.setRotation(offsetX * 0.12);
    this.selectedSprite.setRotation(offsetX * 0.08);
    if (this.hoverTooltip && this.hoveredPieceId) {
      this.positionHoverTooltip(pointer.x, pointer.y);
    }
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer) {
    if (!this.dragPieceId || !this.selectedContainer || !this.dragOrigin) {
      return;
    }

    const onlyMoves = this.legalActions.length > 0 && this.legalActions.every((action) => action.kind === "normal_move");
    if (!onlyMoves) {
      this.resetDraggedPiece();
      return;
    }

    const cell = this.toBoardCell(pointer.x, pointer.y);
    if (cell && this.collectActionAtCell(cell[0], cell[1])) {
      this.dragPieceId = null;
      this.dragOrigin = null;
      this.onCellAction(cell[0], cell[1]);
      return;
    }

    this.resetDraggedPiece();
  }

  private resetDraggedPiece() {
    if (!this.selectedContainer || !this.dragOrigin) {
      this.dragPieceId = null;
      this.dragOrigin = null;
      return;
    }
    this.selectedContainer.x = this.dragOrigin.x;
    this.selectedContainer.y = this.dragOrigin.y;
    this.selectedContainer.setRotation(0);
    if (this.selectedSprite) {
      this.selectedSprite.x = 0;
      this.selectedSprite.y = 0;
      this.selectedSprite.setRotation(0);
    }
    this.dragPieceId = null;
    this.dragOrigin = null;
  }

  private positionHoverTooltip(pointerX: number, pointerY: number) {
    if (!this.hoverTooltip) {
      return;
    }
    const width = 250;
    const height = this.hoverTooltip.height || 96;
    const margin = 14;
    const nextX = Phaser.Math.Clamp(pointerX + 18, margin, BOARD_SIZE - width - margin);
    const nextY = Phaser.Math.Clamp(pointerY - height - 10, margin, BOARD_SIZE - height - margin);
    this.hoverTooltip.setPosition(nextX, nextY);
  }

  private showHoverTooltip(pieceId: string, pointerX: number, pointerY: number) {
    this.hideHoverTooltip();
    if (!this.snapshot) {
      return;
    }

    const piece = this.snapshot.pieces[pieceId];
    if (!piece || !piece.alive) {
      return;
    }

    const statuses = this.snapshot.statuses[pieceId] ?? [];
    const lines = [formatPieceName(piece.name)];
    if (statuses.length > 0) {
      statuses.forEach((status) => {
        lines.push(`${formatStatus(status.kind)} · ${status.turns} ход`);
        lines.push(getStatusDescription(status.kind));
      });
    } else {
      lines.push("Нет активных эффектов.");
    }

    const paddingX = 14;
    const paddingTop = 12;
    const width = 260;
    const contentWidth = width - paddingX * 2;

    const title = this.add.text(paddingX, paddingTop, lines[0], {
      fontFamily: "Inter, sans-serif",
      fontSize: "16px",
      fontStyle: "700",
      color: "#f7f8ff",
      wordWrap: { width: contentWidth },
    });

    const body = this.add.text(paddingX, paddingTop + 30, lines.slice(1).join("\n"), {
      fontFamily: "Inter, sans-serif",
      fontSize: "12px",
      color: "#bdd0e4",
      lineSpacing: 5,
      wordWrap: { width: contentWidth },
    });

    const dividerY = paddingTop + 24;
    const height = Math.max(70, Math.ceil(body.y + body.height + 12));
    const background = this.add.rectangle(0, 0, width, height, 0x081221, 0.96).setOrigin(0);
    background.setStrokeStyle(1, 0x8be9fd, 0.2);
    const glow = this.add.rectangle(0, 0, width, height, 0x14304b, 0.08).setOrigin(0);
    const divider = this.add.line(paddingX, dividerY, 0, 0, contentWidth, 0, 0x8be9fd, 0.18).setOrigin(0, 0);

    this.hoverTooltip = this.add.container(0, 0, [background, glow, divider, title, body]);
    this.hoverTooltip.setDepth(1000);
    this.hoveredPieceId = pieceId;
    this.positionHoverTooltip(pointerX, pointerY);
  }

  private hideHoverTooltip() {
    this.hoveredPieceId = null;
    if (!this.hoverTooltip) {
      return;
    }
    this.hoverTooltip.destroy(true);
    this.hoverTooltip = null;
  }

  private wirePieceHover(target: Phaser.GameObjects.GameObject, pieceId: string) {
    target.on("pointerover", (pointer: Phaser.Input.Pointer) => {
      this.onHoverPiece(pieceId);
      this.showHoverTooltip(pieceId, pointer.x, pointer.y);
    });
    target.on("pointerout", () => {
      this.onHoverPiece(null);
      this.hideHoverTooltip();
    });
  }

  private renderBoard() {
    this.children.removeAll();
    this.tweens.killAll();
    this.selectedSprite = null;
    this.selectedContainer = null;
    this.hoverTooltip = null;
    this.hoveredPieceId = null;
    this.dragPieceId = null;
    this.dragOrigin = null;
    if (!this.snapshot) {
      return;
    }

    this.add.rectangle(BOARD_SIZE / 2, BOARD_SIZE / 2, BOARD_SIZE - 4, BOARD_SIZE - 4, 0x050c15, 0.98);
    this.add.rectangle(BOARD_SIZE / 2, BOARD_SIZE / 2, BOARD_SIZE - 16, BOARD_SIZE - 16).setStrokeStyle(2, 0x8be9fd, 0.18);

    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const fill = (x + y) % 2 === 0 ? 0x13202d : 0x241220;
        const rect = this.add.rectangle(OFFSET + x * CELL, OFFSET + y * CELL, CELL - 2, CELL - 2, fill).setOrigin(0);
        rect.setStrokeStyle(1, (x + y) % 2 === 0 ? 0x314760 : 0x5b2743, 0.75);
        rect.setInteractive();
        rect.on("pointerdown", () => this.onCellAction(x, y));
        this.add.text(OFFSET + x * CELL + 8, OFFSET + y * CELL + 8, `${String.fromCharCode(65 + x)}${8 - y}`, {
          fontFamily: "Inter, sans-serif",
          fontSize: "11px",
          color: "#7f93ad",
        });

        const action = this.collectActionAtCell(x, y);
        if (action) {
          this.renderActionMarker(x, y, action.kind);
        }
      }
    }

    Object.values(this.snapshot.pieces)
      .filter((piece) => piece.alive)
      .forEach((piece) => {
        const selected = piece.id === this.selectedPieceId;
        const cx = OFFSET + piece.x * CELL + CELL / 2;
        const cy = OFFSET + piece.y * CELL + CELL / 2;
        const textureKey = `${piece.side}_${piece.name.toLowerCase()}`;
        const actionAtPiece = this.collectActionAtCell(piece.x, piece.y);
        const glowColor = piece.side === "white" ? 0x8feaff : 0xff5b97;
        const glowRadius = selected ? 30 : 26;
        const glowAlpha = piece.side === "white" ? (selected ? 0.18 : 0.08) : selected ? 0.24 : 0.12;

        if (!this.textures.exists(textureKey)) {
          return;
        }

        const source = this.textures.get(textureKey).getSourceImage() as { width: number; height: number };
        const scale = Math.min(74 / source.width, 74 / source.height);

        if (!selected) {
          this.add.circle(cx, cy, glowRadius, glowColor, glowAlpha);
          const sprite = this.add.image(cx, cy, textureKey);
          sprite.setScale(scale);
          sprite.setInteractive({ useHandCursor: true });
          this.wirePieceHover(sprite, piece.id);
          sprite.on("pointerdown", () => {
            if (actionAtPiece && this.selectedPieceId) {
              this.onCellAction(piece.x, piece.y);
              return;
            }
            this.onSelectPiece(piece.id);
          });
          return;
        }

        const glow = this.add.circle(0, 0, glowRadius, glowColor, glowAlpha);
        const sprite = this.add.image(0, 0, textureKey);
        sprite.setScale(scale);
        const container = this.add.container(cx, cy, [glow, sprite]);
        container.setSize(86, 86);
        container.setInteractive({ draggable: true, useHandCursor: true });
        this.wirePieceHover(container, piece.id);
        this.input.setDraggable(container);

        container.on("pointerdown", () => {
          if (actionAtPiece) {
            this.onCellAction(piece.x, piece.y);
          } else {
            this.onSelectPiece(piece.id);
          }
        });

        container.on("dragstart", () => {
          const onlyMoves = this.legalActions.length > 0 && this.legalActions.every((action) => action.kind === "normal_move");
          if (!onlyMoves) {
            return;
          }
          this.dragPieceId = piece.id;
          this.dragOrigin = { x: cx, y: cy };
          this.tweens.killTweensOf(container);
          this.tweens.killTweensOf(glow);
        });

        this.selectedSprite = sprite;
        this.selectedContainer = container;
        this.tweens.add({
          targets: container,
          y: { from: cy, to: cy - 5 },
          duration: 760,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
        this.tweens.add({
          targets: glow,
          alpha: { from: glowAlpha, to: glowAlpha * 0.45 },
          scale: { from: 0.92, to: 1.08 },
          duration: 780,
          yoyo: true,
          repeat: -1,
          ease: "Sine.easeInOut",
        });
      });
  }
}

export function PhaserBoard({ state, selectedPieceId, legalActions, onSelectPiece, onHoverPiece, onCellAction }: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<BoardScene | null>(null);

  useEffect(() => {
    if (!hostRef.current || gameRef.current) {
      return;
    }
    const boardScene = new BoardScene();
    sceneRef.current = boardScene;
    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      width: BOARD_SIZE,
      height: BOARD_SIZE,
      parent: hostRef.current,
      backgroundColor: "#030711",
      scene: [boardScene],
    });
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.sync(state, selectedPieceId, legalActions, onSelectPiece, onHoverPiece, onCellAction);
  }, [state, selectedPieceId, legalActions, onSelectPiece, onHoverPiece, onCellAction]);

  return <div className="board-host" ref={hostRef} />;
}
