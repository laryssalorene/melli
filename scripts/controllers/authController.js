const userService = require('../services/userService'); // Seu serviço de usuário
const bcrypt = require('bcryptjs'); // Para comparar senhas
const jwt = require('jsonwebtoken'); // Para gerar tokens JWT

// <<-- NOVO: Define JWT_SECRET uma única vez no arquivo
// Ele deve vir de process.env.JWT_SECRET que é carregado pelo dotenv no server.js
const JWT_SECRET = process.env.JWT_SECRET; 

// <<-- Importe MascoteModel se você estiver usando mascote_id no registro
// const MascoteModel = require('../models/Mascote'); // Exemplo: Se precisar validar mascote_id

const authController = {
    register: async (req, res) => {
        try {
            const { nome, email, senha, mascote_id } = req.body; // Incluído mascote_id, se aplicável

            if (!nome || !email || !senha) {
                return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
            }

            // Verificar se o email já existe
            const existingUser = await userService.findUserByEmail(email);
            if (existingUser) {
                return res.status(409).json({ message: 'Este email já está em uso.' });
            }

            // Você pode adicionar uma verificação para mascote_id aqui se for obrigatório
            // Exemplo: if (mascote_id === undefined) return res.status(400).json({ message: 'Mascote é obrigatório.' });

            // Registrar o usuário com o userService
            // O userService deve cuidar do hash da senha e da criação no DB
            const newUser = await userService.registerUser(nome, email, senha, mascote_id); 
            
            // Verifica se o secret foi carregado
            if (!JWT_SECRET) {
                console.error("JWT_SECRET não está definido em authController.");
                throw new Error("Chave secreta do JWT não configurada no servidor.");
            }

            // Gerar token JWT imediatamente após o registro
            const token = jwt.sign({ id_usuario: newUser.id_usuario }, JWT_SECRET, { expiresIn: '1h' });
            
            res.status(201).json({ 
                message: 'Usuário registrado com sucesso!', 
                token, 
                user: { 
                    id_usuario: newUser.id_usuario, 
                    nome: newUser.nome, 
                    email: newUser.email,
                    pontos: newUser.pontos, // Adicione outros campos que o registro pode retornar
                    assiduidade_dias: newUser.assiduidade_dias
                } 
            });
        } catch (error) {
            console.error('Erro no registro do usuário:', error);
            // Melhora a mensagem de erro para o cliente se for um erro específico (ex: unique constraint)
            if (error.message.includes('unique constraint failed')) {
                return res.status(409).json({ message: 'Erro: Dados duplicados (ex: email já cadastrado).' });
            }
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao registrar usuário.' });
        }
    },

    login: async (req, res) => {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
            }

            const user = await userService.findUserByEmail(email);
            if (!user) {
                return res.status(400).json({ message: 'Email ou senha incorretos.' });
            }

            const isMatch = await bcrypt.compare(senha, user.senha);
            if (!isMatch) {
                return res.status(400).json({ message: 'Email ou senha incorretos.' });
            }

            // Lógica de atualização de último login e assiduidade (movida para o userService)
            // O userService.updateLoginData já deve lidar com a lógica de assiduidade
            await userService.updateLoginData(user.id_usuario); 
            
            // Recarrega o usuário para pegar dados atualizados (como assiduidade_dias e ultimo_login)
            const updatedUser = await userService.findUserById(user.id_usuario);
            
            if (!updatedUser) {
                // Isso não deveria acontecer, mas é uma verificação de segurança
                console.error("Usuário não encontrado após atualização de login.");
                return res.status(500).json({ message: 'Erro interno ao recuperar dados do usuário.' });
            }

            // Verifica se o secret foi carregado
            if (!JWT_SECRET) {
                console.error("JWT_SECRET não está definido em authController.");
                throw new Error("Chave secreta do JWT não configurada no servidor.");
            }

            const token = jwt.sign({ id_usuario: updatedUser.id_usuario }, JWT_SECRET, { expiresIn: '1h' });
            
            res.json({ 
                token, 
                user: { 
                    id_usuario: updatedUser.id_usuario, 
                    nome: updatedUser.nome, 
                    email: updatedUser.email,
                    pontos: updatedUser.pontos,
                    assiduidade_dias: updatedUser.assiduidade_dias,
                    ultimo_login: updatedUser.ultimo_login // Incluir se for relevante para o front
                } 
            });
        } catch (error) {
            console.error('Erro no login do usuário:', error);
            res.status(500).json({ message: error.message || 'Erro interno do servidor ao fazer login.' });
        }
    }
};

module.exports = authController;