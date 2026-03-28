from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List, Optional
import os
import stripe
import xml.etree.ElementTree as ET
import uuid

from database import (
    Base, get_engine, get_session_local, User, Company, CFDI, 
    Declaration, Subscription, AIConversation, TaxDocument, ActivityLog,
    UserTier, RegimenFiscal, CFDITipo, CFDIStatus, SubscriptionStatus
)
from auth import (
    Token, UserCreate, UserOut, UserLogin, CompanyCreate, CompanyOut,
    CFDIOut, DeclarationOut, SubscriptionOut,
    create_access_token, get_password_hash, verify_password,
    get_current_active_user, decode_token, check_demo_access
)
from tax_engine import TaxEngine
from ai_assistant import AIAssistant

# App initialization
app = FastAPI(
    title="Ignum CFO API",
    description="AI Tax Assistant for Mexican SMEs",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@db:5432/ignum_cfo")
engine = get_engine(DATABASE_URL)
SessionLocal = get_session_local(engine)

# Stripe setup
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_your_key")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "whsec_your_secret")

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Startup event
@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)

# Health check
@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "ignum-cfo-api", "version": "1.0.0"}

# ============== AUTH ROUTES ==============

@app.post("/api/auth/register", response_model=Token)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if user exists
    existing = db.query(User).filter(User.email == user_data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    demo_expires = datetime.utcnow() + timedelta(hours=72)  # 72 hour demo
    
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        tier=UserTier.DEMO,
        demo_expires_at=demo_expires
    )
    
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Create subscription record
    subscription = Subscription(
        user_id=user.id,
        status=SubscriptionStatus.TRIAL,
        tier=UserTier.DEMO,
        trial_end=demo_expires
    )
    db.add(subscription)
    db.commit()
    
    # Create access token
    access_token, expires = create_access_token(
        data={"sub": user.email, "user_id": user.id, "tier": user.tier.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires,
        "user_id": user.id,
        "tier": user.tier.value
    }

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check demo expiration
    if user.tier == UserTier.DEMO:
        if user.demo_expires_at and datetime.utcnow() > user.demo_expires_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Demo expired. Please subscribe to continue."
            )
    
    access_token, expires = create_access_token(
        data={"sub": user.email, "user_id": user.id, "tier": user.tier.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_at": expires,
        "user_id": user.id,
        "tier": user.tier.value
    }

@app.get("/api/auth/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    check_demo_access(current_user)
    return current_user

# ============== COMPANY ROUTES ==============

@app.post("/api/companies", response_model=CompanyOut)
def create_company(
    company_data: CompanyCreate, 
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    
    # Check company limits based on tier
    company_count = db.query(Company).filter(Company.owner_id == current_user.id).count()
    
    if current_user.tier == UserTier.GODINEZ and company_count >= 1:
        raise HTTPException(status_code=403, detail="Godinez tier allows only 1 company")
    elif current_user.tier == UserTier.EMPRESARIO and company_count >= 2:
        raise HTTPException(status_code=403, detail="Empresario tier allows up to 2 companies")
    
    # Validate RFC format (basic)
    if len(company_data.rfc) not in [12, 13]:
        raise HTTPException(status_code=400, detail="Invalid RFC format")
    
    company = Company(
        owner_id=current_user.id,
        rfc=company_data.rfc.upper(),
        razon_social=company_data.razon_social,
        regimen_fiscal=RegimenFiscal(company_data.regimen_fiscal),
        nombre_comercial=company_data.nombre_comercial
    )
    
    db.add(company)
    db.commit()
    db.refresh(company)
    
    return company

@app.get("/api/companies", response_model=List[CompanyOut])
def list_companies(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    companies = db.query(Company).filter(Company.owner_id == current_user.id).all()
    return companies

@app.get("/api/companies/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.owner_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company

# ============== CFDI ROUTES ==============

@app.post("/api/cfdi/upload")
async def upload_cfdi(
    company_id: int = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    
    # Verify company ownership
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.owner_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Read and parse XML
    content = await file.read()
    try:
        xml_str = content.decode('utf-8')
        cfdi_data = parse_cfdi_xml(xml_str)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid CFDI XML: {str(e)}")
    
    # Check for duplicate UUID
    existing = db.query(CFDI).filter(CFDI.uuid == cfdi_data['uuid']).first()
    if existing:
        raise HTTPException(status_code=400, detail="CFDI already exists")
    
    # Create CFDI record
    cfdi = CFDI(
        company_id=company_id,
        uuid=cfdi_data['uuid'],
        folio=cfdi_data.get('folio'),
        serie=cfdi_data.get('serie'),
        tipo=cfdi_data['tipo'],
        emisor_rfc=cfdi_data['emisor_rfc'],
        emisor_nombre=cfdi_data.get('emisor_nombre'),
        receptor_rfc=cfdi_data['receptor_rfc'],
        receptor_nombre=cfdi_data.get('receptor_nombre'),
        subtotal=cfdi_data['subtotal'],
        descuento=cfdi_data.get('descuento', 0),
        total=cfdi_data['total'],
        moneda=cfdi_data.get('moneda', 'MXN'),
        tipo_cambio=cfdi_data.get('tipo_cambio', 1.0),
        iva_trasladado=cfdi_data.get('iva_trasladado', 0),
        iva_retenido=cfdi_data.get('iva_retenido', 0),
        isr_retenido=cfdi_data.get('isr_retenido', 0),
        ieps_trasladado=cfdi_data.get('ieps_trasladado', 0),
        xml_content=xml_str,
        fecha_emision=cfdi_data['fecha_emision'],
        fecha_timbrado=cfdi_data.get('fecha_timbrado'),
        status=CFDIStatus.VALID
    )
    
    db.add(cfdi)
    db.commit()
    db.refresh(cfdi)
    
    # AI categorization (async)
    ai = AIAssistant()
    category = ai.categorize_expense(cfdi_data)
    cfdi.category = category
    db.commit()
    
    return {
        "success": True,
        "cfdi_id": cfdi.id,
        "uuid": cfdi.uuid,
        "category": category,
        "total": cfdi.total
    }

@app.get("/api/cfdi", response_model=List[CFDIOut])
def list_cfdis(
    company_id: int,
    tipo: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    
    query = db.query(CFDI).join(Company).filter(
        CFDI.company_id == company_id,
        Company.owner_id == current_user.id
    )
    
    if tipo:
        query = query.filter(CFDI.tipo == tipo)
    
    return query.order_by(CFDI.fecha_emision.desc()).all()

# ============== TAX CALCULATION ROUTES ==============

@app.get("/api/tax/calculate/{company_id}")
def calculate_taxes(
    company_id: int,
    year: int,
    month: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.owner_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    tax_engine = TaxEngine(db)
    result = tax_engine.calculate_monthly(company, year, month)
    
    return result

@app.get("/api/tax/deadlines")
def get_deadlines(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    
    tax_engine = TaxEngine(db)
    deadlines = tax_engine.get_upcoming_deadlines()
    
    return deadlines

# ============== SUBSCRIPTION ROUTES ==============

@app.get("/api/subscription", response_model=SubscriptionOut)
def get_subscription(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    subscription = db.query(Subscription).filter(Subscription.user_id == current_user.id).first()
    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")
    return subscription

@app.post("/api/subscription/create-checkout")
def create_checkout(
    tier: str,
    success_url: str,
    cancel_url: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Price IDs for each tier
    price_ids = {
        "godinez": "price_godinez_monthly",
        "empresario": "price_empresario_monthly",
        "sovereign": "price_sovereign_monthly"
    }
    
    if tier not in price_ids:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    # Create or get Stripe customer
    if not current_user.stripe_customer_id:
        customer = stripe.Customer.create(
            email=current_user.email,
            name=f"{current_user.first_name} {current_user.last_name}"
        )
        current_user.stripe_customer_id = customer.id
        db.commit()
    
    # Create checkout session
    checkout_session = stripe.checkout.Session.create(
        customer=current_user.stripe_customer_id,
        payment_method_types=["card"],
        line_items=[{
            "price": price_ids[tier],
            "quantity": 1,
        }],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": current_user.id, "tier": tier}
    )
    
    return {"checkout_url": checkout_session.url, "session_id": checkout_session.id}

@app.post("/api/subscription/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = int(session["metadata"]["user_id"])
        tier = session["metadata"]["tier"]
        
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            user.tier = UserTier(tier)
            user.stripe_subscription_id = session["subscription"]
            
            subscription = db.query(Subscription).filter(Subscription.user_id == user_id).first()
            if subscription:
                subscription.status = SubscriptionStatus.ACTIVE
                subscription.tier = UserTier(tier)
                subscription.stripe_subscription_id = session["subscription"]
            
            db.commit()
    
    return {"status": "success"}

# ============== AI ASSISTANT ROUTES ==============

@app.post("/api/ai/chat")
def ai_chat(
    message: str,
    conversation_id: Optional[int] = None,
    company_id: Optional[int] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    
    ai = AIAssistant()
    
    # Get or create conversation
    if conversation_id:
        conversation = db.query(AIConversation).filter(
            AIConversation.id == conversation_id,
            AIConversation.user_id == current_user.id
        ).first()
    else:
        conversation = None
    
    if not conversation:
        conversation = AIConversation(
            user_id=current_user.id,
            company_id=company_id,
            title=message[:50] + "...",
            messages=[]
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
    
    # Get company context if provided
    company_context = None
    if company_id:
        company = db.query(Company).filter(
            Company.id == company_id,
            Company.owner_id == current_user.id
        ).first()
        if company:
            company_context = {
                "rfc": company.rfc,
                "razon_social": company.razon_social,
                "regimen_fiscal": company.regimen_fiscal.value
            }
    
    # Get response from AI
    response = ai.chat(message, conversation.messages, company_context)
    
    # Update conversation
    conversation.messages.append({
        "role": "user",
        "content": message,
        "timestamp": datetime.utcnow().isoformat()
    })
    conversation.messages.append({
        "role": "assistant",
        "content": response,
        "timestamp": datetime.utcnow().isoformat()
    })
    conversation.updated_at = datetime.utcnow()
    db.commit()
    
    return {
        "response": response,
        "conversation_id": conversation.id
    }

@app.get("/api/ai/recommendations/{company_id}")
def get_ai_recommendations(
    company_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    check_demo_access(current_user)
    
    company = db.query(Company).filter(
        Company.id == company_id,
        Company.owner_id == current_user.id
    ).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    ai = AIAssistant()
    recommendations = ai.generate_recommendations(company, db)
    
    return recommendations

# ============== HELPER FUNCTIONS ==============

def parse_cfdi_xml(xml_str: str) -> dict:
    """Parse CFDI 4.0 XML and extract key data"""
    root = ET.fromstring(xml_str)
    
    # Namespaces
    ns = {
        'cfdi': 'http://www.sat.gob.mx/cfd/4',
        'tfd': 'http://www.sat.gob.mx/TimbreFiscalDigital'
    }
    
    # Get root attributes
    data = {
        'version': root.get('Version', '4.0'),
        'folio': root.get('Folio'),
        'serie': root.get('Serie'),
        'fecha_emision': datetime.fromisoformat(root.get('Fecha')),
        'subtotal': float(root.get('SubTotal', 0)),
        'total': float(root.get('Total', 0)),
        'moneda': root.get('Moneda', 'MXN'),
        'tipo_cambio': float(root.get('TipoCambio', 1.0)),
        'tipo': root.get('TipoDeComprobante', 'I'),
    }
    
    # Get Emisor
    emisor = root.find('cfdi:Emisor', ns)
    if emisor is not None:
        data['emisor_rfc'] = emisor.get('Rfc')
        data['emisor_nombre'] = emisor.get('Nombre')
        data['emisor_regimen'] = emisor.get('RegimenFiscal')
    
    # Get Receptor
    receptor = root.find('cfdi:Receptor', ns)
    if receptor is not None:
        data['receptor_rfc'] = receptor.get('Rfc')
        data['receptor_nombre'] = receptor.get('Nombre')
        data['receptor_regimen'] = receptor.get('RegimenFiscalReceptor')
    
    # Get UUID from TimbreFiscalDigital
    complemento = root.find('.//tfd:TimbreFiscalDigital', ns)
    if complemento is not None:
        data['uuid'] = complemento.get('UUID')
        fecha_timbrado = complemento.get('FechaTimbrado')
        if fecha_timbrado:
            data['fecha_timbrado'] = datetime.fromisoformat(fecha_timbrado)
    
    # Calculate taxes from conceptos
    data['iva_trasladado'] = 0
    data['iva_retenido'] = 0
    data['isr_retenido'] = 0
    data['ieps_trasladado'] = 0
    data['ieps_retenido'] = 0
    
    conceptos = root.find('cfdi:Conceptos', ns)
    if conceptos is not None:
        for concepto in conceptos.findall('cfdi:Concepto', ns):
            impuestos = concepto.find('cfdi:Impuestos', ns)
            if impuestos is not None:
                traslados = impuestos.find('cfdi:Traslados', ns)
                if traslados is not None:
                    for traslado in traslados.findall('cfdi:Traslado', ns):
                        impuesto = traslado.get('Impuesto')
                        importe = float(traslado.get('Importe', 0))
                        if impuesto == '002':  # IVA
                            data['iva_trasladado'] += importe
                        elif impuesto == '003':  # IEPS
                            data['ieps_trasladado'] += importe
                
                retenciones = impuestos.find('cfdi:Retenciones', ns)
                if retenciones is not None:
                    for retencion in retenciones.findall('cfdi:Retencion', ns):
                        impuesto = retencion.get('Impuesto')
                        importe = float(retencion.get('Importe', 0))
                        if impuesto == '002':  # IVA
                            data['iva_retenido'] += importe
                        elif impuesto == '001':  # ISR
                            data['isr_retenido'] += importe
                        elif impuesto == '003':  # IEPS
                            data['ieps_retenido'] += importe
    
    # Convert tipo to enum
    tipo_map = {
        'I': CFDITipo.INGRESO,
        'E': CFDITipo.EGRESO,
        'T': CFDITipo.TRASLADO,
        'N': CFDITipo.NOMINA,
        'P': CFDITipo.PAGO
    }
    data['tipo'] = tipo_map.get(data['tipo'], CFDITipo.INGRESO)
    
    return data

from fastapi import Request
