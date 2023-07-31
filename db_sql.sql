CREATE DATABASE  IF NOT EXISTS `pointstar_booking_system` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `pointstar_booking_system`;
-- MySQL dump 10.13  Distrib 8.0.33, for macos13 (arm64)
--
-- Host: localhost    Database: pointstar_booking_system
-- ------------------------------------------------------
-- Server version	8.0.33

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `meeting_participants`
--

DROP TABLE IF EXISTS `meeting_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meeting_participants` (
  `attendee_id` int DEFAULT NULL,
  `meeting_id` int NOT NULL,
  `attendee_status` int DEFAULT NULL,
  `attendee_email` varchar(65) NOT NULL,
  KEY `meeting_id_idx` (`meeting_id`),
  KEY `attendee_id_idx` (`attendee_id`),
  CONSTRAINT `attendee_id` FOREIGN KEY (`attendee_id`) REFERENCES `users` (`user_id`),
  CONSTRAINT `meeting_id` FOREIGN KEY (`meeting_id`) REFERENCES `meetings` (`meeting_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meeting_participants`
--

LOCK TABLES `meeting_participants` WRITE;
/*!40000 ALTER TABLE `meeting_participants` DISABLE KEYS */;
INSERT INTO `meeting_participants` VALUES (1,12,1,'joe.chua@point-star.com'),(1,21,1,'joe.chua@point-star.com');
/*!40000 ALTER TABLE `meeting_participants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meeting_rooms`
--

DROP TABLE IF EXISTS `meeting_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meeting_rooms` (
  `meeting_room_id` int NOT NULL,
  `meeting_room_name` varchar(45) NOT NULL,
  `capacity` int NOT NULL,
  `country` varchar(60) NOT NULL,
  `city` varchar(90) NOT NULL,
  `area` varchar(45) DEFAULT NULL,
  `time_zone` varchar(30) NOT NULL,
  `gmt` varchar(10) NOT NULL,
  PRIMARY KEY (`meeting_room_id`),
  UNIQUE KEY `meeting_room_id_UNIQUE` (`meeting_room_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meeting_rooms`
--

LOCK TABLES `meeting_rooms` WRITE;
/*!40000 ALTER TABLE `meeting_rooms` DISABLE KEYS */;
INSERT INTO `meeting_rooms` VALUES (0,'Cityloft-23-JKT-CONF-FRAPPUCCINO',4,'INDONESIA','JAKARTA',NULL,'Asia/Jakarta','+07:00'),(1,'Cityloft-23-JKT-CONF-AMERICANO',10,'INDONESIA','JAKARTA',NULL,'Asia/Jakarta','+07:00'),(2,'Bandung-1-BDO-CENDANA-SMALL',6,'INDONESIA','BANDUNG',NULL,'Asia/Jakarta','+07:00'),(3,'Bandung-1-BDO-JATI-BIG',10,'INDONESIA','BANDUNG',NULL,'Asia/Jakarta','+07:00'),(4,'Bendemeer-6-Prince George-Demo',6,'SINGAPORE','SINGAPORE','BENDEMEER','Asia/Singapore','+08:00'),(5,'Bendemeer-6-SG-CONF-AYER-RAJAH',5,'SINGAPORE','SINGAPORE','BENDEMEER','Asia/Singapore','+08:00'),(6,'Bendemeer-6-SG-CONF-PRINCE-GEORGES-PARK',5,'SINGAPORE','SINGAPORE','BENDEMEER','Asia/Singapore','+08:00'),(7,'Bendemeer-6-SG-DEMO',2,'SINGAPORE','SINGAPORE','BENDEMEER','Asia/Singapore','+08:00'),(8,'Bendemeer-6-SG-Jamboard',1,'SINGAPORE','SINGAPORE','BENDEMEER','Asia/Singapore','+08:00'),(9,'Eco Botanic-2-JB-DIM-SUM',4,'MALAYSIA','JOHOR BAHRU',NULL,'Asia/Kuala_Lumpur','+08:00'),(10,'Eco Botanic-2-JB-TEH-TARIK-BIG',5,'MALAYSIA','JOHOR BAHRU',NULL,'Asia/Kuala_Lumpur','+08:00'),(11,'Northpoint-11-KL-JUPITER-BIG',10,'MALAYSIA','KUALA LUMPUR',NULL,'Asia/Kuala_Lumpur','+08:00'),(12,'Northpoint-11-KL-MARS-MEDIUM',5,'MALAYSIA','KUALA LUMPUR',NULL,'Asia/Kuala_Lumpur','+08:00'),(13,'Northpoint-11-KL-PLUTO-SMALL',3,'MALAYSIA','KUALA LUMPUR',NULL,'Asia/Kuala_Lumpur','+08:00'),(14,'Northpoint-11-KL-VENUS-SMALL',3,'MALAYSIA','KUALA LUMPUR',NULL,'Asia/Kuala_Lumpur','+08:00');
/*!40000 ALTER TABLE `meeting_rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `meetings`
--

DROP TABLE IF EXISTS `meetings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `meetings` (
  `meeting_id` int NOT NULL AUTO_INCREMENT,
  `event_id` varchar(45) NOT NULL,
  `title` varchar(45) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `meeting_room_id` int NOT NULL,
  `organizer_id` int NOT NULL,
  `start_date_time` varchar(45) NOT NULL,
  `end_date_time` varchar(45) NOT NULL,
  `time_zone` varchar(45) NOT NULL,
  `organizer_email` varchar(65) NOT NULL,
  `date` varchar(10) NOT NULL,
  `start_time` varchar(5) NOT NULL,
  `end_time` varchar(5) NOT NULL,
  `meeting_status` int NOT NULL,
  `gmt` varchar(6) NOT NULL,
  `universal_start_time` varchar(5) NOT NULL,
  `universal_end_time` varchar(5) NOT NULL,
  `universal_start_date` varchar(10) NOT NULL,
  `universal_end_date` varchar(10) NOT NULL,
  PRIMARY KEY (`meeting_id`),
  UNIQUE KEY `meeting_id_UNIQUE` (`meeting_id`),
  KEY `meeting_room_id_idx` (`meeting_room_id`),
  KEY `organizer_id_idx` (`organizer_id`),
  CONSTRAINT `meeting_room_id` FOREIGN KEY (`meeting_room_id`) REFERENCES `meeting_rooms` (`meeting_room_id`),
  CONSTRAINT `organizer_id` FOREIGN KEY (`organizer_id`) REFERENCES `users` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `meetings`
--

LOCK TABLES `meetings` WRITE;
/*!40000 ALTER TABLE `meetings` DISABLE KEYS */;
INSERT INTO `meetings` VALUES (12,'5n8de203cec2d7g65vjrvp9qd0','test 12','this is a test',0,1,'2023-06-21T14:00:00+07:00','2023-06-21T14:15:00+07:00','Asia/Jakarta','joe.chua@point-star.com','2023-06-21','14:00','14:15',1,'+07:00','07:00','07:15','2023-06-21','2023-06-21'),(21,'d33m7nadmi2rgtdpcn3e78tfrk','test meeting','this is a meeting',0,1,'2023-07-30T08:00:00+07:00','2023-07-30T10:00:00+07:00','Asia/Jakarta','joe.chua@point-star.com','2023-07-30','08:00','10:00',0,'+07:00','01:00','03:00','2023-07-30','2023-07-30');
/*!40000 ALTER TABLE `meetings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `user_id` int NOT NULL AUTO_INCREMENT,
  `user_email` varchar(65) NOT NULL,
  `full_name` varchar(45) DEFAULT NULL,
  `image_url` varchar(2000) DEFAULT NULL,
  `join_date_time` varchar(100) NOT NULL,
  `last_login` varchar(100) NOT NULL,
  `login_status` int NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `email_UNIQUE` (`user_email`),
  UNIQUE KEY `user_id_UNIQUE` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'joe.chua@point-star.com','Joe Chua','https://lh3.googleusercontent.com/a/AAcHTtfLDut0op2OPsBimveqwjDfadjFcqe-q2JzNOeY=s96-c','Wed Jun 14 2023 11:39:55 GMT+0700 (Western Indonesia Time)','Wed Jun 14 2023 11:39:55 GMT+0700 (Western Indonesia Time)',1),(2,'wuihong.khoo@point-star.com','Wui Hong Khoo','https://lh3.googleusercontent.com/a/AAcHTtdieg0QmlTojHJjO8AT3ur4s80Mw4evhw6UuA9Z=s96-c','Wed Jun 14 2023 11:47:18 GMT+0700 (Western Indonesia Time)','Wed Jun 14 2023 11:47:18 GMT+0700 (Western Indonesia Time)',1);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2023-07-31 14:48:32
