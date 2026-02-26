import EventTracker from './EventTracker';

export const trackMenuItemViewed = (venueId, itemId, categoryId) =>
  EventTracker.track('menu_item_viewed', null, { venue_id: venueId, item_id: itemId, category_id: categoryId });

export const trackGameAddedToCollection = (venueId, gameId, source) =>
  EventTracker.track('game_added_to_collection', gameId, { venue_id: venueId, source });

export const trackScoreStarted = (venueId, gameId, playerCount) =>
  EventTracker.track('score_started', gameId, { venue_id: venueId, player_count: playerCount });

export const trackOrderPlaced = (venueId, items, totalCents) =>
  EventTracker.track('order_placed', null, { venue_id: venueId, items, total_cents: totalCents });
