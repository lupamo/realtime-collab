// ==================== AUTH TYPES ====================

export interface User {
  id: number
  email: string
  full_name: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  full_name?: string
}

// ==================== TEAM TYPES ====================

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer'

export interface Team {
  id: number
  name: string
  description: string | null
  owner_id: number
  created_at: string
  updated_at: string
}

export interface TeamMember {
  team_id: number
  user_id: number
  role: TeamRole
  joined_at: string
  user?: User
}

export interface TeamCreate {
  name: string
  description?: string
}

// ==================== PROJECT TYPES ====================

export interface Project {
  id: number
  name: string
  description: string | null
  team_id: number
  created_by: number | null
  is_archived: boolean
  created_at: string
  updated_at: string
  team?: Team
}

export interface ProjectCreate {
  name: string
  description?: string
  team_id: number
}

// ==================== TASK TYPES ====================

export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'archived'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  project_id: number
  project?: Project
  assigned_to: number | null
  assignee?: User | null
  created_by: number
  creator?: User
  due_date: string | null
  completed_at: string | null
  version: number
  ai_category: string | null
  ai_suggested_priority: TaskPriority | null
  created_at: string
  updated_at: string
}

export interface TaskCreate {
  title: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  project_id: number
  assigned_to?: number
  due_date?: string
}

export interface TaskUpdate {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigned_to?: number | null
  due_date?: string | null
  version: number  // Required for optimistic locking
}

// ==================== WEBSOCKET TYPES ====================

export type WSMessageType =
  | 'task_created'
  | 'task_updated'
  | 'task_deleted'
  | 'user_joined'
  | 'user_left'
  | 'cursor_move'
  | 'presence'
  | 'join_project'
  | 'error'

export interface WSMessage {
  type: WSMessageType
  data: Record<string, unknown>
}

export interface PresenceUser {
  user_id: number
  full_name: string | null
  email: string
  project_id: number
  last_seen: string
}

// ==================== API TYPES ====================

export interface ApiError {
  detail: string | { msg: string; type: string }[]
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  size: number
}

// ==================== UI TYPES ====================

export interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
  tasks: Task[]
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string }> = {
  todo:        { label: 'To Do',       color: 'text-gray-400',   bg: 'bg-gray-400/10' },
  in_progress: { label: 'In Progress', color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  in_review:   { label: 'In Review',   color: 'text-purple-400', bg: 'bg-purple-400/10' },
  done:        { label: 'Done',        color: 'text-emerald-400',bg: 'bg-emerald-400/10' },
  archived:    { label: 'Archived',    color: 'text-gray-600',   bg: 'bg-gray-600/10' },
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; dot: string }> = {
  low:    { label: 'Low',    color: 'text-gray-400',   dot: 'bg-gray-400' },
  medium: { label: 'Medium', color: 'text-amber-400',  dot: 'bg-amber-400' },
  high:   { label: 'High',   color: 'text-orange-400', dot: 'bg-orange-400' },
  urgent: { label: 'Urgent', color: 'text-red-400',    dot: 'bg-red-400' },
}