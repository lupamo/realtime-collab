"""
Pydantic schemas for Task service
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from shared.models import TaskStatus, TaskPriority, TeamRole

class TaskCreate(BaseModel):
	"""Schema for creating a new task"""
	title: str = Field(..., min_length=1, max_length=500)
	description: Optional[str] = None
	status: Optional[TaskStatus] = None
	priority: Optional[TaskPriority] = None
	project_id: int
	assigned_to: Optional[int] = None
	due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
	"""Schema for updating a task"""
	title: Optional[str] = Field(None, min_length=1, max_length=500)
	description: Optional[str] = None
	status: Optional[TaskStatus] = None
	priority: Optional[TaskPriority] = None
	assigned_to: Optional[int] = None
	due_date: Optional[datetime] = None
	version: Optional[int] = None  # For optimistic locking

class UserBasic(BaseModel):
	"""Basic user info for responses"""
	id: int
	email: str
	full_name: Optional[str] = None

	class Config:
		from_attributes = True

class ProjectBasic(BaseModel):
	"""Basic project info for responses"""
	id: int
	name: str

	class Config:
		from_attributes = True

class TaskResponse(BaseModel):
    """Schema for task in responses."""
    id: int
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    project_id: int
    project: Optional[ProjectBasic] = None
    assigned_to: Optional[int] = None
    assignee: Optional[UserBasic] = None
    created_by: int
    creator: Optional[UserBasic] = None
    due_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    version: int
    ai_category: Optional[str] = None
    ai_suggested_priority: Optional[TaskPriority] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

#=======PROJECT SCHEMAS========	
class ProjectCreate(BaseModel):
	"""Schema for creating a project"""
	name: str = Field(..., min_length=1, max_length=255)
	description: Optional[str] = None
	team_id: int


class ProjectResponse(BaseModel):
	"""Schema for project in responses"""
	id: int
	name: str
	description: Optional[str] = None
	team_id: int
	created_by: Optional[int] = None
	is_archived: bool	
	created_at: datetime
	updated_at: datetime

	class Config:
		from_attributes = True

#=======TEAM SCHEMAS========
class TeamCreate(BaseModel):
	"""Schema for creating a team"""
	name: str = Field(..., min_length=1, max_length=255)
	description: Optional[str] = None

class TeamMemberAdd(BaseModel):
	"""Schema for adding a member to a team"""
	email: str
	role: Optional[TeamRole] = TeamRole.MEMBER

class TeamResponse(BaseModel):
	"""Schema for team in responses"""
	id: int
	name: str
	description: Optional[str] = None
	owner_id: int
	created_at: datetime
	updated_at: datetime

	class Config:
		from_attributes = True
