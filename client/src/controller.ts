import type { ServerMsg, ImageInfo } from './shared/types';

const grid = document.getElementById('grid') as HTMLDivElement;
const status = document.getElementById('status') as HTMLDivElement;
const hideButton = document.getElementById('hide') as HTMLDivElement;
const autoHide = document.getElementById('autoHide') as HTMLInputElement;

const DURATION_MS = 7000;

let ws: WebSocket | null = null;

function renderButtons(images: ImageInfo[]) {
    console.log(`updating buttons (${images.length} images)`);
    grid.innerHTML = '';

    for (const img of images) {
        const btn = document.createElement('button');
        btn.textContent = img.title;

        btn.addEventListener('click', () => {
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: 'show', 
                    file: img.file, 
                    duration: DURATION_MS,
                    autoHide: autoHide.checked,
                }));
            }
        });

        grid.appendChild(btn);
    }
}

function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws?role=controller`);

    ws.onopen = () => { 
        status.style.color="#0f0"
        status.textContent = '(подключён)'; 
    };
    
    ws.onclose = () => {
        status.style.color="rgb(237, 42, 42)"
        status.textContent = '(переподключение..)';
        setTimeout(connect, 1000);
    };
    
    ws.onmessage = (ev) => {
        const msg: ServerMsg = JSON.parse(ev.data);
        if (msg.type === 'list') renderButtons(msg.images);
    };

    hideButton.onclick = () => {
        console.log("скрыть");
        if (ws?.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'hide' }));
        }
    }
}

connect();