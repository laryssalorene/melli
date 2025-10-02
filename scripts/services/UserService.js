// scripts/services/UserService.js
const UserModel = require('../models/Usuario'); 
const bcrypt = require('bcryptjs');
const progressService = require('./progressService'); 

const userService = {
    registerUser: async (nome, email, senha, mascote_id = null) => {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error("E-mail já cadastrado.");
        }
        const hashedPassword = await bcrypt.hash(senha, 10);
        const newUser = await UserModel.create(nome, email, hashedPassword, mascote_id);
        return newUser;
    },

    findUserByEmail: async (email) => {
        return await UserModel.findByEmail(email);
    },

    findUserById: async (id_usuario) => {
        return await UserModel.findById(id_usuario);
    },

    // =======================================================
    // MÉTODO updateLoginData CORRIGIDO
    // =======================================================
    updateLoginData: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) {
            throw new Error("Usuário não encontrado para atualização de login.");
            // <<-- ADICIONE O 'return' AQUI PARA SAIR DA FUNÇÃO
            return; 
        }

        const today = new Date().toISOString().split('T')[0];
        let assiduidade = user.assiduidade_dias;

        if (user.ultimo_login !== today) {
            const lastLoginDate = new Date(user.ultimo_login);
            const diffTime = Math.abs(new Date().getTime() - lastLoginDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                assiduidade++;
            } else {
                assiduidade = 1;
            }
            await UserModel.updateLoginInfo(id_usuario, today, assiduidade);
        }
    },

    getUserProfile: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) return null;
        
        const userProgress = await progressService.getUserProgress(id_usuario); 
        return { ...user, progresso: userProgress };
    },

    updateUserPoints: async (id_usuario, pointsToAdd) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) throw new Error("Usuário não encontrado para atualizar pontos.");
        
        await UserModel.updatePointsAndAssiduidade(id_usuario, pointsToAdd, user.assiduidade_dias);
    }
};

module.exports = userService;