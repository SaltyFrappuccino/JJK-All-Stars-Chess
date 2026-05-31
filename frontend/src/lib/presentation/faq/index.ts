import type { FaqPiece } from "../types";

export const faqPieces: FaqPiece[] = [
  { name: "Sukuna", role: "king", summary: "Р¦РµРЅС‚СЂ РІСЃРµР№ РїР°СЂС‚РёРё. Р”Р°РІРёС‚ Р±Р»РёР¶РЅРµР№ СѓРіСЂРѕР·РѕР№ Рё СЂР°СЃРєСЂС‹РІР°РµС‚ Р Рў С‡РµСЂРµР· Р·Р°С…РІР°С‚ Р·РѕРЅС‹.", techniqueKeys: ["sukuna"], domainName: "Sukuna" },
  { name: "Gojo", role: "queen", summary: "Р“РёР±РєРёР№ РґР°Р»СЊРЅРёР№ РєРѕРЅС‚СЂРѕР»СЊ. РЎРёРЅРёР№, РљСЂР°СЃРЅС‹Р№ Рё Р¤РёРѕР»РµС‚РѕРІС‹Р№ РјРµРЅСЏСЋС‚СЃСЏ РїРѕ РєСЂСѓРіСѓ.", techniqueKeys: ["gojo_blue", "gojo_red", "gojo_purple"], domainName: "Gojo" },
  { name: "Yuta", role: "rook", summary: "РџРѕРґСЃС‚СЂР°РёРІР°РµС‚СЃСЏ РїРѕРґ РїРѕР»Рµ. РЎРІРѕСЋ СЃРёР»Сѓ РїРѕР»СѓС‡Р°РµС‚ С‡РµСЂРµР· РєРѕРїРёСЂРѕРІР°РЅРёРµ С‡СѓР¶РѕР№ С‚РµС…РЅРёРєРё.", techniqueKeys: [], domainName: "Yuta" },
  { name: "Jogo", role: "rook", summary: "РљРѕРЅС‚СЂРѕР»СЊ РїСЂСЏРјС‹С… Р»РёРЅРёР№ Рё РѕРіРЅРµРЅРЅРѕРµ РґР°РІР»РµРЅРёРµ С‡РµСЂРµР· Р»Р°РІСѓ.", techniqueKeys: ["jogo"], domainName: "Jogo" },
  { name: "Kenjaku", role: "bishop", summary: "Р›РѕРјР°РµС‚ РїРµС€РµС‡РЅС‹Р№ СЃС‚СЂРѕР№, РґРІРёРіР°РµС‚ РІСЂР°РіР° Рё РІСЃРєСЂС‹РІР°РµС‚ Р»РёРЅРёРё.", techniqueKeys: ["kenjaku"], domainName: "Kenjaku" },
  { name: "Mahito", role: "bishop", summary: "РСЃРєР°Р¶РµРЅРёРµ РґСѓС€Рё Р·Р°СЃС‚Р°РІР»СЏРµС‚ РІС‹Р±РёСЂР°С‚СЊ РјРµР¶РґСѓ С‚РµРјРїРѕРј Рё РїРѕС‚РµСЂРµР№ С„РёРіСѓСЂС‹.", techniqueKeys: ["mahito"], domainName: "Mahito" },
  { name: "Yuki", role: "knight", summary: "Р РµР·РєРёР№ РІСЂС‹РІ, РїРѕР·РёС†РёРѕРЅРЅС‹Р№ СЃРґРІРёРі Рё Р¶С‘СЃС‚РєРѕРµ РґР°РІР»РµРЅРёРµ РЅР° Р±Р»РёР¶РЅРµР№ РґРёСЃС‚Р°РЅС†РёРё.", techniqueKeys: ["yuki"], domainName: "Yuki" },
  { name: "Dagon", role: "knight", summary: "Р›РѕРєР°Р»СЊРЅС‹Р№ РєРѕРЅС‚СЂРѕР»СЊ Р·РѕРЅС‹. Р’С‹РґР°РІР»РёРІР°РµС‚ С†РµР»СЊ РЅР°Р·Р°Рґ Рё СЂРµР¶РµС‚ С‚РµС…РЅРёРєРё РІ Р Рў.", techniqueKeys: ["dagon"], domainName: "Dagon" },
  { name: "Yuji", role: "pawn", summary: "Р›РѕР±РѕРІРѕР№ РїСЂРѕР±РѕР№. Р”Р°РІРёС‚ РїСЂСЏРјРѕ РІРїРµСЂС‘Рґ С‡РµСЂРµР· Р§С‘СЂРЅСѓСЋ Р’СЃРїС‹С€РєСѓ.", techniqueKeys: ["yuji"] },
  { name: "Megumi", role: "pawn", summary: "Р–РµСЂС‚РІРµРЅРЅР°СЏ РїРµС€РєР°. РњРѕР¶РµС‚ СѓРЅРёС‡С‚РѕР¶РёС‚СЊ СЃРµР±СЏ РІ РЅСѓР¶РЅС‹Р№ РјРѕРјРµРЅС‚ СЂР°РґРё С‚РµРјРїР°.", techniqueKeys: ["megumi"] },
  { name: "Nobara", role: "pawn", summary: "РњРµС‚РєР° Рё Р·Р°РїСЂРµС‚ РЅР° С‚РµС…РЅРёРєСѓ. РҐРѕСЂРѕС€Р° РґР»СЏ СЂР°Р·РјРµРЅР° СЃ РІС‹РіРѕРґРѕР№ РїРѕ СЌРЅРµСЂРіРёРё.", techniqueKeys: ["nobara"] },
  { name: "Nanami", role: "pawn", summary: "Р”Р°Р»СЊРЅСЏСЏ РґРёР°РіРѕРЅР°Р»СЊРЅР°СЏ РєР°Р·РЅСЊ С‡РµСЂРµР· 7:3.", techniqueKeys: ["nanami"] },
  { name: "Choso", role: "pawn", summary: "Р›РёРЅРµР№РЅС‹Р№ РїСЂРѕРєРѕР» РЅР° 1-2 РєР»РµС‚РєРё РїРѕ С‡РёСЃС‚РѕР№ Р»РёРЅРёРё.", techniqueKeys: ["choso"] },
  { name: "Todo", role: "pawn", summary: "РњРµРЅСЏРµС‚ РїРѕР·РёС†РёРё СЃРѕСЋР·РЅС‹С… РїРµС€РµРє Рё Р»РѕРјР°РµС‚ РїРѕСЃС‚СЂРѕРµРЅРёРµ С„СЂРѕРЅС‚Р°.", techniqueKeys: ["todo"] },
  { name: "Maki", role: "pawn", summary: "РџСЂРѕСЃС‚Р°СЏ Рё Р¶С‘СЃС‚РєР°СЏ РїРµС€РєР° СЃ Р±РµСЃРїР»Р°С‚РЅС‹Рј С„СЂРѕРЅС‚Р°Р»СЊРЅС‹Рј РґРѕР±РёРІР°РЅРёРµРј.", techniqueKeys: ["maki"] },
  { name: "Inumaki", role: "pawn", summary: "РљРѕРЅС‚СЂРѕР»СЊ СЃРѕСЃРµРґРЅРµР№ РєР»РµС‚РєРё С‡РµСЂРµР· РџСЂРѕРєР»СЏС‚СѓСЋ Р РµС‡СЊ.", techniqueKeys: ["inumaki"] },
];
