import EventTracker from './EventTracker';

// ── Existing events (kept for backward compat) ──

export const trackMenuItemViewed = (gameId, itemName, category, price) =>
  EventTracker.track('menu_item_viewed', gameId, { item_name: itemName, category, price });

export const trackGameAddedToCollection = (venueId, gameId, source) =>
  EventTracker.track('game_added_to_collection', gameId, { venue_id: venueId, source });

export const trackScoreStarted = (venueId, gameId, playerCount) =>
  EventTracker.track('score_started', gameId, { venue_id: venueId, player_count: playerCount });

export const trackOrderPlaced = (gameId, items, subtotal, minutesSinceStart) =>
  EventTracker.track('order_placed', gameId, { items, subtotal, total_cents: Math.round(subtotal * 100), minutes_since_game_start: minutesSinceStart });

// ── Page & Navigation ──

export const trackPageViewed = (page, referrerPage) =>
  EventTracker.track('page_viewed', null, { page, referrer_page: referrerPage });

export const trackPageDwell = (page, dwellSeconds) =>
  EventTracker.track('page_dwell', null, { page, dwell_seconds: dwellSeconds });

// ── Game Selection ──

export const trackGameSelected = (gameId, gameTitle, source) =>
  EventTracker.track('game_selected', gameId, { game_title: gameTitle, source });

export const trackGameSearch = (query, resultsCount, resultsShown) =>
  EventTracker.track('game_search', null, { query, results_count: resultsCount, results_shown: resultsShown });

export const trackFilterApplied = (filterType, filterValue) =>
  EventTracker.track('filter_applied', null, { filter_type: filterType, filter_value: filterValue });

// ── Tabs ──

export const trackTabSwitched = (gameId, fromTab, toTab) =>
  EventTracker.track('tab_switched', gameId, { from_tab: fromTab, to_tab: toTab });

export const trackTabDwell = (gameId, tab, dwellSeconds) =>
  EventTracker.track('tab_dwell', gameId, { tab, dwell_seconds: dwellSeconds });

// ── Q&A ──

export const trackQuestionAsked = (gameId, questionText, questionLength, inputMethod) =>
  EventTracker.track('question_asked', gameId, { question_text: questionText, question_length: questionLength, input_method: inputMethod });

export const trackResponseDelivered = (gameId, responseLength, responseTimeMs) =>
  EventTracker.track('response_delivered', gameId, { response_length: responseLength, response_time_ms: responseTimeMs });

// ── TTS ──

export const trackTtsPlayed = (gameId, tab, contentType) =>
  EventTracker.track('tts_played', gameId, { tab, content_type: contentType });

export const trackTtsPaused = (gameId, tab, listenedSeconds) =>
  EventTracker.track('tts_paused', gameId, { tab, listened_seconds: listenedSeconds });

export const trackTtsCompleted = (gameId, tab, totalSeconds) =>
  EventTracker.track('tts_completed', gameId, { tab, total_seconds: totalSeconds });

// ── Voice ──

export const trackVoiceInputUsed = (gameId, success, transcriptLength) =>
  EventTracker.track('voice_input_used', gameId, { success, transcript_length: transcriptLength });

// ── Score ──

export const trackScorePlayerAdded = (gameId, playerCount, playerName) =>
  EventTracker.track('score_player_added', gameId, { player_count: playerCount, player_name: playerName });

export const trackScoreUpdated = (gameId, playerCount, roundNumber) =>
  EventTracker.track('score_updated', gameId, { player_count: playerCount, round_number: roundNumber });

export const trackGameEnded = (gameId, props) =>
  EventTracker.track('game_ended', gameId, props);

// ── Menu / Orders ──

export const trackMenuBrowsed = (gameId, minutesSinceStart) =>
  EventTracker.track('menu_browsed', gameId, { minutes_since_game_start: minutesSinceStart });

// ── Notes ──

export const trackNotesEdited = (gameId, noteLength) =>
  EventTracker.track('notes_edited', gameId, { note_length: noteLength });

export const trackCopyResponse = (gameId) =>
  EventTracker.track('copy_response', gameId);

export const trackPasteToNotes = (gameId) =>
  EventTracker.track('paste_to_notes', gameId);

// ── Session ──

export const trackSessionEnded = (props) =>
  EventTracker.track('session_ended', null, props);
