// scripts/services/authService.js
const UserModel = require('../models/Usuario');
const MascoteModel = require('../models/Mascote');
const encryptionService = require('./encryptionService');
const jwt = require('jsonwebtoken');
const userService = require('./userService'); // Para updateLoginInfo

require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const authService = {

    /**
     * Registra um novo usuário no sistema.
     * @param {string} nickname - Nickname do usuário.
     * @param {string} email - Email em texto simples.
     * @param {string} plainTextPassword - Senha em texto simples.
     * @param {number} mascote_id - ID numérico do mascote (ex: 1, 2, 3).
     * @returns {Object} O novo usuário registrado.
     * @throws {Error} Se houver falha de unicidade ou mascote inválido.
     */
    registerUser: async (nickname, email, plainTextPassword, mascote_id) => { 
        // 1. Validação básica de campos
        if (!nickname || !email || !plainTextPassword || mascote_id === undefined || mascote_id === null) { // <-- mascote_id agora é obrigatório e pode ser 0
            throw new Error('Todos os campos (nickname, e-mail, senha e mascote) são obrigatórios.');
        }
        
        // 2. Criptografia e Verificação de Unicidade de E-mail
        const encryptedEmail = encryptionService.encrypt(email.toLowerCase());
        if (!encryptedEmail) {
            throw new Error('Falha na criptografia do e-mail durante o registro.');
        }
        const existingUserByEmail = await UserModel.findByEncryptedEmail(encryptedEmail);
        if (existingUserByEmail) {
            throw new Error('E-mail já cadastrado.');
        }

        // 3. Verificação de Unicidade de Nickname
        const existingUserByNickname = await UserModel.findByNickname(nickname);
        if (existingUserByNickname) {
            throw new Error('Nickname já está em uso.');
        }

        // 4. Validação do Mascote (Garantir que o ID numérico exista no DB)
        // Convertendo para número explicitamente para garantir que o findById receba um number
        const numericMascoteId = parseInt(mascote_id, 10); 
        if (isNaN(numericMascoteId)) {
            throw new Error('ID do mascote fornecido é inválido.');
        }

        const mascoteExists = await MascoteModel.findById(numericMascoteId); 
        if (!mascoteExists) {
            throw new Error('Mascote escolhido inválido.'); // <-- Este erro será disparado se o ID não existir
        }

        // 5. Criação do Usuário no DB
        // UserModel.create agora hasheia a senha internamente
        const newUser = await UserModel.create(nickname, encryptedEmail, plainTextPassword, numericMascoteId);
        
        // 6. Retorno (descriptografado para o frontend, incluindo mascote_id numérico)
        return {
            id_usuario: newUser.id_usuario,
            nickname: newUser.nickname,
            email: encryptionService.decrypt(newUser.email), 
            mascote_id: newUser.mascote_id, // Retorna o ID numérico
            pontos: newUser.pontos,
            assiduidade_dias: newUser.assiduidade_dias
        };
    },

    /**
     * Autentica um usuário existente e gera um token JWT.
     * @param {string} email - Email em texto simples.
     * @param {string} password - Senha em texto simples.
     * @returns {Object} Um objeto contendo o token JWT e os dados do usuário.
     * @throws {Error} Se as credenciais forem inválidas.
     */
    loginUser: async (email, password) => {
        // 1. Criptografia e Busca
        const encryptedEmail = encryptionService.encrypt(email.toLowerCase());
        if (!encryptedEmail) {
            throw new Error('Falha na criptografia do e-mail ao tentar login.');
        }
        const user = await UserModel.findByEncryptedEmail(encryptedEmail); 
        if (!user) {
            throw new Error('Credenciais inválidas.');
        }

        // 2. Comparação de Senha
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Credenciais inválidas.');
        }

        // 3. Atualiza Assiduidade (utilizando o userService)
        // OBS: Isso pode ser feito de forma assíncrona após o envio da resposta.
        userService.updateLoginData(user.id_usuario).catch(err => {
            console.error("Erro ao atualizar dados de login de forma assíncrona:", err);
        });

        // 4. Descriptografia e Geração de Token
        const decryptedEmail = encryptionService.decrypt(user.email); 

        const token = jwt.sign(
            // Inclui o mascote_id numérico no payload do JWT
            { id_usuario: user.id_usuario, nickname: user.nickname, email: decryptedEmail, mascote_id: user.mascote_id }, 
            JWT_SECRET, // Usando a constante importada
            { expiresIn: JWT_EXPIRES_IN } // Usando a constante importada
        );

        // 5. Retorno
        return { 
            token, 
            user: {
                id_usuario: user.id_usuario,
                nickname: user.nickname,
                email: decryptedEmail,
                mascote_id: user.mascote_id, // <-- Envia o mascote_id (numérico)
                pontos: user.pontos,
                assiduidade_dias: user.assiduidade_dias
            }
        };
    },
};

module.exports = authService;