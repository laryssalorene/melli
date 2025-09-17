// scripts/controllers/userController.js
const userService = require('../services/userService');

const userController = {
    getProfile: async (req, res) => {
        try {
            // O ID do usuário vem do token JWT (configurado pelo authenticateToken)
            const userProfile = await userService.getUserProfile(req.user.id_usuario);
            if (!userProfile) {
                return res.status(404).json({ message: 'Perfil do usuário não encontrado.' });
            }
            res.status(200).json(userProfile);
        } catch (error) {
            console.error('Erro ao buscar perfil do usuário:', error);
            res.status(500).json({ message: 'Erro interno ao buscar perfil do usuário.' });
        }
    },
    // Adicione outros métodos de usuário aqui se necessário (ex: updateProfile)
};

module.exports = userController;