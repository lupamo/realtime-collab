"""
Auth service - Handles authentication and authorization for the application.
Endpoints:
- POST auth/register: Register a new user.
- POST /auth/login - login and get tokens
- POST /auth/refresh - Refresh access token
- GET /auth/me - Get current user info
- POST /auth/logout -  Logout(Revoke refresh token)
- POST /auth/verify - Verify token (used by other services)
"""
from fastapi import FastAPI, Depends, HTTPException, status, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import sys
import os

#add shared module to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from database import get_db, engine
from shared import models
from shared.auth_utils import (
	verify_password,
	get_password_hash,
	create_access_token,
	create_refresh_token,
	decode_token,
	TokenData,
)
from schemas import (
	UserCreate,
	UserLogin,
	TokenResponse,
	UserResponse,
	RefreshTokenRequest,
)
from datetime import datetime, timedelta, timezone
import hashlib

#create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Auth Service", version="1.0.0")

#CORS middleware
app.add_middleware(
	CORSMiddleware,
	allow_origins=["http://localhost:3001", "http://localhost:3000"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

#Dependency to get current user from token
async def get_current_user(
		authorization: Optional[str] = Header(None),
		db: Session = Depends(get_db)
) -> models.User:
	"""
	 Validate JWT token and return current user.
	 Used as dependency in protected endpoints.
	"""

	if not authorization or not authorization.startswith("Bearer "):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Missing or invalid Authorization header",
			headers={"WWW-Authenticate": "Bearer"},
		)
	token = authorization.replace("Bearer ", "")
	payload = decode_token(token)

	if not payload or payload.get("type") != "access":
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid token",
			headers={"WWW-Authenticate": "Bearer"},
		)
	user_id = payload.get("user_id")
	if not user_id:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid token payload"
		)
	user = db.query(models.User).filter(models.User.id == user_id).first()
	if not user or not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="User not found or inactive"
		)
	return user

@app.get("/health")
async def health_check():
	"""Health check endpoint"""
	return {"status": "healthy", "service": "auth"}

@app.post("/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
	"""
	Register a new user account
	Process:
	1. Check if user with the same email already exists
	2. Hash the password
	3. Create user record in the database
	4. Return user info (no token yet muust be logged in to get tokens)
	"""
	#check if user already exists
	existing_user = db.query(models.User).filter(
		models.User.email == user_data.email
	).first()

	if existing_user:
		raise HTTPException(
			status_code=status.HTTP_400_BAD_REQUEST,
			detail="Email already registered"
		)
	
	#create new user
	db_user = models.User(
		email=user_data.email,
		hashed_password=get_password_hash(user_data.password),
		full_name=user_data.full_name,
	)

	db.add(db_user)
	db.commit()
	db.refresh(db_user)

	return db_user

@app.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
	"""
	User login endpoint
	Process:
	1. Find user by email
	2. Verify password with bcrypt
	3. Create access tokens (15 min expiry) and refresh token (7 day expiry)
	4. Store refresh token hash in database 
	5. Return tokens to client
	"""
	user = db.query(models.User).filter(models.User.email == user_data.email).first()
	if not user or not verify_password(user_data.password, user.hashed_password):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid email or password",
			headers={"WWW-Authenticate": "Bearer"},
		)
	if not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_403_FORBIDDEN,
			detail="User account is inactive"
		)
	
	token_data = TokenData(user_id=user.id, email=user.email)
	access_token = create_access_token(token_data.to_dict())
	refresh_token = create_refresh_token(token_data.to_dict())

	#store refresh token hash in database
	token_hash = hashlib.sha256(refresh_token.encode()).hexdigest()
	db_refresh_token = models.RefreshToken(
		token_hash=token_hash,
		user_id=user.id,
		expires_at=datetime.now(timezone.utc) + timedelta(days=7)
	)
	db.add(db_refresh_token)
	db.commit()

	return {
		"access_token": access_token,
		"refresh_token": refresh_token,
		"token_type": "bearer",
		"user": user
	}

@app.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
	refresh_request: RefreshTokenRequest,
	db: Session = Depends(get_db)
):
	"""
	Get new access token using refresh token
	Process:
	1. Decode refresh token
	2. check token hash exists in DB and not revoked or expired
	3. Generate mew access token
	4. Return new access token(same refresh token)
	"""
	payload = decode_token(refresh_request.refresh_token)

	if not payload or payload.get("type") != "refresh":
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Invalid refresh token"
		)
	user_id = payload.get("user_id")
	token_hash = hashlib.sha256(refresh_request.refresh_token.encode()).hexdigest()

	#check if refresh token exists and is valid
	db_token = db.query(models.RefreshToken).filter(
		models.RefreshToken.token_hash == token_hash,
		models.RefreshToken.user_id == user_id,
		models.RefreshToken.revoked == False,
		models.RefreshToken.expires_at > datetime.now(timezone.utc)
	).first()

	if not db_token:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Refresh token not found or invalid"
		)
	#get user
	user = db.query(models.User).filter(models.User.id == user_id).first()
	if not user or not user.is_active:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="User not found or inactive"
		)
	#Create new access token
	token_data = TokenData(user_id=user.id, email=user.email)
	access_token = create_access_token(token_data.to_dict())

	return {
		"access_token": access_token,
		"refresh_token": refresh_request.refresh_token,  #same refresh token
		"token_type": "bearer",
		"user": user
	}

@app.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: models.User = Depends(get_current_user)):
	"""
	Get current user info endpoint
	Requires valid access token in Authorization header
	Returns user info (email, full name, etc.)
	"""
	return current_user

@app.post("/auth/logout")
async def logout(
	refresh_request: RefreshTokenRequest,
	current_user: models.User = Depends(get_current_user),
	db: Session = Depends(get_db)
):
	"""
	Logout user by revoking redfresh token
	Frontend should also clear stored tokens on logout
	"""
	token_hash = hashlib.sha256(refresh_request.refresh_token.encode()).hexdigest()
	db_token = db.query(models.RefreshToken).filter(
		models.RefreshToken.token_hash == token_hash,
		models.RefreshToken.user_id == current_user.id
	).first()

	if db_token:
		db_token.revoked = True
		db.commit()
	
	return {"message": "Successfully logged out"}

@app.post("/auth/verify")
async def verify_token(
	authorization: Optional[str] = Header(None),
	db: Session = Depends(get_db)
):
	"""
	Verify token and return user info.
    Used by other microservices to validate tokens.
    
    This endpoint allows other services to check if a token is valid
    without needing to decode it themselves.
	"""
	try:
		user = await get_current_user(authorization, db)
		return {
			"valid": True,
			"user_id": user.id,
			"email": user.email,
			"is_active": user.is_active,
		}
	except HTTPException:
		return {"valid": False}

if __name__ == "__main__":
	import uvicorn
	uvicorn.run(app, host="0.0.0.0", port=8000)
