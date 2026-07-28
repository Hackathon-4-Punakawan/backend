const { Resend } = require("resend");
const nodemailer = require("nodemailer");

// Resolve Resend API Key from RESEND_API_KEY or SMTP_PASS (re_...)
const resendApiKey = (process.env.RESEND_API_KEY || process.env.SMTP_PASS || "").trim();
const isResendKey = resendApiKey.startsWith("re_");
const resendClient = isResendKey ? new Resend(resendApiKey) : null;

// Fallback Nodemailer Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.com",
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true" || Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: resendApiKey || process.env.SMTP_PASS || "mock_pass",
  },
});

const DEFAULT_FROM = process.env.RESEND_FROM || process.env.SMTP_FROM || "UNIKA.IN <onboarding@resend.dev>";

/**
 * Universal Send Email Helper (Resend API -> Nodemailer SMTP -> Console Fallback)
 */
async function sendMailHelper({ to, subject, html }) {
  const targetTo = Array.isArray(to) ? to : [to];

  // 1. Try Resend Official SDK first if API key starting with 're_' is available
  if (resendClient) {
    try {
      const response = await resendClient.emails.send({
        from: DEFAULT_FROM,
        to: targetTo,
        subject,
        html,
      });
      if (response.error) {
        console.warn(`⚠️ Resend API Warning:`, response.error.message || response.error);
      } else {
        console.log(`✅ [RESEND SDK] Email successfully sent to ${targetTo.join(", ")} | ID: ${response.data?.id}`);
        return response;
      }
    } catch (err) {
      console.warn(`⚠️ Resend SDK Exception (falling back to Nodemailer SMTP):`, err.message);
    }
  }

  // 2. Try Nodemailer SMTP Transporter
  try {
    if (resendApiKey || process.env.SMTP_USER) {
      const info = await transporter.sendMail({
        from: DEFAULT_FROM,
        to: targetTo.join(", "),
        subject,
        html,
      });
      console.log(`✅ [NODEMAILER SMTP] Email sent successfully to ${targetTo.join(", ")} | MessageId: ${info.messageId}`);
      return info;
    }
  } catch (err) {
    console.warn(`⚠️ SMTP Transporter Error:`, err.message);
  }

  return null;
}

/**
 * Send automated credential email to newly created DPL or Mitra Supervisor
 */
async function sendCredentialEmail({ email, password, role, name }) {
  const roleName = role === "DPL" ? "Dosen Pembimbing Lapangan" : "Mitra Industri / Supervisor";
  const loginUrl = process.env.FRONTEND_LOGIN_URL || "https://unika.in/login";

  const subject = `🔐 Akun Akses ${roleName} - UNIKA.IN`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #4f46e5, #4338ca); padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 800;">UNIKA.IN</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Sistem Konversi Nilai Magang Berbasis OBE AMIKOM</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff; color: #1e293b;">
        <h3 style="margin-top: 0; color: #1e1b4b;">Halo, ${name}</h3>
        <p style="font-size: 14px; line-height: 1.6;">Akun akses Anda untuk portal <strong>UNIKA.IN</strong> sebagai <strong>${roleName}</strong> telah berhasil dibuat oleh Admin Kaprodi.</p>
        
        <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 18px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Email / Username:</strong> <code style="font-size: 14px;">${email}</code></p>
          <p style="margin: 0; font-size: 14px;"><strong>🔑 Password Sementara:</strong> <code style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 6px; font-size: 16px; font-weight: bold;">${password}</code></p>
        </div>

        <p style="font-size: 14px; color: #64748b; line-height: 1.5;">Silakan login ke portal menggunakan kredensial di atas. Demi keamanan, Anda sangat disarankan untuk mengubah password setelah login pertama kali.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background: linear-gradient(135deg, #4f46e5, #4338ca); color: white; padding: 13px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(79,70,229,0.3);">Login ke Portal UNIKA.IN</a>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Prodi S-1 Informatika Universitas AMIKOM Yogyakarta</p>
      </div>
    </div>
  `;

  console.log(`\n========================================================`);
  console.log(`📧 [MAILER ENGINE] Credential Email Triggered:`);
  console.log(`• To: ${email} (${name})`);
  console.log(`• Role: ${role}`);
  console.log(`• Temporary Password: ${password}`);
  console.log(`========================================================\n`);

  return sendMailHelper({ to: email, subject, html: htmlContent });
}

/**
 * Send automated approval/ACC notification email to student when their internship application or SKS conversion is approved
 */
async function sendAccNotificationEmail({ email, name, nim, status, approver, catatan }) {
  const targetEmail = email || "mahasiswa@students.amikom.ac.id";
  const mhsName = name || "Mahasiswa MBKM";
  const mhsNim = nim || "24.11.6666";
  const appStatus = status || "Disetujui (ACC)";
  const approverRole = approver || "Dosen DPL / Mentor Mitra";
  const noteText = catatan || "Seluruh berkas dan pemetaan CPMK telah diperiksa dan dinyatakan memenuhi syarat konversi SKS.";
  const portalUrl = process.env.FRONTEND_URL || "https://unika.in/dashboard/mahasiswa";

  const subject = `🎉 Selamat! Pengajuan Konversi SKS Magang Anda Telah ACC (${appStatus})`;
  const htmlContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 24px; text-align: center; color: white;">
        <h2 style="margin: 0; font-size: 24px; font-weight: 800;">UNIKA.IN</h2>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.95;">Sistem Pengajuan & Konversi SKS Magang OBE AMIKOM</p>
      </div>
      
      <div style="padding: 30px; background-color: #ffffff; color: #1e293b;">
        <h3 style="margin-top: 0; color: #065f46; font-size: 18px;">Yth. ${mhsName} (${mhsNim})</h3>
        <p style="font-size: 14px; line-height: 1.6; color: #334155;">
          Selamat! Pengajuan Konversi SKS Magang Anda telah <strong>BERHASIL DI-ACC / DISETUJUI</strong> oleh <strong>${approverRole}</strong>.
        </p>
        
        <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 6px;">
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>📌 Status Verifikasi:</strong> <span style="background-color: #d1fae5; color: #065f46; padding: 3px 8px; border-radius: 4px; font-weight: bold;">${appStatus}</span></p>
          <p style="margin: 0 0 8px 0; font-size: 13px;"><strong>👤 Diverifikasi Oleh:</strong> ${approverRole}</p>
          <p style="margin: 0; font-size: 13px;"><strong>💬 Catatan Evaluasi:</strong> <em>"${noteText}"</em></p>
        </div>

        <p style="font-size: 14px; color: #475569;">
          Anda sekarang dapat melihat detail konversi SKS dan mencetak dokumen SK Pengesahan secara langsung di Dashboard Mahasiswa.
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <a href="${portalUrl}" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">Buka Dashboard Mahasiswa</a>
        </div>
      </div>
      
      <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Universitas AMIKOM Yogyakarta — S-1 Informatika</p>
      </div>
    </div>
  `;

  console.log(`\n========================================================`);
  console.log(`📧 [MAILER ENGINE] ACC Notification Email Triggered:`);
  console.log(`• To: ${targetEmail} (${mhsName} - ${mhsNim})`);
  console.log(`• Status: ${appStatus}`);
  console.log(`• Approver: ${approverRole}`);
  console.log(`• Note: ${noteText}`);
  console.log(`========================================================\n`);

  return sendMailHelper({ to: targetEmail, subject, html: htmlContent });
}

module.exports = {
  sendCredentialEmail,
  sendAccNotificationEmail,
  sendMailHelper,
};
