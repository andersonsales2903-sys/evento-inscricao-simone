const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { nome, email, celular } = req.body;

  const { error } = await supabase
    .from('inscricoes_evento')
    .insert([{ nome, email, celular }]);

  if (error) {
    console.error('Erro ao salvar no Supabase:', error);
    return res.status(500).json({ error: 'Erro ao salvar inscrição' });
  }

  try {
    await resend.emails.send({
      from: 'Simone Santos <onboarding@resend.dev>',
      to: [email],
      subject: 'Confirmação – Encontro com o Corpo Feminino',
      html: `<p>Olá, ${nome}!</p><p>Sua inscrição foi recebida com sucesso. Finalize o pagamento para garantir sua vaga:</p><p><a href="https://pag.ae/7_VN7pKhN" target="_blank">Clique aqui para pagar</a></p><p>Nos vemos em breve!</p>`
    });

    return res.status(200).json({ message: 'Inscrição realizada e e-mail enviado!' });
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
    return res.status(500).json({ error: 'Erro ao enviar o e-mail' });
  }
};