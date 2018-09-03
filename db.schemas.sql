#CREATE DATABASE IF NOT EXISTS `youpark` DEFAULT CHARSET utf8 COLLATE utf8_general_ci;
#USE `youpark`;

CREATE TABLE IF NOT EXISTS `users`(
`id` SERIAL,
`firstname` VARCHAR(30) NOT NULL,
`lastname` VARCHAR(30) NOT NULL,
`email` VARCHAR(80) NOT NULL,
`phone` VARCHAR(30) NOT NULL DEFAULT "",
`handphone` VARCHAR(30) NOT NULL DEFAULT "",
INDEX(firstname, lastname)
)Engine=MyISAM charset=utf8;

INSERT INTO `users` (`id`, `firstname`, `lastname`, `email`, `phone`, `handphone`)
VALUES(NULL, "Shiva", "Ng", "shiva@youpark.tw", "1234567", "0912345678");

CREATE TABLE IF NOT EXISTS `charging_logs`(
`id` SERIAL,
`user_id` BIGINT(20) UNSIGNED NOT NULL,
`start_time` DATETIME NOT NULL DEFAULT "0000-00-00 00:00:00",
`end_time` DATETIME NOT NULL DEFAULT "0000-00-00 00:00:00",
`status` ENUM("start", "end", "idontknow") NOT NULL DEFAULT "idontknow",
`interval` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
`used_watts` INT(11) UNSIGNED NOT NULL DEFAULT 0,
`start_watts` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
`end_watts` SMALLINT(5) UNSIGNED NOT NULL DEFAULT 0,
`deviceid` INT(11) UNSIGNED NOT NULL DEFAULT 0,
`created`  DATETIME NOT NULL DEFAULT "0000-00-00 00:00:00",
`modified`  DATETIME NOT NULL DEFAULT "0000-00-00 00:00:00",
INDEX(`start_time`, `end_time`, `status`, `interval`),
INDEX(`deviceid`),
FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
)Engine=MyISAM charset=utf8;

CREATE TABLE IF NOT EXISTS `simulator`(
`id` SERIAL,
`deviceid` INT(11) UNSIGNED NOT NULL DEFAULT 0,
`value1` INT(11) UNSIGNED NOT NULL DEFAULT 0,
`value2` INT(11) UNSIGNED NOT NULL DEFAULT 0,
`value3` INT(11) UNSIGNED NOT NULL DEFAULT 0,
`created`  DATETIME NOT NULL DEFAULT "0000-00-00 00:00:00",
`modified`  DATETIME NOT NULL DEFAULT "0000-00-00 00:00:00"
)Engine=MyISAM charset=utf8;

INSERT INTO `simulator` (`deviceid`, `value1`, `value2`, `value3`, `created`, `modified`)
VALUES("42087", "0", "26419", "0", NOW(), NOW());