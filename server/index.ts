import http from 'http';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs/promises';
import process from 'process';
import os from 'os';

const BASE_DIR = (process as any).pkg
  ? path.dirname(process.execPath)     // рядом с exe
  : path.resolve(__dirname, '..');     // в dev — родительская папка

const ASSETS_DIR = path.join(BASE_DIR, 'assets');
const CLIENT_DIST = path.join(BASE_DIR, 'client', 'dist');

const PORT = 5000;

// По факту не нужна, но на всякий случай
const DEFAULT_DURATION_MS = 7500;

const app = express();

// картинки
app.use('/assets', express.static(ASSETS_DIR));

// (прод) собранный клиент — если будете деплоить через сервер
// const clientDist = path.resolve(__dirname, '../client/dist');
app.use(express.static(CLIENT_DIST));

async function listImages() {
  const files = await fs.readdir(ASSETS_DIR);
  return files
    .filter(f => /\.(jpe?g|png|gif|webp|avif)$/i.test(f))
    .sort()
    .map(file => ({
      file,
      title: file.replace(/\.[^.]+$/, ''),
    }));
}

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

let hideTimer: NodeJS.Timeout | null = null;

function broadcast(msg: unknown) {
  const str = JSON.stringify(msg);
  for (const c of wss.clients) {
    if (c.readyState === WebSocket.OPEN) c.send(str);
  }
}

function showImage(file: string, durationMs: number, autoHide: boolean) {
    // сбрасываем предыдущий таймер, если был
    if (hideTimer) clearTimeout(hideTimer);

    // console.log("file: " + file);

    broadcast({ type: 'show', file: file, duration: durationMs });

    if (autoHide) {
        hideTimer = setTimeout(() => {
            hideTimer = null;
            broadcast({ type: 'hide' });
        }, durationMs);
    }
}

async function sendListImages(ws: WebSocket) {
    const images = await listImages();
    // console.log(`sending ${images.length} images!`);
    ws.send(JSON.stringify({ type: 'list', images }));
}

wss.on('connection', async (ws, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const role = url.searchParams.get('role') ?? 'viewer';

    // контроллеру сразу отдаём список картинок
    if (role === 'controller') {
        sendListImages(ws);

        (async () => {
            try {
                const watcher = fs.watch(ASSETS_DIR, { });
                for await (const event of watcher) {
                    console.log("image files changed: " + event.eventType);
                    await sendListImages(ws);
                }
            } 
            catch (err: any) {
                if (err.name === 'AbortError')
                return;
                throw err;
            }
        })();
    }

    ws.on('message', (raw) => {
        let msg: any;
        try { msg = JSON.parse(raw.toString()); } catch { return; }

        console.log("got message: " + msg.type);

        if (msg.type === 'show' && typeof msg.file === 'string') {
            console.log("autoHide: " + msg.autoHide)
            
            const duration = Number.isFinite(msg.duration) ? msg.duration : DEFAULT_DURATION_MS;
            
            showImage(msg.file, duration, msg.autoHide);
        }

        if (msg.type == "hide") {
            broadcast({ type: 'hide' });
        }
    });
});


app.get('/api/info', (req, res) => {
  const ips = getLocalIPs();
  const port = Number(process.env.PORT ?? 5000); // на всякий случай
  res.json({
    port,
    ips,
    viewerUrls:     ips.map(ip => `http://${ip}:${port}/viewer.html`),
    controllerUrls: ips.map(ip => `http://${ip}:${port}/controller.html`),
  });
});


server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server on http://0.0.0.0:${PORT}`);
  console.log(`Assets dir: ${ASSETS_DIR}`);
});

function getLocalIPs(): string[] {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  const SKIP = /^(docker|vEthernet|VMware|VirtualBox|br-|veth|utun|Radmin)/i;
  for (const name of Object.keys(nets)) {
    if (SKIP.test(name)) continue;
    for (const net of nets[name] ?? []) {
      if (net.family === 'IPv4' && !net.internal) ips.push(net.address);
    }
  }
  return ips;
}