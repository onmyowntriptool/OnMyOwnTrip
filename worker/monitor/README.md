# omot-monitor: vigilancia de consumo

Worker aparte del proxy. Cada hora (minuto 17) revisa:

- **Cloudflare (plan gratuito, límites diarios de toda la cuenta):** peticiones a Workers (100.000), lecturas KV (100.000), escrituras, borrados y listados KV (1.000 cada uno), puntos de Analytics Engine (100.000), almacenamiento KV (1 GB) y peticiones cortadas por superar los 10 ms de CPU. Los datos salen de la API GraphQL.
- **IA:** tokens de Gemini y Claude, y caracteres de voz, que el proxy anota en Analytics Engine (`recordAiUsage`). Con ellos calcula el gasto en euros, el saldo prepago estimado y hasta cuándo dura.

El resumen se guarda en el KV `omot-premium` (`usage:snapshot`) y se ve en el panel, pestaña **Consumo**. Los correos salen desde `alertaconsumoapi@onmyowntrip.com` en tres casos:

- Un aviso nada más pasar un umbral: un recurso de Cloudflare al 60 % o al 85 % del límite diario, saldo para menos de 30 o de 10 días, un pico de gasto o que conteste Claude porque Gemini falla. Cada motivo se avisa una sola vez al día, salvo que suba de nivel.
- Un resumen semanal los lunes a las 06 UTC.
- Un aviso a las 06 UTC si no pudo leer los datos.

## Despliegue

Se despliega con wrangler desde esta carpeta (no se pega en el panel como el proxy):

```
cd worker/monitor
wrangler deploy
```

Secrets:
- `CF_API_TOKEN`: token de API con el permiso **Account → Account Analytics → Read**. Se crea en dash.cloudflare.com → My Profile → API Tokens.
- `MONITOR_KEY`: clave para lanzarlo a mano. Está en `.monitor-key`, que no se sube a git.

Para lanzarlo a mano: `https://omot-monitor.davidg-henriquez.workers.dev/run?key=<MONITOR_KEY>&mail=none|test|auto`.

## Saldo de Gemini

AI Studio no tiene API para consultar el saldo. Se apunta a mano en el panel (Consumo → Saldo real de Gemini) o lo actualiza la revisión semanal programada en Claude. A partir de esa fecha, el monitor descuenta el gasto estimado. En `usage:config`, `calib` corrige la diferencia entre lo estimado y lo que cobra Google.
