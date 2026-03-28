"""
OTP/Magic Link System - FASE 1: Captura y Cobro
Sistema de verificación sin passwords tradicionales
"""

from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import hashlib
import re
from typing import Optional, Tuple
from pydantic import BaseModel, EmailStr
import resend
import os

# Resend API configuration
RESEND_API_KEY = os.getenv('RESEND_API_KEY', '')
EMAIL_FROM = os.getenv('EMAIL_FROM', 'noreply@ignum.cfo')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'https://ignum-cfo.vercel.app')


class OTPRequest(Base):
    """Solicitudes de OTP/Magic Link"""
    __tablename__ = 'otp_requests'
    __table_args__ = {'schema': 'ignis_core'}
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, index=True)
    codigo_otp = Column(String(255), nullable=False)  # Hash del código
    token_magic = Column(String(255), unique=True, index=True)  # Token para magic link
    
    # Propósito
    proposito = Column(String(50), default='LOGIN')  # LOGIN, REGISTRO, RECOVERY
    
    # Estado
    usado = Column(Boolean, default=False)
    intentos = Column(Integer, default=0)
    max_intentos = Column(Integer, default=3)
    
    # Expiración
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    expira_en = Column(DateTime(timezone=True), nullable=False)
    usado_en = Column(DateTime(timezone=True))
    
    # Metadata
    ip_address = Column(String(45))
    user_agent = Column(Text)
    
    @classmethod
    def generar_codigo(cls, length: int = 6) -> str:
        """Genera código OTP numérico"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(length)])
    
    @classmethod
    def generar_token_magic(cls) -> str:
        """Genera token para magic link"""
        return secrets.token_urlsafe(32)
    
    @classmethod
    def hash_codigo(cls, codigo: str) -> str:
        """Hashea el código para almacenamiento seguro"""
        return hashlib.sha256(f"{codigo}:ignum-salt-v1".encode()).hexdigest()
    
    def verificar_codigo(self, codigo: str) -> bool:
        """Verifica si el código proporcionado es válido"""
        if self.usado or datetime.utcnow() > self.expira_en:
            return False
        if self.intentos >= self.max_intentos:
            return False
        
        self.intentos += 1
        return self.hash_codigo(codigo) == self.codigo_otp


class EmailVerification(Base):
    """Verificación de email para nuevos registros"""
    __tablename__ = 'email_verifications'
    __table_args__ = {'schema': 'ignis_core'}
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False)
    verificado = Column(Boolean, default=False)
    
    creado_en = Column(DateTime(timezone=True), server_default=func.now())
    expira_en = Column(DateTime(timezone=True), nullable=False)
    verificado_en = Column(DateTime(timezone=True))
    
    # Datos de pre-registro
    datos_registro = Column(Text)  # JSON con datos del usuario


# Schemas Pydantic
class OTPRequestInput(BaseModel):
    email: EmailStr
    proposito: str = "LOGIN"  # LOGIN, REGISTRO
    
class OTPVerifyInput(BaseModel):
    email: EmailStr
    codigo: str
    
class MagicLinkInput(BaseModel):
    token: str
    
class EmailVerificationInput(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: Optional[str] = None


class OTPEngine:
    """Motor de OTP y Magic Links"""
    
    def __init__(self, db: Session):
        self.db = db
        resend.api_key = RESEND_API_KEY
    
    def solicitar_otp(self, email: str, proposito: str = "LOGIN",
                      ip_address: Optional[str] = None,
                      user_agent: Optional[str] = None) -> Tuple[str, str]:
        """
        Genera y envía OTP + Magic Link
        
        Returns:
            Tuple(codigo_otp, token_magic) - Solo para testing, en prod no retorna código
        """
        # Normalizar email
        email = email.lower().strip()
        
        # Invalidar OTPs previos del mismo email
        self.db.query(OTPRequest).filter(
            OTPRequest.email == email,
            OTPRequest.usado == False
        ).update({"usado": True})
        
        # Generar nuevos códigos
        codigo = OTPRequest.generar_codigo()
        token_magic = OTPRequest.generar_token_magic()
        
        # Crear registro
        otp = OTPRequest(
            email=email,
            codigo_otp=OTPRequest.hash_codigo(codigo),
            token_magic=token_magic,
            proposito=proposito,
            expira_en=datetime.utcnow() + timedelta(minutes=10),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(otp)
        self.db.commit()
        
        # Enviar email
        self._enviar_email_otp(email, codigo, token_magic, proposito)
        
        return codigo, token_magic
    
    def verificar_otp(self, email: str, codigo: str) -> Optional[OTPRequest]:
        """Verifica código OTP"""
        email = email.lower().strip()
        
        otp = self.db.query(OTPRequest).filter(
            OTPRequest.email == email,
            OTPRequest.usado == False,
            OTPRequest.expira_en > datetime.utcnow()
        ).order_by(OTPRequest.creado_en.desc()).first()
        
        if not otp:
            return None
        
        if otp.verificar_codigo(codigo):
            otp.usado = True
            otp.usado_en = datetime.utcnow()
            self.db.commit()
            return otp
        
        self.db.commit()  # Guardar intentos
        return None
    
    def verificar_magic_link(self, token: str) -> Optional[OTPRequest]:
        """Verifica token de magic link"""
        otp = self.db.query(OTPRequest).filter(
            OTPRequest.token_magic == token,
            OTPRequest.usado == False,
            OTPRequest.expira_en > datetime.utcnow()
        ).first()
        
        if otp:
            otp.usado = True
            otp.usado_en = datetime.utcnow()
            self.db.commit()
            return otp
        
        return None
    
    def iniciar_verificacion_registro(self, data: EmailVerificationInput) -> str:
        """
        Inicia proceso de verificación para nuevo registro
        Retorna token de verificación
        """
        email = data.email.lower().strip()
        
        # Invalidar verificaciones previas
        self.db.query(EmailVerification).filter(
            EmailVerification.email == email
        ).delete()
        
        import json
        token = secrets.token_urlsafe(32)
        
        verification = EmailVerification(
            email=email,
            token=token,
            expira_en=datetime.utcnow() + timedelta(hours=24),
            datos_registro=json.dumps(data.dict())
        )
        
        self.db.add(verification)
        self.db.commit()
        
        # Enviar email de verificación
        self._enviar_email_verificacion(email, token)
        
        return token
    
    def verificar_email(self, token: str) -> Optional[EmailVerification]:
        """Verifica email con token"""
        verification = self.db.query(EmailVerification).filter(
            EmailVerification.token == token,
            EmailVerification.verificado == False,
            EmailVerification.expira_en > datetime.utcnow()
        ).first()
        
        if verification:
            verification.verificado = True
            verification.verificado_en = datetime.utcnow()
            self.db.commit()
            return verification
        
        return None
    
    def _enviar_email_otp(self, email: str, codigo: str, 
                          token_magic: str, proposito: str):
        """Envía email con OTP y Magic Link"""
        
        magic_url = f"{FRONTEND_URL}/auth/verify?token={token_magic}&type=magic"
        
        subject = "🔐 Tu código de acceso - Ignum CFO"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Código de Acceso - Ignum CFO</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; background-color: #0a0a0a; color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid #333;">
                            <!-- Header -->
                            <tr>
                                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">IGNUM CFO</h1>
                                    <p style="margin: 10px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.8);">Poder Real. Ejecución Brutal. Victoria Fiscal.</p>
                                </td>
                            </tr>
                            
                            <!-- Content -->
                            <tr>
                                <td style="padding: 40px;">
                                    <h2 style="margin: 0 0 20px 0; font-size: 22px; color: #ffffff;">Tu código de acceso</h2>
                                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #a0a0a0;">
                                        Usa este código para acceder a tu cuenta. Expira en 10 minutos.
                                    </p>
                                    
                                    <!-- OTP Code -->
                                    <div style="background: rgba(102, 126, 234, 0.1); border: 2px solid #667eea; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0;">
                                        <span style="font-family: 'Courier New', monospace; font-size: 42px; font-weight: 700; letter-spacing: 8px; color: #667eea;">{codigo}</span>
                                    </div>
                                    
                                    <!-- Magic Link -->
                                    <p style="margin: 30px 0 15px 0; font-size: 14px; color: #a0a0a0;">
                                        O haz clic en el botón para acceder directamente:
                                    </p>
                                    <div style="text-align: center;">
                                        <a href="{magic_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            Acceder a mi cuenta
                                        </a>
                                    </div>
                                    
                                    <!-- Security Notice -->
                                    <div style="margin-top: 40px; padding: 20px; background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; border-radius: 8px;">
                                        <p style="margin: 0; font-size: 13px; color: #ffc107; line-height: 1.5;">
                                            <strong>⚠️ Seguridad:</strong> Si no solicitaste este código, ignora este email. Nunca compartas tu código con nadie.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                            
                            <!-- Footer -->
                            <tr>
                                <td style="padding: 30px 40px; text-align: center; border-top: 1px solid #333;">
                                    <p style="margin: 0; font-size: 12px; color: #666;">
                                        © 2024 Ignum CFO - TPWR Holdings<br>
                                        <a href="https://ignum.cfo" style="color: #667eea; text-decoration: none;">ignum.cfo</a>
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        try:
            resend.Emails.send({
                "from": f"Ignum CFO <{EMAIL_FROM}>",
                "to": email,
                "subject": subject,
                "html": html_content
            })
        except Exception as e:
            print(f"Error enviando email: {e}")
            # En desarrollo, imprimir código
            print(f"[DEV] Código OTP para {email}: {codigo}")
            print(f"[DEV] Magic Link: {magic_url}")
    
    def _enviar_email_verificacion(self, email: str, token: str):
        """Envía email de verificación para registro"""
        
        verify_url = f"{FRONTEND_URL}/auth/verify?token={token}&type=email"
        
        subject = "✅ Verifica tu email - Ignum CFO"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Verifica tu email - Ignum CFO</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', system-ui, sans-serif; background-color: #0a0a0a; color: #ffffff;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a;">
                <tr>
                    <td align="center" style="padding: 40px 20px;">
                        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; border: 1px solid #333;">
                            <tr>
                                <td style="padding: 40px; text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                                    <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">IGNUM CFO</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 40px;">
                                    <h2 style="margin: 0 0 20px 0; font-size: 24px; color: #ffffff;">Verifica tu email</h2>
                                    <p style="margin: 0 0 30px 0; font-size: 16px; line-height: 1.6; color: #a0a0a0;">
                                        Gracias por registrarte en Ignum CFO. Haz clic en el botón para verificar tu email y continuar con tu suscripción.
                                    </p>
                                    <div style="text-align: center;">
                                        <a href="{verify_url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                                            Verificar mi email
                                        </a>
                                    </div>
                                    <p style="margin: 30px 0 0 0; font-size: 13px; color: #666;">
                                        O copia este enlace: {verify_url}
                                    </p>
                                    <div style="margin-top: 30px; padding: 15px; background: rgba(255,255,255,0.05); border-radius: 8px;">
                                        <p style="margin: 0; font-size: 12px; color: #888;">
                                            Este enlace expira en 24 horas.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        """
        
        try:
            resend.Emails.send({
                "from": f"Ignum CFO <{EMAIL_FROM}>",
                "to": email,
                "subject": subject,
                "html": html_content
            })
        except Exception as e:
            print(f"Error enviando email: {e}")
            print(f"[DEV] Link de verificación: {verify_url}")
