"""
Shared authentication utilities for JWT token handling.
Used across all services for validating tokens.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from jose import jwt
from jose.exceptions import JWTError
from passlib.context import CryptContext
import bcrypt
import os


#JWT configuration
JWT_SECRET = os.getenv("JWT_SECRET", "to-be-set-in-production")	
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

def verify_password(plain_password: str, hashed_password: str) -> bool:
	"""Verify a plain password against its hashed version."""
	return bcrypt.checkpw(
		plain_password.encode('utf-8'),
		hashed_password.encode('utf-8')
	)

def get_password_hash(password:str) -> str:
	"""Hash a password for storing"""
	salt = bcrypt.gensalt()
	hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
	return hashed.decode('utf-8')

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
	"""
	Create a jwt access token

	Args:
		data (dict): payload data to encode (typically user_id, email)
		expires_delta (Optional[timedelta], optional): _description_. Defaults to None.

	Returns:
		str: encoded JWT token
	"""
	to_encode = data.copy()

	if expires_delta:
		expire = datetime.now(timezone.utc) + expires_delta
	else:
		expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
	
	to_encode.update({
		"exp": expire,
		"iat": datetime.now(timezone.utc),
		"type": "access"
	})

	encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
	return encoded_jwt

def create_refresh_token(data: dict) ->str:
	"""
	Create a jwt refresh token

	Args:
		data (dict): payload data to encode (typically user_id, email)

	Returns:
		str: encoded JWT refresh token
	"""
	to_encode = data.copy()
	expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
	to_encode.update({
		"exp": expire,
		"iat": datetime.now(timezone.utc),
		"type": "refresh"
	})

	encoded_jwt = jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)
	return encoded_jwt

def decode_token(token: str) -> Dict:
	"""
	Decode and validate a JWT token

	Args:
		token (str): JWT token to decode

	Returns:
		dict: decoded token payload if valid

	Raises:
		JWTError: if the token is invalid or expired
	"""
	try:
		payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
		return payload
	except JWTError as e:
		raise JWTError(f"Invalid token: {str(e)}")
	
def get_user_id_from_token(token: str) -> Optional[int]:
	"""
	Extract user_id from a valid JWT token

	Args:
		token (str): JWT token to decode
	Returns:
	    user_id if token is valid, else None
	"""
	payload = decode_token(token)
	if payload:
		return payload.get("user_id")
	return None

class TokenData:
	""" Structured token payload data"""

	def __init__(self, user_id: int, email: str, token_type: str = "access"):
		self.user_id = user_id
		self.email = email
		self.token_type = token_type
	
	def to_dict(self) -> dict:
		return {
			"user_id": self.user_id,
			"email": self.email
		}

