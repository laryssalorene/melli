// scripts/services/emailService.js
const nodemailer = require('nodemailer');
require('dotenv').config(); 

const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE, 
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS, 
    },
});

const sendResetPasswordEmail = async (toEmail, resetLink) => { // toEmail JÁ DESCRIPTOGRAFADO
    if (!toEmail || !resetLink) {
        throw new Error('E-mail e link de redefinição são obrigatórios para enviar o e-mail.');
    }

    const mailOptions = {
        from: process.env.EMAIL_USER, 
        to: toEmail, 
        subject: 'Redefinição de Senha - Melli Hero', 
        html: `
            <p>Olá,</p>
            <p>Você solicitou a redefinição da sua senha para o Melli Hero.</p>
            <p>Para criar uma nova senha, clique no link abaixo:</p>
            <p><a href="${resetLink}">Redefinir Minha Senha</a></p>
            <p>Este link é válido por ${process.env.RESET_PASSWORD_EXPIRES_IN || '1 hora'}. Se você não solicitou uma redefinição de senha, por favor, ignore este e-mail.</p>
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
        throw new Error('Falha ao enviar e-mail de redefinição. Por favor, verifique suas configurações de e-mail ou tente novamente mais tarde.');
    }
};

const sendNicknameRecoveryEmail = async (toEmail, nickname) => { // toEmail JÁ DESCRIPTOGRAFADO
    if (!toEmail || !nickname) {
        throw new Error('E-mail e nickname são obrigatórios para enviar o e-mail de recuperação.');
    }

    const mailOptions = {
        from: process.env.EMAIL_USER, 
        to: toEmail, 
        subject: 'Recuperação de Nickname - Melli Hero', 
        html: `
            <p>Olá,</p>
            <p>Você solicitou a recuperação do seu nickname no Melli Hero.</p>
            <p>Seu nickname é: <strong>${nickname}</strong></p>
            <p>Se você não solicitou isso, por favor, ignore este e-mail.</p>
            <p>Obrigado,<br>Equipe Melli Hero</p>
        `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`E-mail de recuperação de nickname enviado com sucesso para ${toEmail}:`, info.response);
        return true;
    } catch (error) {
        console.error(`Erro ao enviar e-mail de recuperação de nickname para ${toEmail}:`, error);
        throw new Error('Falha ao enviar e-mail de recuperação de nickname. Por favor, tente novamente mais tarde.');
    }
};

module.exports = {
    sendResetPasswordEmail,
    sendNicknameRecoveryEmail, 
};