USE `spaziod`;

ALTER TABLE `spaziod`.`sessions` 
CHANGE COLUMN `gender` `gender` VARCHAR(3) NULL ,
CHANGE COLUMN `socialGroup` `socialGroup` VARCHAR(64) NULL ,
CHANGE COLUMN `ageGroup` `ageGroup` VARCHAR(32) NULL ,
ADD COLUMN `ifDyslexic` VARCHAR(3) NULL AFTER `ifColorBlind`;
