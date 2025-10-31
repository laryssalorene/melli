// scripts/services/userService.js
const UserModel = require('../models/Usuario'); // Renomeado de Usuario para UserModel para consistência
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Adicionado para gerar tokens JWT
const ms = require('ms'); // Adicionado para parsear strings de tempo (ex: '5m')
const emailService = require('./emailService'); // Importar o serviço de e-mail
const progressService = require('./progressService'); // Já existente no seu código

const saltRounds = 10; 

const userService = {
    // =======================================================
    // MÉTODO DE REGISTRO
    // =======================================================
    registerUser: async (nome, email, senha, mascote_id = null) => {
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            throw new Error("E-mail já cadastrado.");
        }
        // UserModel.create agora faz o hash internamente e retorna uma instância
        const newUser = await UserModel.create(nome, email, senha, mascote_id); 
        return newUser;
    },

    // =======================================================
    // MÉTODO DE LOGIN
    // =======================================================
    loginUser: async (email, senha) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error('Credenciais inválidas.'); // Não informar se o usuário existe ou não por segurança
        }

        // user.comparePassword é um método da instância agora
        const isPasswordValid = await user.comparePassword(senha); 
        if (!isPasswordValid) {
            throw new Error('Credenciais inválidas.');
        }

        const token = jwt.sign(
            { id_usuario: user.id_usuario, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' } // Token expira em 1 hora
        );

        // Atualiza a data do último login e assiduidade (usando a instância do usuário)
        await userService.updateLoginData(user.id_usuario); 
        
        // Retorna apenas dados seguros do usuário, sem a senha
        return { 
            token, 
            user: { 
                id_usuario: user.id_usuario, 
                nome: user.nome, 
                email: user.email, 
                mascote_id: user.mascote_id,
                pontos: user.pontos, 
                assiduidade_dias: user.assiduidade_dias, 
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
            // Chama o método da instância do usuário para atualizar informações de login
            await user.updateLoginInfo(now.toISOString(), assiduidade); 
        }
    },

    // =======================================================
    // MÉTODO getUserProfile (EXISTENTE)
    // =======================================================
    getUserProfile: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) return null;
        
        // Retorna todos os dados da instância do usuário, incluindo pontos e assiduidade.
        // Se você tiver um método .toJSON() no UserModel que filtra, ele seria útil aqui.
        // Caso contrário, construa o objeto manualmente para não expor a senha, etc.
        const userPublicData = {
            id_usuario: user.id_usuario,
            nome: user.nome,
            email: user.email,
            pontos: user.pontos,
            assiduidade_dias: user.assiduidade_dias,
            mascote_id: user.mascote_id,
            data_registro: user.data_registro,
            ultimo_login: user.ultimo_login,
            // ... quaisquer outros campos públicos que você queira expor
        };

        const userProgress = await progressService.getUserProgress(id_usuario); 
        return { ...userPublicData, progresso: userProgress };
    },

    // =======================================================
    // MÉTODO updateUserPoints (EXISTENTE)
    // =======================================================
    updateUserPoints: async (id_usuario, pointsToAdd) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) throw new Error("Usuário não encontrado para atualizar pontos.");
        
        // Chama o método da instância do usuário para atualizar pontos
        // A assiduidade é atualizada no login, não aqui.
        await user.updatePoints(pointsToAdd); 
    },

    // =======================================================
    // MÉTODO para solicitar redefinição de senha
    // =======================================================
    requestPasswordReset: async (email) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            console.warn(`Tentativa de redefinição de senha para e-mail não encontrado: ${email}`);
            return { message: 'Se o e-mail estiver cadastrado, um link de redefinição de senha foi enviado.' };
        }

        const resetToken = jwt.sign(
            { id_usuario: user.id_usuario },
            process.env.RESET_PASSWORD_SECRET,
            { expiresIn: process.env.RESET_PASSWORD_EXPIRES_IN } 
        );

        const expiresInMs = ms(process.env.RESET_PASSWORD_EXPIRES_IN);
        const resetExpires = new Date(Date.now() + expiresInMs); 

        await user.saveResetToken(resetToken, resetExpires);

        const resetLink = `${process.env.FRONTEND_URL}/html/reset-password.html?token=${resetToken}`;
        await emailService.sendResetPasswordEmail(email, resetLink);

        return { message: 'Se o e-mail estiver cadastrado, um link de redefinição de senha foi enviado.' };
    },

    // =======================================================
    // MÉTODO para redefinir a senha
    // =======================================================
    resetPassword: async (token, newPassword) => {
        if (!newPassword || newPassword.length < 6) { 
            throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
        }

        const user = await UserModel.findByResetToken(token);

        if (!user) {
            throw new Error('Token de redefinição inválido ou expirado.');
        }
        
        // Valida se o token não foi utilizado após a verificação de expiração
        if (user.reset_token_expiracao < new Date()) { // Comparar com o tempo atual novamente para garantir
            throw new Error('Token de redefinição expirado.');
        }
        if (user.reset_token !== token) { // Comparar o token para garantir que é o mesmo salvo
             throw new Error('Token de redefinição inválido ou já utilizado.');
        }

        await user.updatePassword(newPassword); 

        return { message: 'Sua senha foi redefinida com sucesso!' };
    },

    // =======================================================
    // NOVO: MÉTODO PARA OBTER RANKING DE USUÁRIOS
    // =======================================================
    getUsersRanking: async () => {
        try {
            // Chama o método estático getRanking do UserModel
            const ranking = await UserModel.getRanking(); 
            
            // Você pode querer filtrar ou formatar os dados aqui antes de retornar
            // Por exemplo, para garantir que apenas campos públicos sejam expostos
            return ranking.map(user => ({
                nome: user.nome,
                pontos: user.pontos,
                // Incluir o mascote_id se for útil para o ranking
            }));
        } catch (error) {
            console.error('Erro no serviço ao buscar ranking de usuários:', error);
            throw new Error('Não foi possível obter o ranking de usuários.'); 
        }
    }
};

module.exports = userService;