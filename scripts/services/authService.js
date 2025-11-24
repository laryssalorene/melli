// scripts/services/authService.js
const UserModel = require('../models/Usuario');
const MascoteModel = require('../models/Mascote');
const encryptionService = require('./encryptionService');
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

        let finalMascoteId = null;
        if (mascote_id) {
            // =========================================================
            // CORREÇÃO AQUI: Use findById porque mascote_id é um número
            // =========================================================
            const numericMascoteId = parseInt(mascote_id, 10);
            if (isNaN(numericMascoteId)) {
                throw new Error('ID do mascote fornecido é inválido (não é um número).');
            }
            const mascote = await MascoteModel.findById(numericMascoteId);
            if (!mascote) {
                throw new Error('Mascote escolhido inválido.');
            }
            finalMascoteId = mascote.id_mascote;
        } else {
            // Lógica para mascote padrão (se 'Melli' existe no DB)
            const defaultMascote = await MascoteModel.findByName('Melli'); // Mantenha findByName para o nome literal "Melli"
            if (defaultMascote) {
                finalMascoteId = defaultMascote.id_mascote;
            } else {
                console.warn("Mascote padrão 'Melli' não encontrado. Registrando usuário sem mascote inicial.");
            }
        }

        const newUser = await UserModel.create(
            nickname,
            encryptedEmail, 
            password,
            finalMascoteId
        );

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

        const isPasswordValid = await user.comparePassword(password);
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