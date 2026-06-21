import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'


export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    token: text('token').notNull().unique(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('session_user_id_idx').on(t.userId)],
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
    scope: text('scope'),
    idToken: text('id_token'),
    password: text('password'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('account_user_id_idx').on(t.userId),
    uniqueIndex('account_provider_unique').on(t.providerId, t.accountId),
  ],
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_identifier_idx').on(t.identifier)],
)

export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  theme: text('theme').notNull().default('system'),
  lyricsLanguage: text('lyrics_language').notNull().default('en-ko'),
  // 넓은 화면 보기 모드. 'default'=단일 컬럼, 'split'=2단(영상/자막), 'theater'=풀스크린(후속).
  viewMode: text('view_mode').notNull().default('default'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const playbackHistory = pgTable(
  'playback_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title'),
    artist: text('artist'),
    album: text('album'),
    fileName: text('file_name').notNull(),
    source: text('source').notNull().default('google_drive'),
    // 최근 재생은 "파일별 1행" 으로 관리한다(append-only 로그 아님). 재생 시
    // (user, source, provider_file_id) 로 upsert 하여 last_played_at 만 갱신하므로
    // provider_file_id 는 항상 존재해야 하고, 아래 unique index 가 dedup 을 보장한다.
    providerFileId: text('provider_file_id').notNull(),
    providerLrcFileId: text('provider_lrc_file_id'),
    mediaType: text('media_type'),
    durationSeconds: integer('duration_seconds'),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('playback_history_user_recent_idx').on(t.userId, t.lastPlayedAt),
    uniqueIndex('playback_history_user_file_unique').on(
      t.userId,
      t.source,
      t.providerFileId,
    ),
  ],
)

export const favorite = pgTable(
  'favorite',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    source: text('source').notNull().default('google_drive'),
    // 즐겨찾기는 항상 실제 Drive 파일을 가리킨다. NOT NULL 이라야 아래 unique
    // index 가 멱등성을 보장한다(Postgres 는 NULL 을 distinct 로 취급하므로
    // nullable 이면 중복 차단이 안 된다).
    providerFileId: text('provider_file_id').notNull(),
    providerLrcFileId: text('provider_lrc_file_id'),
    name: text('name'),
    mediaType: text('media_type'),
    mimeType: text('mime_type'),
    // 사용자가 지정한 표시 순서. 작을수록 위. 추가 시 (max+1) 로 끝에 붙고,
    // reorderFavorites 가 0..n-1 로 재배치한다.
    position: integer('position').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('favorite_user_position_idx').on(t.userId, t.position),
    uniqueIndex('favorite_user_provider_file_unique').on(
      t.userId,
      t.source,
      t.providerFileId,
    ),
  ],
)

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type UserPreferences = typeof userPreferences.$inferSelect
export type PlaybackHistory = typeof playbackHistory.$inferSelect
export type Favorite = typeof favorite.$inferSelect
