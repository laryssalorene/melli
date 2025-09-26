// scripts/controllers/userController.js
const userService = require('../services/userService'); // Importe seu UserService
// Não precisa de bcrypt, jwt, ou JWT_SECRET aqui, pois userService fará isso
// e authController/middleware farão a parte do JWT.

const userController = {
    /**
     * Obtém o perfil completo do usuário logado.
     * Requer que o middleware verifyToken já tenha anexado req.user ao objeto da requisição.
     */
    getProfile: async (req, res) => {
        try {
            // req.user.id_usuario é definido pelo middleware verifyToken (auth.js)
            const id_usuario = req.user.id_usuario; 
            
            // Usamos o userService para buscar o perfil completo do usuário
            const userProfile = await userService.getUserProfile(id_usuario);

            if (!userProfile) {
                // Isso não deveria acontecer se o token é válido e o usuário existia
                return res.status(404).json({ message: 'Perfil do usuário não encontrado após autenticação.' });
            }

            res.status(200).json(userProfile); // Retorna o perfil completo
        } catch (error) {
            console.error('Erro ao buscar perfil do usuário:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar perfil do usuário.' });
        }
    },

    // Você pode adicionar outras funções aqui que manipulem o perfil do usuário logado:
    // Por exemplo, updateUserProfile, changePassword, etc.
    // Exemplo:
    // updateProfile: async (req, res) => {
    //     try {
    //         const id_usuario = req.user.id_usuario;
    //         const { nome, mascote_id } = req.body; // Campos que podem ser atualizados
    //         const updatedUser = await userService.updateUserProfile(id_usuario, { nome, mascote_id });
    //         res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: updatedUser });
    //     } catch (error) {
    //         console.error('Erro ao atualizar perfil:', error);
    //         res.status(500).json({ message: error.message || 'Erro ao atualizar perfil.' });
    //     }
    // }
};

module.exports = userController;