export * from "./presentation/types";
export * from "./presentation/pieces/index";
export * from "./presentation/statuses/index";
export * from "./presentation/techniques/index";
export * from "./presentation/faq/index";

import { formatPieceId, pieceNameFromId } from "./presentation/pieces/index";
import { formatEvent as formatEventBase, formatEventFeedItem as formatEventFeedItemBase } from "./presentation/techniques/index";

export function formatEvent(event: Record<string, unknown>): string {
  return formatEventBase(event, formatPieceId);
}

export function formatEventFeedItem(event: Record<string, unknown>) {
  return formatEventFeedItemBase(event, pieceNameFromId, formatPieceId);
}
