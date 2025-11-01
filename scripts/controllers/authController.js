// scripts/controllers/authController.js
const userService = require('../services/userService'); // Importa o nosso UserService (renomeado)
const jwt = require('jsonwebtoken'); 

// Pega diretamente do process.env (garantindo que .env foi carregado no server.js)
const JWT_SECRET = process.env.JWT_SECRET; 
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const authController = {
    /**
     * Registra um novo usuário.
     * Espera { nickname, email, password } no corpo da requisição.
     */
    register: async (req, res) => {
        try {
            // ** ATENÇÃO: Campos esperados do frontend agora são 'nickname' e 'password' **
            const { nickname, email, password, mascote_id } = req.body; 

            if (!nickname || !email || !password) {
                return res.status(400).json({ message: 'Nickname, e-mail e senha são obrigatórios.' });
            }
            
            // O userService.registerUser já trata validação e hash
            const newUser = await userService.registerUser(nickname, email, password, mascote_id); 
            
            if (!JWT_SECRET) {
                console.error("JWT_SECRET não está definido em authController.");
                throw new Error("Chave secreta do JWT não configurada no servidor.");
            }
            
            // Gerar token JWT após o registro
            const token = jwt.sign(
                { id_usuario: newUser.id_usuario, nickname: newUser.nickname },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRES_IN }
            );

            res.status(201).json({ 
                message: 'Usuário registrado com sucesso!', 
                token, 
                user: { 
                    id_usuario: newUser.id_usuario, 
                    nickname: newUser.nickname, 
                    email: newUser.email,
                    pontos: newUser.pontos,
                    assiduidade_dias: newUser.assiduidade_dias,
                    mascote_id: newUser.mascote_id
                } 
            });
        } catch (error) {
            console.error('Erro no registro do usuário:', error);
            if (error.message.includes('já cadastrado') || error.message.includes('já está em uso')) {
                return res.status(409).json({ message: error.message }); // 409 Conflict
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao registrar usuário.' });
        }
    },

    /**
     * Autentica um usuário existente.
     * Espera { nickname, password } no corpo da requisição.
     */
    login: async (req, res) => {
        try {
            // ** ATENÇÃO: Campos esperados do frontend agora são 'nickname' e 'password' **
            const { nickname, password } = req.body; 

            if (!nickname || !password) {
                return res.status(400).json({ message: 'Nickname e senha são obrigatórios.' });
            }
            
            // O userService.loginUser já valida credenciais, atualiza login e gera o token
            const result = await userService.loginUser(nickname, password); 
            
            if (!JWT_SECRET) {
                console.error("JWT_SECRET não está definido em authController.");
                throw new Error("Chave secreta do JWT não configurada no servidor.");
            }
            
            // O token e os dados do usuário já são retornados pelo userService.loginUser
            res.json({ 
                token: result.token, 
                user: result.user 
            });
        } catch (error) {
            console.error('Erro no login do usuário:', error);
            if (error.message.includes('Credenciais inválidas')) {
                return res.status(401).json({ message: error.message }); // 401 Unauthorized
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao fazer login.' });
        }
    },

    /**
     * Solicita redefinição de senha.
     * Espera { email } no corpo da requisição.
     */
    requestPasswordReset: async (req, res) => {
        try {
            const { email } = req.body;
            if (!email) {
                return res.status(400).json({ message: 'O e-mail é obrigatório para redefinir a senha.' });
            }

            const result = await userService.requestPasswordReset(email);
            res.status(200).json(result); // O serviço já retorna { message: '...' }
        } catch (error) {
            console.error('Erro ao solicitar redefinição de senha:', error);
            // Use 200 OK mesmo em caso de e-mail não encontrado para não vazar informações
            res.status(200).json({ message: error.message || 'Se o seu e-mail estiver cadastrado, um link de redefinição será enviado.' });
        }
    },

    /**
     * Redefine a senha do usuário.
     * Espera { token, newPassword } no corpo da requisição.
     */
    resetPassword: async (req, res) => {
        try {
            const { token, newPassword } = req.body;
            if (!token || !newPassword) {
                return res.status(400).json({ message: 'Token e nova senha são obrigatórios.' });
            }

            const result = await userService.resetPassword(token, newPassword);
            res.status(200).json(result); // O serviço já retorna { message: '...' }
        } catch (error) {
            console.error('Erro ao redefinir senha:', error);
            if (error.message.includes('inválido ou expirado')) {
                return res.status(400).json({ message: error.message }); // 400 Bad Request
            }
            if (error.message.includes('pelo menos 6 caracteres')) {
                return res.status(400).json({ message: error.message });
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao redefinir senha.' });
        }
    },

    /**
     * Retorna os dados do perfil do usuário logado.
     * Requer autenticação (req.userId é definido pelo middleware verifyToken).
     */
    getProfile: async (req, res) => {
        try {
            const userId = req.userId; // Vem do middleware verifyToken
            if (!userId) {
                return res.status(401).json({ message: 'Usuário não autenticado.' });
            }

            const userProfile = await userService.getUserProfile(userId); // Usa getUserProfile
            if (!userProfile) {
                return res.status(404).json({ message: 'Perfil do usuário não encontrado.' });
            }

            res.status(200).json(userProfile);
        } catch (error) {
            console.error('Erro ao buscar perfil do usuário:', error);
            res.status(500).json({ message: 'Erro interno do servidor ao buscar perfil.' });
        }
    },

    /**
     * Atualiza o perfil do usuário logado.
     * Requer autenticação.
     * Espera { nickname, email, mascote_id } no corpo da requisição (apenas os que serão atualizados).
     */
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

    /**
     * Deleta o usuário logado.
     * Requer autenticação.
     */
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

module.exports = authController;