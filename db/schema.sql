-- لعبك: مخطط MariaDB / MySQL
-- لا توجد جداول مستخدمين ولا حسابات. هوية اللاعب جلسة موقّعة في كوكي،
-- والبوتات ما تنحفظ كمستخدمين أبداً (تظهر فقط داخل بيانات الغرفة).

CREATE TABLE IF NOT EXISTS rooms (
  code        CHAR(5)      NOT NULL,
  host_id     CHAR(36)     NOT NULL,
  status      VARCHAR(16)  NOT NULL,
  revision    INT UNSIGNED NOT NULL,
  updated_at  BIGINT       NOT NULL,
  data        LONGTEXT     NOT NULL,
  PRIMARY KEY (code),
  KEY idx_rooms_status (status),
  KEY idx_rooms_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_members (
  code     CHAR(5)  NOT NULL,
  user_id  CHAR(36) NOT NULL,
  PRIMARY KEY (code, user_id),
  KEY idx_members_user (user_id),
  CONSTRAINT fk_members_room FOREIGN KEY (code) REFERENCES rooms (code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Server-only idempotency records; deliberately no room FK (deletion keeps tombstones).
CREATE TABLE IF NOT EXISTS room_creation_keys (
  user_id      VARCHAR(64)  NOT NULL,
  request_key  VARCHAR(128) NOT NULL,
  fingerprint  CHAR(64)     NOT NULL,
  code         VARCHAR(5)   NOT NULL,
  created_at   BIGINT       NOT NULL,
  PRIMARY KEY (user_id, request_key),
  KEY idx_creation_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
