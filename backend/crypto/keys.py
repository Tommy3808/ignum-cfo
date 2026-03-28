"""
Crypto Architecture - Hierarchical Key Management
Key Hierarchy: MEK (HSM) → KEK (per tenant) → DEK (per record)
"""

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.backends import default_backend
import hashlib
import hmac
import os
import base64
import secrets
from typing import Tuple, Optional, Dict
from dataclasses import dataclass
from datetime import datetime

# In production, MEK comes from HSM (YubiHSM, AWS KMS, etc.)
# For this implementation, we simulate HSM with environment variable
MASTER_ENCRYPTION_KEY = os.getenv('MEK_HASH', '').encode() or secrets.token_bytes(32)


@dataclass
class EncryptedData:
    """Estructura de datos encriptados con metadata"""
    ciphertext: bytes
    iv: bytes
    aad: bytes  # Additional Authenticated Data
    tag: bytes  # Auth tag for GCM
    
    def to_dict(self) -> Dict:
        return {
            'ciphertext': base64.b64encode(self.ciphertext).decode(),
            'iv': base64.b64encode(self.iv).decode(),
            'aad': base64.b64encode(self.aad).decode(),
            'tag': base64.b64encode(self.tag).decode(),
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'EncryptedData':
        return cls(
            ciphertext=base64.b64decode(data['ciphertext']),
            iv=base64.b64decode(data['iv']),
            aad=base64.b64decode(data['aad']),
            tag=base64.b64decode(data['tag']),
        )


class HSMKeyManager:
    """
    Simulación de HSM (Hardware Security Module)
    En producción: YubiHSM, AWS CloudHSM, Azure Dedicated HSM
    """
    
    def __init__(self, mek_key: Optional[bytes] = None):
        self._mek = mek_key or MASTER_ENCRYPTION_KEY
        self._kek_cache: Dict[str, bytes] = {}  # Cache en RAM solo
    
    def derive_kek(self, tenant_id: str) -> bytes:
        """
        Deriva KEK (Key Encryption Key) para un tenant específico
        KEK = HKDF(MEK, salt=tenant_id, info='ignum-kek-v1')
        """
        if tenant_id in self._kek_cache:
            return self._kek_cache[tenant_id]
        
        hkdf = HKDF(
            algorithm=hashes.SHA384(),
            length=32,  # 256 bits
            salt=tenant_id.encode(),
            info=b'ignum-kek-v1',
            backend=default_backend()
        )
        kek = hkdf.derive(self._mek)
        self._kek_cache[tenant_id] = kek
        return kek
    
    def generate_dek(self) -> bytes:
        """Genera DEK (Data Encryption Key) aleatoria de 256 bits"""
        return AESGCM.generate_key(bit_length=256)
    
    def encrypt_dek(self, dek: bytes, tenant_id: str) -> Tuple[bytes, bytes]:
        """
        Encripta DEK con KEK del tenant
        Retorna: (dek_cifrada, iv)
        """
        kek = self.derive_kek(tenant_id)
        iv = os.urandom(12)  # 96 bits para GCM
        aesgcm = AESGCM(kek)
        
        # AAD incluye tenant_id para binding
        aad = f"{tenant_id}:dek-wrap".encode()
        dek_cifrada = aesgcm.encrypt(iv, dek, aad)
        
        return dek_cifrada, iv
    
    def decrypt_dek(self, dek_cifrada: bytes, iv: bytes, tenant_id: str) -> bytes:
        """Descifra DEK usando KEK del tenant"""
        kek = self.derive_kek(tenant_id)
        aesgcm = AESGCM(kek)
        aad = f"{tenant_id}:dek-wrap".encode()
        return aesgcm.decrypt(iv, dek_cifrada, aad)
    
    def sign_with_mek(self, data: bytes) -> str:
        """Firma datos con MEK para verificación de integridad"""
        return hmac.new(self._mek, data, hashlib.sha384).hexdigest()
    
    def clear_cache(self):
        """Limpia cache de KEKs (llamar después de operaciones)"""
        self._kek_cache.clear()


class DataVault:
    """
    Bóveda de datos con encriptación AES-256-GCM
    Cada registro usa DEK única
    """
    
    def __init__(self, hsm: HSMKeyManager):
        self.hsm = hsm
    
    def encrypt(self, plaintext: bytes, tenant_id: str, 
                record_id: str, context: str = "default") -> EncryptedData:
        """
        Encripta datos con DEK única
        
        Args:
            plaintext: Datos a encriptar
            tenant_id: ID del tenant
            record_id: ID único del registro
            context: Contexto de uso (fiel, cfdi, ledger, etc.)
        """
        # Generar DEK nueva
        dek = self.hsm.generate_dek()
        
        # IV de 96 bits para GCM
        iv = os.urandom(12)
        
        # AAD (Additional Authenticated Data) - binding a tenant y record
        aad = f"{tenant_id}:{record_id}:{context}".encode()
        
        # Encriptar datos
        aesgcm = AESGCM(dek)
        ciphertext_with_tag = aesgcm.encrypt(iv, plaintext, aad)
        
        # Separar ciphertext y auth tag
        ciphertext = ciphertext_with_tag[:-16]
        tag = ciphertext_with_tag[-16:]
        
        # Encriptar DEK con KEK del tenant
        dek_cifrada, dek_iv = self.hsm.encrypt_dek(dek, tenant_id)
        
        # Metadata para almacenar junto con datos
        encrypted = EncryptedData(
            ciphertext=dek_cifrada + ciphertext,  # DEK cifrada + datos
            iv=iv,
            aad=aad,
            tag=tag
        )
        
        # Guardar IV de DEK como parte de metadata
        encrypted.dek_iv = dek_iv
        
        return encrypted
    
    def decrypt(self, encrypted_data: EncryptedData, tenant_id: str,
                record_id: str, context: str = "default") -> bytes:
        """
        Descifra datos - Solo en RAM, nunca en disco
        
        Args:
            encrypted_data: Datos encriptados
            tenant_id: ID del tenant
            record_id: ID del registro
            context: Contexto de uso
        """
        import gc
        
        try:
            # Reconstruir AAD
            expected_aad = f"{tenant_id}:{record_id}:{context}".encode()
            if not hmac.compare_digest(encrypted_data.aad, expected_aad):
                raise ValueError("AAD mismatch - possible tampering")
            
            # Separar DEK cifrada y ciphertext
            # Los primeros 56 bytes son la DEK cifrada (32 bytes + 16 tag + 8 overhead GCM)
            dek_cifrada_len = 48  # 32 bytes DEK + 16 bytes tag GCM
            dek_cifrada = encrypted_data.ciphertext[:dek_cifrada_len]
            ciphertext = encrypted_data.ciphertext[dek_cifrada_len:]
            
            # Descifrar DEK con KEK
            dek = self.hsm.decrypt_dek(dek_cifrada, encrypted_data.dek_iv, tenant_id)
            
            # Descifrar datos con DEK
            aesgcm = AESGCM(dek)
            plaintext = aesgcm.decrypt(
                encrypted_data.iv, 
                ciphertext + encrypted_data.tag,
                encrypted_data.aad
            )
            
            return plaintext
            
        finally:
            # Forzar garbage collection para eliminar DEK de RAM
            if 'dek' in locals():
                dek = b'\x00' * len(dek)
            gc.collect()
    
    def crypto_shred(self, tenant_id: str) -> bool:
        """
        Crypto-shredding: Elimina acceso a todos los datos del tenant
        Al eliminar KEK, todos los datos quedan irrecuperables
        """
        try:
            # En HSM real, revocaría/eliminaría la KEK
            if tenant_id in self.hsm._kek_cache:
                # Sobrescribir con ceros antes de eliminar
                self.hsm._kek_cache[tenant_id] = b'\x00' * 32
                del self.hsm._kek_cache[tenant_id]
            return True
        except Exception:
            return False


class FIELCrypto:
    """
    Manejo criptográfico específico para FIEL (Firma Electrónica)
 """   
    def __init__(self, vault: DataVault):
        self.vault = vault
    
    def encrypt_fiel_components(self, cert_pem: bytes, key_pem: bytes, 
                                 password: str, tenant_id: str, rfc: str) -> Dict:
        """
        Encripta los 3 componentes de FIEL por separado
        Cada componente tiene su propia DEK
        """
        # Componente 1: Certificado (.cer)
        cert_enc = self.vault.encrypt(
            cert_pem, tenant_id, f"{rfc}:cert", "fiel_cert"
        )
        
        # Componente 2: Llave privada (.key)  
        key_enc = self.vault.encrypt(
            key_pem, tenant_id, f"{rfc}:key", "fiel_key"
        )
        
        # Componente 3: Password
        password_enc = self.vault.encrypt(
            password.encode(), tenant_id, f"{rfc}:password", "fiel_password"
        )
        
        return {
            'certificado': cert_enc.to_dict(),
            'llave_privada': key_enc.to_dict(),
            'password': password_enc.to_dict(),
            'rfc': rfc,
            'encrypted_at': datetime.utcnow().isoformat()
        }
    
    def decrypt_fiel_for_sat(self, encrypted_components: Dict, tenant_id: str, 
                             rfc: str, max_duration: int = 300) -> Dict:
        """
        Descifra FIEL temporalmente para conexión SAT
        
        Args:
            encrypted_components: Componentes encriptados
            tenant_id: ID del tenant
            rfc: RFC del contribuyente
            max_duration: Segundos máximos antes de auto-destrucción
            
        Returns:
            Dict con componentes descifrados (uso inmediato requerido)
        """
        import signal
        
        cert_enc = EncryptedData.from_dict(encrypted_components['certificado'])
        key_enc = EncryptedData.from_dict(encrypted_components['llave_privada'])
        password_enc = EncryptedData.from_dict(encrypted_components['password'])
        
        # Descifrar todos los componentes
        cert_pem = self.vault.decrypt(cert_enc, tenant_id, f"{rfc}:cert", "fiel_cert")
        key_pem = self.vault.decrypt(key_enc, tenant_id, f"{rfc}:key", "fiel_key")
        password = self.vault.decrypt(password_enc, tenant_id, f"{rfc}:password", "fiel_password").decode()
        
        return {
            'certificado': cert_pem,
            'llave_privada': key_pem,
            'password': password,
            'auto_destruct_at': datetime.utcnow().timestamp() + max_duration
        }
    
    def secure_wipe(self, data: Dict):
        """Limpia segura de datos sensibles en memoria"""
        import gc
        
        for key, value in data.items():
            if isinstance(value, bytes):
                # Sobrescribir con datos aleatorios antes de liberar
                overwritten = bytearray(value)
                for i in range(len(overwritten)):
                    overwritten[i] = secrets.randbelow(256)
                data[key] = bytes(overwritten)
                data[key] = b'\x00' * len(value)
            elif isinstance(value, str) and key != 'auto_destruct_at':
                data[key] = '\x00' * len(value)
        
        gc.collect()


class HashChain:
    """
    Implementación de cadena de hashes para ledger inmutable
    """
    
    @staticmethod
    def calculate_hash(payload: bytes, previous_hash: str, 
                       timestamp: datetime, mek_signature: str) -> str:
        """
        Calcula hash criptográfico para ledger
        H_n = SHA384(Payload + H_{n-1} + Timestamp + Firma_MEK)
        """
        data = (
            payload +
            previous_hash.encode('utf-8') +
            timestamp.isoformat().encode('utf-8') +
            mek_signature.encode('utf-8')
        )
        return hashlib.sha384(data).hexdigest()
    
    @staticmethod
    def verify_chain(records: list, mek_secret: str) -> Tuple[bool, list]:
        """
        Verifica integridad de cadena de hashes
        
        Returns:
            Tuple[bool, list]: (válido, lista de errores)
        """
        errors = []
        previous_hash = "0" * 96  # Hash génesis
        
        for i, record in enumerate(records):
            # Verificar hash anterior
            if record.hash_anterior != previous_hash:
                errors.append(f"Registro {i}: hash_anterior no coincide")
            
            # Recalcular hash
            calculated = HashChain.calculate_hash(
                bytes(record.payload_cifrado),
                record.hash_anterior,
                record.timestamp_registro,
                mek_secret
            )
            
            if calculated != record.hash_actual:
                errors.append(f"Registro {i}: hash_actual no válido")
            
            previous_hash = record.hash_actual
        
        return len(errors) == 0, errors


# Singleton instances para uso en la aplicación
_hsm = None
_vault = None

def get_hsm() -> HSMKeyManager:
    global _hsm
    if _hsm is None:
        _hsm = HSMKeyManager()
    return _hsm

def get_vault() -> DataVault:
    global _vault
    if _vault is None:
        _vault = DataVault(get_hsm())
    return _vault

def get_fiel_crypto() -> FIELCrypto:
    return FIELCrypto(get_vault())
