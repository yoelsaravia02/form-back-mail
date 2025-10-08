const axios = require("axios");
const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  // siempre añadir CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // responder preflight OPTIONS con 200
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  try {
    const { nombre, email, telefono, mensaje, captcha } = req.body;

    if (!nombre || !email || !mensaje || !captcha) {
      return res.status(400).json({ success: false, message: "Todos los campos son requeridos" });
    }

    // verificar reCAPTCHA
    const response = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: captcha
        }
      }
    );

    if (!response.data.success) {
      return res.status(400).json({ success: false, message: "reCAPTCHA inválido" });
    }

    // transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.EMAIL_TO,
      subject: `Solicitud de RG & G - ${nombre}`,
      html: `
        <p><strong>Nombre:</strong> ${nombre}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${telefono || "No proporcionado"}</p>
        <p><strong>Mensaje:</strong></p>
        <p>${mensaje}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ success: true, message: "Mensaje enviado correctamente" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
};