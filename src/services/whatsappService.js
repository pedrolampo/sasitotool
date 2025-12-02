import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let client;
let mainWindow;

export function initialize(win) {
  mainWindow = win;

  if (client) {
    try {
      client.destroy();
    } catch (e) {
      console.log('Error destroying old client:', e);
    }
  }

  client = new Client({
    authStrategy: new LocalAuth({
      dataPath: path.join(process.cwd(), '.wwebjs_auth'),
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp:qr', qr);
    }
  });

  client.on('ready', () => {
    console.log('Client is ready!');
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp:ready');
    }
  });

  client.on('authenticated', () => {
    console.log('AUTHENTICATED');
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp:authenticated');
    }
  });

  client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp:auth_failure', msg);
    }
  });

  client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    if (mainWindow) {
      mainWindow.webContents.send('whatsapp:disconnected', reason);
    }
  });

  client.initialize();
}

export async function getUnsavedContacts() {
  if (!client) throw new Error('Client not initialized');

  console.log('Fetching all chats...');
  const chats = await client.getChats();

  const unsavedContacts = [];
  console.log(`Scanning ${chats.length} chats...`);

  for (const chat of chats) {
    if (chat.isGroup) continue;

    const number = chat.id.user;
    const name = chat.name;

    if (!name) {
      unsavedContacts.push({
        name: `+${number}`,
        number: number,
        formattedNumber: `+${number}`,
      });
      continue;
    }

    const hasLetters = /[a-zA-Z]/.test(name);
    if (hasLetters) continue;

    const cleanName = name.replace(/\D/g, '');
    const cleanNumber = number.replace(/\D/g, '');

    if (
      cleanName === cleanNumber ||
      cleanNumber.includes(cleanName) ||
      cleanName.includes(cleanNumber)
    ) {
      unsavedContacts.push({
        name: name,
        number: number,
        formattedNumber: `+${number}`,
      });
    }
  }

  return unsavedContacts;
}

export function generateVCF(contacts) {
  let vcfContent = '';

  contacts.forEach((contact) => {
    const name = contact.name || `WA-${contact.number}`;
    vcfContent += 'BEGIN:VCARD\n';
    vcfContent += 'VERSION:3.0\n';
    vcfContent += `FN:${name}\n`;
    vcfContent += `TEL;TYPE=CELL:${contact.number}\n`;
    vcfContent += 'END:VCARD\n';
  });

  return vcfContent;
}

export async function logout() {
  if (client) {
    await client.logout();
    await client.destroy();
    client = null;

    const authPath = path.join(process.cwd(), '.wwebjs_auth');
    try {
      if (fs.existsSync(authPath)) {
        fs.rmSync(authPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Error cleaning auth folder:', e);
    }

    if (mainWindow) {
      mainWindow.webContents.send('whatsapp:disconnected', 'LOGOUT');
    }
  }
}
