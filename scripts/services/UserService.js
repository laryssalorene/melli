// scripts/services/userService.js
const Usuario = require('../models/Usuario'); // Certifique-se de que o caminho está correto

const userService = {
    getUserProfile: async (id_usuario) => {
        try {
            const user = await Usuario.findById(id_usuario);
            if (!user) return null;
            // Retorna apenas os campos necessários e seguros para o frontend
            const { id_usuario: userId, nome, email, pontos, assiduidade_dias } = user;
            return { userId, nome, email, pontos, assiduidade_dias };
        } catch (error) {
            console.error('Erro no userService.getUserProfile:', error);
            throw new Error('Erro ao buscar dados do perfil do usuário.');
        }
    },
};

module.exports = userService;