// scripts/services/encryptionService.js
const crypto = require('crypto');
require('dotenv').config(); // Garante que as variáveis de ambiente estão carregadas

// Chaves de criptografia e IV (vetor de inicialização)
// Lembre-se de gerar chaves seguras para produção
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Deve ser de 32 bytes (64 caracteres hex) para AES-256
const ENCRYPTION_IV = process.env.ENCRYPTION_IV;   // Deve ser de 16 bytes (32 caracteres hex)

// Validações
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
    console.error('ERRO: ENCRYPTION_KEY não definida ou tem tamanho incorreto (deve ser 64 caracteres hex).');
    process.exit(1);
}
if (!ENCRYPTION_IV || ENCRYPTION_IV.length !== 32) {
    console.error('ERRO: ENCRYPTION_IV não definida ou tem tamanho incorreto (deve ser 32 caracteres hex).');
    process.exit(1);
}

// Converte chaves hex para buffers
const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'hex');
const ivBuffer = Buffer.from(ENCRYPTION_IV, 'hex');

const algorithm = 'aes-256-cbc';

const encrypt = (text) => {
    if (!text) return null; // Retorna null para texto vazio ou nulo
    let cipher = crypto.createCipheriv(algorithm, keyBuffer, ivBuffer);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
};

const decrypt = (encryptedText) => {
    if (!encryptedText) return null; // Retorna null para texto criptografado vazio ou nulo
    try {
        let decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error("Erro ao descriptografar:", error.message);
        return null; // Retorna null em caso de erro na descriptografia (ex: texto inválido)
    }
};

module.exports = { encrypt, decrypt };