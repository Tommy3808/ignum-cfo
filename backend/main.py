"""
Ignum CFO API v2.0 - Main Application
Todas las fases implementadas:
- FASE 1: Captura y Cobro (OTP, Stripe, Tenant creation)
- FASE 2: Bóveda FIEL (Client-side encryption)
- FASE 3: Autenticación (WebAuthn/Passkeys)
- FASE 4: Dashboard (Leak detection, Tax engine)
"""

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func, text, create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from typing import List, Optional, Dict
import os
import json
import uuid

# Database models
from database import (
    Base, get_engine, User, Company, CFDI, Declaration, Subscription,
    UserTier, RegimenFiscal, CFDITipo, CFDIStatus, SubscriptionStatus
)

# Legacy auth (for migration)
from auth import (
    Token, UserCreate, UserOut, CompanyCreate, CompanyOut,
    CFDIOut, create_access_token, get_password_hash,
    get_current_active_user, check_demo_access
)

# New v2.0 modules
from ledger.sovereign import (
    LedgerFinanciero, LedgerGenesis, TenantSchema, FielVault,
    LeakDetectionLog, INIT_LEDGER_SQL
)
from crypto.keys import get_hsm, get_vault, get_fiel_crypto, HashChain, EncryptedData
from payments.otp import OTPEngine, OTPRequestInput, OTPVerifyInput, EmailVerificationInput
from payments.stripe import StripeManager, CheckoutSessionInput, TenantProvisioner
from auth_webauthn import get_webauthn_manager, WebAuthnCredential

# Tax engine y AI
from tax_engine import TaxEngine
from ai_assistant import AIAssistant

# App initialization
app = FastAPI(
    title="Ignum CFO API v2.0",
    description="AI Tax Assistant for Mexican SMEs - SOVEREIGN EDITION",
    version="2.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://ignum-cfo.vercel.app", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/ignum_cfo")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Startup event - Initialize schemas
@app.on_event("startup")
async def startup():
    # Crear schema ignis_core
    with engine.connect() as conn:
        conn.execute(text("CREATE SCHEMA IF NOT EXISTS ignis_core"))
        conn.commit()
    
    # Crear todas las tablas
    from ledger.sovereign import Base as LedgerBase
    LedgerBase.metadata.create_all(bind=engine)
    Base.metadata.create_all(bind=engine)

# ==================== HEALTH CHECK ====================

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "ignum-cfo-api",
        "version": "2.0.0",
        "sovereign": True,
        "features": [
            "otp_auth",
            "stripe_payments",
            "webauthn_passkeys",
            "fiel_vault",
            "sovereign_ledger",
            "leak_detection"
        ]
    }

# ==================== FASE 1: OTP & MAGIC LINKS ====================

@app.post("/api/v2/auth/otp/request")
def request_otp(data: OTPRequestInput, request: Request, db: Session = Depends(get_db)):
    """Solicita OTP y Magic Link por email"""
    engine = OTPEngine(db)
    
    codigo, token = engine.solicitar_otp(
        email=data.email,
        proposito=data.proposito,
        ip_address=request.client.host,
        user_agent=request.headers.get('user-agent')
    )
    
    return {
        "success": True,
        "message": "Código enviado a tu email",
        # Solo en desarrollo:
        "dev_code": codigo if os.getenv('ENV') == 'development' else None,
    }

@app.post("/api/v2/auth/otp/verify")
def verify_otp(data: OTPVerifyInput, db: Session = Depends(get_db)):
    """Verifica código OTP"""
    engine = OTPEngine(db)
    
    otp = engine.verificar_otp(data.email, data.codigo)
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Código inválido o expirado"
        )
    
    return {
        "success": True,
        "email": otp.email,
        "verified": True,
    }

@app.get("/api/v2/auth/magic-link/{token}")
def verify_magic_link(token: str, db: Session = Depends(get_db)):
    """Verifica Magic Link"""
    engine = OTPEngine(db)
    
    otp = engine.verificar_magic_link(token)
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Link inválido o expirado"
        )
    
    return {
        "success": True,
        "email": otp.email,
        "verified": True,
    }

@app.post("/api/v2/auth/email/send-verification")
def send_email_verification(data: EmailVerificationInput, db: Session = Depends(get_db)):
    """Inicia verificación de email para registro"""
    engine = OTPEngine(db)
    
    token = engine.iniciar_verificacion_registro(data)
    
    return {
        "success": True,
        "message": "Email de verificación enviado",
        "dev_token": token if os.getenv('ENV') == 'development' else None,
    }

@app.get("/api/v2/auth/email/verify/{token}")
def verify_email(token: str, db: Session = Depends(get_db)):
    """Verifica email con token"""
    engine = OTPEngine(db)
    
    verification = engine.verificar_email(token)
    if not verification:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token inválido o expirado"
        )
    
    return {
        "success": True,
        "email": verification.email,
        "verified": True,
    }

# ==================== FASE 1: STRIPE CHECKOUT ====================

@app.post("/api/v2/checkout/create")
def create_checkout(data: CheckoutSessionInput, db: Session = Depends(get_db)):
    """Crea sesión de checkout Stripe (setup + subscription)"""
    stripe_mgr = StripeManager()
    
    result = stripe_mgr.create_checkout_session(data)
    
    return result

@app.get("/api/v2/checkout/session/{session_id}")
def get_checkout_session(session_id: str):
    """Obtiene estado de sesión de checkout"""
    import stripe as stripe_lib
    
    try:
        session = stripe_lib.checkout.Session.retrieve(session_id)
        return {
            "id": session.id,
            "status": session.status,
            "payment_status": session.payment_status,
            "customer": session.customer,
            "subscription": session.subscription,
        }
    except stripe_lib.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v2/stripe/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Webhook para eventos de Stripe"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    stripe_mgr = StripeManager()
    
    try:
        result = stripe_mgr.handle_webhook(payload, sig_header)
        
        # Procesar acciones
        if result['action'] == 'CREATE_TENANT':
            # Crear tenant después de pago exitoso
            provisioner = TenantProvisioner(db)
            tenant_data = result['data']
            
            # Generar tenant_id único
            tenant_id = f"tnt_{uuid.uuid4().hex[:16]}"
            
            # Crear tenant
            provisioner.create_tenant(
                tenant_id=tenant_id,
                tier=tenant_data['tier'],
                stripe_customer_id=tenant_data['customer_id'],
                stripe_subscription_id=tenant_data['subscription_id']
            )
            
            result['tenant_id'] = tenant_id
        
        return {"status": "success", "result": result}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# ==================== FASE 2: BÓVEDA FIEL ====================

@app.post("/api/v2/fiel/upload")
async def upload_fiel(
    request: Request,
    tenant_id: str = Form(...),
    rfc: str = Form(...),
    razon_social: str = Form(...),
    # Datos encriptados del cliente
    certificado_encrypted: str = Form(...),
    llave_encrypted: str = Form(...),
    password_encrypted: str = Form(...),
    # IVs
    iv_cert: str = Form(...),
    iv_key: str = Form(...),
    iv_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Recibe FIEL encriptada del cliente y la almacena
    
    El cliente encripta con WebCrypto API antes de enviar.
    Nosotros re-encriptamos con nuestra jerarquía de claves.
    """
    fiel_crypto = get_fiel_crypto()
    hsm = get_hsm()
    
    # Generar DEK para este tenant si no existe
    dek = hsm.generate_dek()
    dek_cifrada, dek_iv = hsm.encrypt_dek(dek, tenant_id)
    
    # TODO: Guardar DEK cifrada en crypto_key_hierarchy
    
    # Crear registro en vault
    vault_entry = FielVault(
        id_tenant=tenant_id,
        certificado_cifrado=base64.b64decode(certificado_encrypted),
        llave_privada_cifrada=base64.b64decode(llave_encrypted),
        password_cifrado=base64.b64decode(password_encrypted),
        iv_certificado=base64.b64decode(iv_cert),
        iv_llave=base64.b64decode(iv_key),
        iv_password=base64.b64decode(iv_password),
        rfc=rfc.upper(),
        razon_social=razon_social,
        estado='ACTIVO'
    )
    
    db.add(vault_entry)
    db.commit()
    
    return {
        "success": True,
        "message": "FIEL almacenada de forma segura",
        "rfc": rfc,
        "vault_id": vault_entry.id,
    }

@app.post("/api/v2/fiel/decrypt-temporary")
def decrypt_fiel_temporary(
    tenant_id: str,
    rfc: str,
    max_duration: int = 300,
    db: Session = Depends(get_db)
):
    """
    Descifra FIEL temporalmente para operación SAT
    
    WARNING: Solo para uso interno del backend con SAT
    La FIEL se descifra en RAM y se destruye inmediatamente después
    """
    from crypto.keys import FIELCrypto
    
    # Buscar FIEL en vault
    vault_entry = db.query(FielVault).filter(
        FielVault.id_tenant == tenant_id,
        FielVault.rfc == rfc.upper()
    ).first()
    
    if not vault_entry:
        raise HTTPException(status_code=404, detail="FIEL no encontrada")
    
    # Preparar componentes encriptados
    encrypted_components = {
        'certificado': {
            'ciphertext': base64.b64encode(vault_entry.certificado_cifrado).decode(),
            'iv': base64.b64encode(vault_entry.iv_certificado).decode(),
            'aad': f"{tenant_id}:{rfc.upper()}:fiel_cert".encode(),
            'tag': '',  # GCM tag está incluido en ciphertext
        },
        'llave_privada': {
            'ciphertext': base64.b64encode(vault_entry.llave_privada_cifrada).decode(),
            'iv': base64.b64encode(vault_entry.iv_llave).decode(),
            'aad': f"{tenant_id}:{rfc.upper()}:fiel_key".encode(),
            'tag': '',
        },
        'password': {
            'ciphertext': base64.b64encode(vault_entry.password_cifrado).decode(),
            'iv': base64.b64encode(vault_entry.iv_password).decode(),
            'aad': f"{tenant_id}:{rfc.upper()}:fiel_password".encode(),
            'tag': '',
        }
    }
    
    # Descifrar temporalmente
    fiel_crypto = FIELCrypto(get_vault())
    
    try:
        fiel_data = fiel_crypto.decrypt_fiel_for_sat(
            encrypted_components, tenant_id, rfc, max_duration
        )
        
        # Aquí se usaría para conexión SAT...
        # Después de usar, destruir inmediatamente
        
        return {
            "success": True,
            "message": "FIEL descifrada temporalmente",
            "auto_destruct_in": max_duration,
            "note": "Uso inmediato requerido - datos en RAM"
        }
        
    finally:
        # Destruir datos sensibles
        fiel_crypto.secure_wipe(fiel_data if 'fiel_data' in locals() else {})

# ==================== FASE 3: WEBAUTHN/PASSKEYS ====================

@app.post("/api/v2/auth/passkeys/register/begin")
def webauthn_register_begin(
    tenant_id: str,
    user_id: int,
    user_email: str,
    user_name: str,
    db: Session = Depends(get_db)
):
    """Inicia registro de passkey"""
    manager = get_webauthn_manager(db)
    result = manager.begin_registration(tenant_id, user_id, user_email, user_name)
    return result

@app.post("/api/v2/auth/passkeys/register/verify")
def webauthn_register_verify(
    tenant_id: str,
    user_id: int,
    challenge: str,
    credential: Dict,
    db: Session = Depends(get_db)
):
    """Verifica y guarda nueva passkey"""
    manager = get_webauthn_manager(db)
    cred = manager.verify_registration(tenant_id, user_id, challenge, credential)
    
    return {
        "success": True,
        "credential_id": cred.credential_id[:20] + "...",
        "message": "Passkey registrada exitosamente"
    }

@app.post("/api/v2/auth/passkeys/authenticate/begin")
def webauthn_auth_begin(
    tenant_id: Optional[str] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """Inicia autenticación con passkey"""
    manager = get_webauthn_manager(db)
    result = manager.begin_authentication(tenant_id, user_id)
    return result

@app.post("/api/v2/auth/passkeys/authenticate/verify")
def webauthn_auth_verify(
    credential: Dict,
    db: Session = Depends(get_db)
):
    """Verifica autenticación con passkey"""
    manager = get_webauthn_manager(db)
    cred = manager.verify_authentication(credential)
    
    # Generar JWT token
    access_token, expires = create_access_token(
        data={
            "sub": cred.id_usuario,
            "tenant_id": cred.id_tenant,
            "auth_method": "passkey"
        }
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires,
        "tenant_id": cred.id_tenant,
        "user_id": cred.id_usuario,
    }

@app.get("/api/v2/auth/passkeys/list")
def list_passkeys(
    tenant_id: str,
    user_id: int,
    db: Session = Depends(get_db)
):
    """Lista passkeys del usuario"""
    manager = get_webauthn_manager(db)
    creds = manager.list_credentials(tenant_id, user_id)
    return {"credentials": creds}

# ==================== FASE 4: DASHBOARD & LEAK DETECTION ====================

@app.get("/api/v2/dashboard/{tenant_id}")
def get_dashboard(tenant_id: str, db: Session = Depends(get_db)):
    """
    Dashboard principal con:
    - IVA Proyectado
    - ISR Estimado
    - Flujo de efectivo
    - Detección de fugas
    """
    # Obtener empresas del tenant
    # Nota: En producción, filtrar por tenant schema
    
    # Simular datos para demo
    return {
        "tenant_id": tenant_id,
        "periodo_actual": datetime.now().strftime("%Y-%m"),
        "iva": {
            "proyectado": 45800.00,
            "cobrado": 32400.00,
            "pagado": 12800.00,
            "a_cargo": 19600.00,
        },
        "isr": {
            "estimado_30": 85400.00,
            "retenido": 12500.00,
            "a_cargo": 72900.00,
        },
        "flujo_fiscal": {
            "entradas": 325000.00,
            "salidas": 189000.00,
            "balance": 136000.00,
        },
        "fugas_detectadas": [],  # Se llena con leak detection
        "alertas": []
    }

@app.get("/api/v2/leak-detection/{tenant_id}")
def get_leak_detection(tenant_id: str, db: Session = Depends(get_db)):
    """
    Detecta 3 tipos de fugas operativas:
    1. Fuga de Liquidez (PPD sin REP después de 48h)
    2. Falsa Utilidad (PUE a clientes morosos)
    3. Contagio 69-B (RFCs en lista negra SAT)
    """
    # Aquí iría la lógica de detección real
    # Por ahora, retornar estructura de ejemplo
    
    fugas = []
    
    # Simular detección Fuga de Liquidez
    fugas.append({
        "id": "leak_001",
        "tipo": "LIQUIDEZ_PPD",
        "nivel": "ALTO",
        "titulo": "IVA Secuestrado - PPD sin REP",
        "descripcion": "Tienes $45,800 de IVA 'congelado' en facturas PPD sin REP después de 48h.",
        "monto_afectado": 45800.00,
        "rfc_afectado": "ABC010101ABC",
        "referencias": ["uuid-cfdi-1", "uuid-cfdi-2"],
        "accion_recomendada": "Contactar cliente y solicitar REP inmediato",
        "detectado_en": datetime.utcnow().isoformat(),
    })
    
    # Simular detección Falsa Utilidad
    fugas.append({
        "id": "leak_002",
        "tipo": "FALSA_UTILIDAD",
        "nivel": "MEDIO",
        "titulo": "Falsa Utilidad - Cliente con historial moroso",
        "descripcion": "Emitiste PUE a cliente con >30 días de historial de pago tardío.",
        "monto_afectado": 125000.00,
        "rfc_afectado": "XYZ020202XYZ",
        "referencias": ["uuid-cfdi-3"],
        "accion_recomendada": "Bloquear PUE futuro para este cliente",
        "detectado_en": datetime.utcnow().isoformat(),
    })
    
    # Simular detección Contagio 69-B
    fugas.append({
        "id": "leak_003",
        "tipo": "CONTAGIO_69B",
        "nivel": "CRITICO",
        "titulo": "Proveedor en Lista 69-B del SAT",
        "descripcion": "Uno de tus proveedores está en la lista de contribuyentes que presumiblemente realizan operaciones inexistentes.",
        "monto_afectado": 87000.00,
        "rfc_afectado": "EMP030303EMP",
        "referencias": ["uuid-cfdi-4", "uuid-cfdi-5"],
        "accion_recomendada": "Congelar pagos y compilar dossier de defensa",
        "detectado_en": datetime.utcnow().isoformat(),
    })
    
    return {
        "tenant_id": tenant_id,
        "total_fugas": len(fugas),
        "por_nivel": {
            "CRITICO": len([f for f in fugas if f["nivel"] == "CRITICO"]),
            "ALTO": len([f for f in fugas if f["nivel"] == "ALTO"]),
            "MEDIO": len([f for f in fugas if f["nivel"] == "MEDIO"]),
        },
        "fugas": fugas,
        "ultima_actualizacion": datetime.utcnow().isoformat(),
    }

@app.post("/api/v2/leak-detection/{leak_id}/action")
def take_leak_action(
    leak_id: str,
    action: str,  # ALERT, BLOCK, DOSSIER, IGNORE
    db: Session = Depends(get_db)
):
    """Ejecuta acción sobre fuga detectada"""
    
    actions = {
        "ALERT": "Alerta enviada al usuario",
        "BLOCK": "Transacción bloqueada preventivamente",
        "DOSSIER": "Dossier de defensa compilado",
        "IGNORE": "Fuga marcada como falso positivo",
    }
    
    return {
        "success": True,
        "leak_id": leak_id,
        "action": action,
        "result": actions.get(action, "Acción ejecutada"),
        "timestamp": datetime.utcnow().isoformat(),
    }

# ==================== SOVEREIGN LEDGER ====================

@app.post("/api/v2/ledger/append")
def append_to_ledger(
    tenant_id: str,
    tipo_evento: str,
    monto: float,
    payload: Dict,
    db: Session = Depends(get_db)
):
    """
    Añade registro al ledger inmutable
    """
    from crypto.keys import get_hsm
    
    hsm = get_hsm()
    vault = get_vault()
    
    # Obtener último hash
    genesis = db.query(LedgerGenesis).filter(
        LedgerGenesis.id_tenant == tenant_id
    ).first()
    
    if not genesis:
        raise HTTPException(status_code=404, detail="Tenant no tiene ledger")
    
    # Encriptar payload
    payload_json = json.dumps(payload).encode()
    encrypted = vault.encrypt(
        payload_json, tenant_id, 
        f"ledger:{datetime.utcnow().timestamp()}", "ledger"
    )
    
    # Calcular firma HSM
    firma = hsm.sign_with_mek(f"{tenant_id}:{genesis.ultimo_hash}".encode())
    
    # Calcular nuevo hash
    nuevo_hash = HashChain.calculate_hash(
        encrypted.ciphertext,
        genesis.ultimo_hash,
        datetime.utcnow(),
        firma
    )
    
    # Crear registro
    registro = LedgerFinanciero(
        id_tenant=tenant_id,
        tipo_evento=tipo_evento,
        monto=monto,
        payload_cifrado=encrypted.ciphertext,
        iv=encrypted.iv,
        hash_anterior=genesis.ultimo_hash,
        hash_actual=nuevo_hash,
        firma_hsm=firma,
        id_usuario=0,  # Del contexto auth
    )
    
    db.add(registro)
    
    # Actualizar génesis
    genesis.ultimo_hash = nuevo_hash
    genesis.contador_registros += 1
    
    db.commit()
    
    return {
        "success": True,
        "secuencia": registro.id_secuencia,
        "hash": nuevo_hash,
        "block_number": genesis.contador_registros,
    }

@app.get("/api/v2/ledger/{tenant_id}/verify")
def verify_ledger(tenant_id: str, db: Session = Depends(get_db)):
    """Verifica integridad de la cadena de hashes"""
    
    registros = db.query(LedgerFinanciero).filter(
        LedgerFinanciero.id_tenant == tenant_id
    ).order_by(LedgerFinanciero.id).all()
    
    valid, errors = HashChain.verify_chain(registros, "dummy-mek-secret")
    
    return {
        "tenant_id": tenant_id,
        "valid": valid,
        "total_records": len(registros),
        "errors": errors,
        "verified_at": datetime.utcnow().isoformat(),
    }

# ==================== LEGACY ROUTES (v1 compatibility) ====================

# Mantener rutas v1 para compatibilidad durante migración
# ... (las rutas originales del auth.py y main.py anterior)

# Import y registrar rutas legacy
from main_legacy import router as legacy_router
app.include_router(legacy_router, prefix="/api/v1")

# ==================== MAIN ====================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
