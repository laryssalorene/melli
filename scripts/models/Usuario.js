// scripts/models/Usuario.js
// Caminho corrigido: `db.js` está em `scripts/`, e `Usuario.js` está em `scripts/models/`.
// Então, para acessar `db.js` de `Usuario.js`, precisamos subir um nível (..) e então acessar `db`.
const { db } = require('../db'); 

class Usuario {
    /**
     * Busca um usuário pelo seu endereço de e-mail.
     * Usado principalmente para login e verificação de registro.
     * @param {string} email O endereço de e-mail do usuário.
     * @returns {Promise<Object|null>} Uma promessa que resolve com o objeto do usuário (incluindo senha) ou null se não for encontrado.
     */
    static async findByEmail(email) {
        return new Promise((resolve, reject) => {
            db.get(`SELECT * FROM Usuario WHERE email = ?`, [email], (err, row) => {
                if (err) {
                    return reject(new Error("Erro ao buscar usuário por e-mail no banco de dados."));
                }
                resolve(row); // Retorna o usuário completo (incluindo senha hash)
            });
        });
    }

    /**
     * Busca um usuário pelo seu ID.
     * Usado para obter informações de perfil e outras operações que requerem o ID do usuário.
     * Não retorna a senha por segurança.
     * @param {number} id O ID do usuário.
     * @returns {Promise<Object|null>} Uma promessa que resolve com o objeto do usuário (sem senha) ou null se não for encontrado.
     */
    static async findById(id) {
        return new Promise((resolve, reject) => {
            db.get(`
                SELECT id_usuario, nome, email, pontos, assiduidade_dias, data_registro
                FROM Usuario
                WHERE id_usuario = ?
            `, [id], (err, row) => {
                if (err) {
                    console.error('Erro ao buscar usuário por ID:', err.message);
                    return reject(new Error("Erro ao buscar usuário por ID no banco de dados."));
                }
                resolve(row); // Retorna o usuário sem a senha
            });
        });
    }

    /**
     * Cria um novo usuário no banco de dados.
     * @param {string} nome O nome do usuário.
     * @param {string} email O e-mail do usuário (deve ser único).
     * @param {string} senhaHash A senha do usuário já hashada (nunca armazene senhas em texto puro).
     * @returns {Promise<Object>} Uma promessa que resolve com o objeto do novo usuário (sem senha).
     */
    static async create(nome, email, senhaHash) {
        return new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO Usuario (nome, email, senha, pontos, assiduidade_dias, data_registro)
                VALUES (?, ?, ?, 0, 0, CURRENT_TIMESTAMP)
            `, [nome, email, senhaHash], function (err) {
                if (err) {
                    // Verifica se o erro é devido a e-mail duplicado
                    if (err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                        return reject(new Error("E-mail já cadastrado."));
                    }
                    return reject(new Error("Erro ao criar novo usuário no banco de dados."));
                }
                // Retorna os dados do novo usuário, excluindo a senha
                resolve({ id_usuario: this.lastID, nome, email, pontos: 0, assiduidade_dias: 0, data_registro: new Date().toISOString() });
            });
        });
    }

    /**
     * Atualiza a pontuação E a assiduidade de um usuário.
     * Este método foi adicionado para ser usado pelo moduloService.
     * @param {number} userId O ID do usuário.
     * @param {number} pointsToAdd Os pontos a serem adicionados (pode ser 0 para não adicionar).
     * @param {number} assiduidadeToAdd Os dias de assiduidade a serem adicionados (geralmente 0 ou 1).
     * @returns {Promise<Object>} Uma promessa que resolve com o número de linhas afetadas.
     */
    static async updatePointsAndAssiduidade(userId, pointsToAdd, assiduidadeToAdd) {
        return new Promise((resolve, reject) => {
            db.run(`UPDATE Usuario SET pontos = pontos + ?, assiduidade_dias = assiduidade_dias + ? WHERE id_usuario = ?`,
                [pointsToAdd, assiduidadeToAdd, userId],
                function(err) {
                    if (err) {
                        return reject(new Error("Erro ao atualizar pontos e assiduidade do usuário."));
                    }
                    resolve({ changes: this.changes });
                }
            );
        });
    }

    // Seu método updatePoints original (se ainda for usado em outro lugar)
    static async updatePoints(userId, pointsToAdd) {
        return new Promise((resolve, reject) => {
            db.run(`UPDATE Usuario SET pontos = pontos + ? WHERE id_usuario = ?`,
                [pointsToAdd, userId],
                function(err) {
                    if (err) {
                        return reject(new Error("Erro ao atualizar pontos do usuário."));
                    }
                    resolve({ changes: this.changes });
                }
            );
        });
    }

    // Você pode adicionar outros métodos para atualizar nome, e-mail, etc.
}

module.exports = Usuario;