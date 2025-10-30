import nodemailer from 'nodemailer';

// Configuration du transporteur email
const createTransporter = () => {
  // Vérifier si Gmail est configuré
  if (process.env.EMAIL_SERVICE === 'gmail' && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    console.log('✅ Gmail configuré - Envoi de vrais emails');
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  
  // Mode test par défaut
  console.log('⚠️ Gmail NON configuré - Mode test (emails non envoyés)');
  console.log('Variables manquantes:', {
    EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'NON DÉFINI',
    EMAIL_USER: process.env.EMAIL_USER ? 'OK' : 'MANQUANT',
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? 'OK' : 'MANQUANT'
  });
  
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
      user: 'test@example.com',
      pass: 'test123'
    }
  });
};

export const sendPasswordResetEmail = async (email, code) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"Stock & Ventes" <noreply@stock-ventes.com>',
    to: email,
    subject: 'Code de réinitialisation de mot de passe',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb; text-align: center;">Réinitialisation de mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé à réinitialiser votre mot de passe.</p>
        <p>Voici votre code de vérification :</p>
        <div style="text-align: center; margin: 30px 0;">
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; display: inline-block;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #2563eb; font-family: monospace;">
              ${code}
            </span>
          </div>
        </div>
        <p style="color: #666; font-size: 14px; text-align: center;">
          Entrez ce code sur la page de réinitialisation
        </p>
        <p style="color: #ef4444; font-size: 14px; text-align: center; font-weight: bold;">
          ⚠️ Ce code expire dans 1 heure
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
    console.log('✅ Email envoyé avec succès à:', email);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ ERREUR envoi email:', error.message);
    if (error.response) {
      console.error('📨 Réponse SMTP:', error.response);
    }
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
