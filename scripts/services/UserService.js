// scripts/services/userService.js
const UserModel = require('../models/Usuario');
const MascoteModel = require('../models/Mascote'); 
const jwt = require('jsonwebtoken'); 
const ms = require('ms'); 
const emailService = require('./emailService');
const progressService = require('./progressService'); 
const encryptionService = require('./encryptionService'); 
const bcrypt = require('bcryptjs'); 

require('dotenv').config(); 
const RESET_PASSWORD_SECRET = process.env.RESET_PASSWORD_SECRET;
const RESET_PASSWORD_EXPIRES_IN = process.env.RESET_PASSWORD_EXPIRES_IN || '1h'; 

const userService = {

    updateLoginData: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) {
            console.warn("Usuário não encontrado para atualização de login. ID:", id_usuario);
            return; 
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0]; 
        
        const lastLoginDateTime = user.ultimo_login ? new Date(user.ultimo_login) : null;
        const lastLoginDay = lastLoginDateTime ? lastLoginDateTime.toISOString().split('T')[0] : null;

        let assiduidade = user.assiduidade_dias;

        if (lastLoginDay !== today) { 
            if (lastLoginDateTime) {
                const diffTime = Math.abs(now.getTime() - lastLoginDateTime.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                if (diffDays === 1) { 
                    assiduidade++;
                } else { 
                    assiduidade = 1;
                }
            } else { 
                assiduidade = 1;
            }
            await user.updateLoginInfo(now.toISOString(), assiduidade); 
        }
    },

    getUserProfile: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario); 
        if (!user) return null;
        
        const decryptedEmail = encryptionService.decrypt(user.email);
        if (!decryptedEmail) {
            console.error(`Falha ao descriptografar e-mail para o perfil do usuário ${id_usuario}`);
            throw new Error('Erro interno ao buscar perfil.');
        }

        const userPublicData = {
            id_usuario: user.id_usuario,
            nickname: user.nickname, 
            email: decryptedEmail, 
            pontos: user.pontos,
            assiduidade_dias: user.assiduidade_dias,
            mascote_id: user.mascote_id,
            data_registro: user.data_registro,
            ultimo_login: user.ultimo_login,
        };

        const userProgress = await progressService.getUserProgress(id_usuario); 
        return { ...userPublicData, progresso: userProgress };
    },

    updateUserPoints: async (id_usuario, pointsToAdd) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) throw new Error("Usuário não encontrado para atualizar pontos.");
        
        await user.updatePoints(pointsToAdd); 
    },

    requestPasswordReset: async (email) => { 
        const encryptedEmail = encryptionService.encrypt(email.toLowerCase());
        if (!encryptedEmail) {
            throw new Error('Falha na criptografia do e-mail ao solicitar redefinição de senha.');
        }
        const user = await UserModel.findByEncryptedEmail(encryptedEmail); 
        if (!user) {
            console.warn(`Tentativa de redefinição de senha para e-mail não encontrado: ${email}`);
            return { message: 'Se o e-mail estiver cadastrado, um link de redefinição de senha foi enviado.' };
        }

        const resetToken = jwt.sign(
            { id_usuario: user.id_usuario },
            RESET_PASSWORD_SECRET,
            { expiresIn: RESET_PASSWORD_EXPIRES_IN } 
        );

        const expiresInMs = ms(RESET_PASSWORD_EXPIRES_IN);
        const resetExpires = new Date(Date.now() + expiresInMs); 

        await user.saveResetToken(resetToken, resetExpires); 

        const resetLink = `${process.env.FRONTEND_URL}/html/reset-password.html?token=${resetToken}`;
        await emailService.sendResetPasswordEmail(email, resetLink); 

        return { message: 'Se o e-mail estiver cadastrado, um link de redefinição de senha foi enviado.' };
    },

    resetPassword: async (token, newPassword) => {
        if (!newPassword || newPassword.length < 6) { 
            throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
        }

        let decoded;
        try {
            decoded = jwt.verify(token, RESET_PASSWORD_SECRET);
        } catch (err) {
            throw new Error('Token de redefinição inválido ou expirado.');
        }

        const user = await UserModel.findById(decoded.id_usuario);
        if (!user || user.reset_password_token !== token || new Date(user.reset_password_expires) < new Date()) {
            throw new Error('Token de redefinição inválido ou expirado.');
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.updatePassword(hashedPassword); 
        await user.clearResetToken(); 

        return { message: 'Sua senha foi redefinida com sucesso!' };
    },

    getUsersRanking: async () => {
        try {
            const ranking = await UserModel.getRanking(); 
            
            return ranking.map(user => ({
                nickname: user.nickname, 
                pontos: user.pontos,
                mascote_id: user.mascote_id
            }));
        } catch (error) {
            console.error('Erro no serviço ao buscar ranking de usuários:', error);
            throw new Error('Não foi possível obter o ranking de usuários.'); 
        }
    },

    updateProfile: async (userId, { nickname, email, mascote_id }) => {
        const user = await UserModel.findById(userId); 
        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        let updatedEmailEncrypted = user.email; 

        if (nickname && nickname.toLowerCase() !== user.nickname.toLowerCase()) { 
            const existingNickname = await UserModel.findByNickname(nickname);
            if (existingNickname && existingNickname.id_usuario !== userId) {
                throw new Error('Nickname já está em uso.');
            }
            user.nickname = nickname;
        }

        if (email) { 
            const currentDecryptedEmail = encryptionService.decrypt(user.email);
            if (!currentDecryptedEmail) {
                console.error(`Falha ao descriptografar e-mail atual do usuário ${userId} durante updateProfile.`);
                throw new Error('Erro interno ao processar atualização de e-mail.');
            }

            if (email.toLowerCase() !== currentDecryptedEmail.toLowerCase()) {
                const newEncryptedEmail = encryptionService.encrypt(email.toLowerCase());
                if (!newEncryptedEmail) {
                    throw new Error('Falha na criptografia do novo e-mail durante a atualização.');
                }
                const existingEmailUser = await UserModel.findByEncryptedEmail(newEncryptedEmail); 
                if (existingEmailUser && existingEmailUser.id_usuario !== userId) {
                    throw new Error('E-mail já está em uso.');
                }
                updatedEmailEncrypted = newEncryptedEmail; 
            }
        }
        user.email = updatedEmailEncrypted; 

        if (mascote_id !== undefined && mascote_id !== user.mascote_id) {
            const mascoteExists = await MascoteModel.findById(mascote_id); 
            if (!mascoteExists) {
                throw new Error('Mascote escolhido inválido.');
            }
            user.mascote_id = mascote_id; 
        }

        await user.update(); 

        user.email = encryptionService.decrypt(user.email); 
        return {
            id_usuario: user.id_usuario,
            nickname: user.nickname,
            email: user.email, 
            pontos: user.pontos,
            mascote_id: user.mascote_id,
            ultimo_login: user.ultimo_login,
            assiduidade_dias: user.assiduidade_dias
        };
    },

    deleteAccount: async (userId) => {
        const result = await UserModel.delete(userId);
        if (result.changes === 0) {
            throw new Error('Usuário não encontrado para deletar.');
        }
        return { message: 'Conta deletada com sucesso.' };
    },

    requestNicknameRecovery: async (email) => { 
        if (!email) {
            throw new Error('O e-mail é obrigatório para recuperar o nickname.');
        }

        const encryptedEmail = encryptionService.encrypt(email.toLowerCase());
        if (!encryptedEmail) {
            throw new Error('Falha na criptografia do e-mail ao solicitar recuperação de nickname.');
        }
        const user = await UserModel.findByEncryptedEmail(encryptedEmail); 
        if (!user) {
            return { message: 'Se o e-mail estiver cadastrado, o nickname foi enviado.' };
        }

        await emailService.sendNicknameRecoveryEmail(email, user.nickname);

        return { message: 'Se o e-mail estiver cadastrado, o nickname foi enviado.' };
    }
};

module.exports = userService;