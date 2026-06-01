import type { GameAction, MatchState, Piece } from "../../types";
import { formatStatus } from "../statuses";
import type { AbilityInfo } from "../types";

const domainNames: Record<string, string> = {
  "Malevolent Shrine": "Гробница Зла",
  "Infinite Void": "Необъятная Пустота",
  "True Mutual Love": "Истинная Взаимная Любовь",
  "Coffin of the Iron Mountain": "Гроб Стальной Горы",
  "Womb of Abundance": "Чрево Изобилия",
  "Self-Embodiment of Perfection": "Самовоплощение Совершенства",
  "Mass Collapse": "Коллапс Массы",
  "Horizon of Captivating Skandha": "Горизонт Пленительной Сканды",
};

const eventNames: Record<string, string> = {
  piece_moved: "Ход",
  piece_killed: "Уничтожение",
  technique_cast: "Техника",
  domain_cast: "Расширение Территории",
  terrain_created: "Зона",
  piece_forced_move: "Принудительное Перемещение",
  piece_spawned: "Призыв",
  wheel_rotated: "Прокрут Колеса",
  status_applied: "Статус",
  swap: "Обмен",
  resign: "Сдача",
  technique_check: "Шах Техникой",
};

const techniqueInfo: Record<string, AbilityInfo> = {
  sukuna: {
    label: "Разрубание",
    cost: 3,
    summary: "Уничтожает соседнюю вражескую фигуру.",
    usage: "Выберите Сукуну, затем соседнюю цель.",
  },
  gojo_blue: {
    label: "Синий",
    cost: 5,
    summary: "Притягивает цель на 1 клетку к Годзё по линии до 3 клеток.",
    usage: "Выберите вражескую фигуру в линии действия.",
  },
  gojo_red: {
    label: "Красный",
    cost: 5,
    summary: "Дальний удар по прямой или диагонали до 3 клеток.",
    usage: "Выберите вражескую фигуру в линии действия.",
  },
  gojo_purple: {
    label: "Фиолетовый",
    cost: 5,
    summary: "Усиленный дальний удар по прямой или диагонали до 4 клеток.",
    usage: "Выберите вражескую фигуру в линии действия.",
  },
  jogo: {
    label: "Вулканический Удар",
    cost: 4,
    summary: "Дальний удар по прямой. После удара клетка становится лавой.",
    usage: "Выберите вражескую фигуру в прямой линии.",
  },
  kenjaku: {
    label: "Манипуляция",
    cost: 3,
    summary: "Передвигает вражескую пешку на соседнюю свободную клетку.",
    usage: "Выберите пешку, затем свободную клетку для смещения.",
  },
  mahito: {
    label: "Искажение Души",
    cost: 4,
    summary: "Накладывает искажение: если целью не сходят, она погибает.",
    usage: "Выберите цель по диагонали до 2 клеток.",
  },
  yuki: {
    label: "Звёздная Масса",
    cost: 4,
    summary: "Прыжок и добивание соседней цели после приземления.",
    usage: "Выберите клетку прыжка. Если рядом будет цель, техника сработает.",
  },
  dagon: {
    label: "Рой Сикигами",
    cost: 4,
    summary: "Отталкивает цель от Дагона на 2 клетки, а если нельзя — на 1.",
    usage: "Выберите вражескую фигуру в зоне Дагона. Толчок сработает только при свободной клетке.",
  },
  yuji: {
    label: "Чёрная Вспышка",
    cost: 2,
    summary: "Берёт фигуру прямо перед собой.",
    usage: "Выберите цель перед Юдзи.",
  },
  megumi: {
    label: "Проклятье Пятого Ранга",
    cost: 2,
    summary: "Мэгуми жертвует собой. На двух последних рядах врага вместо него появляется Махорага.",
    usage: "Активируйте технику. Если Мэгуми у края вражеской стороны, он призовёт Махорагу.",
  },
  mahoraga: {
    label: "Прокрут Колеса",
    cost: 3,
    summary: "Открывает новые варианты движения для Махораги.",
    usage: "Каждый прокрут расширяет набор ходов: пешка, затем конь, затем слон, затем ладья.",
  },
  nobara: {
    label: "Резонанс",
    cost: 2,
    summary: "Помечает цель и запрещает ей технику на 1 ход.",
    usage: "Выберите диагональную цель Нобары.",
  },
  nanami: {
    label: "7:3",
    cost: 2,
    summary: "Берёт фигуру по дальней диагонали на 2 клетки вперёд.",
    usage: "Выберите подсвеченную дальнюю диагональную цель.",
  },
  choso: {
    label: "Пронзающая Кровь",
    cost: 2,
    summary: "Бьёт вперёд до 2 клеток по чистой линии.",
    usage: "Выберите подсвеченную цель перед Чосо.",
  },
  todo: {
    label: "Буги-Вуги",
    cost: 2,
    summary: "Меняется местами с союзной пешкой в радиусе 2 клеток.",
    usage: "Выберите союзную пешку в зоне Тодо.",
  },
  maki: {
    label: "Небесное Ограничение",
    cost: 0,
    summary: "Бесплатно берёт фигуру прямо перед собой.",
    usage: "Выберите цель перед Маки.",
  },
  inumaki: {
    label: "Проклятая Речь",
    cost: 2,
    summary: "Соседняя фигура теряет движение и технику на 1 ход.",
    usage: "Выберите соседнюю цель.",
  },
};

const domainInfo: Record<string, AbilityInfo> = {
  Sukuna: {
    label: "Гробница Зла",
    cost: 9,
    summary: "До двух целей в радиусе 2 получают рассечение.",
    usage: "Выберите врагов в зоне. Если они не уйдут, погибнут.",
  },
  Gojo: {
    label: "Необъятная Пустота",
    cost: 9,
    summary: "Парализует до трёх целей в радиусе 2.",
    usage: "Выберите врагов вокруг Годзё.",
  },
  Yuta: {
    label: "Истинная Взаимная Любовь",
    cost: 8,
    summary: "Копирует текущую технику любой фигуры в радиусе 2 и делает её новой техникой Юты.",
    usage: "Выберите фигуру рядом с Ютой. После этого техника Юты сменится.",
  },
  Jogo: {
    label: "Гроб Стальной Горы",
    cost: 8,
    summary: "Создаёт лаву на трёх клетках и накладывает ожог.",
    usage: "Выберите клетки в радиусе действия РТ.",
  },
  Kenjaku: {
    label: "Чрево Изобилия",
    cost: 8,
    summary: "Блокирует пешек в зоне и сдвигает одну из них.",
    usage: "Лучше всего вскрывает пешечный фронт.",
  },
  Mahito: {
    label: "Самовоплощение Совершенства",
    cost: 8,
    summary: "До двух фигур получают искажение и молчание.",
    usage: "Выберите врагов в зоне Махито.",
  },
  Yuki: {
    label: "Коллапс Массы",
    cost: 8,
    summary: "Притягивает врагов и навешивает давление массы.",
    usage: "Выберите врагов в радиусе 2.",
  },
  Dagon: {
    label: "Горизонт Пленительной Сканды",
    cost: 8,
    summary: "Глушит техники в ближней зоне и режет приток энергии.",
    usage: "Локальная РТ контроля вокруг Дагона.",
  },
};

export type EventFeedItem = {
  label: string;
  title: string;
  detail?: string;
  tone: "move" | "ability" | "warning" | "finish";
};

export function getTechniqueKey(piece: Piece): string | null {
  if (piece.name === "Gojo") {
    return piece.technique_state ?? "gojo_blue";
  }
  if (piece.name === "Yuta") {
    return piece.technique_state;
  }
  if (piece.name === "Mahoraga") {
    return "mahoraga";
  }
  return piece.name.toLowerCase();
}

export function formatDomainName(name: string): string {
  return domainNames[name] ?? name;
}

export function formatActionKind(kind: GameAction["kind"]): string {
  return { normal_move: "Ход", technique_cast: "Техника", domain_cast: "РТ", resign: "Сдача" }[kind];
}

export function groupActionCounts(actions: GameAction[]): Array<{ kind: string; count: number }> {
  return [
    { kind: "Ход", count: actions.filter((item) => item.kind === "normal_move").length },
    { kind: "Техника", count: actions.filter((item) => item.kind === "technique_cast").length },
    { kind: "РТ", count: actions.filter((item) => item.kind === "domain_cast").length },
  ].filter((item) => item.count > 0);
}

export function getTechniqueInfo(piece: Piece): AbilityInfo | null {
  const key = getTechniqueKey(piece);
  return key ? techniqueInfo[key] ?? null : null;
}

export function getDomainInfo(piece: Piece): AbilityInfo | null {
  return domainInfo[piece.name] ?? null;
}

export function getTechniqueInfoByKey(key: string): AbilityInfo | null {
  return techniqueInfo[key] ?? null;
}

export function getDomainInfoByName(name: string): AbilityInfo | null {
  return domainInfo[name] ?? null;
}

export function getTechniqueUnavailableReason(piece: Piece, state: MatchState, techniqueActions: GameAction[]): string | null {
  const statuses = state.statuses[piece.id] ?? [];
  if (piece.side !== state.side_to_move) {
    return "Сейчас не ход этой стороны.";
  }
  if (piece.cooldown > 0) {
    return `Техника на перезарядке: ещё ${piece.cooldown} ход.`;
  }
  if (statuses.some((status) => ["silence", "paralysis", "stop", "domination"].includes(status.kind))) {
    return "Фигура сейчас не может применять технику из-за статуса.";
  }
  if (piece.role === "pawn" && piece.name !== "Mahoraga" && piece.technique_used) {
    return "Пешечная техника уже потрачена.";
  }
  if (piece.name === "Yuta" && !piece.technique_state) {
    return "Сначала Юта должен скопировать технику через РТ.";
  }
  const info = getTechniqueInfo(piece);
  if (info && info.cost !== null && state.energy[piece.side] < info.cost) {
    return `Недостаточно энергии: нужно ${info.cost}.`;
  }
  if (!techniqueActions.length) {
    return "Сейчас нет доступной цели для техники.";
  }
  return null;
}

export function getDomainUnavailableReason(piece: Piece, state: MatchState, domainActions: GameAction[]): string | null {
  const statuses = state.statuses[piece.id] ?? [];
  if (piece.role === "pawn") {
    return "У пешек нет РТ.";
  }
  if (piece.side !== state.side_to_move) {
    return "Сейчас не ход этой стороны.";
  }
  if (piece.domain_used) {
    return "Эта РТ уже потрачена.";
  }
  if (state.global_domain_lock[piece.side] > 0) {
    return `Глобальный откат РТ: ещё ${state.global_domain_lock[piece.side]} ход.`;
  }
  if (state.active_domain) {
    return "Пока на доске уже активна другая РТ.";
  }
  if (statuses.some((status) => ["silence", "paralysis", "stop", "domination"].includes(status.kind))) {
    return "Фигура сейчас не может применять РТ из-за статуса.";
  }
  const info = getDomainInfo(piece);
  if (info && info.cost !== null && state.energy[piece.side] < info.cost) {
    return `Недостаточно энергии: нужно ${info.cost}.`;
  }
  if (!domainActions.length) {
    return "Сейчас нет доступной цели для РТ.";
  }
  return null;
}

function formatCoords(value: unknown): string {
  if (Array.isArray(value) && value.length === 2) {
    const [x, y] = value;
    if (typeof x === "number" && typeof y === "number") {
      return `${String.fromCharCode(65 + x)}${8 - y}`;
    }
  }
  return String(value);
}

function terrainLabel(terrain: string): string {
  if (terrain === "shikigami") {
    return "Тень";
  }
  if (terrain === "lava") {
    return "Лава";
  }
  return terrain;
}

export function formatEvent(event: Record<string, unknown>, formatPieceId: (pieceId: string) => string): string {
  const kind = String(event.kind ?? "");
  const label = eventNames[kind] ?? kind;

  if (kind === "piece_moved" || kind === "piece_forced_move") {
    const from = event.from_ ? `${formatCoords(event.from_)} -> ` : "";
    return `${label}: ${formatPieceId(String(event.piece_id))} ${from}${formatCoords(event.to)}`;
  }
  if (kind === "piece_killed") {
    return `${label}: ${formatPieceId(String(event.piece_id))}`;
  }
  if (kind === "technique_cast" || kind === "domain_cast") {
    return `${label}: ${formatPieceId(String(event.piece_id))}`;
  }
  if (kind === "piece_spawned") {
    return `${label}: ${formatPieceId(String(event.piece_id))} @ ${formatCoords(event.at)}`;
  }
  if (kind === "wheel_rotated") {
    return `${label}: ${formatPieceId(String(event.piece_id))} -> ${String(event.stage)}`;
  }
  if (kind === "terrain_created") {
    return `${label}: ${terrainLabel(String(event.terrain))} @ ${formatCoords([Number(event.x), Number(event.y)])}`;
  }
  if (kind === "status_applied") {
    return `${label}: ${formatStatus(String(event.status))}`;
  }
  if (kind === "swap") {
    return `${label}: ${formatPieceId(String(event.first))} <-> ${formatPieceId(String(event.second))}`;
  }
  if (kind === "resign") {
    return `${label}: ${String(event.side)}`;
  }
  return `${label}: ${JSON.stringify(event)}`;
}

export function formatEventFeedItem(
  event: Record<string, unknown>,
  pieceNameFromId?: (pieceId: string) => string,
  formatPieceId?: (pieceId: string) => string,
): EventFeedItem {
  const kind = String(event.kind ?? "");
  const pieceId = String(event.piece_id ?? "");
  const pieceName = pieceNameFromId ? pieceNameFromId(pieceId) : pieceId;
  const pieceLabel = formatPieceId ? formatPieceId(pieceId) : pieceId;

  if (kind === "piece_moved") {
    const route = event.from_ ? `${formatCoords(event.from_)} -> ${formatCoords(event.to)}` : `${formatCoords(event.to)}`;
    return { label: "Ход", title: `${pieceName}: ${route}`, detail: pieceLabel, tone: "move" };
  }
  if (kind === "piece_forced_move") {
    const route = event.from_ ? `${formatCoords(event.from_)} -> ${formatCoords(event.to)}` : `${formatCoords(event.to)}`;
    return { label: "Смещение", title: `${pieceName}: ${route}`, detail: "Принудительное перемещение", tone: "warning" };
  }
  if (kind === "piece_killed") {
    return { label: "Уничтожение", title: `${pieceName} уничтожен`, detail: pieceLabel, tone: "warning" };
  }
  if (kind === "technique_cast") {
    return { label: "Техника", title: `${pieceName} использовал технику`, detail: pieceLabel, tone: "ability" };
  }
  if (kind === "domain_cast") {
    return { label: "РТ", title: `${pieceName} раскрыл РТ`, detail: pieceLabel, tone: "ability" };
  }
  if (kind === "terrain_created") {
    return {
      label: "Зона",
      title: `${terrainLabel(String(event.terrain))} появилась на поле`,
      detail: formatCoords([Number(event.x), Number(event.y)]),
      tone: "ability",
    };
  }
  if (kind === "status_applied") {
    return { label: "Статус", title: `Наложен эффект «${formatStatus(String(event.status))}»`, tone: "warning" };
  }
  if (kind === "swap") {
    const first = String(event.first ?? "");
    const second = String(event.second ?? "");
    const firstLabel = formatPieceId ? formatPieceId(first) : first;
    const secondLabel = formatPieceId ? formatPieceId(second) : second;
    return { label: "Обмен", title: `${firstLabel} и ${secondLabel} поменялись местами`, tone: "ability" };
  }
  if (kind === "resign") {
    return { label: "Сдача", title: `${String(event.side)} сдались`, tone: "finish" };
  }
  if (kind === "technique_check") {
    return { label: "Шах", title: "Сукуна под угрозой техники", tone: "warning" };
  }
  if (kind === "piece_spawned") {
    return { label: "Призыв", title: `${pieceName} появился на ${formatCoords(event.at)}`, detail: pieceLabel, tone: "ability" };
  }
  if (kind === "wheel_rotated") {
    return { label: "Колесо", title: `${pieceName} провернул колесо`, detail: `Этап ${String(event.stage)}`, tone: "ability" };
  }
  return { label: eventNames[kind] ?? kind, title: JSON.stringify(event), tone: "move" };
}
