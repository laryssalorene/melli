// scripts/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../mellihero.db'); 

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
        process.exit(1); // Encerrar a aplicação se a conexão ao DB falhar
    } else {
        console.log('Conectado ao banco de dados mellihero.db.'); 
        db.run('PRAGMA foreign_keys = ON;', (pragmaErr) => {
            if (pragmaErr) {
                console.error('Erro ao habilitar FOREIGN KEYS:', pragmaErr.message);
            } else {
                console.log('FOREIGN KEYS ativadas.');
                
                // =======================================================
                // APENAS AS TABELAS QUE PRECISAM DE PERSISTÊNCIA NO DB
                // =======================================================
                require('./models/Usuario').createTable().catch(e => console.error("Erro ao criar tabela Usuario:", e));
                require('./models/Mascote').createTable().catch(e => console.error("Erro ao criar tabela Mascote:", e));
                require('./models/Progresso').createTable().catch(e => console.error("Erro ao criar tabela ProgressoUsuario:", e));
                // =======================================================
            }
        });
    }
});

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error("Erro em db.all:", err.message, "SQL:", sql, "Params:", params);
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                console.error("Erro em db.get:", err.message, "SQL:", sql, "Params:", params);
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) {
                console.error("Erro em db.run:", err.message, "SQL:", sql, "Params:", params);
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

module.exports = { all, get, run, db_instance: db };