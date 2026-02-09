"""
Database connection and session management.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

#Database url from environment variable
DATABASE_URL = os.getenv(
	"DATABASE_URL",
	"postgresql://postgres:postgres@localhost:5432/collab_platform"
)

#create engine
#pool_pre_ping=True ensures that connections are checked before use and replaced if stale
engine = create_engine(
	DATABASE_URL,
	pool_pre_ping=True,
	pool_size=10,
	max_overflow=20
)

#session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
	"""
	Dependency for getting database session
	Usage in endpoints:
		@app.get("/users")
		def get_users(db: Session = Depends(get_db)):
			return db.query(User).all()
	This session is automatically closed after request is done.
	"""
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()
