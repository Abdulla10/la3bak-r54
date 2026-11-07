-- لعبك: additive room-creation security migration.
-- Apply explicitly to approved staging only; production requires separate approval.
-- No ALTER to existing rooms/room_members and no runtime auto-migration.
-- No foreign key to rooms: records are permanent idempotency tombstones.
-- Binary collation keeps actor IDs and request keys case-sensitive.
CREATE TABLE IF NOT EXISTS room_creation_keys (
  user_id      VARCHAR(64)  NOT NULL,
  request_key  VARCHAR(128) NOT NULL,
  fingerprint  CHAR(64)     NOT NULL,
  code         VARCHAR(5)   NOT NULL,
  created_at   BIGINT       NOT NULL,
  PRIMARY KEY (user_id, request_key),
  KEY idx_creation_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
