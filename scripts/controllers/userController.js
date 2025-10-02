// scripts/controllers/userController.js
const userService = require('../services/userService'); // Importa seu userService

const userController = {
    // =======================================================
    // REGISTRAR USUÁRIO
    // =======================================================
    register: async (req, res) => {
        try {
            const { nome, email, senha, mascote_id } = req.body;
            if (!nome || !email || !senha) {
                return res.status(400).json({ message: 'Todos os campos (nome, email, senha) são obrigatórios.' });
            }
            if (senha.length < 6) {
                return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
            }
            const newUser = await userService.registerUser(nome, email, senha, mascote_id);
            // Retorna apenas dados públicos do usuário no registro
            res.status(201).json({ 
                message: 'Usuário registrado com sucesso!', 
                user: { 
                    id_usuario: newUser.id_usuario, 
                    nome: newUser.nome, 
                    email: newUser.email,
                    mascote_id: newUser.mascote_id
                } 
            });
        } catch (error) {
            if (error.message.includes('E-mail já cadastrado.')) {
                return res.status(409).json({ message: error.message });
            }
            console.error('Erro ao registrar usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao registrar.' });
        }
    },

    // =======================================================
    // LOGIN DE USUÁRIO
    // =======================================================
    login: async (req, res) => {
        try {
            const { email, senha } = req.body;
            if (!email || !senha) {
                return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
            }
            // Chama o novo método de login do userService
            const { token, user } = await userService.loginUser(email, senha);
            res.status(200).json({ token, user });
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            res.status(401).json({ message: error.message || 'Credenciais inválidas.' });
        }
    },

    // =======================================================
    // OBTER PERFIL DO USUÁRIO LOGADO
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
    // SOLICITAR REDEFINIÇÃO DE SENHA (NOVO)
    // =======================================================
    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'E-mail é obrigatório.' });
            }
            // Chama o novo método do userService
            const result = await userService.requestPasswordReset(email);
            // Sempre retornar uma mensagem de sucesso para não revelar se o e-mail existe, por segurança.
            res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao solicitar redefinição de senha:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao solicitar redefinição de senha.' });
        }
    },

    // =======================================================
    // REDEFINIR SENHA (NOVO)
    // =======================================================
    resetPassword: async (req, res) => {
        try {
            const { token } = req.params; // Token vem da URL, ex: /reset-password/:token
            const { newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
            }

            // Chama o novo método do userService
            const result = await userService.resetPassword(token, newPassword);
            res.status(200).json(result);
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            // Retorna 400 para erros de token inválido/expirado ou senha fraca
            res.status(400).json({ message: error.message || 'Erro interno do servidor ao redefinir senha.' });
        }
    }
};

module.exports = userController;