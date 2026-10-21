import localtunnel from 'localtunnel';

const SUBDOMAIN = 'kontrakanku-app';
const PORT = 3000;
let isReconnecting = false;

async function startTunnel() {
  if (isReconnecting) return;
  isReconnecting = true;

  try {
    console.log(`[${new Date().toLocaleTimeString()}] Requesting tunnel for subdomain: ${SUBDOMAIN}...`);
    const tunnel = await localtunnel({ port: PORT, subdomain: SUBDOMAIN });

    console.log(`[${new Date().toLocaleTimeString()}] Tunnel successfully connected!`);
    console.log(`> URL: ${tunnel.url}`);

    if (tunnel.url !== `https://${SUBDOMAIN}.loca.lt`) {
      console.warn(`[WARNING] Subdomain '${SUBDOMAIN}' is currently held in lease cooldown by loca.lt. Assigned fallback: ${tunnel.url}`);
      console.log(`Retrying for exact subdomain '${SUBDOMAIN}' in 5 seconds...`);
      setTimeout(() => {
        try { tunnel.close(); } catch {}
        isReconnecting = false;
        startTunnel();
      }, 5000);
      return;
    }

    console.log(`[READY] Custom link is active: https://${SUBDOMAIN}.loca.lt`);
    isReconnecting = false;

    tunnel.on('close', () => {
      console.warn(`[${new Date().toLocaleTimeString()}] Tunnel connection closed. Reconnecting in 3s...`);
      isReconnecting = false;
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error(`[${new Date().toLocaleTimeString()}] Tunnel error:`, err?.message || err);
      try { tunnel.close(); } catch {}
      isReconnecting = false;
      setTimeout(startTunnel, 3000);
    });

  } catch (err) {
    console.error(`[${new Date().toLocaleTimeString()}] Failed to start tunnel:`, err?.message || err);
    isReconnecting = false;
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
