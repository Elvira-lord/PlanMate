-- PlanMate Database Schema
-- Generated from Prisma schema (backend/prisma/schema.prisma)
-- Database: MySQL / MariaDB with utf8mb4

CREATE DATABASE IF NOT EXISTS planmate DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE planmate;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS daily_plans;
DROP TABLE IF EXISTS long_task_checkins;
DROP TABLE IF EXISTS long_tasks;
DROP TABLE IF EXISTS today_tasks;
DROP TABLE IF EXISTS users;

-- ============================================================
-- Table: users
-- ============================================================
CREATE TABLE users (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  username    VARCHAR(50)     NOT NULL,
  email       VARCHAR(100)    NOT NULL,
  password    VARCHAR(255)    NOT NULL,
  avatar      VARCHAR(255)    DEFAULT NULL,
  role        VARCHAR(20)     NOT NULL DEFAULT 'user',
  ai_prompt   VARCHAR(255)    NOT NULL DEFAULT '你是一个待办事项助手，帮用户合理安排任务',
  ai_provider VARCHAR(50)     DEFAULT NULL,
  ai_model    VARCHAR(100)    DEFAULT NULL,
  ai_base_url VARCHAR(255)    DEFAULT NULL,
  ai_api_key  VARCHAR(255)    DEFAULT NULL,
  created_at  DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: today_tasks
-- ============================================================
CREATE TABLE today_tasks (
  id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id          BIGINT UNSIGNED NOT NULL,
  title            VARCHAR(100)    NOT NULL,
  description      TEXT            DEFAULT NULL,
  priority         VARCHAR(10)     NOT NULL,
  is_completed     TINYINT(1)      NOT NULL DEFAULT 0,
  task_date        DATE            NOT NULL,
  original_date    DATE            NOT NULL,
  carry_over_count INT UNSIGNED    NOT NULL DEFAULT 0,
  sort_order       INT             NOT NULL DEFAULT 0,
  source           VARCHAR(10)     NOT NULL,
  created_at       DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_today_tasks_user_date (user_id, task_date),
  KEY idx_today_tasks_user_completed (user_id, is_completed),
  CONSTRAINT fk_today_tasks_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: long_tasks
-- ============================================================
CREATE TABLE long_tasks (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      BIGINT UNSIGNED NOT NULL,
  title        VARCHAR(100)    NOT NULL,
  description  TEXT            DEFAULT NULL,
  priority     VARCHAR(10)     NOT NULL,
  is_completed TINYINT(1)      NOT NULL DEFAULT 0,
  start_date   DATE            NOT NULL,
  source       VARCHAR(10)     NOT NULL,
  created_at   DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_long_tasks_user_completed (user_id, is_completed),
  CONSTRAINT fk_long_tasks_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: long_task_checkins (每日打卡记录)
-- ============================================================
CREATE TABLE long_task_checkins (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  long_task_id BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  check_date   DATE            NOT NULL,
  created_at   DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY idx_long_task_checkin_unique (long_task_id, check_date),
  KEY idx_long_task_checkins_user_date (user_id, check_date),
  CONSTRAINT fk_long_task_checkins_long_task_id FOREIGN KEY (long_task_id) REFERENCES long_tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_long_task_checkins_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Table: daily_plans (每日计划)
-- ============================================================
CREATE TABLE daily_plans (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  long_task_id BIGINT UNSIGNED NOT NULL,
  user_id      BIGINT UNSIGNED NOT NULL,
  content      VARCHAR(255)    NOT NULL,
  plan_date    DATE            NOT NULL,
  is_completed TINYINT(1)      NOT NULL DEFAULT 0,
  created_at   DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME(0)     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_daily_plans_user_date (user_id, plan_date),
  KEY idx_daily_plans_long_task (long_task_id),
  CONSTRAINT fk_daily_plans_long_task_id FOREIGN KEY (long_task_id) REFERENCES long_tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_daily_plans_user_id FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
