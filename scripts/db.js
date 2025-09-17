const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'mellihero.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.message);
        throw err;
    } else {
        console.log('Conectado ao banco de dados mellihero.db.');
        initializeDatabaseSchema();
    }
});

function initializeDatabaseSchema() {
    console.log('Iniciando verificação do esquema do banco de dados...');
    db.serialize(() => {
        // Tabela Usuario
        db.run(`
            CREATE TABLE IF NOT EXISTS Usuario (
                id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
                nome TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                senha TEXT NOT NULL,
                pontos INTEGER DEFAULT 0,
                assiduidade_dias INTEGER DEFAULT 0,
                data_registro DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `, (err) => {
            if (err) console.error("Erro ao criar tabela Usuario:", err.message);
            else console.log('Tabela Usuario verificada.');
        });
        
        // Tabela Progresso
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
            if (err) console.error("Erro ao criar tabela Progresso:", err.message);
            else console.log('Tabela Progresso verificada.');
        });
        
        console.log('Verificação do esquema do banco de dados concluída.');
    });
}

// <<-- CORREÇÃO CRÍTICA AQUI -->>
// Exporta a instância do banco de dados como uma propriedade de um objeto.
// Isso alinha com a forma como seus modelos fazem `const { db } = ...`.
module.exports = { db };