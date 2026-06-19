CREATE TABLE `config` (
  `accessor` enum('system','application','all') NOT NULL DEFAULT 'system' COMMENT 'Type of the clients allowed to access this configuration item.',
  `appAccess` int unsigned DEFAULT NULL COMMENT 'Bitwise value of client config flags which specifies which application clients have access to this configuration item. Has no affect if accessor is not ''application''.',
  `key` varchar(255) NOT NULL DEFAULT '' COMMENT 'Dot-notation of the configuration item as an object property.',
  `type` enum('null','string','boolean','number','integer','float','hexadecimal','datetime','date','time','regexp','json','any') NOT NULL DEFAULT 'null' COMMENT 'Data type of the configuration item.',
  `listType` enum('none','array','csl') NOT NULL DEFAULT 'none' COMMENT 'Indicates the list type of the config item. Set to ''none'' if the value is not a list.',
  `value` varchar(5000) DEFAULT NULL COMMENT 'Configuration item''s value to be parsed.',
  `options` text COMMENT 'Comma-delimited list of possible values for this configuration.',
  `defaultValue` varchar(5000) DEFAULT NULL COMMENT 'Default/initial value of the configuration. This should be used for reverting the configuration.',
  `requiresReboot` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Whether this configuration requires the related app/system to be rebooted, if changed.',
  `editable` tinyint unsigned NOT NULL DEFAULT '1' COMMENT 'Whether this configuration is editable by the accessor.',
  `encrypt` tinyint unsigned NOT NULL DEFAULT '0' COMMENT 'Whether this configuration should be encrypted when fetched.',
  `description` text COMMENT 'Description of the configuration item.',
  UNIQUE KEY `config_uniq_key` (`key`),
  KEY `config_index_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3 COMMENT='Configuration items table.';