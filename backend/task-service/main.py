"""
Task Service - Handles tasks, projects, and teams.

Endpoints:
- Tasks: CRUD operations with permissions
- Projects: Create and manage projects
- Teams: Team management and membership
"""

from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import sys
import os
import json

# Add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import get_db, engine
from shared import models
from shared.auth_utils import decode_token
from schemas import (
    TaskCreate, TaskUpdate, TaskResponse,
    ProjectCreate, ProjectResponse,
    TeamCreate, TeamResponse, TeamMemberAdd
)
import redis

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Task Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Redis connection for pub/sub
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)


async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    """Extract and validate user from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authorization header"
        )
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    
    user_id = payload.get("user_id")
    user = db.query(models.User).filter(models.User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user


def publish_event(event_type: str, data: dict):
    """
    Publish events to Redis for WebSocket service to broadcast.
    
    This is the heart of the event-driven architecture.
    When something changes, other services can react.
    """
    message = {
        "type": event_type,
        "data": data
    }
    redis_client.publish("task_events", json.dumps(message))


def check_team_access(user_id: int, team_id: int, db: Session) -> bool:
    """Check if user has access to a team."""
    membership = db.query(models.team_members).filter(
        models.team_members.c.user_id == user_id,
        models.team_members.c.team_id == team_id
    ).first()
    return membership is not None


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "task"}


# ==================== TASK ENDPOINTS ====================

@app.get("/api/tasks", response_model=List[TaskResponse])
async def list_tasks(
    project_id: Optional[int] = None,
    status: Optional[models.TaskStatus] = None,
    assigned_to_me: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List tasks with filtering.
    
    Row-level security: Only returns tasks from projects 
    in teams the user belongs to.
    """
    # Base query with eager loading to avoid N+1 queries
    query = db.query(models.Task)\
        .join(models.Project)\
        .join(models.Team)\
        .join(models.team_members)\
        .filter(models.team_members.c.user_id == current_user.id)\
        .options(
            joinedload(models.Task.assignee),
            joinedload(models.Task.creator),
            joinedload(models.Task.project)
        )
    
    # Apply filters
    if project_id:
        query = query.filter(models.Task.project_id == project_id)
    
    if status:
        query = query.filter(models.Task.status == status)
    
    if assigned_to_me:
        query = query.filter(models.Task.assigned_to == current_user.id)
    
    tasks = query.order_by(models.Task.created_at.desc()).all()
    return tasks


@app.post("/api/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new task.
    
    Process:
    1. Check user has access to project
    2. Create task in database
    3. Publish event to Redis
    4. WebSocket service broadcasts to all connected clients
    """
    # Verify project access
    project = db.query(models.Project)\
        .join(models.Team)\
        .join(models.team_members)\
        .filter(
            models.Project.id == task_data.project_id,
            models.team_members.c.user_id == current_user.id
        ).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project"
        )
    
    # Create task
    db_task = models.Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status or models.TaskStatus.TODO,
        priority=task_data.priority or models.TaskPriority.MEDIUM,
        project_id=task_data.project_id,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
        due_date=task_data.due_date
    )
    
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Publish event for real-time updates
    publish_event("task_created", {
        "task_id": db_task.id,
        "project_id": db_task.project_id,
        "title": db_task.title,
        "created_by": current_user.full_name or current_user.email
    })
    
    # TODO: Trigger Celery task for AI analysis
    # analyze_task_with_ai.delay(db_task.id)
    
    return db_task


@app.get("/api/tasks/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single task with permission check."""
    task = db.query(models.Task)\
        .join(models.Project)\
        .join(models.Team)\
        .join(models.team_members)\
        .filter(
            models.Task.id == task_id,
            models.team_members.c.user_id == current_user.id
        )\
        .options(
            joinedload(models.Task.assignee),
            joinedload(models.Task.creator),
            joinedload(models.Task.project)
        )\
        .first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or access denied"
        )
    
    return task


@app.patch("/api/tasks/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update task with optimistic locking.
    
    Optimistic locking prevents lost updates when multiple users
    edit the same task simultaneously.
    """
    # Get task with permission check
    task = db.query(models.Task)\
        .join(models.Project)\
        .join(models.Team)\
        .join(models.team_members)\
        .filter(
            models.Task.id == task_id,
            models.team_members.c.user_id == current_user.id
        ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or access denied"
        )
    
    # Check version for optimistic locking
    if task_update.version and task.version != task_update.version:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Task was modified by another user. Please refresh and try again."
        )
    
    # Update fields
    update_data = task_update.model_dump(exclude_unset=True, exclude={'version'})
    for field, value in update_data.items():
        setattr(task, field, value)
    
    # Increment version
    task.version += 1
    
    db.commit()
    db.refresh(task)
    
    # Publish event
    publish_event("task_updated", {
        "task_id": task.id,
        "project_id": task.project_id,
        "updated_by": current_user.full_name or current_user.email,
        "changes": list(update_data.keys())
    })
    
    return task


@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete task (soft delete by setting status to archived)."""
    task = db.query(models.Task)\
        .join(models.Project)\
        .join(models.Team)\
        .join(models.team_members)\
        .filter(
            models.Task.id == task_id,
            models.team_members.c.user_id == current_user.id
        ).first()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found or access denied"
        )
    
    # Soft delete
    task.status = models.TaskStatus.ARCHIVED
    db.commit()
    
    # Publish event
    publish_event("task_deleted", {
        "task_id": task.id,
        "project_id": task.project_id
    })
    
    return None


# ==================== PROJECT ENDPOINTS ====================

@app.get("/api/projects", response_model=List[ProjectResponse])
async def list_projects(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all projects in user's teams."""
    projects = db.query(models.Project)\
        .join(models.Team)\
        .join(models.team_members)\
        .filter(
            models.team_members.c.user_id == current_user.id,
            models.Project.is_archived == False
        )\
        .options(joinedload(models.Project.team))\
        .all()
    
    return projects


@app.post("/api/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new project in a team."""
    # Check team access
    if not check_team_access(current_user.id, project_data.team_id, db):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this team"
        )
    
    db_project = models.Project(
        name=project_data.name,
        description=project_data.description,
        team_id=project_data.team_id,
        created_by=current_user.id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


# ==================== TEAM ENDPOINTS ====================

@app.get("/api/teams", response_model=List[TeamResponse])
async def list_teams(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all teams the user belongs to."""
    teams = db.query(models.Team)\
        .join(models.team_members)\
        .filter(models.team_members.c.user_id == current_user.id)\
        .options(joinedload(models.Team.members))\
        .all()
    
    return teams


@app.post("/api/teams", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
async def create_team(
    team_data: TeamCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new team with current user as owner."""
    db_team = models.Team(
        name=team_data.name,
        description=team_data.description,
        owner_id=current_user.id
    )
    
    db.add(db_team)
    db.flush()  # Get team.id without committing
    
    # Add creator as team member with owner role
    stmt = models.team_members.insert().values(
        team_id=db_team.id,
        user_id=current_user.id,
        role=models.TeamRole.OWNER
    )
    db.execute(stmt)
    
    db.commit()
    db.refresh(db_team)
    
    return db_team


@app.post("/api/teams/{team_id}/members")
async def add_team_member(
    team_id: int,
    member_data: TeamMemberAdd,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a member to a team (requires owner/admin role)."""
    # Check if user is owner or admin
    membership = db.query(models.team_members).filter(
        models.team_members.c.team_id == team_id,
        models.team_members.c.user_id == current_user.id,
        models.team_members.c.role.in_([models.TeamRole.OWNER, models.TeamRole.ADMIN])
    ).first()
    
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team owners/admins can add members"
        )
    
    # Check if user exists
    new_member = db.query(models.User).filter(
        models.User.email == member_data.email
    ).first()
    
    if not new_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Add member
    stmt = models.team_members.insert().values(
        team_id=team_id,
        user_id=new_member.id,
        role=member_data.role or models.TeamRole.MEMBER
    )
    
    try:
        db.execute(stmt)
        db.commit()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team"
        )
    
    return {"message": f"Added {new_member.email} to team"}

@app.get("/api/teams/{team_id}/members")
async def get_team_members(
    team_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of a team."""
    membership = db.query(models.team_members).filter(
        models.team_members.c.team_id == team_id,
        models.team_members.c.user_id == current_user.id
    ).first()
    
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No access")
    
    members = db.query(
        models.team_members.c.user_id, models.team_members.c.role, models.User
    ).join(models.User, models.User.id == models.team_members.c.user_id
    ).filter(models.team_members.c.team_id == team_id).all()
    
    return [{"user_id": m.user_id, "role": m.role, "user": {"id": m.User.id, "email": m.User.email, "full_name": m.User.full_name}} for m in members]

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)