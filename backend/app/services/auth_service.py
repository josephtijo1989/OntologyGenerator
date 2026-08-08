from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models.domain import User
from app.repositories.user_repository import UserRepository
from app.configuration.security import verify_password, get_password_hash, create_access_token, create_refresh_token
from app.schemas.auth import UserCreate
from app.utilities.logger import logger


class AuthService:
    def __init__(self, db: Session):
        self.user_repo = UserRepository(db)

    def authenticate_user(self, username: str, password: str) -> Optional[User]:
        user = self.user_repo.get_by_username(username)
        if not user or not verify_password(password, user.hashed_password):
            return None
        return user

    def login(self, username: str, password: str) -> Optional[Tuple[str, str]]:
        user = self.authenticate_user(username, password)
        if not user or not user.is_active:
            return None
        roles = [r.name for r in user.roles]
        access_token = create_access_token(subject=user.id, roles=roles)
        refresh_token = create_refresh_token(subject=user.id)
        return access_token, refresh_token

    def register_user(self, user_in: UserCreate) -> User:
        existing = self.user_repo.get_by_username(user_in.username)
        if existing:
            raise ValueError("Username already registered")
        
        hashed_pwd = get_password_hash(user_in.password)
        new_user = User(
            username=user_in.username,
            email=user_in.email,
            hashed_password=hashed_pwd,
            full_name=user_in.full_name,
            is_active=True,
            is_superuser=False
        )
        return self.user_repo.create(new_user)
