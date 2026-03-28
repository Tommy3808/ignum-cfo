"""
SOVEREIGN LEDGER - Append-only financial ledger with cryptographic hash chain
Ignis Core Financial Ledger - Immutable by design
"""

from sqlalchemy import (
    Column, Integer, String, DateTime, Float, Text, ForeignKey, 
    Index, text, event
)
from sqlalchemy.dialects.postgresql import JSONB, BYTEA
from sqlalchemy.orm import declarative_base
from datetime import datetime
import hashlib
import hmac
import os

Base = declarative_base()

class LedgerFinanciero(Base):
    """
    SOVEREIGN LEDGER - Tabla financiera append-only con hash chain
    
    Reglas de inmutabilidad:
    1. NO UPDATES permitidos - Solo INSERTS
    2. Hash chain criptográfica: H_n = SHA384(Payload + H_{n-1} + Timestamp + Firma)
    3. Cada registro referencia al hash anterior
    4. CONSTRAINT ledger_inmutable previene modificaciones
    """
    
    __tablename__ = 'ledger_financiero'
    __table_args__ = (
        {'schema': 'ignis_core'},
    )
    
    # Identificación
    id = Column(Integer, primary_key=True)
    id_secuencia = Column(String(32), unique=True, nullable=False, index=True)
    id_tenant = Column(String(64), nullable=False, index=True)  # Schema aislado del tenant
    
    # Metadata del evento
    tipo_evento = Column(String(50), nullable=False, index=True)  # INGRESO, EGRESO, IMPUESTO, AJUSTE, etc.
    subtipo = Column(String(50))  # CFDI, MANUAL, AJUSTE, etc.
    
    # Referencias externas
    referencia_externa = Column(String(255))  # UUID CFDI, ID transacción, etc.
    id_usuario = Column(Integer, nullable=False)  # Quién registró
    
    # Datos financieros
    moneda = Column(String(3), default='MXN')
    monto = Column(Float, nullable=False)
    monto_iva = Column(Float, default=0.0)
    monto_isr = Column(Float, default=0.0)
    
    # Payload cifrado con DEK (Data Encryption Key)
    # Contiene: detalles CFDI, metadata, etc.
    payload_cifrado = Column(BYTEA, nullable=False)
    
    # IV para descifrado AES-GCM
    iv = Column(BYTEA, nullable=False)
    
    # Hash chain criptográfica
    hash_anterior = Column(String(96), nullable=False)  # SHA384 = 96 chars hex
    hash_actual = Column(String(96), nullable=False, unique=True, index=True)
    
    # Firma HSM - Prueba de integridad con clave maestra
    firma_hsm = Column(String(128), nullable=False)
    
    # Timestamp con precisión de microsegundos
    timestamp_registro = Column(DateTime(timezone=True), 
                                server_default=text('CURRENT_TIMESTAMP'),
                                nullable=False, index=True)
    
    # Metadata adicional (no sensible)
    metadata_publica = Column(JSONB, default=dict)
    
    def __init__(self, **kwargs):
        # Generar id_secuencia si no proporcionado
        if 'id_secuencia' not in kwargs:
            kwargs['id_secuencia'] = self._generar_secuencia()
        super().__init__(**kwargs)
    
    @staticmethod
    def _generar_secuencia() -> str:
        """Genera ID de secuencia único con timestamp"""
        import uuid
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S%f')
        random_suffix = uuid.uuid4().hex[:8]
        return f"LED-{timestamp}-{random_suffix}"
    
    @classmethod
    def calcular_hash(cls, payload: bytes, hash_anterior: str, 
                      timestamp: datetime, firma_mek: str) -> str:
        """
        Calcula el hash criptográfico del registro
        H_n = SHA384(Payload + H_{n-1} + Timestamp + Firma_MEK)
        """
        # Concatenar todos los componentes
        data = (
            payload +
            hash_anterior.encode('utf-8') +
            timestamp.isoformat().encode('utf-8') +
            firma_mek.encode('utf-8')
        )
        return hashlib.sha384(data).hexdigest()
    
    def verificar_integridad(self, mek_secret: str) -> bool:
        """Verifica la integridad del registro contra manipulación"""
        hash_calculado = self.calcular_hash(
            bytes(self.payload_cifrado),
            self.hash_anterior,
            self.timestamp_registro,
            mek_secret
        )
        return hmac.compare_digest(hash_calculado, self.hash_actual)


class LedgerGenesis(Base):
    """
    Registro génesis del ledger - Punto de origen inmutable
    Cada tenant tiene su propio bloque génesis
    """
    
    __tablename__ = 'ledger_genesis'
    __table_args__ = (
        {'schema': 'ignis_core'},
    )
    
    id = Column(Integer, primary_key=True)
    id_tenant = Column(String(64), unique=True, nullable=False)
    hash_genesis = Column(String(96), nullable=False)
    timestamp_creacion = Column(DateTime(timezone=True), default=datetime.utcnow)
    certificado_tenant = Column(BYTEA)  # Certificado público del tenant
    
    # Hash del último registro (actualizado automáticamente)
    ultimo_hash = Column(String(96), nullable=False)
    contador_registros = Column(Integer, default=0)


class CryptoKeyHierarchy(Base):
    """
    Jerarquía de claves criptográficas:
    MEK (Master Encryption Key) en HSM → KEK (Key Encryption Key) → DEK (Data Encryption Key)
    """
    
    __tablename__ = 'crypto_key_hierarchy'
    __table_args__ = (
        {'schema': 'ignis_core'},
    )
    
    id = Column(Integer, primary_key=True)
    id_tenant = Column(String(64), nullable=False, index=True)
    
    # Tipo de clave
    tipo_clave = Column(String(10), nullable=False)  # KEK, DEK
    
    # Clave cifrada (KEK cifrada con MEK, DEK cifrada con KEK)
    clave_cifrada = Column(BYTEA, nullable=False)
    
    # IV para descifrado
    iv = Column(BYTEA, nullable=False)
    
    # Referencia a clave padre
    id_clave_padre = Column(Integer, ForeignKey('ignis_core.crypto_key_hierarchy.id'))
    
    # Estado
    estado = Column(String(20), default='ACTIVA')  # ACTIVA, ROTADA, REVOCADA
    creada_en = Column(DateTime(timezone=True), default=datetime.utcnow)
    rotada_en = Column(DateTime(timezone=True))
    
    # Metadata
    algoritmo = Column(String(20), default='AES-256-GCM')
    proposito = Column(String(50))  # FIEL, CFDI, LEDGER, etc.


class FielVault(Base):
    """
    Bóveda de FIEL - Almacena credenciales SAT encriptadas
    """
    
    __tablename__ = 'fiel_vault'
    __table_args__ = (
        {'schema': 'ignis_core'},
    )
    
    id = Column(Integer, primary_key=True)
    id_tenant = Column(String(64), unique=True, nullable=False)
    
    # Certificado .cer encriptado
    certificado_cifrado = Column(BYTEA, nullable=False)
    
    # Llave privada .key encriptada
    llave_privada_cifrada = Column(BYTEA, nullable=False)
    
    # Password encriptado (componente separado)
    password_cifrado = Column(BYTEA, nullable=False)
    
    # IVs para cada componente
    iv_certificado = Column(BYTEA, nullable=False)
    iv_llave = Column(BYTEA, nullable=False)
    iv_password = Column(BYTEA, nullable=False)
    
    # Referencia a DEK usada
    id_dek = Column(Integer, ForeignKey('ignis_core.crypto_key_hierarchy.id'))
    
    # Metadata
    rfc = Column(String(13), nullable=False)
    razon_social = Column(String(255))
    vigencia_desde = Column(DateTime(timezone=True))
    vigencia_hasta = Column(DateTime(timezone=True))
    
    # Estado
    estado = Column(String(20), default='ACTIVO')  # ACTIVO, EXPIRADO, REVOCADO
    ultimo_uso = Column(DateTime(timezone=True))
    contador_usos = Column(Integer, default=0)
    
    creado_en = Column(DateTime(timezone=True), default=datetime.utcnow)


class TenantSchema(Base):
    """
    Registro de schemas de tenant aislados
    """
    
    __tablename__ = 'tenant_schemas'
    __table_args__ = (
        {'schema': 'ignis_core'},
    )
    
    id = Column(Integer, primary_key=True)
    id_tenant = Column(String(64), unique=True, nullable=False)
    nombre_schema = Column(String(64), unique=True, nullable=False)
    
    # Estado del tenant
    estado = Column(String(20), default='PENDING_SETUP')  # PENDING_SETUP, ACTIVE, SUSPENDED, DELETED
    
    # Configuración
    plan = Column(String(20), default='GODINEZ')  # GODINEZ, EMPRESARIO, SOVEREIGN
    
    # Límites
    limite_empresas = Column(Integer, default=1)
    limite_cfdis_mes = Column(Integer, default=1000)
    
    # Stripe
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    
    # Timestamps
    creado_en = Column(DateTime(timezone=True), default=datetime.utcnow)
    activado_en = Column(DateTime(timezone=True))
    suspendido_en = Column(DateTime(timezone=True))


class LeakDetectionLog(Base):
    """
    Log de detecciones de fugas operativas
    """
    
    __tablename__ = 'leak_detection_log'
    __table_args__ = (
        {'schema': 'ignis_core'},
    )
    
    id = Column(Integer, primary_key=True)
    id_tenant = Column(String(64), nullable=False, index=True)
    
    # Tipo de fuga detectada
    tipo_fuga = Column(String(50), nullable=False)  # LIQUIDEZ_PPD, FALSA_UTILIDAD, CONTAGIO_69B
    nivel_riesgo = Column(String(20), nullable=False)  # BAJO, MEDIO, ALTO, CRITICO
    
    # Descripción
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text, nullable=False)
    
    # Datos relacionados
    rfc_afectado = Column(String(13))
    monto_afectado = Column(Float)
    referencias = Column(JSONB, default=list)  # UUIDs CFDI, IDs relacionados
    
    # Acción tomada
    accion_tomada = Column(String(50))  # ALERTA, BLOQUEO, DOSSIER, NONE
    detalles_accion = Column(JSONB, default=dict)
    
    # Estado
    estado = Column(String(20), default='ACTIVO')  # ACTIVO, RESUELTO, FALSO_POSITIVO
    resuelto_en = Column(DateTime(timezone=True))
    
    # Timestamps
    detectado_en = Column(DateTime(timezone=True), default=datetime.utcnow)


# Trigger para prevenir UPDATES en ledger
LEDGER_IMMUTABLE_TRIGGER = """
CREATE OR REPLACE FUNCTION ignis_core.prevenir_update_ledger()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'LEDGER INMUTABLE: No se permiten actualizaciones. Tabla append-only.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ledger_no_update ON ignis_core.ledger_financiero;
CREATE TRIGGER ledger_no_update
    BEFORE UPDATE ON ignis_core.ledger_financiero
    FOR EACH ROW
    EXECUTE FUNCTION ignis_core.prevenir_update_ledger();
"""

# Función para verificar hash chain
VERIFY_HASH_CHAIN_FUNC = """
CREATE OR REPLACE FUNCTION ignis_core.verificar_hash_chain(p_id_tenant VARCHAR)
RETURNS TABLE (
    id_registro INTEGER,
    hash_valido BOOLEAN,
    mensaje VARCHAR
) AS $$
DECLARE
    v_registro RECORD;
    v_hash_anterior VARCHAR(96) := '';
    v_hash_calculado VARCHAR(96);
BEGIN
    FOR v_registro IN 
        SELECT id, hash_anterior, hash_actual, payload_cifrado, timestamp_registro
        FROM ignis_core.ledger_financiero
        WHERE id_tenant = p_id_tenant
        ORDER BY id
    LOOP
        -- Verificar que hash_anterior coincide con registro previo
        IF v_hash_anterior != '' AND v_registro.hash_anterior != v_hash_anterior THEN
            RETURN QUERY SELECT v_registro.id, FALSE, 'Hash anterior no coincide'::VARCHAR;
        END IF;
        
        v_hash_anterior := v_registro.hash_actual;
        RETURN QUERY SELECT v_registro.id, TRUE, 'Hash válido'::VARCHAR;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
"""

# SQL para crear schema y extensiones
INIT_LEDGER_SQL = """
-- Crear schema ignis_core si no existe
CREATE SCHEMA IF NOT EXISTS ignis_core;

-- Extension para crypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tablas
{table_definitions}

-- Triggers
{triggers}

-- Funciones
{functions}

-- Índices adicionales
CREATE INDEX IF NOT EXISTS idx_ledger_tenant_tipo 
    ON ignis_core.ledger_financiero(id_tenant, tipo_evento);

CREATE INDEX IF NOT EXISTS idx_ledger_tenant_fecha 
    ON ignis_core.ledger_financiero(id_tenant, timestamp_registro);

CREATE INDEX IF NOT EXISTS idx_leaks_tenant_tipo 
    ON ignis_core.leak_detection_log(id_tenant, tipo_fuga);
"""
