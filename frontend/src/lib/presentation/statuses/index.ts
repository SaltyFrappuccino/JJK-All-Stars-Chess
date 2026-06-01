import type { StatusInfo } from "../types";

const statusNames: Record<string, string> = {
  distortion: "Искажение",
  severed: "Рассечён",
  burn: "Ожог",
  silence: "Молчание",
  paralysis: "Паралич",
  domination: "Подчинение",
  mass_pressure: "Давление Массы",
  marked: "Резонанс",
  stop: "Стоп",
  no_capture_energy: "Без Энергии За Взятие",
};

const statusDescriptions: Record<string, string> = {
  distortion: "Если этой фигурой не сходить на следующем ходу владельца, она погибнет.",
  severed: "Если фигура останется в опасной зоне до следующего своего хода, она погибнет.",
  burn: "Если фигура не уйдёт с лавы до следующего своего хода, она погибнет.",
  silence: "Фигура не может использовать технику или РТ.",
  paralysis: "Фигура не может двигаться и использовать техники.",
  domination: "Фигура временно подавлена и не может действовать.",
  mass_pressure: "Фигура не может использовать технику или РТ на следующий ход.",
  marked: "При взятии этой фигуры атакующий получает дополнительную энергию.",
  stop: "Фигура не может двигаться и использовать технику 1 ход.",
  no_capture_energy: "За взятие этой фигурой не начисляется энергия.",
};

export function formatStatus(kind: string): string {
  return statusNames[kind] ?? kind;
}

export function getStatusDescription(kind: string): string {
  return statusDescriptions[kind] ?? "Описание эффекта пока не задано.";
}

export const statusCatalog: StatusInfo[] = Object.entries(statusNames).map(([kind, label]) => ({
  kind,
  label,
  description: statusDescriptions[kind] ?? "Описание эффекта пока не задано.",
}));
