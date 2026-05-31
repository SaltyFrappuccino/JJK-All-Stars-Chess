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
  domain_cast: "Расширение территории",
  terrain_created: "Зона",
  piece_forced_move: "Принудительное перемещение",
  status_applied: "Статус",
  swap: "Обмен",
  resign: "Сдача",
  technique_check: "Шах техникой",
};

const techniqueInfo: Record<string, AbilityInfo> = {
  sukuna: { label: "Разрубание", cost: 3, summary: "Уничтожает соседнюю вражескую фигуру.", usage: "Нажмите на Сукуну, затем на соседнюю цель." },
  gojo_blue: { label: "Синий", cost: 5, summary: "Притягивает цель на 1 клетку к Годзё по линии до 3 клеток.", usage: "Нажмите на вражескую фигуру в линии. Цель подтянется ближе к Годзё." },
  gojo_red: { label: "Красный", cost: 5, summary: "Дальний удар по прямой или диагонали до 3 клеток.", usage: "Нажмите на вражескую фигуру в линии." },
  gojo_purple: { label: "Фиолетовый", cost: 5, summary: "Усиленный дальний удар по прямой или диагонали до 4 клеток.", usage: "Нажмите на вражескую фигуру в линии." },
  jogo: { label: "Вулканический Удар", cost: 4, summary: "Дальний удар по прямой. После удара клетка становится лавой.", usage: "Нажмите на вражескую фигуру в прямой линии." },
  kenjaku: { label: "Манипуляция", cost: 3, summary: "Передвигает вражескую пешку на соседнюю свободную клетку.", usage: "Выберите цель и свободную клетку для смещения." },
  mahito: { label: "Искажение Души", cost: 4, summary: "Навешивает искажение: если фигурой не сходят, она погибает.", usage: "Нажмите на цель по диагонали до 2 клеток." },
  yuki: { label: "Звёздная Масса", cost: 4, summary: "Прыжок и добивание соседней цели.", usage: "Выберите легальную клетку прыжка. Если рядом есть цель, техника сработает." },
  dagon: { label: "Рой Шикигами", cost: 4, summary: "Отталкивает цель от Дагона на 2 клетки, а если нельзя — на 1.", usage: "Нажмите на вражескую фигуру в зоне Дагона. Техника сработает только если цель можно оттолкнуть." },
  yuji: { label: "Чёрная Вспышка", cost: 2, summary: "Берёт фигуру прямо перед собой.", usage: "Нажмите на цель впереди Юдзи." },
  megumi: { label: "Проклятье Пятого Ранга", cost: 2, summary: "Мэгуми может мгновенно пожертвовать собой.", usage: "Нажмите на технику, чтобы Мэгуми уничтожил сам себя." },
  nobara: { label: "Резонанс", cost: 2, summary: "Метка и запрет на технику на 1 ход.", usage: "Нажмите на диагональную цель Нобары." },
  nanami: { label: "7:3", cost: 2, summary: "Берёт фигуру по дальней диагонали на 2 клетки вперёд.", usage: "Нажмите на подсвеченную дальнюю диагональную цель." },
  choso: { label: "Пронзающая Кровь", cost: 2, summary: "Бьёт вперёд до 2 клеток по чистой линии.", usage: "Нажмите на подсвеченную цель перед Чосо." },
  todo: { label: "Буги-Вуги", cost: 2, summary: "Меняется местами с союзной пешкой в радиусе 2 клеток.", usage: "Нажмите на союзную пешку в зоне Тодо." },
  maki: { label: "Небесное Ограничение", cost: 0, summary: "Бесплатно берёт фигуру прямо перед собой.", usage: "Нажмите на цель впереди Маки." },
  inumaki: { label: "Проклятая Речь", cost: 2, summary: "Соседняя фигура теряет движение и технику на 1 ход.", usage: "Нажмите на соседнюю цель." },
};

const domainInfo: Record<string, AbilityInfo> = {
  Sukuna: { label: "Гробница Зла", cost: 9, summary: "До двух целей в радиусе 2 получают рассечение.", usage: "Нажмите на врагов в зоне. Если они не уйдут, погибнут." },
  Gojo: { label: "Необъятная Пустота", cost: 9, summary: "Парализует до трёх целей в радиусе 2.", usage: "Нажмите на врагов вокруг Годзё." },
  Yuta: { label: "Истинная Взаимная Любовь", cost: 8, summary: "Копирует текущую технику любой фигуры в радиусе 2 и делает её новой техникой Юты.", usage: "Нажмите на фигуру рядом с Ютой. После этого техника Юты сменится." },
  Jogo: { label: "Гроб Стальной Горы", cost: 8, summary: "Создаёт лаву на трёх клетках и навешивает ожог.", usage: "Золотые метки показывают клетки лавы." },
  Kenjaku: { label: "Чрево Изобилия", cost: 8, summary: "Блокирует пешек в зоне и сдвигает одну из них.", usage: "Лучше всего вскрывает пешечный фронт." },
  Mahito: { label: "Самовоплощение Совершенства", cost: 8, summary: "До двух фигур получают искажение и молчание.", usage: "Нажмите на врагов в зоне Махито." },
  Yuki: { label: "Коллапс Массы", cost: 8, summary: "Притягивает врагов и вешает давление массы.", usage: "Нажмите на врагов в радиусе 2." },
  Dagon: { label: "Горизонт Пленительной Сканды", cost: 8, summary: "Глушит техники в ближней зоне и режет приток энергии.", usage: "Локальная РТ контроля вокруг Дагона." },
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
  if (piece.role === "pawn" && piece.technique_used) {
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

export function formatEvent(event: Record<string, unknown>, formatPieceId: (pieceId: string) => string): string {
  const kind = String(event.kind ?? "");
  const label = eventNames[kind] ?? kind;
  if (kind === "piece_moved") {
    const from = event.from_ ? `${formatCoords(event.from_)} -> ` : "";
    return `${label}: ${formatPieceId(String(event.piece_id))} ${from}${formatCoords(event.to)}`;
  }
  if (kind === "piece_killed") {
    return `${label}: ${formatPieceId(String(event.piece_id))}`;
  }
  if (kind === "piece_forced_move") {
    const from = event.from_ ? `${formatCoords(event.from_)} -> ` : "";
    return `${label}: ${formatPieceId(String(event.piece_id))} ${from}${formatCoords(event.to)}`;
  }
  if (kind === "technique_cast" || kind === "domain_cast") {
    return `${label}: ${formatPieceId(String(event.piece_id))}`;
  }
  if (kind === "terrain_created") {
    const terrain = String(event.terrain) === "shikigami" ? "тень" : String(event.terrain) === "lava" ? "лава" : String(event.terrain);
    return `${label}: ${terrain} @ ${String(event.x)}, ${String(event.y)}`;
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
  pieceNameFromId: (pieceId: string) => string,
  formatPieceId: (pieceId: string) => string,
): EventFeedItem {
  const kind = String(event.kind ?? "");

  if (kind === "piece_moved") {
    const from = event.from_ ? `${formatCoords(event.from_)} -> ${formatCoords(event.to)}` : `${formatCoords(event.to)}`;
    return { label: "Ход", title: `${pieceNameFromId(String(event.piece_id))}: ${from}`, detail: formatPieceId(String(event.piece_id)), tone: "move" };
  }

  if (kind === "piece_forced_move") {
    const from = event.from_ ? `${formatCoords(event.from_)} -> ${formatCoords(event.to)}` : `${formatCoords(event.to)}`;
    return { label: "Смещение", title: `${pieceNameFromId(String(event.piece_id))}: ${from}`, detail: "Принудительное перемещение", tone: "warning" };
  }

  if (kind === "piece_killed") {
    return { label: "Уничтожение", title: `${pieceNameFromId(String(event.piece_id))} уничтожен`, detail: formatPieceId(String(event.piece_id)), tone: "warning" };
  }

  if (kind === "technique_cast") {
    return { label: "Техника", title: `${pieceNameFromId(String(event.piece_id))} использовал технику`, detail: formatPieceId(String(event.piece_id)), tone: "ability" };
  }

  if (kind === "domain_cast") {
    return { label: "РТ", title: `${pieceNameFromId(String(event.piece_id))} раскрыл РТ`, detail: formatPieceId(String(event.piece_id)), tone: "ability" };
  }

  if (kind === "terrain_created") {
    const terrain = String(event.terrain) === "shikigami" ? "Тень" : String(event.terrain) === "lava" ? "Лава" : String(event.terrain);
    return { label: "Зона", title: `${terrain} появилась на поле`, detail: `${formatCoords([Number(event.x), Number(event.y)])}`, tone: "ability" };
  }

  if (kind === "status_applied") {
    return { label: "Статус", title: `Наложен эффект «${formatStatus(String(event.status))}»`, tone: "warning" };
  }

  if (kind === "swap") {
    return { label: "Обмен", title: `${formatPieceId(String(event.first))} и ${formatPieceId(String(event.second))} поменялись местами`, tone: "ability" };
  }

  if (kind === "resign") {
    return { label: "Сдача", title: `${String(event.side)} сдались`, tone: "finish" };
  }

  if (kind === "technique_check") {
    return { label: "Шах", title: "Сукуна под угрозой техники", tone: "warning" };
  }

  return { label: eventNames[kind] ?? kind, title: JSON.stringify(event), tone: "move" };
}
