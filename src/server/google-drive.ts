import { createServerFn } from '@tanstack/react-start'
import { GOOGLE_DRIVE_READONLY_SCOPE } from '~/lib/google-drive'
import { detectMediaTypeByName, type MediaKind } from '~/lib/media-types'
import { requireUser } from './session'

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder'
const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

type DriveMediaType = MediaKind

export type GoogleDriveFolder = {
  id: string
  name: string
  mimeType: typeof DRIVE_FOLDER_MIME
  modifiedTime: string | null
}

export type GoogleDriveAsset = {
  id: string
  name: string
  mediaType: DriveMediaType
  mimeType: string
  sizeBytes: number
  modifiedTime: string | null
}

export type GoogleDriveListResult = {
  folders: GoogleDriveFolder[]
  assets: GoogleDriveAsset[]
  totalCount: number
  unsupportedCount: number
  nextPageToken: string | null
}

type DriveFile = {
  id?: string
  name?: string
  mimeType?: string
  size?: string
  modifiedTime?: string
}

const isListInput = (v: unknown): v is { folderId: string | null } => {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  return o.folderId === null || typeof o.folderId === 'string'
}

async function googleDriveError(res: Response, fallback: string): Promise<Response> {
  const body = (await res.json().catch(() => null)) as {
    error?: {
      message?: string
      status?: string
      details?: Array<{
        '@type'?: string
        reason?: string
        metadata?: { activationUrl?: string; serviceTitle?: string }
      }>
    }
  } | null
  const details = body?.error?.details ?? []
  const serviceDisabled = details.find(
    (d) => d.reason === 'SERVICE_DISABLED' && d.metadata?.activationUrl,
  )
  if (serviceDisabled?.metadata?.activationUrl) {
    return new Response(
      `Google Drive API가 비활성화되어 있습니다. Google Cloud Console에서 Drive API를 활성화한 뒤 몇 분 후 다시 시도하세요: ${serviceDisabled.metadata.activationUrl}`,
      { status: res.status },
    )
  }
  return new Response(body?.error?.message ?? fallback, { status: res.status })
}

function hasDriveScope(scope: string | null): boolean {
  if (!scope) return false
  return scope.split(/[,\s]+/).includes(GOOGLE_DRIVE_READONLY_SCOPE)
}

async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Response('Google OAuth is not configured', { status: 503 })
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    throw new Response('Google Drive 권한을 다시 연결해 주세요', { status: 401 })
  }

  const json = (await res.json()) as {
    access_token?: string
    expires_in?: number
    scope?: string
  }
  if (!json.access_token) {
    throw new Response('Google access token refresh failed', { status: 502 })
  }

  return {
    accessToken: json.access_token,
    accessTokenExpiresAt: new Date(Date.now() + (json.expires_in ?? 3600) * 1000),
    scope: json.scope,
  }
}

export async function getGoogleDriveAccessToken(userId: string): Promise<string> {
  const { db } = await import('./db/client')
  const { account } = await import('./db/schema')
  const { and, eq } = await import('drizzle-orm')

  const [row] = await db
    .select({
      id: account.id,
      accessToken: account.accessToken,
      refreshToken: account.refreshToken,
      accessTokenExpiresAt: account.accessTokenExpiresAt,
      scope: account.scope,
    })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'google')))
    .limit(1)

  if (!row) {
    throw new Response('Google 계정으로 다시 로그인해 주세요', { status: 401 })
  }
  if (!hasDriveScope(row.scope)) {
    throw new Response('Google Drive 권한이 필요합니다', { status: 403 })
  }

  const expiresAt = row.accessTokenExpiresAt?.getTime() ?? 0
  if (row.accessToken && expiresAt > Date.now() + 60_000) {
    return row.accessToken
  }
  if (!row.refreshToken) {
    throw new Response('Google Drive 권한을 다시 연결해 주세요', { status: 401 })
  }

  const refreshed = await refreshGoogleAccessToken(row.refreshToken)
  await db
    .update(account)
    .set({
      accessToken: refreshed.accessToken,
      accessTokenExpiresAt: refreshed.accessTokenExpiresAt,
      scope: refreshed.scope ?? row.scope,
    })
    .where(eq(account.id, row.id))

  return refreshed.accessToken
}

export const getGoogleDriveStatus = createServerFn({ method: 'GET' }).handler(
  async () => {
    const user = await requireUser()
    const { db } = await import('./db/client')
    const { account } = await import('./db/schema')
    const { and, eq } = await import('drizzle-orm')
    const [row] = await db
      .select({ scope: account.scope, refreshToken: account.refreshToken })
      .from(account)
      .where(and(eq(account.userId, user.id), eq(account.providerId, 'google')))
      .limit(1)
    return {
      connected: !!row,
      hasDriveScope: hasDriveScope(row?.scope ?? null),
      canRefresh: !!row?.refreshToken,
    }
  },
)

export const listGoogleDriveContents = createServerFn({ method: 'GET' })
  .inputValidator((data: unknown) => {
    if (!isListInput(data)) throw new Error('Invalid Google Drive list payload')
    return data
  })
  .handler(async ({ data }) => {
    const user = await requireUser()
    const token = await getGoogleDriveAccessToken(user.id)
    const parentId = data.folderId ?? 'root'
    const params = new URLSearchParams({
      q: `'${parentId.replace(/'/g, "\\'")}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType,size,modifiedTime)',
      orderBy: 'folder,name',
      pageSize: '200',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })

    const res = await fetch(`${DRIVE_API}/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      throw await googleDriveError(res, 'Google Drive 목록을 불러오지 못했습니다')
    }
    const json = (await res.json()) as {
      files?: DriveFile[]
      nextPageToken?: string
    }
    const folders: GoogleDriveFolder[] = []
    const assets: GoogleDriveAsset[] = []
    let totalCount = 0
    let unsupportedCount = 0

    for (const file of json.files ?? []) {
      if (!file.id || !file.name || !file.mimeType) continue
      totalCount++
      if (file.mimeType === DRIVE_FOLDER_MIME) {
        folders.push({
          id: file.id,
          name: file.name,
          mimeType: DRIVE_FOLDER_MIME,
          modifiedTime: file.modifiedTime ?? null,
        })
        continue
      }
      const mediaType = detectMediaTypeByName(file.name, file.mimeType)
      if (!mediaType) {
        unsupportedCount++
        continue
      }
      assets.push({
        id: file.id,
        name: file.name,
        mediaType,
        mimeType: file.mimeType,
        sizeBytes: Number(file.size ?? 0),
        modifiedTime: file.modifiedTime ?? null,
      })
    }

    return {
      folders,
      assets,
      totalCount,
      unsupportedCount,
      nextPageToken: json.nextPageToken ?? null,
    } satisfies GoogleDriveListResult
  })
