/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.3.2-MariaDB, for Linux (x86_64)
--
-- Host: localhost    Database: kontrakanku
-- ------------------------------------------------------
-- Server version	12.3.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `activities`
--

DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities` (
  `id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `actor_id` varchar(255) NOT NULL,
  `action` varchar(255) NOT NULL,
  `entity_type` varchar(255) DEFAULT NULL,
  `entity_id` varchar(255) DEFAULT NULL,
  `metadata` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `activities_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `activities_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `calendar_events`
--

DROP TABLE IF EXISTS `calendar_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendar_events` (
  `id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `date` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'HOUSE_EVENT',
  `color` varchar(255) DEFAULT '#3b82f6',
  `creator_id` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `calendar_events_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `calendar_events_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `expenses`
--

DROP TABLE IF EXISTS `expenses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `expenses` (
  `id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `amount` int(11) NOT NULL,
  `payer_id` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `split_type` varchar(255) DEFAULT 'EQUAL',
  `status` varchar(255) NOT NULL DEFAULT 'OPEN',
  `participants` varchar(255) DEFAULT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `expenses_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `expenses_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `house_members`
--

DROP TABLE IF EXISTS `house_members`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `house_members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `house_id` varchar(255) NOT NULL,
  `user_id` varchar(255) NOT NULL,
  `role` varchar(255) NOT NULL DEFAULT 'member',
  `status` varchar(255) NOT NULL DEFAULT 'active',
  `joined_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `house_members_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `house_members_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `houses`
--

DROP TABLE IF EXISTS `houses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `houses` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL,
  `currency` varchar(255) DEFAULT 'IDR',
  `rules` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `maintenance_tasks`
--

DROP TABLE IF EXISTS `maintenance_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `maintenance_tasks` (
  `id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `cost_estimate` int(11) DEFAULT 0,
  `actual_cost` int(11) DEFAULT 0,
  `status` varchar(255) NOT NULL DEFAULT 'OPEN',
  `reporter_id` varchar(255) NOT NULL,
  `assignee_id` varchar(255) DEFAULT NULL,
  `date` varchar(255) NOT NULL,
  `resolved_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `maintenance_tasks_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `maintenance_tasks_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `needs`
--

DROP TABLE IF EXISTS `needs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `needs` (
  `id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `icon` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,
  `color` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `duty_enabled` tinyint(1) DEFAULT 1,
  `current_duty_member_id` varchar(255) DEFAULT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'AVAILABLE',
  `urgency_score` int(11) DEFAULT 0,
  `average_consumption_days` int(11) DEFAULT 14,
  `unit` varchar(255) DEFAULT 'pcs',
  `notes` varchar(255) DEFAULT NULL,
  `last_purchaser_id` varchar(255) DEFAULT NULL,
  `last_amount` int(11) DEFAULT 0,
  `last_purchased_at` timestamp NULL DEFAULT NULL,
  `expected_depleted_at` timestamp NULL DEFAULT NULL,
  `archived` tinyint(1) DEFAULT 0,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `rotation_logic` varchar(50) DEFAULT NULL,
  `rotation_participants` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `needs_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `needs_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `id` varchar(255) NOT NULL,
  `need_id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `purchaser_id` varchar(255) NOT NULL,
  `date` varchar(255) NOT NULL,
  `amount` int(11) NOT NULL,
  `quantity` int(11) DEFAULT 1,
  `unit` varchar(255) DEFAULT 'pcs',
  `notes` varchar(255) DEFAULT NULL,
  `duty_execution_ref` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `purchases_need_id_needs_id_fk` (`need_id`),
  KEY `purchases_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `purchases_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `purchases_need_id_needs_id_fk` FOREIGN KEY (`need_id`) REFERENCES `needs` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `settlements`
--

DROP TABLE IF EXISTS `settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `settlements` (
  `id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `debtor_id` varchar(255) NOT NULL,
  `creditor_id` varchar(255) NOT NULL,
  `amount` int(11) NOT NULL,
  `status` varchar(255) NOT NULL DEFAULT 'PENDING',
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `confirmed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `settlements_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `settlements_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `uid` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `password_salt` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `avatar_url` longtext DEFAULT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT 'member',
  `qris_payload` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  `username` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_uid_unique` (`uid`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_transactions` (
  `id` varchar(255) NOT NULL,
  `house_id` varchar(255) NOT NULL,
  `actor_id` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `amount` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `category` varchar(255) DEFAULT 'GENERAL',
  `created_at` timestamp NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `wallet_transactions_house_id_houses_id_fk` (`house_id`),
  CONSTRAINT `wallet_transactions_house_id_houses_id_fk` FOREIGN KEY (`house_id`) REFERENCES `houses` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-09-26 22:29:09
