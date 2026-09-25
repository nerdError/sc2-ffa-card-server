import type { Direction, ServerMsg } from '../../shared/types';

const pic = document.getElementById('pic') as HTMLImageElement;

const DURATION_IN = 500;
const DURATION_OUT = 500;
const EASING_IN = 'cubic-bezier(0.22, 1, 0.36, 1)';
const EASING_OUT = 'ease-in';

// стартовые/конечные ключевые кадры для каждого направления
function keyframesFor(direction: Direction, phase: 'in' | 'out'): Keyframe[] {
    const hidden = {
        left: { transform: 'translateX(-110%)', opacity: 0 },
        right: { transform: 'translateX( 110%)', opacity: 0 },
        top: { transform: 'translateY(-110%)', opacity: 0 },
        bottom: { transform: 'translateY( 110%)', opacity: 0 },
        fade: { transform: 'scale(1)', opacity: 0 },
    }[direction];

    const visible = { transform: 'translate(0) scale(1)', opacity: 1 };

    // phase 'in':  hidden → visible
    // phase 'out': visible → hidden
    return phase === 'in' ? [hidden, visible] : [visible, hidden];
}

let currentDirection: Direction = 'left';
let activeAnim: Animation | null = null;
let hideTimeout: number | null = null;

function cancelActive() {
    if (activeAnim) {
        activeAnim.cancel();
        activeAnim = null;
    }
    if (hideTimeout !== null) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
    }
}

async function show(file: string, direction: Direction, version: number) {
    cancelActive();
    currentDirection = direction;

    // подгружаем картинку и ждём декодирования — чтобы анимация
    // начиналась уже с готовым изображением
    const url = `/assets/${encodeURIComponent(file)}${version ? `?v=${version}` : ''}`;
    pic.src = url;

    try {
        if (typeof pic.decode === 'function') {
            await pic.decode();
        } else {
            await new Promise<void>((resolve) => {
                if (pic.complete) return resolve();
                pic.onload = () => resolve();
                pic.onerror = () => resolve();
            });
        }
    } catch {
        // src сменился во время decode — просто продолжаем
    }

    // запускаем анимацию появления
    activeAnim = pic.animate(keyframesFor(direction, 'in'), {
        duration: DURATION_IN,
        easing: EASING_IN,
        fill: 'forwards',
    });
}

function hide() {
    if (!pic.src) return;
    cancelActive();
    activeAnim = pic.animate(keyframesFor(currentDirection, 'out'), {
        duration: DURATION_OUT,
        easing: EASING_OUT,
        fill: 'forwards',
    });
    const anim = activeAnim;
    anim.onfinish = () => {
        // после завершения — сбрасываем src
        if (activeAnim === anim) {
            pic.removeAttribute('src');
            activeAnim = null;
        }
    };
    // страховка на случай, если onfinish не вызовется
    hideTimeout = window.setTimeout(() => {
        if (activeAnim === anim) {
            pic.removeAttribute('src');
            activeAnim = null;
        }
        hideTimeout = null;
    }, DURATION_OUT + 100);
}

let ws: WebSocket | null = null;

function connect() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws?role=viewer`);
    ws.onclose = () => setTimeout(connect, 1000);

    ws.onmessage = (ev) => {
        const msg: ServerMsg = JSON.parse(ev.data);
        console.log("got message: " + msg.type)

        if (msg.type === 'show') show(msg.file, msg.direction, msg.version);
        else if (msg.type === 'hide') hide();
    };
}

connect();