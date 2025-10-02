// scripts/controllers/userController.js
const userService = require('../services/userService'); // Importe seu UserService

const userController = {
    /**
     * Obtém o perfil completo do usuário logado.
     * Requer que o middleware verifyToken já tenha anexado req.userId ao objeto da requisição.
     */
    getProfile: async (req, res) => {
        try {
            // =========================================================================
            // CORREÇÃO ESSENCIAL AQUI:
            // O middleware auth.js anexa o ID do usuário diretamente em `req.userId`.
            // Portanto, devemos ler de `req.userId`, NÃO de `req.user.id_usuario`.
            // =========================================================================
            const id_usuario = req.userId; 
            
            // Se, por algum motivo, o middleware não anexou o userId (o que não deve acontecer
            // se o token foi validado), é bom ter uma checagem.
            if (!id_usuario) {
                return res.status(401).json({ message: 'Não autorizado: ID do usuário não encontrado na requisição.' });
            }

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
    // Lembre-se de usar `req.userId` em qualquer método que precise do ID do usuário logado.
    // Exemplo:
    // updateProfile: async (req, res) => {
    //     try {
    //         const id_usuario = req.userId; // Usar req.userId aqui também!
    //         if (!id_usuario) {
    //             return res.status(401).json({ message: 'Não autorizado.' });
    //         }
    //         const { nome, mascote_id } = req.body; 
    //         const updatedUser = await userService.updateUserProfile(id_usuario, { nome, mascote_id });
    //         res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: updatedUser });
    //     } catch (error) {
    //         console.error('Erro ao atualizar perfil:', error);
    //         res.status(500).json({ message: error.message || 'Erro ao atualizar perfil.' });
    //     }
    // }
};

module.exports = userController;