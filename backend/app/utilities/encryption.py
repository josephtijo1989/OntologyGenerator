import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.configuration.config import settings
from app.utilities.logger import logger


class AESCipher:
    """
    AES-256 GCM Encryption and Decryption utility for sensitive credentials and connection strings.
    """
    def __init__(self, secret_key: str = settings.ENCRYPTION_KEY):
        # Ensure 32-byte key for AES-256
        key_bytes = secret_key.encode('utf-8')
        if len(key_bytes) < 32:
            key_bytes = key_bytes.ljust(32, b'0')
        else:
            key_bytes = key_bytes[:32]
        self.aesgcm = AESGCM(key_bytes)

    def encrypt(self, plain_text: str) -> str:
        """Encrypts plain text string and returns base64 encoded string containing nonce + ciphertext."""
        if not plain_text:
            return ""
        try:
            nonce = os.urandom(12)  # 96-bit nonce for AES-GCM
            ciphertext = self.aesgcm.encrypt(nonce, plain_text.encode('utf-8'), None)
            combined = nonce + ciphertext
            return base64.b64encode(combined).decode('utf-8')
        except Exception as e:
            logger.error(f"Encryption failed: {str(e)}")
            raise ValueError("Failed to encrypt sensitive data")

    def decrypt(self, encrypted_text: str) -> str:
        """Decrypts base64 encoded payload and returns decrypted plain text."""
        if not encrypted_text:
            return ""
        try:
            combined = base64.b64decode(encrypted_text.encode('utf-8'))
            nonce = combined[:12]
            ciphertext = combined[12:]
            decrypted_bytes = self.aesgcm.decrypt(nonce, ciphertext, None)
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            logger.error(f"Decryption failed: {str(e)}")
            raise ValueError("Failed to decrypt sensitive data")


cipher = AESCipher()
