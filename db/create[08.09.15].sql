CREATE DATABASE `spaziod` /*!40100 DEFAULT CHARACTER SET utf16 */;

USE `spaziod`;

CREATE TABLE `sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `assignedId` varchar(32) NOT NULL,
  `gender` varchar(3) NOT NULL,
  `socialGroup` varchar(64) NOT NULL,
  `ageGroup` varchar(32) NOT NULL,
  `ifFinished` smallint(6) NOT NULL DEFAULT '0',
  `lang` varchar(2) NOT NULL,
  `feedback` varchar(1024) NOT NULL DEFAULT '',
  `ifColorBlind` varchar(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `assignedId_UNIQUE` (`assignedId`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf16;

CREATE TABLE `stimuli` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `realName` varchar(256) NOT NULL,
  `codeName` varchar(64) NOT NULL,
  `visible` smallint(6) NOT NULL DEFAULT '1',
  `timesRated` int(11) NOT NULL DEFAULT '0',
  `compVC` double NOT NULL,
  `rosen` double NOT NULL,
  `congestion` double NOT NULL,
  `quadSmall` double NOT NULL,
  `salObjNum` double NOT NULL,
  `colClust` double NOT NULL,
  `pointAmVert` double NOT NULL,
  `quadBig` double NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codeName_UNIQUE` (`codeName`)
) ENGINE=InnoDB AUTO_INCREMENT=936 DEFAULT CHARSET=utf16;



CREATE TABLE `ratings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `rating` int(11) NOT NULL,
  `stimulusId` int(11) NOT NULL,
  `sessionId` varchar(32) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `_stimulusId_idx` (`stimulusId`),
  KEY `_sessionId_idx` (`sessionId`),
  CONSTRAINT `_stimulusId` FOREIGN KEY (`stimulusId`) REFERENCES `stimuli` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `_sessionId` FOREIGN KEY (`sessionId`) REFERENCES `sessions` (`assignedId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=230 DEFAULT CHARSET=utf16;
