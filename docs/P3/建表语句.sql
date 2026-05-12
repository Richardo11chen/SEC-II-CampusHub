-- ============================================================
-- CampusHub 校园互助服务平台 — 核心建表语句
-- 数据库：MySQL 8.0+ / MariaDB 10.5+
-- 字符集：utf8mb4（支持中文、表情符号）
-- ============================================================

-- ============================================================
-- 1. User（用户）
-- ============================================================
CREATE TABLE `User` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '用户 ID',
    `student_id`      VARCHAR(10)     NOT NULL                COMMENT '学号（10 位数字，唯一）',
    `password_hash`   VARCHAR(255)    NOT NULL                COMMENT '密码 bcrypt 哈希',
    `nickname`        VARCHAR(20)     NOT NULL                COMMENT '昵称（1-20 字）',
    `name`            VARCHAR(20)     DEFAULT NULL            COMMENT '真实姓名（选填）',
    `college`         VARCHAR(50)     DEFAULT NULL            COMMENT '学院',
    `phone_encrypted` VARBINARY(255)  DEFAULT NULL            COMMENT '手机号 AES-256 加密存储',
    `email`           VARCHAR(100)    DEFAULT NULL            COMMENT '邮箱',
    `avatar`          VARCHAR(500)    DEFAULT NULL            COMMENT '头像 URL',
    `credit_score`    INT             NOT NULL DEFAULT 70     COMMENT '信用分（0-100，初始 70）',
    `role`            ENUM('student', 'admin') NOT NULL DEFAULT 'student' COMMENT '用户角色',
    `show_real_name`  TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否对外展示真实姓名',
    `status`          ENUM('正常', '已禁用') NOT NULL DEFAULT '正常' COMMENT '账号状态',
    `created_at`      DATETIME        NOT NULL                COMMENT '注册时间',
    `updated_at`      DATETIME        NOT NULL                COMMENT '更新时间',
    `last_login_at`   DATETIME        DEFAULT NULL            COMMENT '最后登录时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_student_id` (`student_id`),
    KEY `idx_nickname` (`nickname`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 索引说明：
--   uk_student_id — 学号唯一，用于登录查询
--   idx_nickname  — 支持按昵称搜索用户

-- 隐私数据处理说明：
--   1. password_hash：使用 bcrypt（cost=12）哈希，不可逆。绝不存储明文密码。
--   2. phone_encrypted：手机号使用 AES-256 加密后存入 VARBINARY，
--      应用层加解密，加密密钥由 KMS/环境变量管理，不写入数据库。
--      查询时按脱敏格式返回（如 138****1234）。
--   3. student_id：明文存储但 API 响应中脱敏展示（如 2024*****456）。
--   4. name（真实姓名）：受 show_real_name 字段控制，默认不对外展示。


-- ============================================================
-- 2. Demand（需求）
-- ============================================================
CREATE TABLE `Demand` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '需求 ID',
    `publisher_id`    INT             NOT NULL                COMMENT '发布者 ID（FK → User.id）',
    `title`           VARCHAR(100)    NOT NULL                COMMENT '需求标题',
    `description`     VARCHAR(2000)   NOT NULL                COMMENT '详细描述',
    `category`        ENUM('快递代取','学习辅导','二手交易','活动组队',
                           '失物招领','拼车拼单','找搭子','咨询答疑','其他')
                                        NOT NULL                COMMENT '需求分类',
    `location`        VARCHAR(200)    DEFAULT NULL            COMMENT '地点',
    `expected_time`   DATETIME        DEFAULT NULL            COMMENT '期望完成时间',
    `reward`          DECIMAL(6,2)    NOT NULL DEFAULT 0.00   COMMENT '报酬（0=无偿）',
    `status`          ENUM('开放','进行中','已完成','已关闭')
                                        NOT NULL DEFAULT '开放' COMMENT '需求状态',
    `is_urgent`       TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否紧急（置顶展示）',
    `is_anonymous`    TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否匿名发布',
    `version`         INT             NOT NULL DEFAULT 1      COMMENT '乐观锁版本号',
    `created_at`      DATETIME        NOT NULL                COMMENT '发布时间',
    `updated_at`      DATETIME        NOT NULL                COMMENT '更新时间',

    PRIMARY KEY (`id`),
    KEY `idx_publisher_id` (`publisher_id`),
    KEY `idx_category` (`category`),
    -- 复合索引覆盖列表页核心查询：WHERE status=? [AND category=?] ORDER BY created_at
    KEY `idx_status_created` (`status`, `created_at`),
    KEY `idx_status_category_created` (`status`, `category`, `created_at`),
    -- 全文索引支持关键词搜索（替代 LIKE %keyword% 全表扫描）
    FULLTEXT KEY `ft_title_description` (`title`, `description`),
    CONSTRAINT `fk_demand_publisher` FOREIGN KEY (`publisher_id`)
        REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='需求表';

-- 索引说明：
--   idx_publisher_id           — 外键索引，按发布者查询其发布的需求列表
--   idx_category               — 按分类筛选需求（列表页核心筛选条件）
--   idx_status_created         — 复合索引，覆盖「按状态筛选 + 按时间排序」的列表页默认查询
--   idx_status_category_created— 复合索引，覆盖「按状态+分类筛选 + 按时间排序」场景
--   ft_title_description       — 全文索引，支持关键词搜索标题和描述，避免全表扫描


-- ============================================================
-- 3. DemandImage（需求图片）
-- ============================================================
CREATE TABLE `DemandImage` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '图片 ID',
    `demand_id`       INT             NOT NULL                COMMENT '关联需求 ID（FK → Demand.id）',
    `url`             VARCHAR(500)    NOT NULL                COMMENT '图片 URL',
    `sort_order`      TINYINT         NOT NULL DEFAULT 0      COMMENT '排序序号',
    `created_at`      DATETIME        NOT NULL                COMMENT '上传时间',

    PRIMARY KEY (`id`),
    KEY `idx_demand_id` (`demand_id`),
    CONSTRAINT `fk_demand_image_demand` FOREIGN KEY (`demand_id`)
        REFERENCES `Demand` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='需求图片表';

-- 索引说明：
--   idx_demand_id — 外键索引，快速查询某个需求的所有图片


-- ============================================================
-- 4. Order（订单）
-- ============================================================
CREATE TABLE `Order` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '订单 ID',
    `demand_id`       INT             NOT NULL                COMMENT '关联需求 ID（FK → Demand.id，唯一）',
    `publisher_id`    INT             NOT NULL                COMMENT '需求方 ID（FK → User.id）',
    `provider_id`     INT             NOT NULL                COMMENT '服务方 ID（FK → User.id）',
    `status`          ENUM('进行中','待确认','已完成','已取消','纠纷中')
                                        NOT NULL                COMMENT '订单状态',
    `reward`          DECIMAL(6,2)    NOT NULL                COMMENT '报酬金额（从需求继承）',
    `is_paid`         TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否已付款',
    `version`         INT             NOT NULL DEFAULT 1      COMMENT '乐观锁版本号',
    `created_at`      DATETIME        NOT NULL                COMMENT '创建时间',
    `completed_at`    DATETIME        DEFAULT NULL            COMMENT '完成时间',
    `cancelled_at`    DATETIME        DEFAULT NULL            COMMENT '取消时间',
    `cancel_reason`   VARCHAR(500)    DEFAULT NULL            COMMENT '取消原因',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_demand_id` (`demand_id`),
    -- 复合索引：按需求方 + 状态筛选 + 按时间排序（覆盖 F17 接口 publisher 视角）
    KEY `idx_publisher_status_created` (`publisher_id`, `status`, `created_at`),
    -- 复合索引：按服务方 + 状态筛选 + 按时间排序（覆盖 F17 接口 provider 视角）
    KEY `idx_provider_status_created` (`provider_id`, `status`, `created_at`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_order_demand` FOREIGN KEY (`demand_id`)
        REFERENCES `Demand` (`id`),
    CONSTRAINT `fk_order_publisher` FOREIGN KEY (`publisher_id`)
        REFERENCES `User` (`id`),
    CONSTRAINT `fk_order_provider` FOREIGN KEY (`provider_id`)
        REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 索引说明：
--   uk_demand_id                 — 一个需求同时只能有一个活跃订单（唯一约束）
--   idx_publisher_status_created — 复合索引，覆盖「用户作为需求方」的订单列表查询
--   idx_provider_status_created  — 复合索引，覆盖「用户作为服务方」的订单列表查询
--   idx_status                   — 按状态筛选订单列表（管理员视角）


-- ============================================================
-- 5. Review（评价）
-- ============================================================
CREATE TABLE `Review` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '评价 ID',
    `order_id`        INT             NOT NULL                COMMENT '关联订单 ID（FK → Order.id）',
    `from_user_id`    INT             NOT NULL                COMMENT '评价者 ID（FK → User.id）',
    `to_user_id`      INT             NOT NULL                COMMENT '被评价者 ID（FK → User.id）',
    `rating`          TINYINT         NOT NULL                COMMENT '评分（1-5 星）',
    `content`         VARCHAR(1000)   DEFAULT NULL            COMMENT '文字评价内容',
    `created_at`      DATETIME        NOT NULL                COMMENT '评价时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_from_user` (`order_id`, `from_user_id`),
    -- idx_order_id 已由 uk_order_from_user 的左前缀覆盖，不再单独建索引
    KEY `idx_to_user_id` (`to_user_id`),
    CONSTRAINT `fk_review_order` FOREIGN KEY (`order_id`)
        REFERENCES `Order` (`id`),
    CONSTRAINT `fk_review_from_user` FOREIGN KEY (`from_user_id`)
        REFERENCES `User` (`id`),
    CONSTRAINT `fk_review_to_user` FOREIGN KEY (`to_user_id`)
        REFERENCES `User` (`id`),
    CONSTRAINT `ck_rating_range` CHECK (`rating` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='评价表';

-- 索引说明：
--   uk_order_from_user — 每个订单每个用户只能评价一次（业务约束），同时加速按 order_id 查询评价
--   idx_to_user_id     — 按被评价者聚合评价列表（用户主页展示，F20 接口）


-- ============================================================
-- 6. Notification（通知）
-- ============================================================
CREATE TABLE `Notification` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '通知 ID',
    `user_id`         INT             NOT NULL                COMMENT '接收用户 ID（FK → User.id）',
    `type`            ENUM('order_taken','order_completed','order_confirmed',
                           'order_cancelled','review_received','dispute_update')
                                        NOT NULL                COMMENT '通知类型',
    `title`           VARCHAR(200)    NOT NULL                COMMENT '通知标题',
    `content`         TEXT            NOT NULL                COMMENT '通知内容',
    `related_id`      INT             DEFAULT NULL            COMMENT '关联业务 ID（订单 ID / 需求 ID）',
    `is_read`         TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否已读',
    `created_at`      DATETIME        NOT NULL                COMMENT '创建时间',

    PRIMARY KEY (`id`),
    -- 复合索引覆盖核心查询：WHERE user_id=? AND is_read=? ORDER BY created_at DESC
    KEY `idx_user_read_created` (`user_id`, `is_read`, `created_at`),
    CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`)
        REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表';

-- 索引说明：
--   idx_user_read_created — 复合索引，覆盖「查某用户未读通知并按时间排序」的完整查询。
--                           三个单列索引无法被 MySQL 合并使用于同一个查询，必须建复合索引。
-- 性能注意：
--   通知表会持续增长。建议查询时附加 created_at > NOW() - INTERVAL 30 DAY 时间范围，
--   并定期归档已读超过 30 天的通知到历史表。


-- ============================================================
-- 7. Message（聊天消息）
-- ============================================================
CREATE TABLE `Message` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '消息 ID',
    `order_id`        INT             NOT NULL                COMMENT '所属订单 ID（FK → Order.id）',
    `sender_id`       INT             NOT NULL                COMMENT '发送者 ID（FK → User.id）',
    `content_type`    ENUM('text', 'image')
                                        NOT NULL DEFAULT 'text' COMMENT '消息类型',
    `content`         VARCHAR(2000)   NOT NULL                COMMENT '消息内容（文字或图片 URL）',
    `created_at`      DATETIME        NOT NULL                COMMENT '发送时间',

    PRIMARY KEY (`id`),
    KEY `idx_order_id` (`order_id`),
    KEY `idx_order_created` (`order_id`, `created_at`),
    CONSTRAINT `fk_message_order` FOREIGN KEY (`order_id`)
        REFERENCES `Order` (`id`),
    CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`)
        REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表';

-- 索引说明：
--   idx_order_id       — 外键索引
--   idx_order_created  — 复合索引，按时间线分页获取聊天记录（必走索引排序）
--                       覆盖最核心查询：WHERE order_id=? ORDER BY created_at


-- ============================================================
-- 8. Dispute（纠纷）
-- ============================================================
CREATE TABLE `Dispute` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '纠纷 ID',
    `order_id`        INT             NOT NULL                COMMENT '关联订单 ID（FK → Order.id，唯一）',
    `initiator_id`    INT             NOT NULL                COMMENT '申诉发起人 ID（FK → User.id）',
    `reason`          VARCHAR(2000)   NOT NULL                COMMENT '申诉理由',
    `evidence`        JSON            DEFAULT NULL            COMMENT '证据图片 URL 数组',
    `status`          ENUM('待处理', '已处理')
                                        NOT NULL DEFAULT '待处理' COMMENT '处理状态',
    `resolution`      VARCHAR(2000)   DEFAULT NULL            COMMENT '管理员处理结果',
    `created_at`      DATETIME        NOT NULL                COMMENT '申诉时间',
    `resolved_at`     DATETIME        DEFAULT NULL            COMMENT '处理时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_id` (`order_id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_dispute_order` FOREIGN KEY (`order_id`)
        REFERENCES `Order` (`id`),
    CONSTRAINT `fk_dispute_initiator` FOREIGN KEY (`initiator_id`)
        REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='纠纷申诉表';

-- 索引说明：
--   uk_order_id — 一个订单最多只能发起一个纠纷（唯一约束）
--   idx_status  — 快速筛选「待处理」纠纷（管理员后台核心视图）


-- ============================================================
-- 9. AdminApplication（管理员申请）
-- ============================================================
CREATE TABLE `AdminApplication` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '申请 ID',
    `user_id`         INT             NOT NULL                COMMENT '申请人 ID（FK → User.id，唯一）',
    `reason`          VARCHAR(2000)   NOT NULL                COMMENT '申请理由',
    `status`          ENUM('待审批', '已通过', '已拒绝')
                                        NOT NULL DEFAULT '待审批' COMMENT '审批状态',
    `reviewer_id`     INT             DEFAULT NULL            COMMENT '审批人 ID（FK → User.id）',
    `review_comment`  VARCHAR(500)    DEFAULT NULL            COMMENT '审批意见',
    `created_at`      DATETIME        NOT NULL                COMMENT '申请时间',
    `reviewed_at`     DATETIME        DEFAULT NULL            COMMENT '审批时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    CONSTRAINT `fk_application_user` FOREIGN KEY (`user_id`)
        REFERENCES `User` (`id`),
    CONSTRAINT `fk_application_reviewer` FOREIGN KEY (`reviewer_id`)
        REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员申请表';

-- 索引说明：
--   uk_user_id — 每个用户只能提交一个管理员申请（唯一约束）
--   idx_status — 快速筛选「待审批」申请（管理员后台）


-- ============================================================
-- 10. RefreshToken（刷新令牌）
-- ============================================================
CREATE TABLE `RefreshToken` (
    `id`              INT             NOT NULL AUTO_INCREMENT  COMMENT '记录 ID',
    `user_id`         INT             NOT NULL                COMMENT '用户 ID（FK → User.id）',
    `token_hash`      VARCHAR(255)    NOT NULL                COMMENT '刷新令牌 SHA-256 哈希',
    `expires_at`      DATETIME        NOT NULL                COMMENT '过期时间（7 天）',
    `is_revoked`      TINYINT(1)      NOT NULL DEFAULT 0      COMMENT '是否已撤销',
    `created_at`      DATETIME        NOT NULL                COMMENT '创建时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_token_hash` (`token_hash`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_expires_at` (`expires_at`),
    CONSTRAINT `fk_refresh_token_user` FOREIGN KEY (`user_id`)
        REFERENCES `User` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刷新令牌表';

-- 索引说明：
--   uk_token_hash  — 令牌哈希唯一，用于快速查找和校验
--   idx_user_id    — 撤销某个用户的所有令牌（账号禁用时使用）
--   idx_expires_at — 定时任务清理过期令牌（WHERE expires_at < NOW()）


-- ============================================================
-- 全局约束：信用分 CHECK
-- ============================================================
-- MySQL 8.0+ 支持 CHECK 约束，但需注意 ENUM 类型的兼容性。
-- 以下约束在 User 表之外独立声明，确保 credit_score 范围合规。
ALTER TABLE `User`
    ADD CONSTRAINT `ck_credit_score` CHECK (`credit_score` BETWEEN 0 AND 100);


-- ============================================================
-- 外键级联策略说明
-- ============================================================
-- User 表：不做物理删除（ON DELETE RESTRICT），仅通过 status='已禁用' 标记。
--         用户禁用时保留其发布的需求、订单、评价等历史记录。
--
-- Demand → Order：SET NULL 不合适。需求关闭时订单应继续存在（通过 status 标记）。
--                  不设 ON DELETE CASCADE，由应用层处理状态变更。
--
-- Demand → DemandImage：ON DELETE CASCADE，需求删除时关联图片记录一并删除（纯附属表）。
--
-- Order → Message/Review/Dispute：不设 CASCADE，订单标记为「已取消」而非物理删除。
--
-- 总结：除 DemandImage 外，所有外键行为均为默认（RESTRICT），
--       避免意外级联删除业务数据。所有「删除」操作均为逻辑删除（状态变更）。


-- ============================================================
-- 建表顺序说明
-- ============================================================
-- 1. User（无外键依赖）
-- 2. Demand（依赖 User）
-- 3. DemandImage（依赖 Demand，CASCADE 删除）
-- 4. Order（依赖 Demand + User×2）
-- 5. Review（依赖 Order + User×2）
-- 6. Notification（依赖 User）
-- 7. Message（依赖 Order + User）
-- 8. Dispute（依赖 Order + User）
-- 9. AdminApplication（依赖 User×2）
-- 10. RefreshToken（依赖 User）
