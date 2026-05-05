import {
  bigint,
  boolean,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  type AnyPgColumn,
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
  volume: real('volume').notNull().default(0.8),
  theme: text('theme').notNull().default('system'),
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
    durationSeconds: integer('duration_seconds'),
    lastPlayedAt: timestamp('last_played_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('playback_history_user_recent_idx').on(t.userId, t.lastPlayedAt)],
)

export const folder = pgTable(
  'folder',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id').references((): AnyPgColumn => folder.id, {
      onDelete: 'cascade',
    }),
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('folder_user_parent_idx').on(t.userId, t.parentId),
    unique('folder_user_parent_name_unique')
      .on(t.userId, t.parentId, t.name)
      .nullsNotDistinct(),
  ],
)

export const mediaAsset = pgTable(
  'media_asset',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    folderId: text('folder_id').references(() => folder.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    mediaType: text('media_type').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    blobUrl: text('blob_url').notNull(),
    blobPathname: text('blob_pathname').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('media_asset_user_folder_idx').on(t.userId, t.folderId),
    index('media_asset_user_recent_idx').on(t.userId, t.createdAt),
  ],
)

export type User = typeof user.$inferSelect
export type Session = typeof session.$inferSelect
export type UserPreferences = typeof userPreferences.$inferSelect
export type PlaybackHistory = typeof playbackHistory.$inferSelect
export type Folder = typeof folder.$inferSelect
export type MediaAsset = typeof mediaAsset.$inferSelect
