# AGENTS.md — La Tienda de Cachi

Reglas para agentes autónomos (Hermes u otros) que trabajen en este repo.
Estas reglas NO son opcionales. Si una tarea entra en conflicto con ellas,
detente y pregunta al dueño antes de continuar.

## 1. Seguridad y credenciales

- **NUNCA pidas tokens, contraseñas ni API keys por el chat.** Si falta
  autenticación (push rechazado, API 401), reporta el error exacto y detente.
  El dueño configura las credenciales en el entorno; tú las heredas.
- **NUNCA leas, imprimas, loguees ni commitees** el contenido de `.env` ni
  ningún secreto. El token de Loyverse vive ahí y jamás sale de ahí.
- No agregues secretos hardcodeados en el código bajo ninguna circunstancia.
- No modifiques `.gitignore` para des-ignorar archivos de entorno.

## 2. Flujo de Git

- **NUNCA hagas push directo a `main`.** Trabaja siempre en una branch:
  `feat/descripcion` o `fix/descripcion`.
- **NUNCA merges tu propio PR.** Abre el PR, describe qué hiciste y qué NO
  verificaste, y espera revisión del dueño.
- Un cambio = un commit con mensaje claro. Prefijos: `feat:`, `fix:`, `chore:`.
- Antes de empezar: `git fetch origin && git status`. Si el árbol no está
  limpio o la rama está desfasada, repórtalo y detente. No hagas `git pull`
  con merge automático ni resuelvas conflictos por tu cuenta.
- Nunca uses `push --force` en ninguna rama.

## 3. Verificación obligatoria antes de commitear

- **Verifica sintaxis JS** de las funciones serverless con `node --check`:
  ```bash
  node --check api/recompensas.js api/productos.js api/imagen.js
  ```
- Si tocaste el HTML/JS del frontend (`public/index.html`), comprueba que no
  haya errores de sintaxis JS en el bloque `<script>` — la validación visual
  o un linter inline es suficiente.
- Verifica que `public/index.html` y las funciones serverless compartan los
  mismos nombres de campos y rutas de API.
- **Valida claves contra la fuente de datos real.** Las categorías, nombres
  de producto e IDs vienen de Loyverse. Cualquier string usado como clave de
  lookup debe coincidir EXACTAMENTE (mayúsculas, acentos, espacios) con el
  valor que devuelve la API de Loyverse. Si no puedes consultar la API para
  verificar, dilo explícitamente en el PR: "claves NO verificadas contra Loyverse".
- **NUNCA simules infraestructura externa que estás probando** (Redis,
  APIs, bases de datos). Si necesitas verificar que algo funciona en
  producción o localmente, pruébalo contra el sistema real. Si no
  tienes las credenciales o el acceso necesario, DETENTE y repórtalo
  explícitamente — no escribas un mock, un fake, ni una clase simulada
  para producir un resultado que parezca exitoso.

## 4. Alcance y honestidad

- **Declara los límites de tu cambio.** Si el resultado visible depende de
  algo fuera del código (ej. una variable de entorno en Vercel), dilo en el
  PR. No entregues un cambio como "completo" si requiere pasos externos.
- **No inventes datos.** Si necesitas datos que no tienes (nombres reales de
  categorías, precios, fixtures), pregunta o marca el hueco con un TODO
  visible. Nunca rellenes con datos plausibles pero no verificados.
- Si no estás seguro de cómo funciona algo, lee el código existente antes de
  asumir. No adivines contratos ni formatos.

## 5. Estilo de código

- **Diffs mínimos.** Extiende estructuras existentes; no crees estructuras
  paralelas ni reescribas archivos completos para cambios puntuales.
- Sigue los patrones ya presentes en el archivo que tocas (naming,
  formato de objetos, orden de propiedades).
- No agregues dependencias nuevas a `package.json` sin aprobación explícita.
- No hagas refactors "de paso". Si ves algo mejorable fuera del alcance de
  la tarea, menciónalo en el PR en vez de tocarlo.
- Las funciones serverless usan `export default function handler(req, res)` —
  no las migres a App Router de Next.js ni a otro formato.

## 6. Contexto del proyecto

- **Stack:** HTML/CSS/JS vanilla (sin framework), funciones serverless nativas
  de Vercel (`/api/*.js` con `export default function handler(req, res)`),
  deploy en Vercel (plan hobby — no introduzcas nada que genere cargos:
  cron jobs pesados, funciones de larga duración, etc.).
- **No hay Next.js ni React.** No hay `next build`. Las funciones se
  despliegan como serverless functions estándar de Vercel.
- **Datos:** catálogo, productos e imágenes vienen de la API de Loyverse.
  El frontend carga productos desde `/api/productos`. El sistema de
  lealtad busca por número de teléfono vía `POST /api/recompensas` con
  rate limiting (`@upstash/ratelimit`, slidingWindow 5/10 min por IP).
- **Variables de entorno requeridas en Vercel:** `LOYVERSE_TOKEN`,
  `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- **Frontend:** archivo único `public/index.html` con estilos inline y
  `<script>` embebido. No hay bundler ni framework.
- **Producción:** https://latiendadecachi.com —
  cualquier cambio mergeado a `main` se despliega solo. Por eso la regla 2:
  nada llega a `main` sin revisión humana.

## 7. Al terminar cada tarea

Incluye en la descripción del PR:

1. Qué cambiaste (archivos y propósito).
2. Qué verificaste (node --check, despliegue, claves contra Loyverse).
3. Qué NO verificaste y por qué.
4. Pasos externos pendientes para que el cambio surta efecto (si los hay).
