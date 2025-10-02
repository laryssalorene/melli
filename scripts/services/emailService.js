// scripts/services/emailService.js
const nodemailer = require('nodemailer');

// Configura o transportador de e-mail usando as variáveis de ambiente do .env
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, // Ex: 'gmail', 'outlook', 'sendgrid' etc.
    auth: {
        user: process.env.EMAIL_USER, // Seu e-mail (kumonchato2@gmail.com)
        pass: process.env.EMAIL_PASS, // Sua senha de app ou senha forte
    },
});

/**
 * Envia um e-mail de redefinição de senha para o usuário.
 * @param {string} toEmail O endereço de e-mail do destinatário.
 * @param {string} resetToken O token único gerado para a redefinição de senha.
 * @returns {Promise<boolean>} Retorna true se o e-mail foi enviado com sucesso, lança erro caso contrário.
 */
const sendResetPasswordEmail = async (toEmail, resetToken) => {
    const frontendUrl = process.env.FRONTEND_URL; // URL do seu frontend (ex: http://localhost:5000)
    
    // Constrói o link de redefinição que o usuário receberá.
    // O usuário será direcionado para uma página no frontend com o token na URL.
    // Certifique-se de que seu frontend tenha um arquivo `reset-password.html` ou uma rota equivalente.
    const resetLink = `${frontendUrl}/html/reset-password.html?token=${resetToken}`; 

    const mailOptions = {
        from: process.env.EMAIL_USER, // Remetente do e-mail
        to: toEmail, // Destinatário (e-mail do usuário que solicitou a redefinição)
        subject: 'Redefinição de Senha - Melli Hero', // Assunto do e-mail
        html: `
            <p>Olá,</p>
            <p>Você solicitou a redefinição da sua senha para o Melli Hero.</p>
            <p>Para criar uma nova senha, clique no link abaixo:</p>
            <p><a href="${resetLink}">Redefinir Minha Senha</a></p>
            <p>Este link é válido por ${process.env.RESET_PASSWORD_EXPIRES_IN}. Se você não solicitou uma redefinição de senha, por favor, ignore este e-mail.</p>
            <p>Obrigado,<br>Equipe Melli Hero</p>
            <p>Link direto (se o botão não funcionar): <a href="${resetLink}">${resetLink}</a></p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`E-mail de redefinição enviado com sucesso para ${toEmail}:`, info.response);
        return true;
    } catch (error) {
        console.error(`Erro ao enviar e-mail de redefinição para ${toEmail}:`, error);
        // É importante lançar o erro para que o controlador possa capturá-lo
        // e enviar uma resposta adequada ao cliente (embora ainda de forma genérica para segurança).
        throw new Error('Falha ao enviar e-mail de redefinição. Por favor, verifique suas configurações de e-mail ou tente novamente mais tarde.');
    }
};

module.exports = {
    sendResetPasswordEmail,
};