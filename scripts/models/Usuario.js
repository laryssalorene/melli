// scripts/models/Usuario.js
const { get, run, all } = require('../db');
const bcrypt = require('bcryptjs'); // A importação de bcryptjs está correta aqui

class Usuario {
    constructor(data) {
        this.id_usuario = data.id_usuario;
        this.nickname = data.nickname;
        this.email = data.email; // O email aqui é o valor CRIPTOGRAFADO vindo do DB
        this.senha = data.senha;
        this.mascote_id = data.mascote_id;
        this.pontos = data.pontos;
        this.ultimo_login = data.ultimo_login;
        this.assiduidade_dias = data.assiduidade_dias;
        this.reset_token = data.reset_token;
        this.reset_token_expires = data.reset_token_expires;
        this.data_registro = data.data_registro; 
    }

    static async createTable() {
        await run(`
            CREATE TABLE IF NOT EXISTS Usuario (
                id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT UNIQUE COLLATE NOCASE NOT NULL,
                email TEXT UNIQUE COLLATE NOCASE NOT NULL,
                senha TEXT NOT NULL,
                mascote_id INTEGER,
                pontos INTEGER DEFAULT 0,
                ultimo_login TEXT,
                assiduidade_dias INTEGER DEFAULT 0,
                reset_token TEXT,
                reset_token_expires TEXT,
                data_registro TEXT DEFAULT CURRENT_TIMESTAMP, 
                FOREIGN KEY (mascote_id) REFERENCES Mascote(id_mascote)
            )
        `);
        console.log("Tabela 'Usuario' verificada/criada.");
    }
    
    // Este método 'create' recebe a senha em texto puro e a hasheia
    static async create(nickname, encryptedEmail, plainTextPassword, mascote_id = null) { 
        try {
            const hashedPassword = await bcrypt.hash(plainTextPassword, 10); // Hash da senha em texto puro
            
            const result = await run(
                `INSERT INTO Usuario (nickname, email, senha, mascote_id) VALUES (?, ?, ?, ?)`,
                [nickname, encryptedEmail, hashedPassword, mascote_id]
            );
            return new Usuario({
                id_usuario: result.lastID,
                nickname,
                email: encryptedEmail, // Retorna o e-mail como foi salvo (CRIPTOGRAFADO)
                senha: hashedPassword, // A senha aqui é o hash
                mascote_id,
                pontos: 0,
                assiduidade_dias: 0,
                data_registro: new Date().toISOString()
            });
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Usuario.nickname')) {
                throw new Error("Nickname já está em uso.");
            }
            if (err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                throw new Error("E-mail já está em uso."); 
            }
            throw err;
        }
    }

    static async findById(id_usuario) {
        const row = await get(`SELECT * FROM Usuario WHERE id_usuario = ?`, [id_usuario]);
        return row ? new Usuario(row) : null; 
    }

    static async findByNickname(nickname) {
        const row = await get(`SELECT * FROM Usuario WHERE nickname = ? COLLATE NOCASE`, [nickname]);
        return row ? new Usuario(row) : null; 
    }

    static async findByEncryptedEmail(encryptedEmail) {
        const row = await get(`SELECT * FROM Usuario WHERE email = ? COLLATE NOCASE`, [encryptedEmail]);
        return row ? new Usuario(row) : null; 
    }

    // Método para comparar a senha (usado nos serviços) - JÁ ESTAVA CORRETO
    async comparePassword(plainTextPassword) {
        return await bcrypt.compare(plainTextPassword, this.senha);
    }

    async update() {
        try {
            const result = await run(
                `UPDATE Usuario SET nickname = ?, email = ?, mascote_id = ?, pontos = ?, ultimo_login = ?, assiduidade_dias = ?, reset_token = ?, reset_token_expires = ?, data_registro = ? WHERE id_usuario = ?`,
                [this.nickname, this.email, this.mascote_id, this.pontos, this.ultimo_login, this.assiduidade_dias, this.reset_token, this.reset_token_expires, this.data_registro, this.id_usuario]
            );
            return result.changes > 0;
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Usuario.nickname')) {
                throw new Error("Nickname já está em uso.");
            }
            if (err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                throw new Error("E-mail já está em uso.");
            }
            throw err;
        }
    }

    async saveResetToken(token, expires) {
        this.reset_token = token;
        this.reset_token_expires = expires.toISOString();
        await this.update(); 
    }

    static async findByResetToken(token) {
        const row = await get(`SELECT * FROM Usuario WHERE reset_token = ?`, [token]);
        if (!row) return null;

        const user = new Usuario(row);
        if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
            return null; 
        }
        return user;
    }

    // Atualiza apenas a senha (recebe senha em texto puro, hasheia e salva) - JÁ ESTAVA CORRETO
    async updatePassword(newPassword) {
        this.senha = await bcrypt.hash(newPassword, 10);
        await run(`UPDATE Usuario SET senha = ?, reset_token = NULL, reset_token_expires = NULL WHERE id_usuario = ?`, [this.senha, this.id_usuario]);
    }

    async updateLoginInfo(ultimo_login, assiduidade_dias) {
        await run(`UPDATE Usuario SET ultimo_login = ?, assiduidade_dias = ? WHERE id_usuario = ?`, 
            [ultimo_login, assiduidade_dias, this.id_usuario]);
        this.ultimo_login = ultimo_login;
        this.assiduidade_dias = assiduidade_dias;
    }

    async updatePoints(pointsToAdd) {
        this.pontos += pointsToAdd;
        await run(`UPDATE Usuario SET pontos = ? WHERE id_usuario = ?`, [this.pontos, this.id_usuario]);
    }

    static async getRanking() {
        const rows = await all(`SELECT nickname, pontos, mascote_id FROM Usuario ORDER BY pontos DESC LIMIT 10`);
        return rows.map(row => new Usuario(row)); 
    }

    static async delete(id_usuario) {
        const result = await run(`DELETE FROM Usuario WHERE id_usuario = ?`, [id_usuario]);
        return result; 
    }
}

// Garante que a tabela é criada quando o modelo é carregado
Usuario.createTable().catch(err => {
    console.error("Erro ao criar tabela de Usuário na inicialização:", err);
});

module.exports = Usuario;