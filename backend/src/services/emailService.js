import nodemailer from 'nodemailer';

// Configuration du transporteur email
const createTransporter = () => {
  // Pour le développement, utilise un compte de test Ethereal
  // Pour la production, utilise Gmail, SendGrid, Mailgun, etc.
  
  if (process.env.EMAIL_SERVICE === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD // Utilise un "App Password" pour Gmail
      }
    });
  }
  
  // Par défaut, mode test (les emails ne sont pas vraiment envoyés)
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: process.env.EMAIL_USER || 'test@example.com',
      pass: process.env.EMAIL_PASSWORD || 'test123'
    }
  });
};

export const sendPasswordResetEmail = async (email, token) => {
  const transporter = createTransporter();
  
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Stock & Ventes" <noreply@stock-ventes.com>',
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Réinitialisation de mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Ou copiez ce lien dans votre navigateur :<br>
          <a href="${resetUrl}">${resetUrl}</a>
        </p>
        <p style="color: #666; font-size: 14px;">
          Ce lien expirera dans 1 heure.
        </p>
        <p style="color: #666; font-size: 14px;">
          Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Stock & Ventes - Gestion de stock et ventes
        </p>
      </div>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email envoyé:', info.messageId);
    
    // En mode test, affiche l'URL de prévisualisation
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Prévisualiser l\'email:', nodemailer.getTestMessageUrl(info));
      console.log('🔑 Token de réinitialisation:', token);
      console.log('🌐 URL de réinitialisation:', resetUrl);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

export const sendVerificationEmail = async (email, token) => {
  const transporter = createTransporter();
  
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Stock & Ventes" <noreply@stock-ventes.com>',
    to: email,
    subject: 'Vérifiez votre adresse email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Bienvenue sur Stock & Ventes !</h2>
        <p>Bonjour,</p>
        <p>Merci de vous être inscrit. Pour activer votre compte, veuillez vérifier votre adresse email.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verifyUrl}" 
             style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Vérifier mon email
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Ou copiez ce lien dans votre navigateur :<br>
          <a href="${verifyUrl}">${verifyUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          Stock & Ventes - Gestion de stock et ventes
        </p>
      </div>
    `
  };
  
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email de vérification envoyé:', info.messageId);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔗 Prévisualiser l\'email:', nodemailer.getTestMessageUrl(info));
      console.log('🔑 Token de vérification:', token);
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};
