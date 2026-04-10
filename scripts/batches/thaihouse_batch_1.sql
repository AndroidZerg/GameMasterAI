-- catan: 4 images -> walk[9] sum[9]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('catan-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'catan';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('catan-setup-01-components.jpg'::text)) WHERE game_id = 'catan';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,3,image}', to_jsonb('catan-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,3,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'catan';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,3,image}', to_jsonb('catan-setup-02-board-setup.jpg'::text)) WHERE game_id = 'catan';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,5,image}', to_jsonb('catan-setup-03-player-area.jpg'::text)), '{setup,walkthrough,5,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'catan';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,5,image}', to_jsonb('catan-setup-03-player-area.jpg'::text)) WHERE game_id = 'catan';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,8,image}', to_jsonb('catan-setup-04-tokens-cards.jpg'::text)), '{setup,walkthrough,8,image_caption}', to_jsonb('Tokens, cards, and key components'::text)) WHERE game_id = 'catan';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,8,image}', to_jsonb('catan-setup-04-tokens-cards.jpg'::text)) WHERE game_id = 'catan';


-- azul: 2 images -> walk[7] sum[7]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('azul-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'azul';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('azul-setup-01-components.jpg'::text)) WHERE game_id = 'azul';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,6,image}', to_jsonb('azul-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,6,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'azul';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,6,image}', to_jsonb('azul-setup-02-board-setup.jpg'::text)) WHERE game_id = 'azul';


-- splendor: 1 images -> walk[8] sum[8]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('splendor-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'splendor';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('splendor-setup-01-components.jpg'::text)) WHERE game_id = 'splendor';


-- ticket-to-ride: 8 images -> walk[8] sum[8]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('ticket-to-ride-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('ticket-to-ride-setup-01-components.jpg'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,1,image}', to_jsonb('ticket-to-ride-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,1,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,1,image}', to_jsonb('ticket-to-ride-setup-02-board-setup.jpg'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('ticket-to-ride-setup-03-player-area.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('ticket-to-ride-setup-03-player-area.jpg'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,3,image}', to_jsonb('ticket-to-ride-setup-04-tokens-cards.jpg'::text)), '{setup,walkthrough,3,image_caption}', to_jsonb('Tokens, cards, and key components'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,3,image}', to_jsonb('ticket-to-ride-setup-04-tokens-cards.jpg'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,4,image}', to_jsonb('ticket-to-ride-setup-05-setup-detail.jpg'::text)), '{setup,walkthrough,4,image_caption}', to_jsonb('Setup detail view'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,4,image}', to_jsonb('ticket-to-ride-setup-05-setup-detail.jpg'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,5,image}', to_jsonb('ticket-to-ride-setup-06-mid-setup.jpg'::text)), '{setup,walkthrough,5,image_caption}', to_jsonb('Mid-setup checkpoint'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,5,image}', to_jsonb('ticket-to-ride-setup-06-mid-setup.jpg'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,6,image}', to_jsonb('ticket-to-ride-setup-07-late-setup.jpg'::text)), '{setup,walkthrough,6,image_caption}', to_jsonb('Late-setup checkpoint'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,6,image}', to_jsonb('ticket-to-ride-setup-07-late-setup.jpg'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,7,image}', to_jsonb('ticket-to-ride-setup-08-final-setup.jpg'::text)), '{setup,walkthrough,7,image_caption}', to_jsonb('Final setup - your table should look like this'::text)) WHERE game_id = 'ticket-to-ride';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,7,image}', to_jsonb('ticket-to-ride-setup-08-final-setup.jpg'::text)) WHERE game_id = 'ticket-to-ride';


-- exploding-kittens: 1 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('exploding-kittens-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'exploding-kittens';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('exploding-kittens-setup-01-components.jpg'::text)) WHERE game_id = 'exploding-kittens';


-- codenames: 2 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('codenames-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'codenames';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('codenames-setup-01-components.jpg'::text)) WHERE game_id = 'codenames';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,5,image}', to_jsonb('codenames-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,5,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'codenames';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,5,image}', to_jsonb('codenames-setup-02-board-setup.jpg'::text)) WHERE game_id = 'codenames';


-- king-of-tokyo: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('king-of-tokyo-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'king-of-tokyo';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('king-of-tokyo-setup-01-components.jpg'::text)) WHERE game_id = 'king-of-tokyo';


-- pandemic: 2 images -> walk[13] sum[13]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('pandemic-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'pandemic';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('pandemic-setup-01-components.jpg'::text)) WHERE game_id = 'pandemic';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,12,image}', to_jsonb('pandemic-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,12,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'pandemic';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,12,image}', to_jsonb('pandemic-setup-02-board-setup.jpg'::text)) WHERE game_id = 'pandemic';


-- everdell: 2 images -> walk[14] sum[14]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('everdell-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'everdell';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('everdell-setup-01-components.jpg'::text)) WHERE game_id = 'everdell';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,13,image}', to_jsonb('everdell-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,13,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'everdell';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,13,image}', to_jsonb('everdell-setup-02-board-setup.jpg'::text)) WHERE game_id = 'everdell';


-- carcassonne: 1 images -> walk[8] sum[8]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('carcassonne-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'carcassonne';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('carcassonne-setup-01-components.jpg'::text)) WHERE game_id = 'carcassonne';

