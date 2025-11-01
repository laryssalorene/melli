const UserModel = require('../models/Usuario');
const MascoteModel = require('../models/Mascote'); 
const jwt = require('jsonwebtoken');
const ms = require('ms');
const emailService = require('./emailService');
const progressService = require('./progressService');

// Validações iniciais para variáveis de ambiente
if (!process.env.JWT_SECRET) {
    console.error('ERRO: JWT_SECRET não definido no arquivo .env');
    process.exit(1);
}
if (!process.env.RESET_PASSWORD_SECRET) {
    console.warn('AVISO: RESET_PASSWORD_SECRET não definido no arquivo .env. Redefinição de senha pode não funcionar.');
}
if (!process.env.RESET_PASSWORD_EXPIRES_IN) {
    console.warn('AVISO: RESET_PASSWORD_EXPIRES_IN não definido no arquivo .env. Usando padrão de 1 hora.');
}

const userService = {
    // =======================================================
    // MÉTODO DE REGISTRO
    // =======================================================
    registerUser: async (nickname, email, password, mascote_id = null) => {
        const existingUserByEmail = await UserModel.findByEmail(email);
        if (existingUserByEmail) {
            throw new Error("E-mail já cadastrado.");
        }
        const existingUserByNickname = await UserModel.findByNickname(nickname);
        if (existingUserByNickname) {
            throw new Error("Nickname já está em uso.");
        }

        const newUser = await UserModel.create(nickname, email, password, mascote_id); 
        return newUser;
    },

    // =======================================================
    // MÉTODO DE LOGIN (AGORA COM NICKNAME E PASSWORD)
    // =======================================================
    loginUser: async (nickname, password) => { 
        // Busca o usuário pelo nickname
        const user = await UserModel.findByNickname(nickname); 
        if (!user) {
            throw new Error('Credenciais inválidas.');
        }

        // Compara a senha fornecida com o hash do DB
        const isPasswordValid = await user.comparePassword(password); 
        if (!isPasswordValid) {
            throw new Error('Credenciais inválidas.');
        }

        // Gera o token JWT para o usuário logado
        const token = jwt.sign(
            { id_usuario: user.id_usuario, nickname: user.nickname }, 
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } 
        );

        // Atualiza os dados de login (último login, assiduidade)
        await userService.updateLoginData(user.id_usuario); 
        
        // Busca o usuário novamente para ter os dados mais atualizados (assiduidade, etc.)
        const updatedUser = await UserModel.findById(user.id_usuario);

        return { 
            token, 
            user: { 
                id_usuario: updatedUser.id_usuario, 
                nickname: updatedUser.nickname, 
                email: updatedUser.email, 
                mascote_id: updatedUser.mascote_id,
                pontos: updatedUser.pontos || 0, 
                assiduidade_dias: updatedUser.assiduidade_dias || 0, 
                data_registro: updatedUser.data_registro,
                ultimo_login: updatedUser.ultimo_login
            } 
        };
    },

    // =======================================================
    // MÉTODOS DE BUSCA DE USUÁRIO
    // =======================================================
    findUserByEmail: async (email) => {
        return await UserModel.findByEmail(email);
    },

    findUserById: async (id_usuario) => {
        return await UserModel.findById(id_usuario);
    },

    findUserByNickname: async (nickname) => {
        return await UserModel.findByNickname(nickname);
    },

    // =======================================================
    // MÉTODO updateLoginData para gerenciar assiduidade
    // =======================================================
    updateLoginData: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) {
            console.warn("Usuário não encontrado para atualização de login. ID:", id_usuario);
            return; 
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0]; // Data atual no formato YYYY-MM-DD
        
        const lastLoginDateTime = user.ultimo_login ? new Date(user.ultimo_login) : null;
        const lastLoginDay = lastLoginDateTime ? lastLoginDateTime.toISOString().split('T')[0] : null;

        let assiduidade = user.assiduidade_dias;

        // Se o último login não foi hoje
        if (lastLoginDay !== today) { 
            if (lastLoginDateTime) {
                const diffTime = Math.abs(now.getTime() - lastLoginDateTime.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Diferença em dias

                // Se logou no dia seguinte ao último login (streak)
                if (diffDays === 1) { 
                    assiduidade++;
                } else { 
                    // Se a diferença for maior que 1 dia, reseta a assiduidade
                    assiduidade = 1;
                }
            } else { 
                // Primeiro login, inicia a assiduidade
                assiduidade = 1;
            }
            await user.updateLoginInfo(now.toISOString(), assiduidade); 
        }
    },

    // =======================================================
    // MÉTODO getUserProfile para obter dados do perfil
    // =======================================================
    getUserProfile: async (id_usuario) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) return null;
        
        const userPublicData = {
            id_usuario: user.id_usuario,
            nickname: user.nickname, 
            email: user.email,
            pontos: user.pontos,
            assiduidade_dias: user.assiduidade_dias,
            mascote_id: user.mascote_id,
            data_registro: user.data_registro,
            ultimo_login: user.ultimo_login,
        };

        const userProgress = await progressService.getUserProgress(id_usuario); 
        return { ...userPublicData, progresso: userProgress };
    },

    // =======================================================
    // MÉTODO updateUserPoints para adicionar pontos
    // =======================================================
    updateUserPoints: async (id_usuario, pointsToAdd) => {
        const user = await UserModel.findById(id_usuario);
        if (!user) throw new Error("Usuário não encontrado para atualizar pontos.");
        
        await user.updatePoints(pointsToAdd); 
    },

    // =======================================================
    // MÉTODO para solicitar redefinição de senha
    // =======================================================
    requestPasswordReset: async (email) => {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            console.warn(`Tentativa de redefinição de senha para e-mail não encontrado: ${email}`);
            // Por segurança, sempre retornar uma mensagem genérica para não revelar se o e-mail existe.
            return { message: 'Se o e-mail estiver cadastrado, um link de redefinição de senha foi enviado.' };
        }

        // Gera um token JWT específico para redefinição de senha
        const resetToken = jwt.sign(
            { id_usuario: user.id_usuario },
            process.env.RESET_PASSWORD_SECRET,
            { expiresIn: process.env.RESET_PASSWORD_EXPIRES_IN || '1h' } 
        );

        const expiresInMs = ms(process.env.RESET_PASSWORD_EXPIRES_IN || '1h');
        const resetExpires = new Date(Date.now() + expiresInMs); 

        // Salva o token de redefinição e sua expiração no banco de dados do usuário
        await user.saveResetToken(resetToken, resetExpires); 

        // Constrói o link de redefinição e envia o e-mail
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

        // Busca o usuário pelo token de redefinição
        const user = await UserModel.findByResetToken(token); 

        if (!user) {
            throw new Error('Token de redefinição inválido ou expirado.');
        }
        
        // Atualiza a senha do usuário e limpa o token de redefinição
        await user.updatePassword(newPassword); 

        return { message: 'Sua senha foi redefinida com sucesso!' };
    },

    // =======================================================
    // MÉTODO PARA OBTER RANKING DE USUÁRIOS (COM ANONIMIZAÇÃO)
    // =======================================================
    getUsersRanking: async () => {
        try {
            const ranking = await UserModel.getRanking(); 
            
            // Anonimiza os dados, retornando apenas nickname, pontos e mascote_id
            return ranking.map(user => ({
                nickname: user.nickname, 
                pontos: user.pontos,
                mascote_id: user.mascote_id
            }));
        } catch (error) {
            console.error('Erro no serviço ao buscar ranking de usuários:', error);
            throw new Error('Não foi possível obter o ranking de usuários.'); 
        }
    },

    // =======================================================
    // MÉTODO updateProfile para atualização de perfil
    // =======================================================
    updateProfile: async (userId, { nickname, email, mascote_id }) => {
        const user = await UserModel.findById(userId);
        if (!user) {
            throw new Error('Usuário não encontrado.');
        }

        if (nickname && nickname !== user.nickname) {
            const existingNickname = await UserModel.findByNickname(nickname);
            if (existingNickname && existingNickname.id_usuario !== userId) {
                throw new Error('Nickname já está em uso.');
            }
            user.nickname = nickname;
        }

        if (email && email !== user.email) {
            const existingEmail = await UserModel.findByEmail(email);
            if (existingEmail && existingEmail.id_usuario !== userId) {
                throw new Error('E-mail já está em uso.');
            }
            user.email = email;
        }

        if (mascote_id !== undefined) {
            const mascoteExists = await MascoteModel.findById(mascote_id); 
            if (!mascoteExists) {
                throw new Error('Mascote escolhido inválido.');
            }
            user.mascote_id = mascote_id; 
        }

        await user.save(); // Salva as alterações no banco de dados

        // Retorna os dados atualizados do usuário
        return {
            id_usuario: user.id_usuario,
            nickname: user.nickname,
            email: user.email,
            pontos: user.pontos,
            mascote_id: user.mascote_id,
            ultimo_login: user.ultimo_login,
            assiduidade_dias: user.assiduidade_dias
        };
    },

    // =======================================================
    // MÉTODO deleteAccount para exclusão de conta
    // =======================================================
    deleteAccount: async (userId) => {
        const result = await UserModel.delete(userId);
        if (result.changes === 0) {
            throw new Error('Usuário não encontrado para deletar.');
        }
        return { message: 'Conta deletada com sucesso.' };
    }
};

module.exports = userService;