-- clue: 3 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('clue-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'clue';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('clue-setup-01-components.jpg'::text)) WHERE game_id = 'clue';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('clue-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'clue';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('clue-setup-02-board-setup.jpg'::text)) WHERE game_id = 'clue';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,5,image}', to_jsonb('clue-setup-03-player-area.jpg'::text)), '{setup,walkthrough,5,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'clue';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,5,image}', to_jsonb('clue-setup-03-player-area.jpg'::text)) WHERE game_id = 'clue';


-- rummikub: 3 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('rummikub-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'rummikub';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('rummikub-setup-01-components.jpg'::text)) WHERE game_id = 'rummikub';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('rummikub-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'rummikub';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('rummikub-setup-02-board-setup.jpg'::text)) WHERE game_id = 'rummikub';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,5,image}', to_jsonb('rummikub-setup-03-player-area.jpg'::text)), '{setup,walkthrough,5,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'rummikub';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,5,image}', to_jsonb('rummikub-setup-03-player-area.jpg'::text)) WHERE game_id = 'rummikub';


-- tokaido: 1 images -> walk[7] sum[7]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('tokaido-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'tokaido';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('tokaido-setup-01-components.jpg'::text)) WHERE game_id = 'tokaido';


-- century-golem-edition-endless-world: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('century-golem-edition-endless-world-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'century-golem-edition-endless-world';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('century-golem-edition-endless-world-setup-01-components.jpg'::text)) WHERE game_id = 'century-golem-edition-endless-world';


-- risk-game-of-thrones: 2 images -> walk[7] sum[7]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('risk-game-of-thrones-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'risk-game-of-thrones';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('risk-game-of-thrones-setup-01-components.jpg'::text)) WHERE game_id = 'risk-game-of-thrones';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,6,image}', to_jsonb('risk-game-of-thrones-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,6,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'risk-game-of-thrones';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,6,image}', to_jsonb('risk-game-of-thrones-setup-02-board-setup.jpg'::text)) WHERE game_id = 'risk-game-of-thrones';


-- welcome-to: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('welcome-to-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'welcome-to';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('welcome-to-setup-01-components.jpg'::text)) WHERE game_id = 'welcome-to';


-- above-and-below: 8 images -> walk[14] sum[14]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('above-and-below-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('above-and-below-setup-01-components.jpg'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('above-and-below-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('above-and-below-setup-02-board-setup.jpg'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,4,image}', to_jsonb('above-and-below-setup-03-player-area.jpg'::text)), '{setup,walkthrough,4,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,4,image}', to_jsonb('above-and-below-setup-03-player-area.jpg'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,6,image}', to_jsonb('above-and-below-setup-04-tokens-cards.jpg'::text)), '{setup,walkthrough,6,image_caption}', to_jsonb('Tokens, cards, and key components'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,6,image}', to_jsonb('above-and-below-setup-04-tokens-cards.jpg'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,7,image}', to_jsonb('above-and-below-setup-05-setup-detail.jpg'::text)), '{setup,walkthrough,7,image_caption}', to_jsonb('Setup detail view'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,7,image}', to_jsonb('above-and-below-setup-05-setup-detail.jpg'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,9,image}', to_jsonb('above-and-below-setup-06-mid-setup.jpg'::text)), '{setup,walkthrough,9,image_caption}', to_jsonb('Mid-setup checkpoint'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,9,image}', to_jsonb('above-and-below-setup-06-mid-setup.jpg'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,11,image}', to_jsonb('above-and-below-setup-07-late-setup.jpg'::text)), '{setup,walkthrough,11,image_caption}', to_jsonb('Late-setup checkpoint'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,11,image}', to_jsonb('above-and-below-setup-07-late-setup.jpg'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,13,image}', to_jsonb('above-and-below-setup-08-final-setup.jpg'::text)), '{setup,walkthrough,13,image_caption}', to_jsonb('Final setup - your table should look like this'::text)) WHERE game_id = 'above-and-below';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,13,image}', to_jsonb('above-and-below-setup-08-final-setup.jpg'::text)) WHERE game_id = 'above-and-below';


-- quacks-of-quedlinburg: 1 images -> walk[12] sum[12]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('quacks-of-quedlinburg-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'quacks-of-quedlinburg';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('quacks-of-quedlinburg-setup-01-components.jpg'::text)) WHERE game_id = 'quacks-of-quedlinburg';


-- betrayal-at-house-on-the-hill: 2 images -> walk[10] sum[10]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('betrayal-at-house-on-the-hill-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'betrayal-at-house-on-the-hill';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('betrayal-at-house-on-the-hill-setup-01-components.jpg'::text)) WHERE game_id = 'betrayal-at-house-on-the-hill';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,9,image}', to_jsonb('betrayal-at-house-on-the-hill-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,9,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'betrayal-at-house-on-the-hill';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,9,image}', to_jsonb('betrayal-at-house-on-the-hill-setup-02-board-setup.jpg'::text)) WHERE game_id = 'betrayal-at-house-on-the-hill';


-- dead-of-winter: 1 images -> walk[14] sum[14]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('dead-of-winter-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'dead-of-winter';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('dead-of-winter-setup-01-components.jpg'::text)) WHERE game_id = 'dead-of-winter';

