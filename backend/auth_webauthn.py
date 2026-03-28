"""
WebAuthn/Passkeys Authentication - FASE 3
Zero passwords - FaceID/TouchID/YubiKey support
"""

from fastapi import HTTPException, status
from sqlalchemy import Column, Integer, String, DateTime, Boolean, LargeBinary, JSON
from sqlalchemy.sql import func
from datetime import datetime, timedelta
from typing import Optional, Dict, List
import json
import secrets
import base64

# WebAuthn libraries
# pip install webauthn
try:
    from webauthn import (
        generate_registration_options,
        verify_registration_response,
        generate_authentication_options,
        verify_authentication_response,
    )
    from webauthn.helpers import base64url_to_bytes, bytes_to_base64url
    from webauthn.helpers.structs import (
        RegistrationOptions,
        AuthenticationOptions,
        AuthenticatorTransport,
        PublicKeyCredentialDescriptor,
    )
    WEBAUTHN_AVAILABLE = True
except ImportError:
    WEBAUTHN_AVAILABLE = False
    print("Warning: webauthn library not installed. Passkeys disabled.")


# RP Configuration
RP_ID = 'ignum-cfo.vercel.app'  # Production domain
RP_NAME = 'Ignum CFO'
RP_ORIGIN = 'https://ignum-cfo.vercel.app'


class WebAuthnCredential(Base):
    """Credenciales WebAuthn almacenadas"""
    __tablename__ = 'webauthn_credentials'
    __table_args__ = {'schema': 'ignis_core'}
    
    id = Column(Integer, primary_key=True)
    id_tenant = Column(String(64), nullable=False, index=True)
    id_usuario = Column(Integer, nullable=False, index=True)
    
    # Datos de la credencial
    credential_id = Column(String(255), unique=True, nullable=False)
    credential_public_key = Column(LargeBinary, nullable=False)
    sign_count = Column(Integer, default=0)
    
    # Metadata del autenticador
    aaguid = Column(String(36))  # Identificador del autenticador
    
    # Información del dispositivo
    device_type = Column(String(50))  # platform, cross-platform
    device_name = Column(String(100))  # iPhone, YubiKey, etc.
    transports = Column(JSON, default=list)  # internal, hybrid, usb, nfc, ble
    
    # Estado
    is_primary = Column(Boolean, default=False)
    last_used_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class PasskeyChallenge(Base):
    """Challenges temporales para WebAuthn"""
    __tablename__ = 'passkey_challenges'
    __table_args__ = {'schema': 'ignis_core'}
    
    id = Column(Integer, primary_key=True)
    challenge = Column(String(255), unique=True, nullable=False, index=True)
    id_tenant = Column(String(64), nullable=True)  # NULL para registro
    id_usuario = Column(Integer, nullable=True)
    
    tipo = Column(String(20), nullable=False)  # REGISTRATION, AUTHENTICATION
    
    # Datos temporales
    temp_data = Column(JSON)
    
    # Expiración
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False)
    usado = Column(Boolean, default=False)


class WebAuthnManager:
    """Gestor de WebAuthn/Passkeys"""
    
    def __init__(self, db):
        self.db = db
        if not WEBAUTHN_AVAILABLE:
            raise RuntimeError("WebAuthn library not available")
    
    def begin_registration(self, tenant_id: str, user_id: int, 
                          user_email: str, user_name: str) -> Dict:
        """
        Inicia registro de nueva credencial WebAuthn
        """
        # Generar challenge
        challenge = secrets.token_urlsafe(32)
        
        # Guardar challenge
        challenge_record = PasskeyChallenge(
            challenge=challenge,
            id_tenant=tenant_id,
            id_usuario=user_id,
            tipo='REGISTRATION',
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            temp_data={
                'user_email': user_email,
                'user_name': user_name,
            }
        )
        self.db.add(challenge_record)
        self.db.commit()
        
        # Generar opciones de registro
        options = generate_registration_options(
            rp_id=RP_ID,
            rp_name=RP_NAME,
            user_id=str(user_id).encode(),
            user_name=user_email,
            user_display_name=user_name,
            challenge=challenge.encode(),
            # Preferir autenticadores de plataforma (FaceID/TouchID)
            authenticator_selection={
                'resident_key': 'preferred',
                'user_verification': 'preferred',
                'authenticator_attachment': 'platform',  # FaceID/TouchID
            },
            # Permitir también cross-platform (YubiKey)
            # authenticator_attachment: None,
        )
        
        return {
            'options': options,
            'challenge': challenge,
        }
    
    def verify_registration(self, tenant_id: str, user_id: int,
                           challenge: str, credential: Dict) -> WebAuthnCredential:
        """
        Verifica y guarda nueva credencial
        """
        # Validar challenge
        challenge_record = self.db.query(PasskeyChallenge).filter(
            PasskeyChallenge.challenge == challenge,
            PasskeyChallenge.tipo == 'REGISTRATION',
            PasskeyChallenge.usado == False,
            PasskeyChallenge.expires_at > datetime.utcnow()
        ).first()
        
        if not challenge_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Challenge inválido o expirado"
            )
        
        # Verificar respuesta
        verification = verify_registration_response(
            credential=credential,
            expected_challenge=challenge.encode(),
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
        )
        
        # Marcar challenge como usado
        challenge_record.usado = True
        
        # Guardar credencial
        cred = WebAuthnCredential(
            id_tenant=tenant_id,
            id_usuario=user_id,
            credential_id=bytes_to_base64url(verification.credential_id),
            credential_public_key=verification.credential_public_key,
            sign_count=verification.sign_count,
            aaguid=str(verification.aaguid) if verification.aaguid else None,
            device_type='platform',  # o 'cross-platform'
            transports=[t.value for t in (credential.get('transports') or [])],
        )
        
        # Si es la primera credencial, marcar como primaria
        existing = self.db.query(WebAuthnCredential).filter(
            WebAuthnCredential.id_tenant == tenant_id,
            WebAuthnCredential.id_usuario == user_id
        ).count()
        
        if existing == 0:
            cred.is_primary = True
        
        self.db.add(cred)
        self.db.commit()
        
        return cred
    
    def begin_authentication(self, tenant_id: Optional[str] = None,
                            user_id: Optional[int] = None) -> Dict:
        """
        Inicia autenticación con passkey
        """
        # Generar challenge
        challenge = secrets.token_urlsafe(32)
        
        # Guardar challenge
        challenge_record = PasskeyChallenge(
            challenge=challenge,
            id_tenant=tenant_id,
            id_usuario=user_id,
            tipo='AUTHENTICATION',
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
        self.db.add(challenge_record)
        self.db.commit()
        
        # Si tenemos tenant/user, obtener credenciales permitidas
        allow_credentials = []
        if tenant_id and user_id:
            creds = self.db.query(WebAuthnCredential).filter(
                WebAuthnCredential.id_tenant == tenant_id,
                WebAuthnCredential.id_usuario == user_id
            ).all()
            
            allow_credentials = [
                {
                    'type': 'public-key',
                    'id': cred.credential_id,
                    'transports': cred.transports or ['internal'],
                }
                for cred in creds
            ]
        
        # Generar opciones de autenticación
        options = generate_authentication_options(
            rp_id=RP_ID,
            challenge=challenge.encode(),
            allow_credentials=allow_credentials if allow_credentials else None,
            user_verification='preferred',
        )
        
        return {
            'options': options,
            'challenge': challenge,
        }
    
    def verify_authentication(self, credential: Dict) -> Optional[WebAuthnCredential]:
        """
        Verifica autenticación con passkey
        """
        credential_id = credential.get('id')
        
        # Buscar credencial
        cred = self.db.query(WebAuthnCredential).filter(
            WebAuthnCredential.credential_id == credential_id
        ).first()
        
        if not cred:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credencial no encontrada"
            )
        
        # Verificar respuesta
        verification = verify_authentication_response(
            credential=credential,
            expected_challenge=self._get_challenge_from_db(cred.id_tenant, cred.id_usuario),
            expected_rp_id=RP_ID,
            expected_origin=RP_ORIGIN,
            credential_public_key=cred.credential_public_key,
            credential_current_sign_count=cred.sign_count,
        )
        
        # Actualizar contador y último uso
        cred.sign_count = verification.new_sign_count
        cred.last_used_at = datetime.utcnow()
        self.db.commit()
        
        return cred
    
    def _get_challenge_from_db(self, tenant_id: str, user_id: int) -> bytes:
        """Recupera challenge vigente"""
        challenge_record = self.db.query(PasskeyChallenge).filter(
            PasskeyChallenge.id_tenant == tenant_id,
            PasskeyChallenge.id_usuario == user_id,
            PasskeyChallenge.tipo == 'AUTHENTICATION',
            PasskeyChallenge.usado == False,
            PasskeyChallenge.expires_at > datetime.utcnow()
        ).order_by(PasskeyChallenge.created_at.desc()).first()
        
        if not challenge_record:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Challenge no encontrado"
            )
        
        return challenge_record.challenge.encode()
    
    def list_credentials(self, tenant_id: str, user_id: int) -> List[Dict]:
        """Lista credenciales del usuario"""
        creds = self.db.query(WebAuthnCredential).filter(
            WebAuthnCredential.id_tenant == tenant_id,
            WebAuthnCredential.id_usuario == user_id
        ).all()
        
        return [
            {
                'id': c.id,
                'credential_id': c.credential_id[:20] + '...',
                'device_name': c.device_name or 'Dispositivo desconocido',
                'device_type': c.device_type,
                'is_primary': c.is_primary,
                'last_used_at': c.last_used_at.isoformat() if c.last_used_at else None,
                'created_at': c.created_at.isoformat(),
            }
            for c in creds
        ]
    
    def remove_credential(self, tenant_id: str, user_id: int, 
                         credential_id: str) -> bool:
        """Elimina una credencial"""
        cred = self.db.query(WebAuthnCredential).filter(
            WebAuthnCredential.id_tenant == tenant_id,
            WebAuthnCredential.id_usuario == user_id,
            WebAuthnCredential.credential_id.like(f"{credential_id}%")
        ).first()
        
        if cred:
            self.db.delete(cred)
            self.db.commit()
            return True
        return False


# Fallback para cuando webauthn no está disponible
class WebAuthnFallback:
    """Fallback cuando webauthn no está instalado"""
    
    def __init__(self, db):
        self.db = db
    
    def begin_registration(self, *args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WebAuthn no disponible. Instala: pip install webauthn"
        )
    
    def begin_authentication(self, *args, **kwargs):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="WebAuthn no disponible"
        )
    
    verify_registration = begin_registration
    verify_authentication = begin_authentication


def get_webauthn_manager(db):
    """Factory para obtener manager de WebAuthn"""
    if WEBAUTHN_AVAILABLE:
        return WebAuthnManager(db)
    return WebAuthnFallback(db)
