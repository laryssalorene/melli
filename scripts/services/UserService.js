// scripts/services/userService.js
const UserModel = require('../models/Usuario'); // Renomeado de Usuario para UserModel para consistência
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Adicionado para gerar tokens JWT
const ms = require('ms'); // Adicionado para parsear strings de tempo (ex: '5m')
const emailService = require('./emailService'); // Importar o serviço de e-mail
const progressService = require('./progressService'); // Já existente no seu código
const { run } = require('../db'); // Importa 'run' para atualizar o ultimo_login, se o UserModel não o fizer diretamente

const saltRounds = 10; // Custo de hash para bcrypt, pode ser configurado em .env se desejar

const userService = {
    // =======================================================
    // MÉTODO DE REGISTRO
    // =======================================================
    registerUser: async (nome, email, senha, mascote_id = null) => {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error("E-mail já cadastrado.");
        }
        const hashedPassword = await bcrypt.hash(senha, saltRounds); // Usar saltRounds
        const newUser = await UserModel.create(nome, email, hashedPassword, mascote_id);
        return newUser;
    },

    // =======================================================
    // NOVO: MÉTODO DE LOGIN
    // =======================================================
    loginUser: async (email, senha) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error('Credenciais inválidas.'); // Não informar se o usuário existe ou não por segurança
        }

        const isPasswordValid = await bcrypt.compare(senha, user.senha); // Usar bcrypt.compare
        if (!isPasswordValid) {
            throw new Error('Credenciais inválidas.');
        }

        const token = jwt.sign(
            { id_usuario: user.id_usuario, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // Atualiza a data do último login e assiduidade (usando o seu método existente ou atualizado)
        await userService.updateLoginData(user.id_usuario); 
        
        // Retorna apenas dados seguros do usuário, sem a senha
        return { 
            token, 
            user: { 
                id_usuario: user.id_usuario, 
                nome: user.nome, 
                email: user.email, 
                mascote_id: user.mascote_id,
                pontos: user.pontos, // Adicionado pontos
                assiduidade_dias: user.assiduidade_dias, // Adicionado assiduidade
                data_registro: user.data_registro,
                ultimo_login: user.ultimo_login
            } 
        };
    },

    // =======================================================
    // MÉTODOS DE BUSCA (EXISTENTES)
    // =======================================================
    findUserByEmail: async (email) => {
        return await UserModel.findByEmail(email);
    },

    findUserById: async (id_usuario) => {
        return await UserModel.findById(id_usuario);
    },

    // =======================================================
    // MÉTODO updateLoginData (AJUSTADO PARA USAR UserModel.updateLoginInfo)
    // =======================================================
    updateLoginData: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) {
            console.warn("Usuário não encontrado para atualização de login. ID:", id_usuario);
            return; // Apenas loga e sai, não lança erro aqui para não interromper o login
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        // Se ultimo_login for null ou uma data inválida, trate-o como um novo dia de login
        const lastLoginDateTime = user.ultimo_login ? new Date(user.ultimo_login) : null;
        const lastLoginDay = lastLoginDateTime ? lastLoginDateTime.toISOString().split('T')[0] : null;

        let assiduidade = user.assiduidade_dias;

        if (lastLoginDay !== today) { // Se o último login não foi hoje
            if (lastLoginDateTime) { // Se houve um último login registrado
                const diffTime = Math.abs(now.getTime() - lastLoginDateTime.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays === 1) { // Se logou no dia seguinte consecutivo
                    assiduidade++;
                } else { // Se houve uma lacuna, reinicia a assiduidade
                    assiduidade = 1;
                }
            } else { // Primeiro login registrado, inicia assiduidade
                assiduidade = 1;
            }
            // Chama o método atualizado do modelo
            await UserModel.updateLoginInfo(id_usuario, now.toISOString(), assiduidade); // Salva com DATETIME completo
        }
    },

    // =======================================================
    // MÉTODO getUserProfile (EXISTENTE)
    // =======================================================
    getUserProfile: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) return null;
        
        const userProgress = await progressService.getUserProgress(id_usuario); 
        return { ...user, progresso: userProgress };
    },

    // =======================================================
    // MÉTODO updateUserPoints (EXISTENTE)
    // =======================================================
    updateUserPoints: async (id_usuario, pointsToAdd) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) throw new Error("Usuário não encontrado para atualizar pontos.");
        
        await UserModel.updatePointsAndAssiduidade(id_usuario, pointsToAdd, user.assiduidade_dias);
    },

    // =======================================================
    // NOVO: MÉTODO para solicitar redefinição de senha
    // =======================================================
    requestPasswordReset: async (email) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            console.warn(`Tentativa de redefinição de senha para e-mail não encontrado: ${email}`);
            // POR SEGURANÇA: Sempre retornar uma mensagem de sucesso para não revelar se o e-mail existe ou não.
            return { message: 'Se o e-mail estiver cadastrado, um link de redefinição de senha foi enviado.' };
        }

        // Gerar um token de redefinição único e com expiração
        const resetToken = jwt.sign(
            { id_usuario: user.id_usuario },
            process.env.RESET_PASSWORD_SECRET,
            { expiresIn: process.env.RESET_PASSWORD_EXPIRES_IN } // Ex: '5m' do .env
        );

        // Calcular a data de expiração para salvar no DB
        const expiresInMs = ms(process.env.RESET_PASSWORD_EXPIRES_IN);
        const resetExpires = new Date(Date.now() + expiresInMs).toISOString(); // Formato ISO para DATETIME no SQLite

        // Salvar o token e a data de expiração no banco de dados
        await UserModel.saveResetToken(email, resetToken, resetExpires);

        // Enviar o e-mail com o link de redefinição
        await emailService.sendResetPasswordEmail(email, resetToken);

        return { message: 'Se o e-mail estiver cadastrado, um link de redefinição de senha foi enviado.' };
    },

    // =======================================================
    // NOVO: MÉTODO para redefinir a senha
    // =======================================================
    resetPassword: async (token, newPassword) => {
        if (!newPassword || newPassword.length < 6) { // Exemplo de validação de senha
            throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
        }

        const user = await UserModel.findByResetToken(token);

        if (!user) {
            throw new Error('Token de redefinição inválido ou expirado.');
        }

        // Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        // Atualizar a senha do usuário e limpar o token de redefinição
        await UserModel.updatePassword(user.id_usuario, hashedPassword);

        return { message: 'Sua senha foi redefinida com sucesso!' };
    }
};

module.exports = userService;