// scripts/models/Progresso.js

const { get, run, all } = require('../db');

class Progresso {
    constructor(data) {
        this.id_progresso = data.id_progresso;
        this.id_usuario = data.id_usuario;
        this.id_modulo = data.id_modulo;
        this.id_unidade = data.id_unidade;
        this.completo = data.completo === 1; // Converte o valor do DB (0 ou 1) para boolean
        this.pontuacao_unidade = data.pontuacao_unidade;
        this.data_conclusao = data.data_conclusao;
    }

    static async createTable() {
        await run(`
            CREATE TABLE IF NOT EXISTS progresso_usuario (
                id_progresso INTEGER PRIMARY KEY AUTOINCREMENT,
                id_usuario INTEGER NOT NULL,
                id_modulo TEXT NOT NULL,       -- DEFINIDO COMO TEXT para corresponder aos IDs de JSON (ex: "modulo-1")
                id_unidade TEXT NOT NULL,      -- DEFINIDO COMO TEXT para corresponder aos IDs de JSON (ex: "unidade-intro")
                completo INTEGER DEFAULT 0,    -- SQLite usa INTEGER (0 para false, 1 para true)
                pontuacao_unidade INTEGER DEFAULT 0,
                data_conclusao TEXT DEFAULT NULL, -- SQLite armazena DATETIME como TEXT (ISO 8601 string)
                FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
                UNIQUE(id_usuario, id_modulo, id_unidade) -- Garante que um usuário só tenha um progresso por unidade/módulo
            )
        `);
        console.log("Tabela 'progresso_usuario' verificada/criada.");
    }

    static async setUnidadeConcluida(id_usuario, id_modulo, id_unidade, completo, pontuacao_unidade = 0) {
        // Garante que 'completo' seja 1 para true, 0 para false
        const completoNum = completo ? 1 : 0; 
        const data_conclusao = completo ? new Date().toISOString() : null; // Define data apenas se completa

        const result = await run(`
            INSERT INTO progresso_usuario (id_usuario, id_modulo, id_unidade, completo, pontuacao_unidade, data_conclusao)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(id_usuario, id_modulo, id_unidade) DO UPDATE SET
                completo = EXCLUDED.completo,
                pontuacao_unidade = EXCLUDED.pontuacao_unidade,
                data_conclusao = EXCLUDED.data_conclusao
        `, [
            id_usuario,
            id_modulo,
            id_unidade,
            completoNum,
            pontuacao_unidade,
            data_conclusao
        ]);

        return { message: 'Progresso da unidade registrado/atualizado com sucesso.', id_progresso: result.lastID || (await Progresso.getProgressoByUnit(id_usuario, id_modulo, id_unidade)).id_progresso };
    }

    // =========================================================
    // MÉTODO: Adiciona pontos ao saldo do usuário na tabela Usuario
    // Este método interage com a tabela Usuario para adicionar pontos.
    // =========================================================
    static async addUserPoints(id_usuario, pointsToAdd) {
        if (pointsToAdd <= 0) return { changes: 0, message: "Nenhum ponto adicionado." };

        const result = await run(`
            UPDATE Usuario
            SET pontos = pontos + ?
            WHERE id_usuario = ?
        `, [pointsToAdd, id_usuario]);

        return { changes: result.changes, totalPointsAdded: pointsToAdd };
    }

    static async getProgressoUsuario(id_usuario) {
        const rows = await all(`
            SELECT id_modulo, id_unidade, completo, pontuacao_unidade, data_conclusao
            FROM progresso_usuario
            WHERE id_usuario = ?
        `, [id_usuario]);

        // Mapeia para objetos Progresso para consistência
        return rows.map(row => new Progresso(row));
    }

    static async getProgressoUsuarioPorModulo(id_usuario, id_modulo) {
        const rows = await all(`
            SELECT id_unidade, completo, pontuacao_unidade, data_conclusao
            FROM progresso_usuario
            WHERE id_usuario = ? AND id_modulo = ?
        `, [id_usuario, id_modulo]);

        // Mapeia para objetos Progresso (apenas as partes relevantes da unidade)
        return rows.map(row => ({
            id_unidade: row.id_unidade,
            completo: row.completo === 1,
            pontuacao_unidade: row.pontuacao_unidade,
            data_conclusao: row.data_conclusao
        }));
    }

    static async getProgressoByUnit(id_usuario, id_modulo, id_unidade) {
        const row = await get(`
            SELECT id_progresso, id_modulo, id_unidade, completo, pontuacao_unidade, data_conclusao
            FROM progresso_usuario
            WHERE id_usuario = ? AND id_modulo = ? AND id_unidade = ?
        `, [id_usuario, id_modulo, id_unidade]);

        return row ? new Progresso(row) : null;
    }

    static async isUnitCompleted(id_usuario, id_modulo, id_unidade) { // Adicionei id_modulo aqui para ser mais específico
        const result = await get(
            'SELECT completo FROM progresso_usuario WHERE id_usuario = ? AND id_modulo = ? AND id_unidade = ? AND completo = 1',
            [id_usuario, id_modulo, id_unidade]
        );
        return !!result;
    }

    static async resetProgresso(id_usuario) {
        const result = await run(`DELETE FROM progresso_usuario WHERE id_usuario = ?`, [id_usuario]);
        return { message: 'Progresso resetado com sucesso para o usuário.', changes: result.changes };
    }
}

module.exports = Progresso;