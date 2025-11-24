// scripts/db.js (VERSÃO MAIS ROBUSTA DE CONEXÃO E INICIALIZAÇÃO)
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.resolve(__dirname, '../mellihero.db'); 

let db_connection_promise = null; // Promise para a conexão e inicialização
let db_instance = null; // A instância do DB real

// Esta função agora CRIA OU RETORNA a Promise de conexão e inicialização
async function connectAndInitializeDb() {
    if (db_connection_promise) {
        return db_connection_promise; // Já está conectando ou já conectou
    }

    db_connection_promise = new Promise((resolve, reject) => {
        db_instance = new sqlite3.Database(DB_PATH, async (err) => { // <-- Mantém async aqui
            if (err) {
                console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
                db_connection_promise = null; // Resetar a promise em caso de erro
                return reject(err); 
            } else {
                console.log('Conectado ao banco de dados mellihero.db.'); 
                db_instance.run('PRAGMA foreign_keys = ON;', async (pragmaErr) => { // <-- Mantém async aqui
                    if (pragmaErr) {
                        console.error('Erro ao habilitar FOREIGN KEYS:', pragmaErr.message);
                        db_connection_promise = null; 
                        return reject(pragmaErr);
                    } else {
                        console.log('FOREIGN KEYS ativadas.');
                        resolve(db_instance); // Resolve a Promise com a instância do DB
                    }
                });
            }
        });
    });

    return db_connection_promise;
}

// Helper para obter a instância do DB, esperando a conexão se necessário
async function getDbInstance() {
    if (db_instance) {
        return db_instance;
    }
    // Se não estiver conectado, espera pela promise de conexão
    await connectAndInitializeDb(); 
    return db_instance;
}


// Funções de query agora chamam getDbInstance para garantir que o DB esteja pronto
function all(sql, params = []) {
    return new Promise(async (resolve, reject) => { // <-- Torna async
        try {
            const db = await getDbInstance(); // <--- Aguarda a instância
            db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error("Erro em db.all:", err.message, "SQL:", sql, "Params:", params);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        } catch (error) {
            reject(error); // Erro na conexão ou obtenção da instância
        }
    });
}

function get(sql, params = []) {
    return new Promise(async (resolve, reject) => { // <-- Torna async
        try {
            const db = await getDbInstance(); // <--- Aguarda a instância
            db.get(sql, params, (err, row) => {
                if (err) {
                    console.error("Erro em db.get:", err.message, "SQL:", sql, "Params:", params);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

function run(sql, params = []) {
    return new Promise(async (resolve, reject) => { // <-- Torna async
        try {
            const db = await getDbInstance(); // <--- Aguarda a instância
            db.run(sql, params, function (err) {
                if (err) {
                    console.error("Erro em db.run:", err.message, "SQL:", sql, "Params:", params);
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = { all, get, run, connectAndInitializeDb };