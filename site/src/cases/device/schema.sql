-- A vertical key → value `config` table. Each row is one setting, carrying its
-- own metadata (type, access level, options, requiresReboot, …) so settings can
-- be added, edited, or removed one at a time — no schema migrations.
CREATE TABLE `config` (
  `accessor`       enum('system','application','all') NOT NULL DEFAULT 'system',
  `appAccess`      int unsigned        DEFAULT NULL,  -- bitwise flags (ABAC)
  `key`            varchar(255)        NOT NULL DEFAULT '',   -- dot/bracket notation; leading `@` = option list
  `type`           enum('null','string','boolean','number','integer','float','hexadecimal','datetime','date','time','regexp','json','any') NOT NULL DEFAULT 'null',
  `listType`       enum('none','array','csl') NOT NULL DEFAULT 'none',
  `value`          varchar(5000)       DEFAULT NULL,  -- raw string; may hold `${...}` templates
  `options`        text                DEFAULT NULL,  -- allowed values, or a `${@name}` option-list ref
  `defaultValue`   varchar(5000)       DEFAULT NULL,  -- factory value, for reverting
  `requiresReboot` tinyint unsigned    NOT NULL DEFAULT '0',
  `editable`       tinyint unsigned    NOT NULL DEFAULT '1',
  `encrypt`        tinyint unsigned    NOT NULL DEFAULT '0',
  `description`    text                DEFAULT NULL,
  UNIQUE KEY `config_uniq_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Configuration items table.';
