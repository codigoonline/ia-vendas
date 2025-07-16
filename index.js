const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const fs = require('fs')
const path = require('path')
const P = require('pino')
const qrcode = require('qrcode-terminal')
const delay = ms => new Promise(res => setTimeout(res, ms))

const mensagens = [
  "Oi! Tudo bem? Me chamo Vinicius e tô aqui pra te ajudar a dar os primeiros passos pra fazer dinheiro online de verdade. 💰", // 0
  "Antes de te explicar o método, queria te conhecer. Quantos anos você tem? E o que te motivou a procurar uma renda extra nesse momento?", // 1
  "Poxa, entendo totalmente… Hoje em dia tá difícil mesmo depender de uma pessoa, um salário ou ficar esperando as coisas caírem do céu. 😞", // 2
  "Me diz uma coisa, você já tentou ganhar dinheiro pela internet antes? Ou seria a primeira vez?", // 3
  "Seguinte, eu faço parte de um projeto chamado PVO – Primeira Venda Online...", // 4
  "Tudo lá é bem explicado, em vídeo-aulas curtas, com suporte 24h e um grupo com centenas de pessoas aprendendo juntos.", // 5
  "Quer que eu te mostre como funciona na prática?", // 6
  `O conteúdo é 100% online, com acesso vitalício. Você aprende:\n\n✅ Como fazer sua primeira venda rápida\n✅ Como usar perfis anônimos\n✅ Como montar infoprodutos que já vendem prontos\n✅ Como criar um perfil que vende todos os dias`, // 7
  `E o melhor:\n\n✅ Você tem 30 dias de garantia\n✅ Suporte 24h\n✅ Serve pra qualquer idade ou nível.`, // 8
  "Tem alunos nossos ganhando R$500, R$1.000 e até mais de R$2.000 por mês só aplicando o que ensino. 🤑", // 9
  "Se você focar, você também consegue. Ficou interessado na nossa mentoria?", // 10
  "Dá uma olhada no nosso site antes pra tirar qualquer dúvida: https://codigoonline.github.io/home", // 11
  "Perfeito! Tenho certeza que você vai Adorar participar da elite das pessoas que faturam somente com o digital.\n\n👉🏼 Link para garantir seu acesso: https://pay.kirvano.com/d4c3d2f0-f1a2-44e9-8b67-51e142a18caf", // 12
  "Relaxa pois, você vai ter 30 dias de garantia sobre nosso treinamento e se não gostar é só pedir seu dinheiro de volta a qualquer momento, sem enrolação", // 13
  "Não tem os 25? Poxa, faço um desconto especial: tudo por 15 e com os mesmos benefícios, fechado?", // 14
  "Aqui está um novo link de pagamento agora custando somente 15 reais\n👉🏼 https://pay.kirvano.com/57b90f24-ffd0-443b-b726-78e6aa077945", // 15
  "Estamos aguardando você pra começarmos a te ensinar do 0 como faturar na internet" // 16
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

async function enviarImagens(sock, jid) {
  const imagens = [1, 2, 3, 4].map(i => path.join(__dirname, `imgs/img${i}.png`)).filter(fs.existsSync)
  for (const imgPath of imagens) {
    const buffer = fs.readFileSync(imgPath)
    await sock.sendMessage(jid, { image: buffer })
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

    if (estado === 0) {
      await delay(20000) // Delay de 20s para a primeira resposta
      estadoUsuario[sender] = 1
      await enviarSequencia(sock, sender, [mensagens[0], mensagens[1]], [3000, 3000]) // Mensagens com delay de 3s
      return
    }

    if (estado === 1) {
      await delay(60000) // Espera 1 min após a resposta do cliente
      estadoUsuario[sender] = 2
      await sock.sendMessage(sender, { text: mensagens[2] }) // "Poxa, entendo..."
      await delay(7000) // Espera 7s
      await sock.sendMessage(sender, { text: mensagens[3] }) // "Já tentou ganhar dinheiro online?"
      return
    }

    if (estado === 2) {
      await delay(60000) // Espera 1 min após a resposta do cliente
      estadoUsuario[sender] = 3
      await enviarSequencia(sock, sender, [mensagens[4], mensagens[5], mensagens[6]], [0, 0, 0]) // Mensagens sobre o projeto
      await delay(20000) // Espera 20s
      await sock.sendMessage(sender, { text: mensagens[3] }) // Pergunta novamente
      return
    }

    if (estado === 3) {
      await delay(20000) // Espera 20s após a resposta do cliente
      estadoUsuario[sender] = 4
      await enviarSequencia(sock, sender, [
        mensagens[7],
        mensagens[8],
        mensagens[9]
      ], [3000, 3000, 3000]) // Envia mensagens com delay de 3s entre elas
      await enviarImagens(sock, sender) // Envia imagens
      await sock.sendMessage(sender, { text: mensagens[10] }) // "Se você focar..."
      await delay(5000) // Delay de 5s
      return
    }

    if (estado === 4 && tipo === 'positiva') {
      estadoUsuario[sender] = 5
      await enviarSequencia(sock, sender, [mensagens[12], mensagens[13]]) // Mensagens de acesso e garantia
      return
    }

    if (estado === 4 && tipo === 'negativa') {
      await sock.sendMessage(sender, { text: mensagens[14] }) // Oferta especial
      await delay(5000) // Delay de 5s
      return
    }

    if (estado === 5 && tipo === 'positiva') {
      await sock.sendMessage(sender, { text: mensagens[15] }) // Novo link com desconto
      await delay(5000) // Delay de 5s
      return
    }

    if (tipo === 'postergar') {
      await sock.sendMessage(sender, { text: mensagens[16] }) // "Salva meu contato"
      return
    }
  })
}

iniciarBot()
