-- dixit: 5 images -> walk[5] sum[5]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('dixit-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('dixit-setup-01-components.jpg'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,1,image}', to_jsonb('dixit-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,1,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,1,image}', to_jsonb('dixit-setup-02-board-setup.jpg'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('dixit-setup-03-player-area.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('dixit-setup-03-player-area.jpg'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,3,image}', to_jsonb('dixit-setup-04-tokens-cards.jpg'::text)), '{setup,walkthrough,3,image_caption}', to_jsonb('Tokens, cards, and key components'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,3,image}', to_jsonb('dixit-setup-04-tokens-cards.jpg'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,4,image}', to_jsonb('dixit-setup-05-setup-detail.jpg'::text)), '{setup,walkthrough,4,image_caption}', to_jsonb('Setup detail view'::text)) WHERE game_id = 'dixit';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,4,image}', to_jsonb('dixit-setup-05-setup-detail.jpg'::text)) WHERE game_id = 'dixit';


-- sushi-go: 1 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('sushi-go-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'sushi-go';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('sushi-go-setup-01-components.jpg'::text)) WHERE game_id = 'sushi-go';


-- seven-wonders: 6 images -> walk[10] sum[10]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('seven-wonders-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('seven-wonders-setup-01-components.jpg'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('seven-wonders-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('seven-wonders-setup-02-board-setup.jpg'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,4,image}', to_jsonb('seven-wonders-setup-03-player-area.jpg'::text)), '{setup,walkthrough,4,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,4,image}', to_jsonb('seven-wonders-setup-03-player-area.jpg'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,5,image}', to_jsonb('seven-wonders-setup-04-tokens-cards.jpg'::text)), '{setup,walkthrough,5,image_caption}', to_jsonb('Tokens, cards, and key components'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,5,image}', to_jsonb('seven-wonders-setup-04-tokens-cards.jpg'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,7,image}', to_jsonb('seven-wonders-setup-05-setup-detail.jpg'::text)), '{setup,walkthrough,7,image_caption}', to_jsonb('Setup detail view'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,7,image}', to_jsonb('seven-wonders-setup-05-setup-detail.jpg'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,9,image}', to_jsonb('seven-wonders-setup-06-mid-setup.jpg'::text)), '{setup,walkthrough,9,image_caption}', to_jsonb('Mid-setup checkpoint'::text)) WHERE game_id = 'seven-wonders';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,9,image}', to_jsonb('seven-wonders-setup-06-mid-setup.jpg'::text)) WHERE game_id = 'seven-wonders';


-- flamecraft: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('flamecraft-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'flamecraft';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('flamecraft-setup-01-components.jpg'::text)) WHERE game_id = 'flamecraft';


-- cant-stop: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('cant-stop-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'cant-stop';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('cant-stop-setup-01-components.jpg'::text)) WHERE game_id = 'cant-stop';


-- cant-stop-korean: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('cant-stop-korean-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'cant-stop-korean';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('cant-stop-korean-setup-01-components.jpg'::text)) WHERE game_id = 'cant-stop-korean';


-- century-golem-edition: 1 images -> walk[9] sum[9]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('century-golem-edition-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'century-golem-edition';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('century-golem-edition-setup-01-components.jpg'::text)) WHERE game_id = 'century-golem-edition';


-- machi-koro: 1 images -> walk[8] sum[8]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('machi-koro-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'machi-koro';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('machi-koro-setup-01-components.jpg'::text)) WHERE game_id = 'machi-koro';


-- one-night-ultimate-werewolf: 4 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('one-night-ultimate-werewolf-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'one-night-ultimate-werewolf';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('one-night-ultimate-werewolf-setup-01-components.jpg'::text)) WHERE game_id = 'one-night-ultimate-werewolf';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,1,image}', to_jsonb('one-night-ultimate-werewolf-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,1,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'one-night-ultimate-werewolf';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,1,image}', to_jsonb('one-night-ultimate-werewolf-setup-02-board-setup.jpg'::text)) WHERE game_id = 'one-night-ultimate-werewolf';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,2,image}', to_jsonb('one-night-ultimate-werewolf-setup-03-player-area.jpg'::text)), '{setup,walkthrough,2,image_caption}', to_jsonb('Player starting area'::text)) WHERE game_id = 'one-night-ultimate-werewolf';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,2,image}', to_jsonb('one-night-ultimate-werewolf-setup-03-player-area.jpg'::text)) WHERE game_id = 'one-night-ultimate-werewolf';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,3,image}', to_jsonb('one-night-ultimate-werewolf-setup-04-tokens-cards.jpg'::text)), '{setup,walkthrough,3,image_caption}', to_jsonb('Tokens, cards, and key components'::text)) WHERE game_id = 'one-night-ultimate-werewolf';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,3,image}', to_jsonb('one-night-ultimate-werewolf-setup-04-tokens-cards.jpg'::text)) WHERE game_id = 'one-night-ultimate-werewolf';


-- codenames-duet: 2 images -> walk[4] sum[4]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('codenames-duet-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'codenames-duet';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('codenames-duet-setup-01-components.jpg'::text)) WHERE game_id = 'codenames-duet';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,3,image}', to_jsonb('codenames-duet-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,3,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'codenames-duet';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,3,image}', to_jsonb('codenames-duet-setup-02-board-setup.jpg'::text)) WHERE game_id = 'codenames-duet';

