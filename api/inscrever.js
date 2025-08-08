// api/inscrever.js
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

// Lê JSON mesmo quando req.body não vem populado no serverless
async function readJson(req) {
  if (req.body && Object.keys(req.body).length) return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8') || '{}';
  try { return JSON.parse(raw); } catch { return {}; }
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { nome, email, celular } = await readJson(req);
  if (!nome || !email || !celular) {
    return res.status(400).json({ error: 'Campos obrigatórios: nome, email, celular' });
  }

  // Grava no Supabase
  const { error } = await supabase.from('inscricoes_evento').insert([{ nome, email, celular }]);
  if (error) {
    console.error('Supabase:', error);
    return res.status(500).json({ error: 'Erro ao salvar inscrição' });
  }

  // Envia e-mail
  try {
    await resend.emails.send({
      from: 'Simone Santos <onboarding@resend.dev>',
      to: [email],
      subject: 'Confirmação – Encontro com o Corpo Feminino',
      html: `
        <p>Olá, ${nome}!</p>
        <p>Sua inscrição foi recebida com sucesso. Para garantir sua vaga, conclua o pagamento:</p>
        <p><a href="https://pag.ae/7_VN7pKhN" target="_blank">Clique aqui para pagar</a></p>
        <p>Qualquer dúvida, é só responder este e-mail.</p>
      `
    });
    return res.status(200).json({ ok: true, message: 'Inscrição realizada e e-mail enviado!' });
  } catch (err) {
    console.error('Resend:', err);
    return res.status(500).json({ error: 'Inscrição salva, mas falhou o envio do e-mail' });
  }
};
