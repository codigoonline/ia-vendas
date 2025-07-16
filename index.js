const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore } = require('@whiskeysockets/baileys')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const path = require('path')

const fluxo = [
  "Oi! Tudo bem? Me chamo Vinicius e tô aqui pra te ajudar a dar os primeiros passos pra fazer dinheiro online de verdade.",
  "Antes de te explicar o método, queria te conhecer.\n\nQuantos anos você tem?\nE o que te motivou a procurar uma renda extra nesse momento?",
  "Poxa, entendo totalmente… Hoje em dia tá difícil mesmo depender de uma pessoa, um salário ou ficar esperando as coisas caírem do céu",
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
✅ Tem suporte 24h com uma equipe pronta pra te ajudar.
✅ Funciona pra qualquer idade e qualquer nível.`,
  "Muita gente já tá faturando com isso. Tem alunos nossos ganhando R$500, R$1.000 e até mais de R$2.000 por mês só aplicando o que ensino."
]

const imagens = ['img1.png', 'img2.png', 'img3.png', 'img4.png']

const mensagensFinais = [
  "Se você focar, você também consegue.",
  "Ficou interessado na nossa mentoria?",
  "Dá uma olhada no nosso site: 👉🏼 https://codigoonline.github.io/home",
  "Aqui está o link pra garantir seu acesso com todos os bônus:\n👉🏼 https://pay.kirvano.com/d4c3d2f0-f1a2-44e9-8b67-51e142a18caf",
  "Qualquer dúvida, me chama! Tô aqui pra te ajudar em tudo nesse início."
]

const desconto = [
  "Não tem os 25? Poxa, faço um desconto especial pra você então, fica tudo por 15 e você terá os mesmos benefícios. Fechado?",
  "Aqui o novo link, custando só 15 agora:\n👉🏼 https://pay.kirvano.com/57b90f24-ffd0-443b-b726-78e6aa077945"
]

const estados = {}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    const msg = messages[0]
    if (!msg.message || msg.key.fromMe) return

    const texto = msg.message.conversation?.toLowerCase() || ''
    const id = msg.key.remoteJid

    if (!estados[id]) estados[id] = 0

    if (texto.includes("quero aprender") || texto.includes("começar")) {
      estados[id] = 0
      await sock.sendMessage(id, { text: fluxo[0] })
    } else if (texto.includes("15") || texto.includes("não tenho")) {
      for (let linha of desconto) {
        await sock.sendMessage(id, { text: linha })
      }
    } else if (estados[id] < fluxo.length) {
      await sock.sendMessage(id, { text: fluxo[estados[id]] })
      estados[id]++
    } else if (estados[id] === fluxo.length) {
      for (let img of imagens) {
        const buffer = fs.readFileSync(path.join(__dirname, 'imgs', img))
        await sock.sendMessage(id, { image: buffer, caption: "" })
      }
      estados[id]++
    } else if (estados[id] === fluxo.length + 1) {
      for (let msgFinal of mensagensFinais) {
        await sock.sendMessage(id, { text: msgFinal })
      }
      estados[id]++
    }
  })
}

startBot()
