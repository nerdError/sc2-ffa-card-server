import type { ServerMsg, ImageInfo, Direction } from '../../shared/types';

const grid = document.getElementById('grid') as HTMLDivElement;
const status = document.getElementById('status') as HTMLDivElement;
const hideButton = document.getElementById('hide') as HTMLDivElement;
const autoHide = document.getElementById('autoHide') as HTMLInputElement;
const animSelect = document.getElementById('anim') as HTMLSelectElement;
const durationInput = document.getElementById('duration') as HTMLInputElement;
const durationValue = document.getElementById('duration-value') as HTMLSpanElement;

// запоминаем выбор между перезагрузками

const savedAutoHide = localStorage.getItem('autoHide') as string | null;
if (savedAutoHide) autoHide.checked = parseInt(savedAutoHide) == 1;

const savedAnim = localStorage.getItem('anim') as Direction | null;
if (savedAnim) animSelect.value = savedAnim;

const savedDuration = localStorage.getItem('duration');
if (savedDuration) durationInput.value = savedDuration;

function renderDurationLabel() {
  const v = parseFloat(durationInput.value);
  durationValue.textContent = `${v.toFixed(1)} с`;
}

autoHide.addEventListener('change', () => {
  localStorage.setItem('autoHide', ""+(autoHide.checked ? 1 : 0));
});

animSelect.addEventListener('change', () => {
  localStorage.setItem('anim', animSelect.value);
});

durationInput.addEventListener('input', () => {
  renderDurationLabel();
  localStorage.setItem('duration', durationInput.value);
});

renderDurationLabel();

let ws: WebSocket | null = null;
let version = 0;

function renderButtons(images: ImageInfo[]) {
    version++;
    // console.log(`updating buttons (${images.length} images)`);
    grid.innerHTML = '';

    for (const img of images) {
        const btn = document.createElement('button');
        btn.textContent = img.title;

        btn.addEventListener('click', () => {
            console.log("отправил с анимацией: " + animSelect.value);

            const durationMs = Math.round(parseFloat(durationInput.value) * 1000);
            if (ws?.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ 
                    type: 'show', 
                    file: img.file, 
                    duration: durationMs,
                    version,
                    autoHide: autoHide.checked,
                    direction: animSelect.value as Direction,
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
        status.textContent = '(Подключён)'; 
    };
    
    ws.onclose = () => {
        status.style.color="rgb(237, 42, 42)"
        status.textContent = '(Переподключение..)';
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