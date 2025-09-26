// scripts/models/Usuario.js
const { get, run, all } = require('../db'); 

class Usuario {
    /**
     * Cria a tabela 'Usuario' no banco de dados se ela não existir.
     * Inclui campos como nome, email, senha, pontos, assiduidade, data de registro,
     * último login e ID do mascote.
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
                data_registro TEXT DEFAULT CURRENT_TIMESTAMP,
                ultimo_login TEXT DEFAULT CURRENT_TIMESTAMP,
                mascote_id INTEGER DEFAULT NULL,
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
     * @returns {Promise<Object|null>} O objeto do usuário (sem a senha) ou null se não encontrado.
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
            const data_registro = new Date().toISOString().split('T')[0];
            const result = await run(`
                INSERT INTO Usuario (nome, email, senha, pontos, assiduidade_dias, data_registro, ultimo_login, mascote_id)
                VALUES (?, ?, ?, 0, 0, ?, ?, ?)
            `, [nome, email, senhaHash, data_registro, data_registro, mascote_id]); // ultimo_login inicial é data_registro

            return { 
                id_usuario: result.lastID, 
                nome, 
                email, 
                pontos: 0, 
                assiduidade_dias: 0, 
                data_registro, 
                ultimo_login: data_registro, 
                mascote_id 
            };
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                throw new Error("E-mail já cadastrado.");
            }
            throw new Error(`Erro ao criar novo usuário no banco de dados: ${err.message}`);
        }
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
     * @param {string} lastLoginDate Data do último login no formato YYYY-MM-DD.
     * @param {number} assiduidadeDays Valor da assiduidade em dias.
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    static async updateLoginInfo(userId, lastLoginDate, assiduidadeDays) {
        return run(`
            UPDATE Usuario 
            SET ultimo_login = ?, assiduidade_dias = ? 
            WHERE id_usuario = ?
        `, [lastLoginDate, assiduidadeDays, userId]);
    }

    // Você pode adicionar outros métodos aqui conforme a necessidade, por exemplo:
    // static async delete(userId) { ... }
    // static async updatePassword(userId, newPasswordHash) { ... }
}

module.exports = Usuario;