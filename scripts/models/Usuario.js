// scripts/models/Usuario.js
// CORRIGIDO: Caminho do db.js
const { get, run, all } = require('../db'); 
const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

const saltRounds = 10; 

class Usuario {
    /**
     * Cria a tabela 'Usuario' no banco de dados se ela não existir.
     * Inclui campos como nome, email, senha, pontos, assiduidade, data de registro,
     * último login e ID do mascote.
     * ADICIONA CAMPOS PARA REDEFINIÇÃO DE SENHA.
     */
    static createTable() {
        return run(`
            CREATE TABLE IF NOT EXISTS Usuario (
                id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,  
                nome TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha TEXT NOT NULL,
                pontos INTEGER DEFAULT 0,
                assiduidade_dias INTEGER DEFAULT 0,
                data_registro DATETIME DEFAULT CURRENT_TIMESTAMP, 
                ultimo_login DATETIME DEFAULT CURRENT_TIMESTAMP,   
                mascote_id INTEGER DEFAULT NULL,
                -- NOVOS CAMPOS PARA REDEFINIÇÃO DE SENHA
                resetPasswordToken TEXT,
                resetPasswordExpires DATETIME,
                FOREIGN KEY (mascote_id) REFERENCES Mascote(id_mascote) ON DELETE SET NULL
            )
        `);
    }

    /**
     * Encontra um usuário pelo seu endereço de e-mail.
     * @param {string} email O e-mail do usuário a ser procurado.
     * @returns {Promise<Object|null>} O objeto do usuário ou null se não encontrado.
     */
    static async findByEmail(email) {
        return get(`SELECT * FROM Usuario WHERE email = ?`, [email]);
    }

    /**
     * Encontra um usuário pelo seu ID.
     * @param {number} id O ID do usuário a ser procurado.
     * @returns {Promise<Object|null>} O objeto do usuário (sem a senha para segurança) ou null se não encontrado.
     */
    static async findById(id) {
        return get(`
            SELECT id_usuario, nome, email, pontos, assiduidade_dias, data_registro, ultimo_login, mascote_id
            FROM Usuario
            WHERE id_usuario = ?
        `, [id]);
    }

    /**
     * Cria um novo usuário no banco de dados.
     * @param {string} nome Nome do usuário.
     * @param {string} email E-mail do usuário (deve ser único).
     * @param {string} senhaHash Senha do usuário já hashed.
     * @param {number|null} mascote_id ID do mascote escolhido (opcional).
     * @returns {Promise<Object>} O objeto do novo usuário.
     * @throws {Error} Se o e-mail já estiver cadastrado ou ocorrer outro erro no DB.
     */
    static async create(nome, email, senhaHash, mascote_id = null) {
        try {
            const result = await run(`
                INSERT INTO Usuario (nome, email, senha, pontos, assiduidade_dias, mascote_id)
                VALUES (?, ?, ?, 0, 0, ?)
            `, [nome, email, senhaHash, mascote_id]);

            return Usuario.findById(result.lastID);

        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                throw new Error("E-mail já cadastrado.");
            }
            throw new Error(`Erro ao criar novo usuário no banco de dados: ${err.message}`);
        }
    }

    /**
     * Compara uma senha em texto puro com uma senha hashed.
     * @param {string} plainPassword Senha em texto puro.
     * @param {string} hashedPassword Senha hashed do banco de dados.
     * @returns {Promise<boolean>} True se as senhas coincidirem, false caso contrário.
     */
    static async comparePassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * Atualiza os pontos e/ou assiduidade de um usuário.
     * @param {number} userId ID do usuário.
     * @param {number} pointsToAdd Pontos a serem adicionados (pode ser negativo).
     * @param {number} assiduidadeDays Novo valor da assiduidade em dias.
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    static async updatePointsAndAssiduidade(userId, pointsToAdd, assiduidadeDays) {
        const result = await run(`
            UPDATE Usuario 
            SET pontos = pontos + ?, assiduidade_dias = ? 
            WHERE id_usuario = ?
        `, [pointsToAdd, assiduidadeDays, userId]);
        return { changes: result.changes };
    }

    /**
     * Atualiza a data do último login e a assiduidade de um usuário.
     * @param {number} userId ID do usuário.
     * @param {string} newLastLoginDate Nova data/hora do último login (ISO string).
     * @param {number} newAssiduidadeDays Novo valor da assiduidade em dias.
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    static async updateLoginInfo(userId, newLastLoginDate, newAssiduidadeDays) {
        return run(`
            UPDATE Usuario 
            SET ultimo_login = ?, assiduidade_dias = ? 
            WHERE id_usuario = ?
        `, [newLastLoginDate, newAssiduidadeDays, userId]);
    }

    /**
     * Atualiza a senha de um usuário e limpa os campos de token de redefinição.
     * @param {number} id_usuario ID do usuário.
     * @param {string} novaSenhaHash Nova senha já hashed.
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    static async updatePassword(id_usuario, novaSenhaHash) {
        return run(
            'UPDATE Usuario SET senha = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id_usuario = ?',
            [novaSenhaHash, id_usuario]
        );
    }

    /**
     * Salva o token de redefinição de senha e sua data de expiração para um usuário.
     * @param {string} email O e-mail do usuário.
     * @param {string} token O token de redefinição.
     * @param {string} expires A data de expiração do token (ISO string).
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    static async saveResetToken(email, token, expires) {
        return run(
            'UPDATE Usuario SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE email = ?',
            [token, expires, email]
        );
    }

    /**
     * Encontra um usuário pelo seu token de redefinição de senha, verificando a validade.
     * @param {string} token O token de redefinição.
     * @returns {Promise<Object|null>} O objeto do usuário ou null se o token for inválido/expirado.
     */
    static async findByResetToken(token) {
        const now = new Date().toISOString(); 
        return get(
            'SELECT * FROM Usuario WHERE resetPasswordToken = ? AND resetPasswordExpires > ?',
            [token, now]
        );
    }
}

module.exports = Usuario;