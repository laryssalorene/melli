const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mellihero.db'); // Caminho para o seu DB

async function runMigrations() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, async (err) => {
            if (err) {
                console.error('Erro ao conectar ao banco de dados para migração:', err.message);
                return reject(err);
            }
            console.log('Conectado ao banco de dados para migração.');

            // Usamos db.serialize para garantir que os comandos rodem em sequência
            db.serialize(() => {
                console.log('Iniciando migrações...');

                // 1. Excluir a tabela Progresso_Modulo
                db.run(`DROP TABLE IF EXISTS Progresso_Modulo;`, (err) => {
                    if (err) {
                        console.error("Erro ao dropar Progresso_Modulo:", err.message);
                        // continue, pois o IF EXISTS pode significar que ela já não existia
                    } else {
                        console.log("Tabela Progresso_Modulo removida (se existia).");
                    }
                });

                // 2. Excluir a tabela Progresso_Unidade (se necessário para recriar Progresso)
                db.run(`DROP TABLE IF EXISTS Progresso_Unidade;`, (err) => {
                    if (err) {
                        console.error("Erro ao dropar Progresso_Unidade:", err.message);
                    } else {
                        console.log("Tabela Progresso_Unidade removida (se existia).");
                    }
                });

                // 3. Criar a nova tabela Progresso
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
                    );
                `, (err) => {
                    if (err) {
                        console.error("Erro ao criar tabela Progresso:", err.message);
                        return reject(err);
                    }
                    console.log("Tabela Progresso verificada/criada.");
                });

                db.close((err) => {
                    if (err) {
                        console.error('Erro ao fechar o banco de dados:', err.message);
                        return reject(err);
                    }
                    console.log('Migrações concluídas e banco de dados fechado.');
                    resolve();
                });
            });
        });
    });
}

// Executar o script de migração
runMigrations().catch(error => {
    console.error('A migração falhou:', error);
});