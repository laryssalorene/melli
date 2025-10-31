// scripts/models/Usuario.js
// CORRIGIDO: Caminho do db.js
// A referência correta é ../db, pois ambos Usuario.js e db.js estão na pasta 'scripts'
const { get, run, all } = require('../db'); 
const bcrypt = require('bcryptjs');

const saltRounds = 10;

class Usuario {
    constructor(data) {
        this.id_usuario = data.id_usuario;
        this.nome = data.nome;
        this.email = data.email;
        this.senha = data.senha; // A senha já deve ser o hash
        this.pontos = data.pontos || 0;
        this.assiduidade_dias = data.assiduidade_dias || 0;
        this.data_registro = data.data_registro;
        this.ultimo_login = data.ultimo_login;
        this.mascote_id = data.mascote_id;
        this.resetPasswordToken = data.resetPasswordToken;
        this.resetPasswordExpires = data.resetPasswordExpires ? new Date(data.resetPasswordExpires) : null; // Converte para Date
    }

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
     * @returns {Promise<Usuario|null>} A instância do usuário ou null se não encontrado.
     */
    static async findByEmail(email) {
        const row = await get(`SELECT * FROM Usuario WHERE email = ?`, [email]);
        return row ? new Usuario(row) : null;
    }

    /**
     * Encontra um usuário pelo seu ID.
     * @param {number} id O ID do usuário a ser procurado.
     * @returns {Promise<Usuario|null>} A instância do usuário (com a senha para operações internas) ou null se não encontrado.
     */
    static async findById(id) {
        const row = await get(`SELECT * FROM Usuario WHERE id_usuario = ?`, [id]);
        return row ? new Usuario(row) : null;
    }

    /**
     * Cria um novo usuário no banco de dados.
     * @param {string} nome Nome do usuário.
     * @param {string} email E-mail do usuário (deve ser único).
     * @param {string} senha Texto puro da senha do usuário.
     * @param {number|null} mascote_id ID do mascote escolhido (opcional).
     * @returns {Promise<Usuario>} A instância do novo usuário.
     * @throws {Error} Se o e-mail já estiver cadastrado ou ocorrer outro erro no DB.
     */
    static async create(nome, email, senha, mascote_id = null) {
        try {
            const hashedPassword = await bcrypt.hash(senha, saltRounds); // Hash da senha aqui
            const result = await run(`
                INSERT INTO Usuario (nome, email, senha, pontos, assiduidade_dias, mascote_id)
                VALUES (?, ?, ?, 0, 0, ?)
            `, [nome, email, hashedPassword, mascote_id]);

            // Retorna uma instância completa do novo usuário
            return Usuario.findById(result.lastID);

        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                throw new Error("E-mail já cadastrado.");
            }
            throw new Error(`Erro ao criar novo usuário no banco de dados: ${err.message}`);
        }
    }

    /**
     * NOVO MÉTODO ESTÁTICO: Obter o ranking de usuários
     * @returns {Promise<Array<Object>>} Uma lista de objetos de usuário com nome, pontos e mascote_id, ordenados por pontos.
     */
    static async getRanking() {
        // Seleciona apenas os campos necessários para o ranking
        const rows = await all('SELECT id_usuario, nome, pontos, mascote_id FROM Usuario ORDER BY pontos DESC, nome ASC');
        return rows; 
    }

    /**
     * Compara uma senha em texto puro com a senha hashed desta instância de usuário.
     * @param {string} plainPassword Senha em texto puro.
     * @returns {Promise<boolean>} True se as senhas coincidirem, false caso contrário.
     */
    async comparePassword(plainPassword) {
        return bcrypt.compare(plainPassword, this.senha);
    }

    /**
     * Atualiza os pontos de um usuário.
     * Este é um método de instância.
     * @param {number} pointsToAdd Pontos a serem adicionados (pode ser negativo).
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    async updatePoints(pointsToAdd) {
        const result = await run(`
            UPDATE Usuario
            SET pontos = pontos + ?
            WHERE id_usuario = ?
        `, [pointsToAdd, this.id_usuario]);
        this.pontos += pointsToAdd; // Atualiza a instância também
        return { changes: result.changes };
    }


    /**
     * Atualiza a data do último login e a assiduidade de um usuário.
     * @param {string} newLastLoginDate Nova data/hora do último login (ISO string).
     * @param {number} newAssiduidadeDays Novo valor da assiduidade em dias.
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    async updateLoginInfo(newLastLoginDate, newAssiduidadeDays) {
        const result = await run(`
            UPDATE Usuario
            SET ultimo_login = ?, assiduidade_dias = ?
            WHERE id_usuario = ?
        `, [newLastLoginDate, newAssiduidadeDays, this.id_usuario]);
        this.ultimo_login = newLastLoginDate; // Atualiza a instância
        this.assiduidade_dias = newAssiduidadeDays;
        return { changes: result.changes };
    }

    /**
     * Atualiza a senha deste usuário e limpa os campos de token de redefinição.
     * Este é um método de instância.
     * @param {string} newPassword Texto puro da nova senha.
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    async updatePassword(newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        const result = await run(
            'UPDATE Usuario SET senha = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id_usuario = ?',
            [hashedPassword, this.id_usuario]
        );
        this.senha = hashedPassword; // Atualiza a instância
        this.resetPasswordToken = null;
        this.resetPasswordExpires = null;
        return { changes: result.changes };
    }

    /**
     * Salva o token de redefinição de senha e sua data de expiração para ESTE usuário.
     * Este é um método de instância.
     * @param {string} token O token de redefinição.
     * @param {Date} expires A data de expiração do token (objeto Date).
     * @returns {Promise<Object>} Objeto com o número de alterações no DB.
     */
    async saveResetToken(token, expires) {
        const result = await run(
            'UPDATE Usuario SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id_usuario = ?',
            [token, expires.toISOString(), this.id_usuario] // Converte Date para ISO string
        );
        this.resetPasswordToken = token; // Atualiza a instância
        this.resetPasswordExpires = expires; // Mantém como Date
        return { changes: result.changes };
    }

    /**
     * Encontra um usuário pelo seu token de redefinição de senha, verificando a validade.
     * @param {string} token O token de redefinição.
     * @returns {Promise<Usuario|null>} A instância do usuário ou null se o token for inválido/expirado.
     */
    static async findByResetToken(token) {
        const now = new Date().toISOString();
        const row = await get(
            'SELECT * FROM Usuario WHERE resetPasswordToken = ? AND resetPasswordExpires > ?',
            [token, now]
        );
        return row ? new Usuario(row) : null;
    }
}

module.exports = Usuario;