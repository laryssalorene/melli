// scripts/services/authService.js
const UserModel = require('../models/Usuario');
const MascoteModel = require('../models/Mascote');
const encryptionService = require('./encryptionService');
// REMOVA A IMPORTAÇÃO DE bcryptjs AQUI. O UserModel fará o hash.
// const bcrypt = require('bcryptjs'); 
const jwt = require('jsonwebtoken');

require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const authService = {
    registerUser: async (nickname, email, password, mascote_id) => { // 'password' é a senha em texto puro
        const existingUserByNickname = await UserModel.findByNickname(nickname);
        if (existingUserByNickname) {
            throw new Error('Nickname já está em uso.');
        }

        const encryptedEmail = encryptionService.encrypt(email.toLowerCase());
        if (!encryptedEmail) {
            throw new Error('Falha na criptografia do e-mail durante o registro.');
        }
        const existingUserByEmail = await UserModel.findByEncryptedEmail(encryptedEmail);
        if (existingUserByEmail) {
            throw new Error('E-mail já cadastrado.');
        }

        // REMOVA ESTA LINHA. O UserModel fará o hash.
        // const hashedPassword = await bcrypt.hash(password, 10);

        let finalMascoteId = mascote_id;
        if (finalMascoteId) {
            const mascoteExists = await MascoteModel.findById(finalMascoteId);
            if (!mascoteExists) {
                throw new Error('Mascote escolhido inválido.');
            }
        } else {
            const defaultMascote = await MascoteModel.findByName('Melli'); 
            finalMascoteId = defaultMascote ? defaultMascote.id_mascote : null;
            if (!finalMascoteId) { 
                console.warn("Mascote padrão 'Melli' não encontrado. Registrando usuário sem mascote inicial.");
            }
        }

        // CHAME UserModel.create PASSANDO A SENHA EM TEXTO PURO (password)
        // E NÃO UM OBJETO, POIS O MÉTODO CREATE DO USUARIO MODEL ESPERA ARGUMENTOS POSICIONAIS
        const newUser = await UserModel.create(
            nickname,
            encryptedEmail, 
            password, // <--- AQUI DEVE SER A SENHA EM TEXTO PURO!
            finalMascoteId
        );

        // Descriptografa o email para o objeto de retorno do serviço
        newUser.email = encryptionService.decrypt(newUser.email); 
        return newUser;
    },

    loginUser: async (email, password) => {
        const encryptedEmail = encryptionService.encrypt(email.toLowerCase());
        if (!encryptedEmail) {
            throw new Error('Falha na criptografia do e-mail ao tentar login.');
        }

        const user = await UserModel.findByEncryptedEmail(encryptedEmail); 
        if (!user) {
            throw new Error('Credenciais inválidas.');
        }

        // Aqui, sim, você compara a senha em texto puro com o hash salvo no banco
        const isPasswordValid = await user.comparePassword(password); // Usando o método do modelo
        if (!isPasswordValid) {
            throw new Error('Credenciais inválidas.');
        }

        const token = jwt.sign(
            { id_usuario: user.id_usuario, nickname: user.nickname, email: encryptionService.decrypt(user.email) }, 
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        user.email = encryptionService.decrypt(user.email); 
        return { token, user: {
            id_usuario: user.id_usuario,
            nickname: user.nickname,
            email: user.email,
            pontos: user.pontos,
            assiduidade_dias: user.assiduidade_dias,
            mascote_id: user.mascote_id
        }};
    },
};

module.exports = authService;