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

// ==================== KANBAN ====================

export const KANBAN_COLS: TaskStatus[] = ['todo', 'in_progress', 'in_review', 'done']


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
export interface KanbanColumn {
  id: TaskStatus; title: string; color: string; tasks: Task[]
}

// ==================== UI TYPES ====================

export interface KanbanColumn {
  id: TaskStatus
  title: string
  color: string
  tasks: Task[]
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, {label: string; color: string; bg: string; dot: string}> = {
  todo:        { label: 'To Do',       color: '#8A877E', bg: '#F5F4EF', dot: '#8A877E' },
  in_progress: { label: 'In Progress', color: '#1A56FF', bg: '#EEF2FF', dot: '#1A56FF' },
  in_review:   { label: 'In Review',   color: '#7C3AED', bg: '#F5F3FF', dot: '#7C3AED' },
  done:        { label: 'Done',        color: '#00C781', bg: '#F0FDF9', dot: '#00C781' },
  archived:    { label: 'Archived',    color: '#C8C5BB', bg: '#F5F4EF', dot: '#C8C5BB' },
}

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, {label: string; color: string; bg: string; dot: string}> = {
  low:    { label: 'Low',    color: '#8A877E', bg: '#F5F4EF', dot: '#C8C5BB' },
  medium: { label: 'Medium', color: '#FF9500', bg: '#FFF7ED', dot: '#FF9500' },
  high:   { label: 'High',   color: '#FF3B30', bg: '#FFF5F5', dot: '#FF3B30' },
  urgent: { label: 'Urgent', color: '#FF3B30', bg: '#FFF5F5', dot: '#FF3B30' },
}
