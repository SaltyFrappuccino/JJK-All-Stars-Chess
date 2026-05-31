import blackChoso from "../../../assets/pieces/black_choso.png";
import blackDagon from "../../../assets/pieces/black_dagon.png";
import blackGojo from "../../../assets/pieces/black_gojo.png";
import blackInumaki from "../../../assets/pieces/black_inumaki.png";
import blackJogo from "../../../assets/pieces/black_jogo.png";
import blackKenjaku from "../../../assets/pieces/black_kenjaku.png";
import blackMahito from "../../../assets/pieces/black_mahito.png";
import blackMaki from "../../../assets/pieces/black_maki.png";
import blackMegumi from "../../../assets/pieces/black_megumi.png";
import blackNanami from "../../../assets/pieces/black_nanami.png";
import blackNobara from "../../../assets/pieces/black_nobara.png";
import blackSukuna from "../../../assets/pieces/black_sukuna.png";
import blackTodo from "../../../assets/pieces/black_todo.png";
import blackYuji from "../../../assets/pieces/black_yuji.png";
import blackYuki from "../../../assets/pieces/black_yuki.png";
import blackYuta from "../../../assets/pieces/black_yuta.png";
import whiteChoso from "../../../assets/pieces/white_choso.png";
import whiteDagon from "../../../assets/pieces/white_dagon.png";
import whiteGojo from "../../../assets/pieces/white_gojo.png";
import whiteInumaki from "../../../assets/pieces/white_inumaki.png";
import whiteJogo from "../../../assets/pieces/white_jogo.png";
import whiteKenjaku from "../../../assets/pieces/white_kenjaku.png";
import whiteMahito from "../../../assets/pieces/white_mahito.png";
import whiteMaki from "../../../assets/pieces/white_maki.png";
import whiteMegumi from "../../../assets/pieces/white_megumi.png";
import whiteNanami from "../../../assets/pieces/white_nanami.png";
import whiteNobara from "../../../assets/pieces/white_nobara.png";
import whiteSukuna from "../../../assets/pieces/white_sukuna.png";
import whiteTodo from "../../../assets/pieces/white_todo.png";
import whiteYuji from "../../../assets/pieces/white_yuji.png";
import whiteYuki from "../../../assets/pieces/white_yuki.png";
import whiteYuta from "../../../assets/pieces/white_yuta.png";

import type { Piece, Side } from "../../types";

export const pieceImageMap: Record<string, string> = {
  white_yuta: whiteYuta,
  white_dagon: whiteDagon,
  white_kenjaku: whiteKenjaku,
  white_gojo: whiteGojo,
  white_sukuna: whiteSukuna,
  white_mahito: whiteMahito,
  white_yuki: whiteYuki,
  white_jogo: whiteJogo,
  white_yuji: whiteYuji,
  white_megumi: whiteMegumi,
  white_nobara: whiteNobara,
  white_nanami: whiteNanami,
  white_choso: whiteChoso,
  white_todo: whiteTodo,
  white_maki: whiteMaki,
  white_inumaki: whiteInumaki,
  black_yuta: blackYuta,
  black_dagon: blackDagon,
  black_kenjaku: blackKenjaku,
  black_gojo: blackGojo,
  black_sukuna: blackSukuna,
  black_mahito: blackMahito,
  black_yuki: blackYuki,
  black_jogo: blackJogo,
  black_yuji: blackYuji,
  black_megumi: blackMegumi,
  black_nobara: blackNobara,
  black_nanami: blackNanami,
  black_choso: blackChoso,
  black_todo: blackTodo,
  black_maki: blackMaki,
  black_inumaki: blackInumaki,
};

const pieceNames: Record<string, string> = {
  Yuta: "Ютка Оккотсу",
  Dagon: "Дагон",
  Kenjaku: "Кэндзяку",
  Gojo: "Сатору Годзё",
  Sukuna: "Сукуна",
  Mahito: "Махито",
  Yuki: "Юки Цукумо",
  Jogo: "Дзёго",
  Yuji: "Юдзи Итадори",
  Megumi: "Мэгуми Фусигуро",
  Nobara: "Нобара Кугисаки",
  Nanami: "Нанами Кэнто",
  Choso: "Чосо",
  Todo: "Яой Тодо",
  Maki: "Маки Дзэнин",
  Inumaki: "Тоге Инумаки",
};

const roleNames: Record<string, string> = {
  king: "Король",
  queen: "Ферзь",
  rook: "Ладья",
  bishop: "Слон",
  knight: "Конь",
  pawn: "Пешка",
};

const sideNames: Record<Side, string> = {
  white: "Белые",
  black: "Чёрные",
};

export function getPieceImage(piece: Piece): string {
  return pieceImageMap[`${piece.side}_${piece.name.toLowerCase()}`];
}

export function getPieceImageByName(name: string, side: Side = "white"): string {
  return pieceImageMap[`${side}_${name.toLowerCase()}`];
}

export function formatPieceName(name: string): string {
  return pieceNames[name] ?? name;
}

export function formatRole(role: string): string {
  return roleNames[role] ?? role;
}

export function formatSide(side: Side): string {
  return sideNames[side];
}

export function getPlayerDisplayNames(playerName: string, playerSide: Side, isBotMatch: boolean): { white: string; black: string } {
  const opponent = isBotMatch ? "Бот" : "Соперник";
  return playerSide === "white" ? { white: playerName, black: opponent } : { white: opponent, black: playerName };
}

export function pieceNameFromId(pieceId: string): string {
  const parts = pieceId.split("_");
  const rawName = parts[parts.length - 1];
  return formatPieceName(rawName.charAt(0).toUpperCase() + rawName.slice(1));
}

export function formatPieceId(pieceId: string): string {
  const parts = pieceId.split("_");
  const side = parts[0] as Side;
  const rawName = parts[parts.length - 1];
  const normalizedName = rawName.charAt(0).toUpperCase() + rawName.slice(1);
  return `${formatSide(side)}: ${formatPieceName(normalizedName)}`;
}
