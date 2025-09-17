// scripts/controllers/authController.js
const authService = require('../services/authService'); // Caminho CORRIGIDO

const authController = {
    // Função para registrar um novo usuário
    register: async (req, res) => {
        const { nome, email, senha } = req.body;
        try {
            const result = await authService.registerUser(nome, email, senha);
            res.status(201).json({ message: result.message, userId: result.userId });
        } catch (error) {
            console.error('Erro no registro:', error);
            res.status(400).json({ message: error.message });
        }
    },

    // Função para fazer login de um usuário
    login: async (req, res) => {
        const { email, senha } = req.body;
        try {
            const result = await authService.loginUser(email, senha);
            res.status(200).json({ 
                message: result.message, 
                token: result.token, 
                user: { // Incluindo informações básicas do usuário
                    id_usuario: result.user.id_usuario,
                    nome: result.user.nome,
                    email: result.user.email,
                    pontos: result.user.pontos,
                    assiduidade_dias: result.user.assiduidade_dias
                }
            });
        } catch (error) {
            console.error('Erro no login:', error);
            res.status(401).json({ message: error.message });
        }
    }
};

module.exports = authController; // Exporta o objeto authController com as funções