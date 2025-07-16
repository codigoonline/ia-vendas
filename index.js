const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const delay = ms => new Promise(res => setTimeout(res, ms))

const readLines = filePath => fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean) : []

const positivas = readLines('./variacoes/positivas.txt')
const negativas = readLines('./variacoes/negativas.txt')
const postergar = readLines('./variacoes/postergar.txt')

const mensagens = {
  inicio: [
    "Oi! Tudo bem? Me chamo Vinicius e tô aqui pra te ajudar a dar os primeiros passos pra fazer dinheiro online de verdade. 💰",
    "Antes de te explicar o método, queria te conhecer. Quantos anos você tem? E o que te motivou a procurar uma renda extra nesse momento?"
  ],
  depoisConhecer: "Poxa, entendo totalmente… Hoje em dia tá difícil mesmo depender de uma pessoa, um salário ou ficar esperando as coisas caírem do céu. 😞",
  tentouAntes: "Me diz uma coisa, você já tentou ganhar dinheiro pela internet antes? Ou seria a primeira vez?",
  explicacao: [
    "Seguinte, eu faço parte de um projeto chamado PVO – Primeira Venda Online...",
    "Tudo lá é bem explicado, em vídeo-aulas curtas, com suporte 24h e um grupo com centenas de pessoas aprendendo juntos.",
    "Quer que eu te mostre como funciona na prática?",
    "O conteúdo é 100% online, com acesso vitalício. Você aprende:\n\n✅ Como fazer sua primeira venda rápida\n✅ Como usar perfis anônimos\n✅ Como montar infoprodutos que já vendem prontos\n✅ Como criar um perfil que vende todos os dias",
    "E o melhor:\n\n✅ Você tem 30 dias de garantia\n✅ Suporte 24h\n✅ Serve pra qualquer idade ou nível.",
    "Tem alunos nossos ganhando R$500, R$1.000 e até mais de R$2.000 por mês só aplicando o que ensino. 🤑"
  ],
  interesse: "*Se você focar, você também consegue. Ficou interessado na nossa mentoria?*",
  link1: "Perfeito! Tenho certeza que você vai Adorar participar da elite das pessoas que faturam somente com o digital.\n\n👉🏼 Link para garantir seu acesso: https://pay.kirvano.com/d4c3d2f0-f1a2-44e9-8b67-51e142a18caf",
  garantia: "Relaxa pois, você vai ter 30 dias de garantia sobre nosso treinamento e se não gostar é só pedir seu dinheiro de volta a qualquer momento, sem enrolação",
  desconto: "Não tem os 25? Poxa, faço um desconto especial: tudo por 15 e com os mesmos benefícios, fechado?",
  linkDesconto: "Aqui está um novo link de pagamento agora custando somente 15 reais\n👉🏼 https://pay.kirvano.com/57b90f24-ffd0-443b-b726-78e6aa077945",
  finaliza: "Estamos aguardando você pra começarmos a te ensinar do 0 como faturar na internet"
}

const imagens = ['imgs/img1.png', 'imgs/img2.png', 'imgs/img3.png', 'imgs/img4.png']

const detectarIntencao = texto => {
  texto = texto.toLowerCase()
  if (positivas.some(p => texto.includes(p))) return 'positiva'
  if (negativas.some(n => texto.includes(n))) return 'negativa'
  if (postergar.some(p => texto.includes(p))) return 'postergar'
  if (texto.includes('sim')) return 'positiva'
  if (texto.includes('não') || texto.includes('nao')) return 'negativa'
  return 'indefinido'
}

const estadoUsuario = {}

async function iniciarBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    logger: P({ level: 'silent' }),
    auth: state,
    browser: ['Ubuntu', 'Chrome', '20.0']
  })

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log('\n🔁 Aguardando pareamento... Escaneie o QR abaixo:\n')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      console.log('\n✅ WhatsApp conectado com sucesso!')
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      console.log('❌ Conexão encerrada. Reconectar?', shouldReconnect)
      if (shouldReconnect) {
        iniciarBot()
      }
    }
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const id = msg.key.remoteJid
    const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    if (!estadoUsuario[id]) {
      estadoUsuario[id] = { etapa: 0 }
      await delay(20000)
      await sock.sendMessage(id, { text: mensagens.inicio[0] })
      await delay(3000)
      await sock.sendMessage(id, { text: mensagens.inicio[1] })
      estadoUsuario[id].etapa = 1
      return
    }

    const user = estadoUsuario[id]
    const resposta = detectarIntencao(texto)

    if (user.etapa === 1) {
      await delay(60000)
      await sock.sendMessage(id, { text: mensagens.depoisConhecer })
      await delay(7000)
      await sock.sendMessage(id, { text: mensagens.tentouAntes })
      user.etapa = 2
    } else if (user.etapa === 2) {
      await delay(60000)
      for (const msg of mensagens.explicacao) {
        await sock.sendMessage(id, { text: msg })
        await delay(3000)
      }
      for (const img of imagens) {
        await sock.sendMessage(id, { image: { url: img } })
      }
      await delay(3000)
      await sock.sendMessage(id, { text: mensagens.interesse })
      user.etapa = 3
    } else if (user.etapa === 3 && resposta === 'positiva') {
      await delay(3000)
      await sock.sendMessage(id, { text: mensagens.link1 })
      await delay(3000)
      await sock.sendMessage(id, { text: mensagens.garantia })
      user.etapa = 4
    } else if (user.etapa === 4 && resposta === 'negativa') {
      await delay(3000)
      await sock.sendMessage(id, { text: mensagens.desconto })
      user.etapa = 5
    } else if (user.etapa === 5 && resposta === 'positiva') {
      await delay(3000)
      await sock.sendMessage(id, { text: mensagens.linkDesconto })
      await delay(3000)
      await sock.sendMessage(id, { text: mensagens.finaliza })
      user.etapa = 6
    }
  })
}

iniciarBot()
