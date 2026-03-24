export type MessageType = 'default' | 'reply' | 'user_join' | 'guild_boost' | 'chat_input_command'

export type DiscordStatus = 'online' | 'idle' | 'dnd' | 'offline' | 'streaming'

export type ActivityType = 'competing' | 'custom' | 'listening' | 'playing' | 'streaming' | 'watching'

export interface UserName {
  username: string
  displayName?: string
  globalName?: string
}

export interface User {
  userId: string
  firstSeen: string
  currentName?: UserName
  messageCount?: number
  voiceTimeMinutes?: number
}

export interface MessageActivity {
  messageId: string
  userId: string
  channelId: string
  messageType: MessageType
  hasAttachments: boolean
  hasEmbeds: boolean
  characterCount?: number
  sentAt: string
}

export interface VoiceSession {
  id: number
  userId: string
  channelId: string
  joinedAt: string
  leftAt?: string
  durationMinutes?: number
}

export interface ActivityLog {
  id: number
  userId: string
  activityType: ActivityType
  activityName: string
  startedAt: string
  endedAt?: string
  durationMinutes?: number
}

export interface PresenceStatusLog {
  id: number
  userId: string
  statusType: DiscordStatus
  setAt: string
  changedAt?: string
  durationMinutes?: number
}

export interface CustomStatus {
  id: number
  userId: string
  statusText?: string
  emoji?: string
  setAt: string
}

export interface ChannelStats {
  channelId: string
  totalMessages: number
  uniqueUsers: number
  mostActiveUserId?: string
}

export interface ServerStats {
  totalUsers: number
  totalMessages: number
  totalVoiceTimeHours: number
  totalActivities: number
  mostActiveChannelId?: string
  mostCommonActivity?: string
}

export interface UserStats {
  totalMessages: number
  totalVoiceTimeMinutes: number
  totalActivities: number
  mostActiveHour?: number
  favoriteActivity?: string
}
