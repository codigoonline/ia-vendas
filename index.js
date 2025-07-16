const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const delay = ms => new Promise(res => setTimeout(res, ms))

const mensagens = [
  "Oi! Tudo bem? Me chamo Vinicius e tô aqui pra te ajudar a dar os primeiros passos pra fazer dinheiro online de verdade. 💰",
  "Antes de te explicar o método, queria te conhecer. Quantos anos você tem? E o que te motivou a procurar uma renda extra nesse momento?",
  "Poxa, entendo totalmente… Hoje em dia tá difícil mesmo depender de uma pessoa, um salário ou ficar esperando as coisas caírem do céu. 😞",
  "Me diz uma coisa, você já tentou ganhar dinheiro pela internet antes? Ou seria a primeira vez?",
  "Seguinte, eu faço parte de um projeto chamado PVO – Primeira Venda Online. É um método passo a passo que te ensina a fazer sua primeira venda na internet em até 24h — mesmo que você nunca tenha vendido nada antes e sem precisar aparecer.",
  "Tudo é bem explicado, em vídeo-aulas curtas, com suporte 24h e um grupo com centenas de pessoas aprendendo junto.",
  "Quer que eu te mostre como funciona na prática?",
  `O conteúdo é 100% online, com acesso vitalício. Você aprende:

✅ Como fazer sua primeira venda rápida
✅ Como usar perfis anônimos (sem aparecer)
✅ Como montar infoprodutos que já vendem prontos
✅ Como criar um perfil que vende todos os dias`,
  `E o melhor:

✅ Você tem 30 dias de garantia.
✅ Suporte 24h.
✅ Serve pra qualquer idade ou nível.`,
  "Tem alunos nossos ganhando R$500, R$1.000 e até mais de R$2.000 por mês só aplicando o que ensino. 🤑",
  "Se você focar, você também consegue. Ficou interessado na nossa mentoria?",
  "Dá uma olhada no nosso site antes pra tirar qualquer dúvida: https://codigoonline.github.io/home",
  "Perfeito! Tenho certeza que você vai curtir.\n\n👉🏼 Link com bônus: https://pay.kirvano.com/d4c3d2f0-f1a2-44e9-8b67-51e142a18caf",
  "Não tem os 25? Poxa, faço um desconto especial: tudo por 15 e com os mesmos benefícios, fechado?",
  "👉🏼 Novo link com desconto: https://pay.kirvano.com/57b90f24-ffd0-443b-b726-78e6aa077945",
  "Sem problemas! Salva meu contato e me chama quando quiser garantir seu acesso, beleza?"
]

let positivas = [], negativas = [], postergar = []

function carregarLista(nome) {
  return fs.readFileSync(path.join(__dirname, nome), 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(l => l.trim().toLowerCase())
}

function detectarTipoResposta(msg) {
  const texto = msg.toLowerCase()
  if (positivas.some(p => texto.includes(p))) return 'positiva'
  if (negativas.some(n => texto.includes(n))) return 'negativa'
  if (postergar.some(p => texto.includes(p))) return 'postergar'
  return 'neutra'
}

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' })
  })

  sock.ev.on('creds.update', saveCreds)

  positivas = carregarLista('positivas.txt')
  negativas = carregarLista('negativas.txt')
  postergar = carregarLista('postergar.txt')

  sock.ev.on('connection.update', (update) => {
    const { qr, connection, lastDisconnect } = update
    if (qr) {
      qrcode.generate(qr, { small: true })
    }
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) {
        iniciarBot()
      } else {
        console.log('❌ Desconectado. Faça login novamente.')
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return
    const sender = msg.key.remoteJid
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    const tipo = detectarTipoResposta(texto)

    if (texto.toLowerCase().includes('quero aprender')) {
      for (let i = 0; i <= 2; i++) {
        await sock.sendMessage(sender, { text: mensagens[i] })
        await delay(3000)
      }
      await delay(5000)
      for (let i = 3; i <= 6; i++) {
        await sock.sendMessage(sender, { text: mensagens[i] })
        await delay(3000)
      }
      await sock.sendMessage(sender, { text: mensagens[7] })
      await delay(7000)
      await sock.sendMessage(sender, { text: mensagens[8] })
      await sock.sendMessage(sender, { text: mensagens[9] })

      for (let i = 1; i <= 4; i++) {
        const imgPath = path.join(__dirname, `imgs/img${i}.png`)
        if (fs.existsSync(imgPath)) {
          const buffer = fs.readFileSync(imgPath)
          await sock.sendMessage(sender, { image: buffer })
          await delay(1500)
        }
      }

      await sock.sendMessage(sender, { text: mensagens[10] })
      await delay(2000)
      await sock.sendMessage(sender, { text: mensagens[11] })
    } else if (tipo === 'positiva') {
      await sock.sendMessage(sender, { text: mensagens[12] })
      await delay(2000)
      await sock.sendMessage(sender, { text: mensagens[13] })
    } else if (tipo === 'negativa') {
      await sock.sendMessage(sender, { text: mensagens[14] })
      await delay(2000)
      await sock.sendMessage(sender, { text: mensagens[15] })
    } else if (tipo === 'postergar') {
      await sock.sendMessage(sender, { text: mensagens[16] })
    }
  })
}

iniciarBot()
