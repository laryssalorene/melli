// scripts/models/Mascote.js
const { run, get, all } = require('../db');

class Mascote {
    // Adicionando um construtor para criar instâncias do Mascote
    constructor(id_mascote, nome, descricao, imagem_url) {
        this.id_mascote = id_mascote;
        this.nome = nome;
        this.descricao = descricao;
        this.imagem_url = imagem_url;
    }

    static createTable() {
        return run(`
            CREATE TABLE IF NOT EXISTS Mascote (
                id_mascote INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL UNIQUE,
                descricao TEXT,
                imagem_url TEXT
            )
        `);
    }

    // =======================================================
    // NOVO: Adiciona a função findByName
    // =======================================================
    static async findByName(nome) {
        const row = await get('SELECT * FROM Mascote WHERE nome = ?', [nome]);
        return row ? new Mascote(row.id_mascote, row.nome, row.descricao, row.imagem_url) : null;
    }

    // =======================================================
    // MÉTODO addMascote atualizado para usar findByName
    // =======================================================
    static async addMascote(nome, descricao, imagem_url) {
        const existingMascote = await this.findByName(nome); // Usa o novo findByName
        if (existingMascote) {
            // console.warn(`Mascote "${nome}" já existe. Retornando o mascote existente.`); // Opcional: logar
            return existingMascote; // Retorna o objeto Mascote existente
        }

        const result = await run(
            'INSERT INTO Mascote (nome, descricao, imagem_url) VALUES (?, ?, ?)',
            [nome, descricao, imagem_url]
        );
        // Retorna uma nova instância de Mascote para o recém-criado
        return new Mascote(result.lastID, nome, descricao, imagem_url);
    }

    // =======================================================
    // MÉTODO findById renomeado para seguir padrão de findByName
    // =======================================================
    static async findById(id) { // O nome do método é findById, então o parâmetro id faz mais sentido
        const row = await get('SELECT * FROM Mascote WHERE id_mascote = ?', [id]);
        return row ? new Mascote(row.id_mascote, row.nome, row.descricao, row.imagem_url) : null;
    }

    static async getAllMascotes() {
        const rows = await all('SELECT * FROM Mascote');
        return rows.map(row => new Mascote(row.id_mascote, row.nome, row.descricao, row.imagem_url));
    }
}

// Certifique-se de chamar createTable() para garantir que a tabela existe
Mascote.createTable().catch(err => {
    console.error("Erro ao criar tabela de Mascote na inicialização:", err);
});

module.exports = Mascote;