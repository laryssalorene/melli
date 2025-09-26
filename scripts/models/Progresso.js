// scripts/models/Progresso.js
const { get, run, all } = require('../db'); 

class Progresso {
    static createTable() {
        return run(`
            CREATE TABLE IF NOT EXISTS progresso_usuario (
                id_progresso INTEGER PRIMARY KEY AUTOINCREMENT,
                id_usuario INTEGER NOT NULL,
                id_modulo INTEGER NOT NULL,
                id_unidade INTEGER NOT NULL,
                completo BOOLEAN DEFAULT 0,
                pontuacao_unidade INTEGER DEFAULT 0,
                data_conclusao TEXT,
                FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
                UNIQUE(id_usuario, id_modulo, id_unidade)
            )
        `);
    }

    static async setUnidadeConcluida(id_usuario, id_modulo, id_unidade, pontuacao_unidade = 0) {
        const data_conclusao = new Date().toISOString().split('T')[0]; 
        
        const result = await run(`
            INSERT INTO progresso_usuario (id_usuario, id_modulo, id_unidade, completo, pontuacao_unidade, data_conclusao)
            VALUES (?, ?, ?, 1, ?, ?)
            ON CONFLICT(id_usuario, id_modulo, id_unidade) DO UPDATE SET
                completo = 1,
                pontuacao_unidade = ?,
                data_conclusao = ?
        `, [id_usuario, id_modulo, id_unidade, pontuacao_unidade, data_conclusao, pontuacao_unidade, data_conclusao]);
        
        return { message: 'Progresso da unidade registrado/atualizado com sucesso.', id_progresso: result.lastID };
    }

    static async getProgressoUsuario(id_usuario) {
        const rows = await all(`
            SELECT id_modulo, id_unidade, completo, pontuacao_unidade, data_conclusao
            FROM progresso_usuario
            WHERE id_usuario = ?
        `, [id_usuario]);
        
        const progressoFormatado = rows.map(row => ({
            ...row,
            completo: row.completo === 1
        }));
        return progressoFormatado;
    }

    static async isUnitCompleted(id_usuario, id_unidade) {
        const result = await get(
            'SELECT completo FROM progresso_usuario WHERE id_usuario = ? AND id_unidade = ? AND completo = 1',
            [id_usuario, id_unidade]
        );
        return !!result; 
    }

    static async resetProgresso(id_usuario) {
        const result = await run(`DELETE FROM progresso_usuario WHERE id_usuario = ?`, [id_usuario]);
        return { message: 'Progresso resetado com sucesso para o usuário.', changes: result.changes };
    }
}

module.exports = Progresso;