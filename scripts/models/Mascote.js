// scripts/models/Mascote.js
const { run, get, all } = require('../db');

class Mascote {
    static createTable() {
        return run(`
            CREATE TABLE IF NOT EXISTS Mascote (
                id_mascote INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                descricao TEXT,
                imagem_url TEXT
                -- Outros campos relevantes para um mascote
            )
        `);
    }

    // Opcional: Métodos para adicionar mascotes padrão ou buscar
    static async addMascote(nome, descricao, imagem_url) {
        try {
            const result = await run(
                'INSERT INTO Mascote (nome, descricao, imagem_url) VALUES (?, ?, ?)',
                [nome, descricao, imagem_url]
            );
            return { id_mascote: result.lastID, nome, descricao, imagem_url };
        } catch (error) {
            if (error.message.includes('UNIQUE constraint failed')) {
                console.warn(`Mascote "${nome}" já existe. Pulando inserção.`);
                return await get('SELECT * FROM Mascote WHERE nome = ?', [nome]); // Retorna o existente
            }
            throw error;
        }
    }

    static async getAllMascotes() {
        return all('SELECT * FROM Mascote');
    }

    static async findMascoteById(id) {
        return get('SELECT * FROM Mascote WHERE id_mascote = ?', [id]);
    }
}

module.exports = Mascote;