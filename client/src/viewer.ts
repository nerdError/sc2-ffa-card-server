import type { ServerMsg } from './shared/types';

const pic = document.getElementById('pic') as HTMLImageElement;

let hideTimeout: number | null = null;

function show(file: string) {
    console.log("SHOW");
    // если уже показываем что-то — мгновенно уводим, потом показываем новую
    if (hideTimeout !== null) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }

    const src = `/assets/${encodeURIComponent(file)}` + "?v=" + Date.now();
    pic.src = src;

    //   console.log("src: " + src);

    // форсируем reflow, чтобы transition сработал даже если класс уже был
    pic.classList.remove('visible');
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    pic.offsetWidth;

    // на следующем кадре включаем видимость
    requestAnimationFrame(() => {
        pic.classList.add('visible');
    });
}

function hide() {
    console.log("HIDE");

    if (!pic.classList.contains('visible')) return;
    pic.classList.remove('visible');
    // после завершения transition убираем src, чтобы не мигало в OBS

    hideTimeout = window.setTimeout(() => {
        pic.removeAttribute('src');
        hideTimeout = null;
    }, 550); // чуть больше длительности transition (500ms)
}

let ws: WebSocket | null = null;

function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws?role=viewer`);
    ws.onclose = () => setTimeout(connect, 1000);
    
    ws.onmessage = (ev) => {
        const msg: ServerMsg = JSON.parse(ev.data);
        console.log("got message: " + msg.type)

        if (msg.type === 'show') show(msg.file);
        else if (msg.type === 'hide') hide();
    };
}

connect();