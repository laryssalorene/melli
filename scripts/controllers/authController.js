// scripts/controllers/authController.js
const authService = require('../services/authService'); // Serviço de AUTENTICAÇÃO
const jwt = require('jsonwebtoken'); 

require('dotenv').config();
const JWT_SECRET = process.env.JWT_SECRET; 
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

const authController = {
    /**
     * Registra um novo usuário.
     */
    register: async (req, res) => {
        try {
            const { nickname, email, password, mascote_id } = req.body; 

            if (!nickname || !email || !password) {
                return res.status(400).json({ message: 'Nickname, email e senha são obrigatórios.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres.' });
            }

            const newUser = await authService.registerUser(nickname, email, password, mascote_id); 
            
            const token = jwt.sign(
                { id_usuario: newUser.id_usuario, nickname: newUser.nickname, email: newUser.email }, 
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
                return res.status(409).json({ message: error.message }); 
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao registrar usuário.' });
        }
    },

    /**
     * Autentica um usuário existente.
     */
    login: async (req, res) => {
        try {
            const { email, password } = req.body; 
            if (!email || !password) {
                return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
            }

            const result = await authService.loginUser(email, password); 
            
            res.json({ 
                token: result.token, 
                user: result.user 
            });
        } catch (error) {
            console.error('Erro no login do usuário:', error);
            if (error.message.includes('Credenciais inválidas')) {
                return res.status(401).json({ message: error.message }); 
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao fazer login.' });
        }
    },
};

module.exports = { authController }; // Exporta APENAS o controller, não o verifyToken