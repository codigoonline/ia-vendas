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
  `O conteúdo é 100% online, com acesso vitalício. Você aprende:\n\n✅ Como fazer sua primeira venda rápida\n✅ Como usar perfis anônimos (sem aparecer)\n✅ Como montar infoprodutos que já vendem prontos\n✅ Como criar um perfil que vende todos os dias`,
  `E o melhor:\n\n✅ Você tem 30 dias de garantia\n✅ Suporte 24h\n✅ Serve pra qualquer idade ou nível.`,
  "Tem alunos nossos ganhando R$500, R$1.000 e até mais de R$2.000 por mês só aplicando o que ensino. 🤑",
  "Se você focar, você também consegue. Ficou interessado na nossa mentoria?",
  "Dá uma olhada no nosso site antes pra tirar qualquer dúvida: https://codigoonline.github.io/home",
  "Perfeito! Tenho certeza que você vai curtir.\n\n👉🏼 Link com bônus: https://pay.kirvano.com/d4c3d2f0-f1a2-44e9-8b67-51e142a18caf",
  "Não tem os 25? Poxa, faço um desconto especial: tudo por 15 e com os mesmos benefícios, fechado?",
  "👉🏼 Novo link com desconto: https://pay.kirvano.com/57b90f24-ffd0-443b-b726-78e6aa077945",
  "Sem problemas! Salva meu contato e me chama quando quiser garantir seu acesso, beleza?"
]

let positivas = [], negativas = [], postergar = []
let estadoUsuario = {}

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

async function enviarSequencia(sock, jid, msgs, delays = []) {
  for (let i = 0; i < msgs.length; i++) {
    await delay(delays[i] || 5000)
    await sock.sendMessage(jid, { text: msgs[i] })
  }
}

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) })

  sock.ev.on('creds.update', saveCreds)

  positivas = carregarLista('positivas.txt')
  negativas = carregarLista('negativas.txt')
  postergar = carregarLista('postergar.txt')

  sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
    if (qr) qrcode.generate(qr, { small: true })
    if (connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode
      if (reason !== DisconnectReason.loggedOut) iniciarBot()
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const sender = msg.key.remoteJid
    const texto = msg.message.conversation?.toLowerCase() || msg.message.extendedTextMessage?.text?.toLowerCase() || ''

    const tipo = detectarTipoResposta(texto)
    const estado = estadoUsuario[sender] || 0

    // Início do funil
    if (texto.includes('quero aprender') && estado === 0) {
      estadoUsuario[sender] = 1
      await enviarSequencia(sock, sender, [mensagens[0], mensagens[1]])
      return
    }

    if (estado === 1) {
      estadoUsuario[sender] = 2
      await sock.sendMessage(sender, { text: mensagens[2] }) // Poxa, entendo totalmente…
      await delay(10000)
      await sock.sendMessage(sender, { text: mensagens[3] }) // Já tentou ganhar dinheiro?
      return
    }

    if (estado === 2) {
      estadoUsuario[sender] = 3
      await enviarSequencia(sock, sender, [mensagens[4], mensagens[5], mensagens[6], mensagens[7], mensagens[8], mensagens[9]])
      await delay(5000)
      await sock.sendMessage(sender, { text: mensagens[10] }) // Interessado?
      return
    }

    if (estado === 3 && texto.includes('sim')) {
      estadoUsuario[sender] = 4
      await sock.sendMessage(sender, { text: mensagens[11] }) // Link do site
      return
    }

    if (estado === 4 && tipo === 'positiva') {
      estadoUsuario[sender] = 5
      await delay(5000)
      await sock.sendMessage(sender, { text: mensagens[12] }) // Link de acesso
      await delay(5000)
      await sock.sendMessage(sender, { text: mensagens[13] }) // Desconto opcional
      return
    }

    // Cliente responde com variações negativas
    if (tipo === 'negativa') {
      await sock.sendMessage(sender, { text: mensagens[14] }) // Oferece desconto
      await delay(5000)
      await sock.sendMessage(sender, { text: mensagens[15] }) // Link com desconto
      return
    }

    if (tipo === 'postergar') {
      await sock.sendMessage(sender, { text: mensagens[16] }) // Salvar contato
      return
    }

    if (estado === 3) {
      // Envia imagens se ainda estiver nessa etapa
      const imagens = [1, 2, 3, 4].map(i => path.join(__dirname, `imgs/img${i}.png`)).filter(fs.existsSync)
      for (const imgPath of imagens) {
        const buffer = fs.readFileSync(imgPath)
        await sock.sendMessage(sender, { image: buffer })
      }
    }
  })
}

iniciarBot()
