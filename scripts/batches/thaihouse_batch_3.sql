-- codenames-pictures-heirloom-edition: 2 images -> walk[7] sum[7]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('codenames-pictures-heirloom-edition-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'codenames-pictures-heirloom-edition';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('codenames-pictures-heirloom-edition-setup-01-components.jpg'::text)) WHERE game_id = 'codenames-pictures-heirloom-edition';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,6,image}', to_jsonb('codenames-pictures-heirloom-edition-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,6,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'codenames-pictures-heirloom-edition';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,6,image}', to_jsonb('codenames-pictures-heirloom-edition-setup-02-board-setup.jpg'::text)) WHERE game_id = 'codenames-pictures-heirloom-edition';


-- wavelength: 1 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('wavelength-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'wavelength';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('wavelength-setup-01-components.jpg'::text)) WHERE game_id = 'wavelength';


-- secret-hitler: 1 images -> walk[8] sum[8]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('secret-hitler-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'secret-hitler';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('secret-hitler-setup-01-components.jpg'::text)) WHERE game_id = 'secret-hitler';


-- scattergories: 1 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('scattergories-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'scattergories';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('scattergories-setup-01-components.jpg'::text)) WHERE game_id = 'scattergories';


-- love-letter: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('love-letter-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'love-letter';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('love-letter-setup-01-components.jpg'::text)) WHERE game_id = 'love-letter';


-- spot-it: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('spot-it-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'spot-it';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('spot-it-setup-01-components.jpg'::text)) WHERE game_id = 'spot-it';


-- six-nimmt: 1 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('six-nimmt-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'six-nimmt';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('six-nimmt-setup-01-components.jpg'::text)) WHERE game_id = 'six-nimmt';


-- the-crew: 1 images -> walk[5] sum[5]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('the-crew-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'the-crew';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('the-crew-setup-01-components.jpg'::text)) WHERE game_id = 'the-crew';


-- deception-murder-in-hong-kong: 1 images -> walk[8] sum[8]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('deception-murder-in-hong-kong-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'deception-murder-in-hong-kong';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('deception-murder-in-hong-kong-setup-01-components.jpg'::text)) WHERE game_id = 'deception-murder-in-hong-kong';


-- uno: 3 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('uno-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'uno';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('uno-setup-01-components.jpg'::text)) WHERE game_id = 'uno';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('uno-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'uno';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('uno-setup-02-board-setup.jpg'::text)) WHERE game_id = 'uno';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,3,image}', to_jsonb('uno-setup-03-player-area.jpg'::text)), '{setup,walkthrough,3,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'uno';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,3,image}', to_jsonb('uno-setup-03-player-area.jpg'::text)) WHERE game_id = 'uno';

