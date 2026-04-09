"""
Stripe Integration - FASE 1: Captura y Cobro
Checkout, subscriptions, and webhook handling
"""

import stripe
import os
from typing import Optional, Dict, List
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.orm import Session

# Stripe configuration
stripe.api_key = os.getenv('STRIPE_SECRET_KEY', 'sk_test_your_key')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', 'whsec_your_secret')

# Price IDs
STRIPE_PRICES = {
    'GODINEZ': {
        'setup': os.getenv('STRIPE_PRICE_SETUP', 'price_setup_godinez'),
        'monthly': os.getenv('STRIPE_PRICE_GODINEZ', 'price_999_monthly'),
        'amount_setup': 2500,
        'amount_monthly': 999,
    },
    'EMPRESARIO': {
        'setup': os.getenv('STRIPE_PRICE_SETUP', 'price_setup_empresario'),
        'monthly': os.getenv('STRIPE_PRICE_EMPRESARIO', 'price_5300_monthly'),
        'amount_setup': 5000,
        'amount_monthly': 5300,
    },
    'SOVEREIGN': {
        'setup': os.getenv('STRIPE_PRICE_SETUP', 'price_setup_sovereign'),
        'monthly': os.getenv('STRIPE_PRICE_SOVEREIGN', 'price_11000_monthly'),
        'amount_setup': 15000,
        'amount_monthly': 11000,
    }
}


class CheckoutSessionInput(BaseModel):
    tier: str  # GODINEZ, EMPRESARIO, SOVEREIGN
    email: str
    success_url: str
    cancel_url: str
    extra_users: int = 0


class SubscriptionInfo(BaseModel):
    id: str
    status: str
    tier: str
    current_period_end: datetime
    cancel_at_period_end: bool


class StripeManager:
    """Gestor de operaciones Stripe"""
    
    TIERS = {
        'GODINEZ': {
            'name': 'Professional',
            'description': '1 físico/moral (<$500K/mes)',
            'setup_amount': 2500,
            'monthly_amount': 999,
        },
        'EMPRESARIO': {
            'name': 'Empresario', 
            'description': '1 moral + 1 físico',
            'setup_amount': 5000,
            'monthly_amount': 5300,
        },
        'SOVEREIGN': {
            'name': 'Sovereign',
            'description': '5 morales + 10 físicos',
            'setup_amount': 15000,
            'monthly_amount': 11000,
        }
    }
    
    def __init__(self):
        self.stripe = stripe
    
    def create_customer(self, email: str, name: Optional[str] = None,
                       metadata: Optional[Dict] = None) -> stripe.Customer:
        """Crea cliente en Stripe"""
        params = {
            'email': email,
            'metadata': metadata or {}
        }
        if name:
            params['name'] = name
            
        return self.stripe.Customer.create(**params)
    
    def create_checkout_session(self, data: CheckoutSessionInput) -> Dict:
        """
        Crea sesión de checkout para setup + subscription
        
        Incluye:
        - Setup fee única ($5,000 para EMPRESARIO)
        - Subscription mensual
        """
        tier = data.tier.upper()
        if tier not in self.TIERS:
            raise ValueError(f"Tier inválido: {tier}")
        
        tier_info = self.TIERS[tier]
        
        # Crear o recuperar cliente
        customers = self.stripe.Customer.list(email=data.email, limit=1)
        if customers.data:
            customer = customers.data[0]
        else:
            customer = self.create_customer(
                email=data.email,
                metadata={'tier_requested': tier}
            )
        
        # Construir line items
        line_items = []
        
        # Setup fee (cargo único)
        line_items.append({
            'price_data': {
                'currency': 'mxn',
                'product_data': {
                    'name': f'Setup Fee - {tier_info["name"]}',
                    'description': 'Configuración inicial y onboarding',
                },
                'unit_amount': tier_info['setup_amount'] * 100,  # Centavos
            },
            'quantity': 1,
        })
        
        # Subscription mensual
        line_items.append({
            'price_data': {
                'currency': 'mxn',
                'product_data': {
                    'name': f'Suscripción {tier_info["name"]}',
                    'description': tier_info['description'],
                },
                'unit_amount': tier_info['monthly_amount'] * 100,
                'recurring': {'interval': 'month'},
            },
            'quantity': 1,
        })
        
        # Extra users si aplica
        if data.extra_users > 0:
            line_items.append({
                'price_data': {
                    'currency': 'mxn',
                    'product_data': {
                        'name': 'Usuario Adicional',
                        'description': f'{data.extra_users} usuario(s) extra',
                    },
                    'unit_amount': 999 * 100,
                    'recurring': {'interval': 'month'},
                },
                'quantity': data.extra_users,
            })
        
        # Crear sesión de checkout
        session = self.stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=line_items,
            mode='subscription',
            success_url=data.success_url,
            cancel_url=data.cancel_url,
            metadata={
                'tier': tier,
                'customer_email': data.email,
            },
            subscription_data={
                'metadata': {
                    'tier': tier,
                }
            },
            payment_intent_data={
                'setup_future_usage': 'off_session',
            },
        )
        
        return {
            'session_id': session.id,
            'checkout_url': session.url,
            'customer_id': customer.id,
        }
    
    def create_setup_session(self, customer_id: str, 
                            success_url: str, cancel_url: str) -> Dict:
        """
        Crea sesión para configurar método de pago (sin cobro inmediato)
        """
        session = self.stripe.setup_intent.create(
            customer=customer_id,
            payment_method_types=['card'],
            usage='off_session',
        )
        
        return {
            'client_secret': session.client_secret,
            'setup_intent_id': session.id,
        }
    
    def get_subscription(self, subscription_id: str) -> Optional[SubscriptionInfo]:
        """Obtiene información de suscripción"""
        try:
            sub = self.stripe.Subscription.retrieve(subscription_id)
            return SubscriptionInfo(
                id=sub.id,
                status=sub.status,
                tier=sub.metadata.get('tier', 'UNKNOWN'),
                current_period_end=datetime.fromtimestamp(sub.current_period_end),
                cancel_at_period_end=sub.cancel_at_period_end,
            )
        except stripe.error.StripeError:
            return None
    
    def cancel_subscription(self, subscription_id: str, 
                           at_period_end: bool = True) -> bool:
        """Cancela suscripción"""
        try:
            if at_period_end:
                self.stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                self.stripe.Subscription.delete(subscription_id)
            return True
        except stripe.error.StripeError:
            return False
    
    def create_invoice_item(self, customer_id: str, amount: float, 
                           description: str) -> stripe.InvoiceItem:
        """Crea item para facturación"""
        return self.stripe.InvoiceItem.create(
            customer=customer_id,
            amount=int(amount * 100),
            currency='mxn',
            description=description,
        )
    
    def handle_webhook(self, payload: bytes, sig_header: str) -> Dict:
        """
        Procesa webhook de Stripe
        
        Eventos manejados:
        - checkout.session.completed
        - invoice.payment_succeeded
        - invoice.payment_failed
        - customer.subscription.deleted
        """
        try:
            event = self.stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise ValueError("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid signature")
        
        event_type = event['type']
        data = event['data']['object']
        
        result = {
            'type': event_type,
            'processed': False,
            'data': {}
        }
        
        if event_type == 'checkout.session.completed':
            result.update(self._handle_checkout_completed(data))
            
        elif event_type == 'invoice.payment_succeeded':
            result.update(self._handle_payment_succeeded(data))
            
        elif event_type == 'invoice.payment_failed':
            result.update(self._handle_payment_failed(data))
            
        elif event_type == 'customer.subscription.deleted':
            result.update(self._handle_subscription_deleted(data))
            
        return result
    
    def _handle_checkout_completed(self, session: Dict) -> Dict:
        """Maneja checkout completado - Crea tenant"""
        return {
            'processed': True,
            'action': 'CREATE_TENANT',
            'data': {
                'customer_id': session.get('customer'),
                'subscription_id': session.get('subscription'),
                'tier': session.get('metadata', {}).get('tier'),
                'email': session.get('customer_email'),
            }
        }
    
    def _handle_payment_succeeded(self, invoice: Dict) -> Dict:
        """Maneja pago exitoso"""
        return {
            'processed': True,
            'action': 'ACTIVATE_SUBSCRIPTION',
            'data': {
                'subscription_id': invoice.get('subscription'),
                'customer_id': invoice.get('customer'),
                'amount_paid': invoice.get('amount_paid'),
            }
        }
    
    def _handle_payment_failed(self, invoice: Dict) -> Dict:
        """Maneja pago fallido"""
        return {
            'processed': True,
            'action': 'PAYMENT_FAILED',
            'data': {
                'subscription_id': invoice.get('subscription'),
                'customer_id': invoice.get('customer'),
                'attempt_count': invoice.get('attempt_count'),
            }
        }
    
    def _handle_subscription_deleted(self, subscription: Dict) -> Dict:
        """Maneja cancelación de suscripción"""
        return {
            'processed': True,
            'action': 'CANCEL_SUBSCRIPTION',
            'data': {
                'subscription_id': subscription.get('id'),
                'customer_id': subscription.get('customer'),
            }
        }


class TenantProvisioner:
    """
    Provisionador de tenants - Crea schema aislado en PostgreSQL
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_tenant(self, tenant_id: str, tier: str, 
                      stripe_customer_id: str,
                      stripe_subscription_id: str) -> Dict:
        """
        Crea nuevo tenant con schema aislado
        
        1. Crea registro en tenant_schemas
        2. Crea schema PostgreSQL aislado
        3. Crea tablas del tenant
        4. Crea bloque génesis del ledger
        """
        from ledger.sovereign import TenantSchema, LedgerGenesis
        from crypto.keys import get_hsm, HashChain
        
        # Crear registro de tenant
        tenant = TenantSchema(
            id_tenant=tenant_id,
            nombre_schema=f"tenant_{tenant_id}",
            plan=tier,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
            limite_empresas=self._get_limit_empresas(tier),
            estado='ACTIVE'
        )
        
        self.db.add(tenant)
        
        # Crear bloque génesis del ledger
        genesis_hash = HashChain.calculate_hash(
            payload=f"GENESIS:{tenant_id}".encode(),
            previous_hash="0" * 96,
            timestamp=datetime.utcnow(),
            mek_signature=get_hsm().sign_with_mek(tenant_id.encode())
        )
        
        genesis = LedgerGenesis(
            id_tenant=tenant_id,
            hash_genesis=genesis_hash,
            ultimo_hash=genesis_hash,
            contador_registros=0
        )
        
        self.db.add(genesis)
        
        # Crear schema PostgreSQL (ejecutar SQL raw)
        self._create_postgres_schema(tenant_id)
        
        self.db.commit()
        
        return {
            'tenant_id': tenant_id,
            'schema': f"tenant_{tenant_id}",
            'tier': tier,
            'genesis_hash': genesis_hash,
        }
    
    def _get_limit_empresas(self, tier: str) -> int:
        """Retorna límite de empresas según tier"""
        limits = {
            'GODINEZ': 1,
            'EMPRESARIO': 2,
            'SOVEREIGN': 15,
        }
        return limits.get(tier, 1)
    
    def _create_postgres_schema(self, tenant_id: str):
        """Crea schema PostgreSQL aislado para el tenant"""
        from sqlalchemy import text
        
        schema_name = f"tenant_{tenant_id}"
        
        # Crear schema
        self.db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {schema_name}"))
        
        # Crear tablas del tenant
        # Nota: En producción, usar migraciones con Alembic
        
        sql = f"""
        -- Tabla de empresas del tenant
        CREATE TABLE IF NOT EXISTS {schema_name}.empresas (
            id SERIAL PRIMARY KEY,
            rfc VARCHAR(13) UNIQUE NOT NULL,
            razon_social VARCHAR(255) NOT NULL,
            regimen_fiscal VARCHAR(20) NOT NULL,
            nombre_comercial VARCHAR(255),
            direccion JSONB,
            sat_certified BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabla de CFDIs del tenant
        CREATE TABLE IF NOT EXISTS {schema_name}.cfdis (
            id SERIAL PRIMARY KEY,
            uuid VARCHAR(36) UNIQUE NOT NULL,
            empresa_id INTEGER REFERENCES {schema_name}.empresas(id),
            tipo VARCHAR(1) NOT NULL,
            emisor_rfc VARCHAR(13) NOT NULL,
            emisor_nombre VARCHAR(255),
            receptor_rfc VARCHAR(13) NOT NULL,
            receptor_nombre VARCHAR(255),
            subtotal DECIMAL(15,2) NOT NULL,
            total DECIMAL(15,2) NOT NULL,
            iva_trasladado DECIMAL(15,2) DEFAULT 0,
            isr_retenido DECIMAL(15,2) DEFAULT 0,
            metodo_pago VARCHAR(10),
            forma_pago VARCHAR(10),
            fecha_emision TIMESTAMP NOT NULL,
            xml_encrypted BYTEA,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Tabla de declaraciones
        CREATE TABLE IF NOT EXISTS {schema_name}.declaraciones (
            id SERIAL PRIMARY KEY,
            empresa_id INTEGER REFERENCES {schema_name}.empresas(id),
            periodo VARCHAR(7) NOT NULL,
            tipo VARCHAR(10) NOT NULL,
            ingresos DECIMAL(15,2) DEFAULT 0,
            egresos DECIMAL(15,2) DEFAULT 0,
            iva_cargo DECIMAL(15,2) DEFAULT 0,
            isr_cargo DECIMAL(15,2) DEFAULT 0,
            estado VARCHAR(20) DEFAULT 'PENDIENTE',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        -- Índices
        CREATE INDEX IF NOT EXISTS idx_cfdis_empresa ON {schema_name}.cfdis(empresa_id);
        CREATE INDEX IF NOT EXISTS idx_cfdis_fecha ON {schema_name}.cfdis(fecha_emision);
        CREATE INDEX IF NOT EXISTS idx_cfdis_uuid ON {schema_name}.cfdis(uuid);
        """
        
        self.db.execute(text(sql))
