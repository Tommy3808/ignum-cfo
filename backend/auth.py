from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pydantic import BaseModel
import os

# Security config
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Schemas
class Token(BaseModel):
    access_token: str
    token_type: str
    expires_at: datetime
    user_id: int
    tier: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    first_name: str
    last_name: str
    phone: Optional[str] = None

class UserOut(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: Optional[str]
    tier: str
    is_active: bool
    demo_expires_at: Optional[datetime]
    created_at: datetime

class CompanyCreate(BaseModel):
    rfc: str
    razon_social: str
    regimen_fiscal: str
    nombre_comercial: Optional[str] = None

class CompanyOut(BaseModel):
    id: int
    rfc: str
    razon_social: str
    regimen_fiscal: str
    nombre_comercial: Optional[str]
    sat_certified: bool
    is_active: bool
    created_at: datetime

class CFDIUpload(BaseModel):
    xml_content: str

class CFDIOut(BaseModel):
    id: int
    uuid: str
    folio: Optional[str]
    tipo: str
    emisor_rfc: str
    emisor_nombre: Optional[str]
    receptor_rfc: str
    receptor_nombre: Optional[str]
    total: float
    subtotal: float
    iva_trasladado: float
    fecha_emision: datetime
    status: str
    category: Optional[str]
    created_at: datetime

class DeclarationOut(BaseModel):
    id: int
    period: str
    tipo: str
    ingresos: float
    egresos: float
    iva_cobrado: float
    iva_pagado: float
    isr_a_cargo: float
    due_date: datetime
    status: str

class SubscriptionOut(BaseModel):
    id: int
    status: str
    tier: str
    monthly_amount: Optional[float]
    current_period_end: Optional[datetime]
    trial_end: Optional[datetime]

# Helper functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt, expire

def decode_token(token: str) -> TokenData:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if email is None:
            raise JWTError
        return TokenData(email=email, user_id=user_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends):
    from database import User
    
    token_data = decode_token(token)
    user = db.query(User).filter(User.email == token_data.email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_current_active_user(current_user = Depends(get_current_user)):
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def check_demo_access(user):
    """Check if demo user still has access"""
    from database import UserTier, SubscriptionStatus
    
    if user.tier == UserTier.DEMO:
        if user.demo_expires_at and datetime.utcnow() > user.demo_expires_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Demo period has expired. Please subscribe to continue."
            )
    return True
