"""
Pydantic schemas for request/response validation.
These define the shape of data coming in and going out of API
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserCreate(BaseModel):
	"""Schema for user registration"""
	email: EmailStr
	password: str = Field(..., min_length=8, description="Password must be at least 8 characters long")
	full_name: Optional[str] = None

class UserLogin(BaseModel):
	"""Schema for user login"""
	email: EmailStr
	password: str 
	
class UserResponse(BaseModel):
	"""Schema for user info in responses"""
	id: int
	email: EmailStr
	full_name: Optional[str] = None
	avatar_url: Optional[str] = None
	is_active: bool
	created_at: datetime

	class Config:
		from_attributes = True

class TokenResponse(BaseModel):
	"""Schema for token response after login/refresh"""
	access_token: str
	refresh_token: str
	token_type: str = "bearer"
	user: UserResponse

class RefreshTokenRequest(BaseModel):
	"""Schema for refresh token request"""
	refresh_token: str
