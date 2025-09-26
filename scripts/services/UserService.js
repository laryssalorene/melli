// scripts/services/UserService.js
const UserModel = require('../models/Usuario'); // <<-- IMPORTA O MODELO DE USUÁRIO
const bcrypt = require('bcryptjs');
const progressService = require('./progressService'); // Para buscar o progresso do usuário

const userService = {
    // Método para registrar um novo usuário
    registerUser: async (nome, email, senha, mascote_id = null) => { // Default para mascote_id
        // Antes de criar, verifica se o usuário já existe para evitar erro de UNIQUE constraint
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error("E-mail já cadastrado.");
        }

        const hashedPassword = await bcrypt.hash(senha, 10);
        
        // Chama o método create do UserModel, que gerencia a inserção no DB
        const newUser = await UserModel.create(nome, email, hashedPassword, mascote_id);
        
        return newUser; // Retorna o objeto completo do novo usuário
    },

    // Método para encontrar um usuário por email (para login)
    findUserByEmail: async (email) => {
        return await UserModel.findByEmail(email); // Chama o método do UserModel
    },

    // <<-- NOVO MÉTODO: Para encontrar usuário por ID
    findUserById: async (id_usuario) => {
        return await UserModel.findById(id_usuario); // Chama o método do UserModel
    },

    // Método para atualizar o último login e assiduidade do usuário
    updateLoginData: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) {
            throw new Error("Usuário não encontrado para atualização de login.");
        }

        const today = new Date().toISOString().split('T')[0];
        let assiduidade = user.assiduidade_dias;

        if (user.ultimo_login !== today) { // Se o último login não foi hoje
            const lastLoginDate = new Date(user.ultimo_login);
            const diffTime = Math.abs(new Date().getTime() - lastLoginDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) { // Se logou ontem, incrementa a assiduidade
                assiduidade++;
            } else { // Se passou mais de um dia, reseta a assiduidade
                assiduidade = 1;
            }
            // Chama o método específico do UserModel para atualizar informações de login
            await UserModel.updateLoginInfo(id_usuario, today, assiduidade);
        }
        // Se já logou hoje, não faz nada com assiduidade, mas poderíamos atualizar 'ultimo_login' para 'today' de qualquer forma
        // No entanto, o `UserModel.updateLoginInfo` só é chamado se `user.ultimo_login !== today`
    },

    // Método para buscar o perfil completo do usuário
    getUserProfile: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario); // Chama o método do UserModel

        if (!user) return null;

        // Anexar o progresso do usuário (usando o progressService)
        const userProgress = await progressService.getProgressoUsuario(id_usuario); // Chamando o progressService

        return { ...user, progresso: userProgress };
    },

    // Adicione um método para atualizar pontos
    updateUserPoints: async (id_usuario, pointsToAdd) => {
        // Assume que existe um método para isso no UserModel ou é feito via updatePointsAndAssiduidade
        const user = await UserModel.findById(id_usuario);
        if (!user) throw new Error("Usuário não encontrado para atualizar pontos.");
        
        await UserModel.updatePointsAndAssiduidade(id_usuario, pointsToAdd, user.assiduidade_dias);
    }
};

module.exports = userService;