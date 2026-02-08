"""
Shared models for the backend.
These models define the schema for PostgreSQL
"""

from datetime import datetime
from enum import Enum
from sqlalchemy import (
	Column, Integer, String, Text, Boolean, DateTime,
	ForeignKey, Table, Enum as SQLEnum, Index
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

Base = declarative_base()

#Enums
class TaskStatus(str, Enum):
	TODO = "todo"
	IN_PROGRESS = "in_progress"
	IN_REVIEW = "in_review"	
	DONE = "done"
	ARCHIVED = "archived"

class TaskPriority(str, Enum):
	LOW = "low"
	MEDIUM = "medium"
	HIGH = "high"
	URGENT = "urgent"

class TeamRole(str, Enum):
	OWNER = "owner"
	ADMIN = "admin"
	MEMBER = "member"
	VIEWER = "viewer"

#Association table for many-to-many relationship between Users and Teams
team_members = Table(
	'team_members',
	Base.metadata,
	Column('team_id', Integer, ForeignKey('teams.id', ondelete="CASCADE"), primary_key=True),
	Column('user_id', Integer, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True),
	Column('role', SQLEnum(TeamRole), nullable=False, default=TeamRole.MEMBER),
	Column('joined_at', DateTime, server_default=func.now()),
	Index('idx_team_members_user', 'user_id'),
	Index('idx_team_members_team', 'team_id')
)

#Models
class User(Base):
	__tablename__ = 'users'
	
	id = Column(Integer, primary_key=True, index=True)
	email = Column(String(255), unique=True, index=True, nullable=False)
	hashed_password = Column(String(255), nullable=False)
	full_name = Column(String(255))
	avatar_url = Column(String(500))
	is_active = Column(Boolean, default=True)
	is_superuser = Column(Boolean, default=False)
	created_at = Column(DateTime, server_default=func.now())
	updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

	#Relationships
	teams = relationship('Team', secondary=team_members, back_populates='members')
	owned_teams = relationship('Team', back_populates='owner', foreign_keys='Team.owner_id')
	created_projects = relationship('Projects', back_populates='creator', foreign_keys='Projects.created_by')
	assigned_tasks = relationship('Task',back_populates='assignee', foreign_keys='Task.assigned_to')
	created_tasks = relationship('Task', back_populates='creator', foreign_keys='Task.created_by')
	refresh_tokens = relationship('RefreshToken', back_populates='user', cascade="all, delete-orphan")
	comments = relationship('Comment', back_populates='user', cascade="all, delete-orphan")

	def __repr__(self):
		return f"<User(id={self.id}, email='{self.email}', full_name='{self.full_name}')>"
	

class RefreshToken(Base):
	__tablename__ = 'refresh_tokens'

	id = Column(Integer, primary_key=True, index=True)
	token_hash = Column(String(255), unique=True, index=True, nullable=False)
	user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
	expires_at = Column(DateTime, nullable=False)
	revoked = Column(Boolean, default=False)
	created_at = Column(DateTime, server_default=func.now())

	#Relationships
	user = relationship('User', back_populates='refresh_tokens')

	def __repr__(self):
		return f"<RefreshToken(id={self.id}, user_id={self.user_id}')>"
	

class Team(Base):
	__tablename__ = 'teams'

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False)
	description = Column(Text)
	owner_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
	created_at = Column(DateTime, server_default=func.now())
	updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

	#relationships
	owner = relationship('User', back_populates='owned_teams', foreign_keys=[owner_id])
	members = relationship('User', secondary=team_members, back_populates='teams')
	projects = relationship('Projects', back_populates='team', cascade="all, delete-orphan")

	def __repr__(self):
		return f"<Team(id={self.id}), name={self.name}'>"
	
class Projects(Base):
	__tablename__ = 'projects'

	id = Column(Integer, primary_key=True, index=True)
	name = Column(String(255), nullable=False)
	description = Column(Text)
	team_id = Column(Integer, ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
	created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'))
	is_archived = Column(Boolean, default=False)
	created_at = Column(DateTime, server_default=func.now())
	updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

	#Relationships
	team = relationship('Team', back_populates='projects')
	creator = relationship('User', back_populates='created_projects', foreign_keys=[created_by])
	tasks = relationship('Task', back_populates='project', cascade="all, delete-orphan")

	#indexes
	__table_args__ = (
		Index('idx_projects_team_id', 'team_id', 'is_archived'),
	)

	def __repr__(self):
		return f"<Projects(id={self.id}, name='{self.name}')>"
	
class Task(Base):
	__tablename__ = 'tasks'

	id = Column(Integer, primary_key=True, index=True)
	title = Column(String(500), nullable=False)
	description = Column(Text)
	status = Column(SQLEnum(TaskStatus), default=TaskStatus.TODO, nullable=False, index=True)
	priority = Column(SQLEnum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
	project_id = Column(Integer, ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
	assigned_to = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), index=True)
	created_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=False)
	due_date = Column(DateTime)
	completed_at = Column(DateTime)

	#optimistic locking
	version = Column(Integer, default=1, nullable=False)

	#AI generated fields
	ai_category = Column(String(100))
	ai_suggested_priority = Column(SQLEnum(TaskPriority))

	created_at = Column(DateTime, server_default=func.now())
	updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

	#Relationships
	project = relationship('Projects', back_populates='tasks')
	assignee = relationship('User', back_populates='assigned_tasks', foreign_keys=[assigned_to])
	creator = relationship('User', back_populates='created_tasks', foreign_keys=[created_by])
	comments = relationship('Comment', back_populates='task', cascade="all, delete-orphan")

	#indexes for common queries
	__table_args__ = (
		Index('idx_tasks_project_id', 'project_id', 'status'),
		Index('idx_tasks_assigned_to', 'assigned_to', 'status'),
		Index('idx_tasks_due_date', 'due_date')
	)

	def __repr__(self):
		return f"<Task(id={self.id}, title='{self.title}', status='{self.status}')>"
	

class Comment(Base):
	__tablename__ = 'comments'

	id = Column(Integer, primary_key=True, index=True)
	content = Column(Text, nullable=False)
	task_id = Column(Integer, ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False, index=True)
	user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
	created_at = Column(DateTime, server_default=func.now())
	updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

	#Relationships
	task = relationship('Task', back_populates='comments')
	user = relationship('User', back_populates='comments')

	def __repr__(self):
		return f"<Comment(id={self.id}, task_id={self.task_id}, user_id={self.user_id})>"
	

class UserPresence:
	"""
	Stored in Redis with key: presence:user:{user_id}
	TTL: 60 seconds (refreshed by heartbeat)

	Data structure:
	{
		"user_id": 123,
		"project_id": 456,
		"task_id": 789,
		"cursor_position": {"x": 100, "y": 200},
		"last_seen": "2024-06-01T12:34:56Z"
	}
	"""
	pass
