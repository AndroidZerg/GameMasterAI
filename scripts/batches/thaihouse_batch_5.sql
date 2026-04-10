-- villainous: 1 images -> walk[10] sum[10]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('villainous-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'villainous';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('villainous-setup-01-components.jpg'::text)) WHERE game_id = 'villainous';


-- sheriff-of-nottingham: 1 images -> walk[10] sum[10]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('sheriff-of-nottingham-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'sheriff-of-nottingham';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('sheriff-of-nottingham-setup-01-components.jpg'::text)) WHERE game_id = 'sheriff-of-nottingham';


-- everdell-pearlbrook: 2 images -> walk[8] sum[8]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('everdell-pearlbrook-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'everdell-pearlbrook';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('everdell-pearlbrook-setup-01-components.jpg'::text)) WHERE game_id = 'everdell-pearlbrook';
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,7,image}', to_jsonb('everdell-pearlbrook-setup-02-board-setup.jpg'::text)), '{setup,walkthrough,7,image_caption}', to_jsonb('Initial board setup'::text)) WHERE game_id = 'everdell-pearlbrook';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,7,image}', to_jsonb('everdell-pearlbrook-setup-02-board-setup.jpg'::text)) WHERE game_id = 'everdell-pearlbrook';


-- takenoko: 1 images -> walk[10] sum[10]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('takenoko-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'takenoko';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('takenoko-setup-01-components.jpg'::text)) WHERE game_id = 'takenoko';


-- scythe: 1 images -> walk[12] sum[12]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('scythe-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'scythe';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('scythe-setup-01-components.jpg'::text)) WHERE game_id = 'scythe';


-- root: 1 images -> walk[15] sum[15]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('root-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'root';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('root-setup-01-components.jpg'::text)) WHERE game_id = 'root';


-- exit-the-game-series: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('exit-the-game-series-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'exit-the-game-series';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('exit-the-game-series-setup-01-components.jpg'::text)) WHERE game_id = 'exit-the-game-series';


-- 5-minute-dungeon: 1 images -> walk[7] sum[7]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('5-minute-dungeon-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = '5-minute-dungeon';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('5-minute-dungeon-setup-01-components.jpg'::text)) WHERE game_id = '5-minute-dungeon';


-- 5-minute-mystery: 1 images -> walk[7] sum[7]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('5-minute-mystery-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = '5-minute-mystery';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('5-minute-mystery-setup-01-components.jpg'::text)) WHERE game_id = '5-minute-mystery';


-- unlock-escape-adventures: 1 images -> walk[6] sum[6]
UPDATE games SET teaching = jsonb_set(jsonb_set(teaching, '{setup,walkthrough,0,image}', to_jsonb('unlock-escape-adventures-setup-01-components.jpg'::text)), '{setup,walkthrough,0,image_caption}', to_jsonb('Game components and starting layout'::text)) WHERE game_id = 'unlock-escape-adventures';
UPDATE games SET teaching = jsonb_set(teaching, '{setup,summary,0,image}', to_jsonb('unlock-escape-adventures-setup-01-components.jpg'::text)) WHERE game_id = 'unlock-escape-adventures';

