-- unlock-mystery-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-mystery-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-mystery-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-mystery-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-mystery-adventures';


-- unlock-secret-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-secret-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-secret-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-secret-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-secret-adventures';


-- unlock-exotic-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-exotic-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-exotic-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-exotic-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-exotic-adventures';


-- unlock-timeless-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-timeless-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-timeless-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-timeless-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-timeless-adventures';


-- unlock-epic-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-epic-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-epic-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-epic-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-epic-adventures';


-- unlock-mythic-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-mythic-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-mythic-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-mythic-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-mythic-adventures';


-- unlock-game-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-game-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-game-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-game-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-game-adventures';


-- unlock-star-wars-escape-game: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-star-wars-escape-game-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-star-wars-escape-game';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-star-wars-escape-game-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-star-wars-escape-game';

