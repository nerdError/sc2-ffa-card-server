type Info = {
  port: number;
  ips: string[];
  viewerUrls: string[];
  controllerUrls: string[];
};

const list = document.getElementById('network-list') as HTMLDivElement;

function renderAddress(ip: string, controllerUrl: string, viewerUrl: string) {
  const row = document.createElement('div');
  row.className = 'addr';
  row.innerHTML = `
    <code>${ip}</code>
    <a class="btn" href="${controllerUrl}" target="_blank" rel="noopener">controller (телефон)</a>
    <a class="btn" href="${viewerUrl}"     target="_blank" rel="noopener">viewer</a>
  `;
  return row;
}

async function load() {
  try {
    const res = await fetch('/api/info');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const info: Info = await res.json();

    list.innerHTML = '';

    if (info.ips.length === 0) {
      list.innerHTML = '<span id="error">Сетевой IP не найден. Проверьте подключение к сети.</span>';
      return;
    }

    for (let i = 0; i < info.ips.length; i++) {
      list.appendChild(
        renderAddress(info.ips[i], info.controllerUrls[i], info.viewerUrls[i])
      );
    }
  } catch (e) {
    list.innerHTML = `<span id="error">Не удалось получить IP: ${(e as Error).message}</span>`;
  }
}

load();