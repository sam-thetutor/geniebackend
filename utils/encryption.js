const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.SECRET_KEY; // Must be 32 bytes
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

class Encryption {
  static async encrypt(text) {
    try {
      // Generate a random salt
      const salt = crypto.randomBytes(SALT_LENGTH);
      
      // Create a unique key using the salt
      const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
      
      // Generate initialization vector
      const iv = crypto.randomBytes(IV_LENGTH);
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
      
      // Encrypt the text
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Get the auth tag
      const tag = cipher.getAuthTag();
      
      // Combine all components: salt:iv:tag:encrypted
      return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static async decrypt(encryptedData) {
    try {
      // Split the encrypted data into components
      const [saltHex, ivHex, tagHex, encryptedHex] = encryptedData.split(':');
      
      // Convert hex strings back to buffers
      const salt = Buffer.from(saltHex, 'hex');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      
      // Recreate the key using the same salt
      const key = crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, 32, 'sha256');
      
      // Create decipher
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      
      // Decrypt the data
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt data');
    }
  }
}

module.exports = Encryption; 