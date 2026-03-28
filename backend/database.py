from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Float, ForeignKey, Text, Enum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import enum
from datetime import datetime

Base = declarative_base()

# Enums
class UserTier(str, enum.Enum):
    DEMO = "demo"
    GODINEZ = "godinez"
    EMPRESARIO = "empresario"
    SOVEREIGN = "sovereign"

class RegimenFiscal(str, enum.Enum):
    RESICO = "626"  # Régimen Simplificado de Confianza
    RIF = "605"     # Régimen de Incorporación Fiscal
    SUELDOS = "605_sueldos"  # Sueldos y Salarios e Ingresos Asimilados a Salarios
    MORAL_GENERAL = "601"  # General de Ley Personas Morales
    MORAL_NF = "603"  # Personas Morales con Fines no Lucrativos

class CFDITipo(str, enum.Enum):
    INGRESO = "I"
    EGRESO = "E"
    TRASLADO = "T"
    NOMINA = "N"
    PAGO = "P"

class CFDIStatus(str, enum.Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"
    CANCELLED = "cancelled"

class SubscriptionStatus(str, enum.Enum):
    TRIAL = "trial"
    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELLED = "cancelled"
    EXPIRED = "expired"

# Models
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    tier = Column(Enum(UserTier), default=UserTier.DEMO)
    
    # Demo tracking
    demo_started_at = Column(DateTime, default=datetime.utcnow)
    demo_expires_at = Column(DateTime)
    
    # Stripe
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    companies = relationship("Company", back_populates="owner")
    subscription = relationship("Subscription", back_populates="user", uselist=False)

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    status = Column(Enum(SubscriptionStatus), default=SubscriptionStatus.TRIAL)
    tier = Column(Enum(UserTier), default=UserTier.DEMO)
    
    # Pricing
    monthly_amount = Column(Float)
    setup_fee = Column(Float)
    currency = Column(String(3), default="MXN")
    
    # Periods
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    trial_end = Column(DateTime)
    
    # Stripe
    stripe_subscription_id = Column(String(255))
    stripe_price_id = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    user = relationship("User", back_populates="subscription")

class Company(Base):
    __tablename__ = "companies"
    
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    
    # SAT Info
    rfc = Column(String(13), unique=True, index=True, nullable=False)
    razon_social = Column(String(255), nullable=False)
    regimen_fiscal = Column(Enum(RegimenFiscal), nullable=False)
    
    # Contact
    nombre_comercial = Column(String(255))
    direccion = Column(JSON)
    
    # SAT Status
    sat_certified = Column(Boolean, default=False)
    sat_cert_data = Column(JSON)
    
    # Limits
    max_monthly_income = Column(Float)
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    owner = relationship("User", back_populates="companies")
    cfdis = relationship("CFDI", back_populates="company")
    declarations = relationship("Declaration", back_populates="company")

class CFDI(Base):
    __tablename__ = "cfdis"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    # CFDI Data
    uuid = Column(String(36), unique=True, index=True)
    folio = Column(String(50))
    serie = Column(String(50))
    tipo = Column(Enum(CFDITipo), nullable=False)
    
    # Emisor
    emisor_rfc = Column(String(13), nullable=False)
    emisor_nombre = Column(String(255))
    
    # Receptor
    receptor_rfc = Column(String(13), nullable=False)
    receptor_nombre = Column(String(255))
    
    # Financial
    subtotal = Column(Float, nullable=False)
    descuento = Column(Float, default=0)
    total = Column(Float, nullable=False)
    moneda = Column(String(3), default="MXN")
    tipo_cambio = Column(Float, default=1.0)
    
    # Taxes
    iva_trasladado = Column(Float, default=0)
    iva_retenido = Column(Float, default=0)
    isr_retenido = Column(Float, default=0)
    ieps_trasladado = Column(Float, default=0)
    ieps_retenido = Column(Float, default=0)
    
    # XML
    xml_content = Column(Text)
    xml_url = Column(String(500))
    
    # Status
    status = Column(Enum(CFDIStatus), default=CFDIStatus.PENDING)
    fecha_emision = Column(DateTime, nullable=False)
    fecha_timbrado = Column(DateTime)
    
    # AI Categorization
    category = Column(String(100))
    ai_metadata = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    company = relationship("Company", back_populates="cfdis")

class Declaration(Base):
    __tablename__ = "declarations"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    
    period = Column(String(7), nullable=False)  # YYYY-MM format
    tipo = Column(String(50), nullable=False)  # ISR, IVA, IEPS, etc.
    
    # Calculations
    ingresos = Column(Float, default=0)
    egresos = Column(Float, default=0)
    iva_cobrado = Column(Float, default=0)
    iva_pagado = Column(Float, default=0)
    isr_retenido = Column(Float, default=0)
    isr_a_cargo = Column(Float, default=0)
    isr_a_favor = Column(Float, default=0)
    
    # Status
    due_date = Column(DateTime, nullable=False)
    filed_at = Column(DateTime)
    filed_uuid = Column(String(36))
    status = Column(String(20), default="pending")  # pending, calculated, filed, paid
    
    # AI Recommendations
    ai_recommendations = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    company = relationship("Company", back_populates="declarations")

class TaxDocument(Base):
    __tablename__ = "tax_documents"
    
    id = Column(Integer, primary_key=True, index=True)
    company_id = Column(Integer, ForeignKey("companies.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    
    filename = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(50))  # pdf, xml, image
    
    # Processing
    processed = Column(Boolean, default=False)
    extracted_data = Column(JSON)
    ai_analysis = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)

class AIConversation(Base):
    __tablename__ = "ai_conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_id = Column(Integer, ForeignKey("companies.id"), nullable=True)
    
    title = Column(String(255))
    messages = Column(JSON, default=list)  # [{role, content, timestamp}]
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50))  # user, company, cfdi, etc.
    entity_id = Column(Integer)
    details = Column(JSON)
    
    created_at = Column(DateTime, default=datetime.utcnow)

# Database connection helper
def get_engine(database_url: str):
    return create_engine(database_url)

def get_session_local(engine):
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal
