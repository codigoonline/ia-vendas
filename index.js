const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const fs = require('fs')
const P = require('pino')
const path = require('path')
const qrcode = require('qrcode-terminal')
const delay = ms => new Promise(res => setTimeout(res, ms))

// Variáveis
const positivas = fs.readFileSync('./variacoes/positivas.txt', 'utf-8').split('\n').map(l => l.trim().toLowerCase())
const negativas = fs.readFileSync('./variacoes/negativas.txt', 'utf-8').split('\n').map(l => l.trim().toLowerCase())
const postergar = fs.existsSync('./variacoes/postergar.txt') ? fs.readFileSync('./variacoes/postergar.txt', 'utf-8').split('\n').map(l => l.trim().toLowerCase()) : []

const estados = {}

function detectarIntencao(texto) {
  const txt = texto.toLowerCase()
  if (negativas.some(p => txt.includes(p)) || /\bn[ãa]o\b/.test(txt)) return 'negativa'
  if (positivas.some(p => txt.includes(p)) || /\bsim\b|\bquero\b|\btopo\b/.test(txt)) return 'positiva'
  if (postergar.some(p => txt.includes(p)) || /\bdepois\b|\bm[oa]is tarde\b|\bvou pensar\b/.test(txt)) return 'postergar'
  return null
}

async function iniciarSocket() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message || !msg.key.remoteJid) return

    const jid = msg.key.remoteJid
    const texto = msg.message.conversation?.toLowerCase() || msg.message.extendedTextMessage?.text?.toLowerCase() || ''
    if (!texto) return

    if (!estados[jid]) {
      estados[jid] = { etapa: 0, aguardando: false }
      await delay(20000)
      await sock.sendMessage(jid, { text: 'Oi! Tudo bem? Me chamo Vinicius e tô aqui pra te ajudar a dar os primeiros passos pra fazer dinheiro online de verdade. 💰' })
      await delay(3000)
      await sock.sendMessage(jid, { text: 'Antes de te explicar o método, queria te conhecer. Quantos anos você tem? E o que te motivou a procurar uma renda extra nesse momento?' })
      estados[jid].etapa = 1
      estados[jid].aguardando = true
      return
    }

    const cliente = estados[jid]

    if (cliente.etapa === 1 && cliente.aguardando) {
      cliente.aguardando = false
      await delay(60000)
      await sock.sendMessage(jid, { text: 'Poxa, entendo totalmente… Hoje em dia tá difícil mesmo depender de uma pessoa, um salário ou ficar esperando as coisas caírem do céu. 😞' })
      await delay(7000)
      await sock.sendMessage(jid, { text: 'Me diz uma coisa, você já tentou ganhar dinheiro pela internet antes? Ou seria a primeira vez?' })
      cliente.etapa = 2
      cliente.aguardando = true
      return
    }

    if (cliente.etapa === 2 && cliente.aguardando) {
      cliente.aguardando = false
      await delay(60000)
      const mensagens = [
        'Seguinte, eu faço parte de um projeto chamado PVO – Primeira Venda Online...',
        'Tudo lá é bem explicado, em vídeo-aulas curtas, com suporte 24h e um grupo com centenas de pessoas aprendendo juntos.',
        'Quer que eu te mostre como funciona na prática?',
        `O conteúdo é 100% online, com acesso vitalício. Você aprende:\n\n✅ Como fazer sua primeira venda rápida\n✅ Como usar perfis anônimos\n✅ Como montar infoprodutos que já vendem prontos\n✅ Como criar um perfil que vende todos os dias`,
        `E o melhor:\n\n✅ Você tem 30 dias de garantia\n✅ Suporte 24h\n✅ Serve pra qualquer idade ou nível.`,
        'Tem alunos nossos ganhando R$500, R$1.000 e até mais de R$2.000 por mês só aplicando o que ensino. 🤑'
      ]

      for (const m of mensagens) {
        await sock.sendMessage(jid, { text: m })
        await delay(3000)
      }

      const imagens = ['img1.png', 'img2.png', 'img3.png', 'img4.png']
      for (const imagem of imagens) {
        await sock.sendMessage(jid, {
          image: fs.readFileSync(`./imgs/${imagem}`),
          caption: ''
        })
      }

      await sock.sendMessage(jid, { text: 'Se você focar, você também consegue. Ficou interessado na nossa mentoria?' })
      await delay(5000)
      await sock.sendMessage(jid, { text: 'Dá uma olhada no nosso site antes pra tirar qualquer dúvida: https://codigoonline.github.io/home' })
      cliente.etapa = 3
      cliente.aguardando = true
      return
    }

    if (cliente.etapa === 3 && cliente.aguardando) {
      const intencao = detectarIntencao(texto)
      if (intencao === 'positiva') {
        cliente.aguardando = false
        await delay(3000)
        await sock.sendMessage(jid, {
          text: 'Perfeito! Tenho certeza que você vai Adorar participar da elite das pessoas que faturam somente com o digital.\n\n👉🏼 Link para garantir seu acesso: https://pay.kirvano.com/d4c3d2f0-f1a2-44e9-8b67-51e142a18caf'
        })
        await delay(3000)
        await sock.sendMessage(jid, {
          text: 'Relaxa pois, você vai ter 30 dias de garantia sobre nosso treinamento e se não gostar é só pedir seu dinheiro de volta a qualquer momento, sem enrolação'
        })
        cliente.etapa = 4
      } else if (intencao === 'negativa') {
        cliente.aguardando = false
        await sock.sendMessage(jid, { text: 'Não tem os 25? Poxa, faço um desconto especial: tudo por 15 e com os mesmos benefícios, fechado?' })
        await delay(5000)
        cliente.etapa = 5
        cliente.aguardando = true
      }
      return
    }

    if (cliente.etapa === 5 && cliente.aguardando && detectarIntencao(texto) === 'positiva') {
      cliente.aguardando = false
      await delay(3000)
      await sock.sendMessage(jid, { text: 'Aqui está um novo link de pagamento agora custando somente 15 reais\n👉🏼 https://pay.kirvano.com/57b90f24-ffd0-443b-b726-78e6aa077945' })
      await delay(3000)
      await sock.sendMessage(jid, { text: 'Estamos aguardando você pra começarmos a te ensinar do 0 como faturar na internet.' })
      cliente.etapa = 6
    }
  })
}

iniciarSocket()
