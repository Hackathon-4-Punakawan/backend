const nodemailer = require("nodemailer");

// Create transport using environment SMTP or Ethereal/mock transport
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "mock_user@ethereal.email",
    pass: process.env.SMTP_PASS || "mock_pass",
  },
});

/**
 * Send automated credential email to newly created DPL or Mitra Supervisor
 */
async function sendCredentialEmail({ email, password, role, name }) {
  const roleName = role === "DPL" ? "Dosen Pembimbing Lapangan" : "Mitra Industri / Supervisor";
  const loginUrl = process.env.FRONTEND_LOGIN_URL || "https://unika.in/login";

  const subject = `🔐 Akun Akses ${roleName} - UNIKA.IN`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #4f46e5; padding: 20px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px;">UNIKA.IN</h2>
        <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Sistem Konversi Nilai Magang Berbasis OBE</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff; color: #333333;">
        <h3 style="margin-top: 0; color: #1e1b4b;">Halo, ${name}</h3>
        <p>Akun akses Anda untuk portal <strong>UNIKA.IN</strong> sebagai <strong>${roleName}</strong> telah berhasil dibuat oleh Admin Prodi.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0 0 8px 0;"><strong>📧 Email / Username:</strong> <code>${email}</code></p>
          <p style="margin: 0;"><strong>🔑 Password Sementara:</strong> <code style="background-color: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 4px; font-size: 16px; font-weight: bold;">${password}</code></p>
        </div>

        <p style="font-size: 14px; color: #64748b;">Silakan login ke portal menggunakan kredensial di atas. Demi keamanan, Anda sangat disarankan untuk mengubah password setelah login pertama kali.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #4f46e5; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login ke Portal UNIKA.IN</a>
        </div>
      </div>
      
      <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Prodi S-1 Informatika Universitas AMIKOM Yogyakarta</p>
      </div>
    </div>
  `;

  // Always log credential to console for testing/debugging purposes
  console.log(`\n========================================================`);
  console.log(`📧 [MAILER ENGINE] Credential Email Triggered:`);
  console.log(`• To: ${email} (${name})`);
  console.log(`• Role: ${role}`);
  console.log(`• Temporary Password: ${password}`);
  console.log(`========================================================\n`);

  try {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      await transporter.sendMail({
        from: `"UNIKA.IN Admin" <${process.env.SMTP_FROM || "no-reply@unika.in"}>`,
        to: email,
        subject,
        html: htmlContent,
      });
      console.log(`✅ Credential email sent successfully to ${email}`);
    }
  } catch (err) {
    console.warn(`⚠️ SMTP Mailer error (logged to console fallback):`, err.message);
  }
}

module.exports = {
  sendCredentialEmail,
};
