const express = require('express');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = 'Bot-Filtro-Martin';
const WHATSAPP_TOKEN = 'EAAZCfKoheyZBIBRo3QXNy9lUc98kUcNvcs7jemBJ2ZAYpZBZAw1N2KKIrChgw2qluPLZCXKg9b1ZBVCW1HbXvFSj6msZBnhysbfd3rHuyz2Xba9ON8Wxm0TnUdY4Vrr8ZAsmMZCO8rqtoEnjP01ZBWqpRNZApneZCKrgyrFDXYd8kebgswNDbt9JQu6hQDMvTwqmOD60XgnqLgDlEIt4t6vMeHfUanJFgSnEUBu8bbFZAOu3eUAYya1qjfyqmZBDQ7ZCXh550fCzOD3rBm1z2Fm2xmbQ8gZDZD';
const PHONE_NUMBER_ID = '1039622265911962';
const MI_NUMERO_PERSONAL = '5491134628481'; // Tu número personal sin + ni espacios
const ANTHROPIC_API_KEY = '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';

// Verificación webhook
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Recibe mensajes
app.post('/webhook', async (req, res) => {
  res.sendStatus(200);
  try {
    const entry = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const message = changes?.value?.messages?.[0];
    const contact = changes?.value?.contacts?.[0];

    if (!message || message.type !== 'text') return;

    const textoRecibido = message.text.body;
    const nombreRemitente = contact?.profile?.name || 'Persona';
    const numeroRemitente = message.from;

    console.log(`Mensaje de ${nombreRemitente}: ${textoRecibido}`);

    // Generar respuesta cordial con Claude
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Sos un asistente que responde mensajes de WhatsApp de forma cordial y neutral. 
La persona se llama ${nombreRemitente} y escribió: "${textoRecibido}"
Respondé de forma breve, cordial y sin generar conflicto. Máximo 2 oraciones.`
        }]
      })
    });

    const claudeData = await claudeRes.json();
    console.log('Claude response:', JSON.stringify(claudeData));
    
    if (!claudeData.content || !claudeData.content[0]) {
      console.error('Error de Claude:', JSON.stringify(claudeData));
      return;
    }
    
    const respuestaBot = claudeData.content[0].text;

    // Responder a la persona
    await enviarMensaje(numeroRemitente, respuestaBot);

    // Notificarme a mí
    const resumen = `🤖 *Bot Intermediario*\n\n👤 *De:* ${nombreRemitente}\n💬 *Dijo:* ${textoRecibido}\n\n✅ *Bot respondió:* ${respuestaBot}`;
    await enviarMensaje(MI_NUMERO_PERSONAL, resumen);

  } catch (error) {
    console.error('Error:', error);
  }
});

async function enviarMensaje(numero, texto) {
  await fetch(`https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numero,
      type: 'text',
      text: { body: texto }
    })
  });
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
