const userService = require('../services/userService');
const jwt = require('jsonwebtoken'); // Ainda usado para gerar tokens no login

// Garanta que estas variáveis de ambiente estão definidas no seu .env
const JWT_SECRET = process.env.JWT_SECRET; 
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const userController = {
    // =======================================================
    // REGISTRAR USUÁRIO
    // =======================================================
    register: async (req, res) => {
        try {
            const { nickname, email, senha, mascote_id } = req.body; 

            if (!nickname || !email || !senha) {
                return res.status(400).json({ message: 'Todos os campos (nickname, email, senha) são obrigatórios.' });
            }
            if (senha.length < 6) {
                return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
            }

            // Chama o serviço para registrar o usuário
            const newUser = await userService.registerUser(nickname, email, senha, mascote_id); 
            
            // Redireciona o usuário para a tela de login após o registro bem-sucedido
            // Assegure-se de que seu 'server.js' está servindo arquivos estáticos da pasta 'html'
            return res.redirect('/html/login.html');

        } catch (error) {
            if (error.message.includes('já cadastrado') || error.message.includes('já está em uso')) {
                return res.status(409).json({ message: error.message }); // 409 Conflict
            }
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao registrar.' });
        }
    },

    // =======================================================
    // LOGIN DE USUÁRIO (AGORA COM NICKNAME E SENHA)
    // =======================================================
    login: async (req, res) => {
        try {
            // Espera 'nickname' e 'senha' no corpo da requisição para login
            const { nickname, senha } = req.body; 
            if (!nickname || !senha) {
                return res.status(400).json({ message: 'Nickname e senha são obrigatórios.' });
            }
            
            // Chama o serviço de login, que autenticará e gerará o token
            const { token, user } = await userService.loginUser(nickname, senha); 
            res.status(200).json({ token, user });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            if (error.message.includes('Credenciais inválidas')) {
                return res.status(401).json({ message: error.message }); // 401 Unauthorized
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao fazer login.' });
        }
    },

    // =======================================================
    // OBTER PERFIL DO USUÁRIO LOGADO (PROTEGIDO POR TOKEN)
    // =======================================================
    getProfile: async (req, res) => {
        try {
            // req.userId é definido pelo middleware verifyToken (auth.js)
            const id_usuario = req.userId; 
            
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
            
            const result = await userService.requestPasswordReset(email);
            // Sempre retornar uma mensagem de sucesso para não revelar se o e-mail existe, por segurança.
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
            const { token } = req.params; // Token vem da URL, ex: /reset-password/:token
            const { newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
            }
            if (newPassword.length < 6) { 
                return res.status(400).json({ message: 'A nova senha deve ter pelo menos 6 caracteres.' });
            }

            const result = await userService.resetPassword(token, newPassword);
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
            const userId = req.userId; // Vem do middleware verifyToken
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
            const userId = req.userId; // Vem do middleware verifyToken

            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            await userService.deleteAccount(userId); 
            res.status(200).json({ message: 'Conta deletada com sucesso.' });
        } catch (error) {
            console.error('Erro ao deletar conta do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao deletar conta.' });
        }
    }
};

module.exports = userController;