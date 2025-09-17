// scripts/models/Progresso.js
// <<-- CORREÇÃO AQUI: Use a desestruturação para pegar a instância do db
const { db } = require('../db'); 

class Progresso {
    /**
     * Cria a tabela 'Progresso' no banco de dados se ela ainda não existir.
     */
    static createTable() {
        return new Promise((resolve, reject) => {
            db.run(`
                CREATE TABLE IF NOT EXISTS Progresso (
                    id_progresso INTEGER PRIMARY KEY AUTOINCREMENT,
                    id_usuario INTEGER NOT NULL,
                    id_modulo INTEGER NOT NULL,
                    id_unidade INTEGER NOT NULL,
                    concluido BOOLEAN DEFAULT 0,
                    pontuacao INTEGER DEFAULT 0,
                    data_conclusao TEXT,
                    FOREIGN KEY (id_usuario) REFERENCES Usuario(id_usuario) ON DELETE CASCADE,
                    UNIQUE(id_usuario, id_modulo, id_unidade)
                )
            `, (err) => {
                if (err) {
                    console.error("Erro ao criar tabela Progresso:", err.message);
                    return reject(err);
                }
                console.log("Tabela Progresso verificada/criada.");
                resolve();
            });
        });
    }

    /**
     * Registra ou atualiza o progresso de uma unidade para um usuário.
     */
    static async setUnidadeConcluida(id_usuario, id_modulo, id_unidade, pontuacao = 0) {
        return new Promise((resolve, reject) => {
            const data_conclusao = new Date().toISOString();
            db.run(`
                INSERT INTO Progresso (id_usuario, id_modulo, id_unidade, concluido, pontuacao, data_conclusao)
                VALUES (?, ?, ?, 1, ?, ?)
                ON CONFLICT(id_usuario, id_modulo, id_unidade) DO UPDATE SET
                    concluido = 1,
                    pontuacao = ?,
                    data_conclusao = ?
            `, [id_usuario, id_modulo, id_unidade, pontuacao, data_conclusao, pontuacao, data_conclusao], function(err) {
                if (err) {
                    console.error("Erro ao registrar progresso da unidade:", err.message);
                    return reject(err);
                }
                resolve({ message: 'Progresso da unidade registrado/atualizado com sucesso.', id_progresso: this.lastID });
            });
        });
    }

    /**
     * Obtém todo o progresso de um usuário.
     */
    static async getProgressoUsuario(id_usuario) {
        return new Promise((resolve, reject) => {
            db.all(`
                SELECT id_modulo, id_unidade, concluido, pontuacao, data_conclusao
                FROM Progresso
                WHERE id_usuario = ?
            `, [id_usuario], (err, rows) => {
                if (err) {
                    console.error("Erro ao buscar progresso do usuário:", err.message);
                    return reject(err);
                }
                const progressoFormatado = rows.map(row => ({
                    ...row,
                    concluido: row.concluido === 1
                }));
                resolve(progressoFormatado);
            });
        });
    }

    /**
     * Reseta todo o progresso de um usuário.
     */
    static async resetProgresso(id_usuario) {
        return new Promise((resolve, reject) => {
            db.run(`DELETE FROM Progresso WHERE id_usuario = ?`, [id_usuario], (err) => {
                if (err) {
                    console.error("Erro ao resetar progresso do usuário:", err.message);
                    return reject(err);
                }
                resolve({ message: 'Progresso resetado com sucesso para o usuário.', changes: this.changes });
            });
        });
    }
}

module.exports = Progresso;