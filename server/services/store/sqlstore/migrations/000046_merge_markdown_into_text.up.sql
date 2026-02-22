UPDATE {{.prefix}}blocks SET type = 'text' WHERE type = 'markdown';
UPDATE {{.prefix}}blocks_history SET type = 'text' WHERE type = 'markdown';
