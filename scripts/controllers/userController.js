// scripts/controllers/userController.js

const userService = require('../services/userService');

const userController = {
    // =======================================================
    // OBTER PERFIL DO USUÁRIO LOGADO (PROTEGIDO POR TOKEN)
    // =======================================================
    getProfile: async (req, res) => {
        try {
            const id_usuario = req.userId; // req.userId é definido pelo verifyToken
            if (!id_usuario) {
                return res.status(401).json({ message: 'Não autorizado: ID do usuário não encontrado na requisição.' });
            }
            const userProfile = await userService.getUserProfile(id_usuario);
            if (!userProfile) {
                return res.status(404).json({ message: 'Perfil do usuário não encontrado após autenticação.' });
            }
            res.status(200).json(userProfile);
        } catch (error) {
            console.error('Erro ao buscar perfil do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao buscar perfil do usuário.' });
        }
    },

    // =======================================================
    // SOLICITAR REDEFINIÇÃO DE SENHA
    // =======================================================
    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'E-mail é obrigatório.' });
            }
            const result = await userService.requestPasswordReset(email); // Chame userService
            res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao solicitar redefinição de senha:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao solicitar redefinição de senha.' });
        }
    },

    // =======================================================
    // REDEFINIR SENHA
    // =======================================================
    resetPassword: async (req, res) => {
        try {
            const { token } = req.params; 
            const { newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
            }
            if (newPassword.length < 6) { 
                return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
            }
            const result = await userService.resetPassword(token, newPassword); // Chame userService
            res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            res.status(400).json({ message: error.message || 'Erro interno do servidor ao redefinir senha.' });
        }
    },

    // =======================================================
    // OBTER RANKING DE USUÁRIOS (PROTEGIDO POR TOKEN)
    // =======================================================
    getRanking: async (req, res) => {
        try {
            const ranking = await userService.getUsersRanking(); 
            res.status(200).json(ranking);
        } catch (error) {
            console.error('Erro ao buscar ranking de usuários:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao buscar ranking.' });
        }
    },

    // =======================================================
    // ATUALIZAR PERFIL DO USUÁRIO (PROTEGIDO POR TOKEN)
    // =======================================================
    updateProfile: async (req, res) => {
        try {
            const userId = req.userId; 
            const { nickname, email, mascote_id } = req.body; 

            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            const updatedUser = await userService.updateProfile(userId, { nickname, email, mascote_id }); 

            res.status(200).json({ message: 'Perfil atualizado com sucesso!', user: updatedUser });
        } catch (error) {
            console.error('Erro ao atualizar perfil do usuário:', error);
            if (error.message.includes('já está em uso') || error.message.includes('já cadastrado')) {
                return res.status(409).json({ message: error.message });
            }
            if (error.message.includes('Mascote escolhido inválido')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao atualizar perfil.' });
        }
    },

    // =======================================================
    // DELETAR CONTA DO USUÁRIO (PROTEGIDO POR TOKEN)
    // =======================================================
    deleteAccount: async (req, res) => {
        try {
            const userId = req.userId; 
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }
            await userService.deleteAccount(userId); 
            res.status(200).json({ message: 'Conta deletada com sucesso.' });
        } catch (error) {
            console.error('Erro ao deletar conta do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao deletar conta.' });
        }
    },

    // =======================================================
    // SOLICITAR RECUPERAÇÃO DE NICKNAME
    // =======================================================
    requestNicknameRecovery: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'O e-mail é obrigatório para recuperar o nickname.' });
            }
            const result = await userService.requestNicknameRecovery(email);
            res.status(200).json(result); 
        } catch (error) {
            console.error('Erro ao solicitar recuperação de nickname:', error);
            res.status(200).json({ message: error.message || 'Se o e-mail estiver cadastrado, o nickname foi enviado.' });
        }
    }
};

module.exports = userController; // Exporta APENAS o userController