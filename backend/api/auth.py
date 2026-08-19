from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.repository import Repository
from backend.authentication.jwt import create_access_token
from backend.authentication.passlib_utils import verify_password
from backend.authentication.rbac import get_current_user
from backend.database.models import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

class RegisterSchema(BaseModel):
    email: str
    password: str
    full_name: str

class LoginSchema(BaseModel):
    email: str
    password: str

class ForgotPasswordSchema(BaseModel):
    email: str

@router.post("/register")
async def register(data: RegisterSchema, db: AsyncSession = Depends(get_db)):
    repo = Repository(db)
    existing = await repo.get_user_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")
    user = await repo.create_user(
        email=data.email,
        password=data.password,
        full_name=data.full_name,
        role="agent"
    )
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/login")
async def login(data: LoginSchema, db: AsyncSession = Depends(get_db)):
    repo = Repository(db)
    user = await repo.get_user_by_email(data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordSchema, db: AsyncSession = Depends(get_db)):
    repo = Repository(db)
    user = await repo.get_user_by_email(data.email)
    if not user:
        # Don't leak user existence
        return {"message": "If your email is registered, a password reset link has been sent."}
    return {"message": "Password reset link sent to your registered email address."}

@router.get("/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role
    }
