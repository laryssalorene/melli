// scripts/models/Usuario.js
const { get, run, all } = require('../db');
const bcrypt = require('bcryptjs'); 

class Usuario {
    constructor(data) {
        this.id_usuario = data.id_usuario;
        this.nickname = data.nickname;
        this.email = data.email; 
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
    
    static async create(nickname, encryptedEmail, plainTextPassword, mascote_id = null) { 
        try {
            const hashedPassword = await bcrypt.hash(plainTextPassword, 10); 
            
            const result = await run(
                `INSERT INTO Usuario (nickname, email, senha, mascote_id) VALUES (?, ?, ?, ?)`,
                [nickname, encryptedEmail, hashedPassword, mascote_id]
            );
            return new Usuario({
                id_usuario: result.lastID,
                nickname,
                email: encryptedEmail, 
                senha: hashedPassword, 
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
                throw new Error("E-mail já cadastrado."); // Alterei para 'cadastrado' para ser mais consistente com a msg do authService
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

    async comparePassword(plainTextPassword) {
        return await bcrypt.compare(plainTextPassword, this.senha);
    }

    // O método update genérico está um pouco problemático para múltiplos campos
    // Vamos ajustá-lo para ser mais flexível e robusto.
    // Ou, para simplificar, se você só precisa de `updateLoginInfo` e `updatePassword`,
    // podemos remover este `update` genérico e confiar nos específicos.
    // No seu caso, o `userService.js` já tem um `updateProfile` que lida com isso.
    // Vou manter a versão mais recente que você tinha do `update` aqui (que estava no `Usuario.js` anteriormente)
    // Se o userService estiver usando `update` neste modelo, o abaixo funcionará.
    async update(updates) { // Recebe um objeto de updates, não precisa de 'this' para todos
        const fields = [];
        const params = [];

        if (updates.nickname !== undefined) {
            fields.push('nickname = ?');
            params.push(updates.nickname);
        }
        if (updates.email !== undefined) { // Já criptografado
            fields.push('email = ?');
            params.push(updates.email);
        }
        if (updates.senha !== undefined) { // Já hashed
            fields.push('senha = ?');
            params.push(updates.senha);
        }
        if (updates.mascote_id !== undefined) {
            fields.push('mascote_id = ?');
            params.push(updates.mascote_id);
        }
        if (updates.pontos !== undefined) {
            fields.push('pontos = ?');
            params.push(updates.pontos);
        }
        if (updates.ultimo_login !== undefined) {
            fields.push('ultimo_login = ?');
            params.push(updates.ultimo_login);
        }
        if (updates.assiduidade_dias !== undefined) {
            fields.push('assiduidade_dias = ?');
            params.push(updates.assiduidade_dias);
        }
        if (updates.reset_token !== undefined) {
            fields.push('reset_token = ?');
            params.push(updates.reset_token);
        }
        if (updates.reset_token_expires !== undefined) {
            fields.push('reset_token_expires = ?');
            params.push(updates.reset_token_expires);
        }
        if (updates.data_registro !== undefined) {
            fields.push('data_registro = ?');
            params.push(updates.data_registro);
        }

        if (fields.length === 0) {
            return false; // Nenhum campo para atualizar
        }

        params.push(this.id_usuario); // Condição WHERE
        const stmt = `UPDATE Usuario SET ${fields.join(', ')} WHERE id_usuario = ?`;

        try {
            const result = await run(stmt, params);
            // Atualiza a instância atual com os novos valores
            Object.assign(this, updates);
            return result.changes > 0;
        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Usuario.nickname')) {
                throw new Error("Nickname já está em uso.");
            }
            if (err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                throw new Error("E-mail já cadastrado.");
            }
            throw err;
        }
    }


    async saveResetToken(token, expires) {
        this.reset_token = token;
        this.reset_token_expires = expires.toISOString();
        // Usando o método update mais genérico
        await this.update({ reset_token: this.reset_token, reset_token_expires: this.reset_token_expires }); 
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

    async updatePassword(newPassword) {
        this.senha = await bcrypt.hash(newPassword, 10);
        await run(`UPDATE Usuario SET senha = ?, reset_token = NULL, reset_token_expires = NULL WHERE id_usuario = ?`, [this.senha, this.id_usuario]);
        // Atualiza a instância local também
        this.reset_token = null;
        this.reset_token_expires = null;
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

Usuario.createTable().catch(err => {
    console.error("Erro ao criar tabela de Usuário na inicialização:", err);
    process.exit(1);
});

module.exports = Usuario;