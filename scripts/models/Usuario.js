const { get, run, all } = require('../db'); 
const bcrypt = require('bcryptjs');

const saltRounds = 10; // Custo do hash para bcrypt

class Usuario {
    constructor(data) {
        this.id_usuario = data.id_usuario;
        this.nickname = data.nickname; 
        this.email = data.email; 
        this.password_hash = data.senha; // ATENÇÃO: A propriedade interna é 'password_hash', mas lê da coluna 'senha' do DB
        this.pontos = data.pontos || 0;
        this.assiduidade_dias = data.assiduidade_dias || 0;
        this.data_registro = data.data_registro;
        this.ultimo_login = data.ultimo_login;
        this.mascote_id = data.mascote_id;
        this.resetPasswordToken = data.resetPasswordToken;
        this.resetPasswordExpires = data.resetPasswordExpires ? new Date(data.resetPasswordExpires) : null;
    }

    /**
     * Método auxiliar para gerar um nickname padrão e aleatório.
     * Utilizado quando o usuário não fornece um nickname no registro.
     * @returns {string} Um nickname gerado aleatoriamente.
     */
    static generateDefaultNickname() {
        const adjectives = ['Veloz', 'Sábio', 'Corajoso', 'Gentil', 'Furtivo', 'Radiante', 'Misterioso', 'Leal', 'Ágil', 'Forte'];
        const nouns = ['Heroi', 'Guerreiro', 'Viajante', 'Explorador', 'Guardião', 'Pioneiro', 'Mestre', 'Lenda', 'Campeão', 'Espião'];
        const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
        const randomNumber = Math.floor(Math.random() * 999) + 1; // Número entre 1 e 999
        return `${randomAdj}${randomNoun}${randomNumber}`;
    }

    /**
     * Cria a tabela 'Usuario' no banco de dados se ela não existir.
     * `nickname` é o campo principal para login e exibição, e deve ser `UNIQUE`.
     * `email` também é `UNIQUE` se preenchido, mas não é usado para login direto.
     * **NOTA:** A coluna da senha é `senha`, mas a propriedade da classe é `password_hash` para consistência.
     */
    static createTable() {
        console.log("Criando/verificando tabela Usuario...");
        return run(`
            CREATE TABLE IF NOT EXISTS Usuario (
                id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL UNIQUE, 
                email TEXT UNIQUE, 
                senha TEXT NOT NULL, -- Coluna da senha no banco de dados
                pontos INTEGER DEFAULT 0,
                assiduidade_dias INTEGER DEFAULT 0,
                data_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
                ultimo_login DATETIME DEFAULT CURRENT_TIMESTAMP,
                mascote_id INTEGER DEFAULT NULL,
                resetPasswordToken TEXT,
                resetPasswordExpires DATETIME,
                FOREIGN KEY (mascote_id) REFERENCES Mascote(id_mascote) ON DELETE SET NULL
            )
        `);
    }

    /**
     * Encontra um usuário pelo seu nickname (nome de usuário).
     * Este é o método principal para localizar um usuário durante o processo de login.
     * @param {string} nickname O nome de usuário a ser procurado (case-insensitive para busca).
     * @returns {Promise<Usuario|null>} A instância do usuário ou null se não encontrado.
     */
    static async findByNickname(nickname) {
        // Usar COLLATE NOCASE para busca case-insensitive no SQLite
        const row = await get(`SELECT * FROM Usuario WHERE nickname = ? COLLATE NOCASE`, [nickname]);
        return row ? new Usuario(row) : null;
    }

    /**
     * Encontra um usuário pelo seu endereço de e-mail.
     * Usado principalmente para processos de recuperação de senha ou verificação de e-mail.
     * @param {string} email O e-mail do usuário a ser procurado (case-insensitive para busca).
     * @returns {Promise<Usuario|null>} A instância do usuário ou null se não encontrado.
     */
    static async findByEmail(email) {
        if (!email) return null; 
        // Usar COLLATE NOCASE para busca case-insensitive no SQLite
        const row = await get(`SELECT * FROM Usuario WHERE email = ? COLLATE NOCASE`, [email]);
        return row ? new Usuario(row) : null;
    }

    /**
     * Encontra um usuário pelo seu ID interno.
     * @param {number} id O ID do usuário a ser procurado.
     * @returns {Promise<Usuario|null>} A instância do usuário ou null se não encontrado.
     */
    static async findById(id) {
        const row = await get(`SELECT * FROM Usuario WHERE id_usuario = ?`, [id]);
        return row ? new Usuario(row) : null;
    }

    /**
     * Cria um novo usuário no banco de dados.
     * Exige 'nickname' e 'rawPassword'. 'email' é opcional.
     * Lida com a hash da senha e a geração de nickname padrão se necessário.
     * @param {string} rawNickname O nome de usuário fornecido pelo cliente.
     * @param {string} rawPassword Texto puro da senha do usuário.
     * @param {string|null} email E-mail do usuário (opcional, será null se não fornecido).
     * @param {number|null} mascote_id ID do mascote escolhido (opcional).
     * @returns {Promise<Usuario>} A instância do novo usuário criado.
     * @throws {Error} Se o nickname ou e-mail já estiver cadastrado ou ocorrer outro erro no DB.
     */
    static async create(rawNickname, rawPassword, email = null, mascote_id = null) {
        try {
            const hashedPassword = await bcrypt.hash(rawPassword, saltRounds);
            
            let finalNickname = rawNickname;
            if (!finalNickname || finalNickname.trim() === '') {
                finalNickname = Usuario.generateDefaultNickname(); // Garante um nickname mesmo se vazio
            }

            // Tenta inserir o usuário
            const result = await run(`
                INSERT INTO Usuario (nickname, email, senha, pontos, assiduidade_dias, mascote_id)
                VALUES (?, ?, ?, 0, 0, ?)
            `, [finalNickname, email, hashedPassword, mascote_id]);

            return Usuario.findById(result.lastID); // Retorna a instância completa do novo usuário

        } catch (err) {
            if (err.message.includes('UNIQUE constraint failed: Usuario.nickname')) {
                throw new Error("Nome de usuário (nickname) já cadastrado. Por favor, escolha outro.");
            }
            if (email && err.message.includes('UNIQUE constraint failed: Usuario.email')) {
                throw new Error("E-mail já cadastrado. Por favor, use outro e-mail ou deixe em branco.");
            }
            // Para outros erros inesperados no DB
            throw new Error(`Erro ao criar novo usuário: ${err.message}`);
        }
    }

    /**
     * Obtém o ranking de usuários, ordenado por pontos.
     * @returns {Promise<Array<Object>>} Uma lista de objetos de usuário com id_usuario, nickname, pontos e mascote_id.
     */
    static async getRanking() {
        const rows = await all('SELECT id_usuario, nickname, pontos, mascote_id FROM Usuario ORDER BY pontos DESC, nickname ASC');
        return rows; 
    }

    /**
     * Compara uma senha em texto puro com a senha hashed armazenada nesta instância de usuário.
     * @param {string} plainPassword Senha em texto puro fornecida pelo usuário.
     * @returns {Promise<boolean>} True se as senhas coincidirem, false caso contrário.
     */
    async comparePassword(plainPassword) {
        return bcrypt.compare(plainPassword, this.password_hash);
    }

    /**
     * Atualiza a pontuação de um usuário específico.
     * @param {number} pointsToAdd Quantidade de pontos a serem adicionados (pode ser negativo).
     * @returns {Promise<Object>} Resultado da operação no banco de dados (número de alterações).
     */
    async updatePoints(pointsToAdd) {
        const result = await run(`
            UPDATE Usuario
            SET pontos = pontos + ?
            WHERE id_usuario = ?
        `, [pointsToAdd, this.id_usuario]);
        this.pontos += pointsToAdd; // Atualiza a instância local também
        return { changes: result.changes };
    }

    /**
     * Atualiza as informações de login de um usuário, como a data do último login e assiduidade.
     * @param {string} newLastLoginDate Nova data/hora do último login (string no formato ISO).
     * @param {number} newAssiduidadeDays Novo valor para a contagem de dias de assiduidade.
     * @returns {Promise<Object>} Resultado da operação no banco de dados (número de alterações).
     */
    async updateLoginInfo(newLastLoginDate, newAssiduidadeDays) {
        const result = await run(`
            UPDATE Usuario
            SET ultimo_login = ?, assiduidade_dias = ?
            WHERE id_usuario = ?
        `, [newLastLoginDate, newAssiduidadeDays, this.id_usuario]);
        this.ultimo_login = newLastLoginDate;
        this.assiduidade_dias = newAssiduidadeDays;
        return { changes: result.changes };
    }

    /**
     * Atualiza a senha de um usuário e limpa quaisquer tokens de redefinição de senha pendentes.
     * @param {string} newPassword Texto puro da nova senha.
     * @returns {Promise<Object>} Resultado da operação no banco de dados (número de alterações).
     */
    async updatePassword(newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        const result = await run(
            'UPDATE Usuario SET senha = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id_usuario = ?',
            [hashedPassword, this.id_usuario]
        );
        this.password_hash = hashedPassword; // Atualiza a instância local
        this.resetPasswordToken = null;
        this.resetPasswordExpires = null;
        return { changes: result.changes };
    }

    /**
     * Salva um token de redefinição de senha e sua data de expiração para este usuário.
     * @param {string} token O token de redefinição gerado.
     * @param {Date} expires A data de expiração do token (objeto Date).
     * @returns {Promise<Object>} Resultado da operação no banco de dados (número de alterações).
     */
    async saveResetToken(token, expires) {
        const result = await run(
            'UPDATE Usuario SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id_usuario = ?',
            [token, expires.toISOString(), this.id_usuario] // Converte Date para ISO string para armazenamento
        );
        this.resetPasswordToken = token; // Atualiza a instância local
        this.resetPasswordExpires = expires; 
        return { changes: result.changes };
    }

    /**
     * Encontra um usuário pelo seu token de redefinição de senha, verificando se o token ainda é válido (não expirou).
     * @param {string} token O token de redefinição a ser procurado.
     * @returns {Promise<Usuario|null>} A instância do usuário ou null se o token for inválido ou expirado.
     */
    static async findByResetToken(token) {
        const now = new Date().toISOString();
        const row = await get(
            'SELECT * FROM Usuario WHERE resetPasswordToken = ? AND resetPasswordExpires > ?',
            [token, now]
        );
        return row ? new Usuario(row) : null;
    }

    /**
     * Salva as alterações feitas em propriedades como nickname, email ou mascote_id.
     * Não altera a senha.
     * @returns {Promise<Object>} Resultado da operação no banco de dados (número de alterações).
     */
    async save() {
        const result = await run(
            `UPDATE Usuario SET nickname = ?, email = ?, mascote_id = ? WHERE id_usuario = ?`,
            [this.nickname, this.email, this.mascote_id, this.id_usuario]
        );
        return { changes: result.changes };
    }

    /**
     * Deleta um usuário do banco de dados.
     * @param {number} id_usuario O ID do usuário a ser deletado.
     * @returns {Promise<Object>} O resultado da operação, incluindo o número de linhas afetadas.
     */
    static async delete(id_usuario) {
        const result = await run('DELETE FROM Usuario WHERE id_usuario = ?', [id_usuario]);
        return result; 
    }
}

module.exports = Usuario;