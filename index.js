const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys') const fs = require('fs') const path = require('path') const P = require('pino') const qrcode = require('qrcode-terminal') const delay = ms => new Promise(res => setTimeout(res, ms))

const mensagens = [ "Oi! Tudo bem? Me chamo Vinicius e tô aqui pra te ajudar a dar os primeiros passos pra fazer dinheiro online de verdade. 💰", "Antes de te explicar o método, queria te conhecer. Quantos anos você tem? E o que te motivou a procurar uma renda extra nesse momento?", "Poxa, entendo totalmente… Hoje em dia tá difícil mesmo depender de uma pessoa, um salário ou ficar esperando as coisas caírem do céu. 😞", "Me diz uma coisa, você já tentou ganhar dinheiro pela internet antes? Ou seria a primeira vez?", "Seguinte, eu faço parte de um projeto chamado PVO – Primeira Venda Online...", "Tudo lá é bem explicado, em vídeo-aulas curtas, com suporte 24h e um grupo com centenas de pessoas aprendendo juntos.", "Quer que eu te mostre como funciona na prática?", O conteúdo é 100% online, com acesso vitalício. Você aprende:\n\n✅ Como fazer sua primeira venda rápida\n✅ Como usar perfis anônimos\n✅ Como montar infoprodutos que já vendem prontos\n✅ Como criar um perfil que vende todos os dias, E o melhor:\n\n✅ Você tem 30 dias de garantia\n✅ Suporte 24h\n✅ Serve pra qualquer idade ou nível., "Tem alunos nossos ganhando R$500, R$1.000 e até mais de R$2.000 por mês só aplicando o que ensino. 🤑", "Se você focar, você também consegue. Ficou interessado na nossa mentoria?", "Perfeito! Tenho certeza que você vai Adorar participar da elite das pessoas que faturam somente com o digital.\n\n👉🏼 Link para garantir seu acesso: https://pay.kirvano.com/d4c3d2f0-f1a2-44e9-8b67-51e142a18caf", "Relaxa pois, você vai ter 30 dias de garantia sobre nosso treinamento e se não gostar é só pedir seu dinheiro de volta a qualquer momento, sem enrolação", "Não tem os 25? Poxa, faço um desconto especial: tudo por 15 e com os mesmos benefícios, fechado?", "Aqui está um novo link de pagamento agora custando somente 15 reais\n👉🏼 https://pay.kirvano.com/57b90f24-ffd0-443b-b726-78e6aa077945", "estamos aguardando você pra começarmos a te ensinar do 0 como faturar na internet" ]

const positivas = ["quero", "sim", "tenho interesse", "bora", "curti", "gostei", "claro", "top", "fechado", "quero aprender"] const negativas = ["não", "sem dinheiro", "n quero", "depois", "to sem grana", "não vou", "não quero", "mais tarde"]

let estados = {}

function detectarTipo(texto) { texto = texto.toLowerCase() if (positivas.some(p => texto.includes(p))) return 'positiva' if (negativas.some(n => texto.includes(n))) return 'negativa' return 'neutra' }

async function enviarImagens(sock, jid) { const imgs = [1, 2, 3, 4].map(i => path.join(__dirname, imgs/img${i}.png)) for (const img of imgs) { if (fs.existsSync(img)) { const buffer = fs.readFileSync(img) await sock.sendMessage(jid, { image: buffer }) } } }

async function iniciar() { const { state, saveCreds } = await useMultiFileAuthState('auth') const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }) }) sock.ev.on('creds.update', saveCreds)

sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => { if (qr) qrcode.generate(qr, { small: true }) if (connection === 'close' && lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) iniciar() })

sock.ev.on('messages.upsert', async ({ messages }) => { const msg = messages[0] if (!msg.message || msg.key.fromMe) return

const jid = msg.key.remoteJid
const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
const tipo = detectarTipo(texto)
const estado = estados[jid] || 0

if (estado === 0 && texto.includes("quero")) {
  estados[jid] = 1
  await delay(20000)
  await sock.sendMessage(jid, { text: mensagens[0] })
  await delay(3000)
  await sock.sendMessage(jid, { text: mensagens[1] })
} else if (estado === 1) {
  estados[jid] = 2
  await delay(60000)
  await sock.sendMessage(jid, { text: mensagens[2] })
  await delay(7000)
  await sock.sendMessage(jid, { text: mensagens[3] })
} else if (estado === 2) {
  estados[jid] = 3
  await delay(60000)
  for (let i = 4; i <= 9; i++) {
    await sock.sendMessage(jid, { text: mensagens[i] })
    await delay(3000)
  }
  await enviarImagens(sock, jid)
  await delay(3000)
  await sock.sendMessage(jid, { text: mensagens[10] })
} else if (estado === 3 && tipo === 'positiva') {
  estados[jid] = 4
  await delay(5000)
  await sock.sendMessage(jid, { text: mensagens[11] })
  await delay(3000)
  await sock.sendMessage(jid, { text: mensagens[12] })
} else if (estado === 4 && tipo === 'negativa') {
  estados[jid] = 5
  await sock.sendMessage(jid, { text: mensagens[13] })
  await delay(5000)
  await sock.sendMessage(jid, { text: mensagens[14] })
  await delay(3000)
  await sock.sendMessage(jid, { text: mensagens[15] })
}

}) }

iniciar()

