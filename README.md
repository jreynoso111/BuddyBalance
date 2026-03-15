# Body Balance Web

Este repositorio queda como el proyecto web que despliega en Vercel.

## Estructura

- `/Users/jreynoso/I Got You`: web
- `/Users/jreynoso/I Got You Android`: app Android
- `/Users/jreynoso/I Got You iOS`: app iOS

## Desarrollo web

```bash
npm install
npm run web
```

Variables locales mínimas:

```bash
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAACp99RfEGJMIh-X3
```

## Build para Vercel

```bash
npm run build:web
```

## API interna

La web ahora consulta datos autenticados de la app mediante endpoints en `api/`, en lugar de depender del código compartido con los proyectos móviles.

## Flujos públicos y Turnstile

Los flujos públicos del sitio usan Supabase Edge Functions:

- `public-contact`
- `public-auth`

Cobertura actual:

- `register` web
- `forgot-password` web
- `login` web para password sign-in
- `contact` público web

Secrets requeridos para la función:

```bash
TURNSTILE_SECRET_KEY=...
PUBLIC_CONTACT_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net
PUBLIC_AUTH_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net
PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS=https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password
TURNSTILE_ALLOWED_HOSTNAMES=buddybalance.net,www.buddybalance.net
ADMIN_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net
ADMIN_ALLOWED_RESET_REDIRECTS=buddybalance://reset-password,https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password
RESEND_API_KEY=...
SUPPORT_TO_EMAIL=...
SUPPORT_FROM_EMAIL=no-reply@buddybalance.net
SUPPORT_FROM_NAME=Buddy Balance
```

Notas:

- Los allowlists ahora son estrictos por defecto. `localhost` ya no se acepta automáticamente.
- Si quieres probar contra funciones remotas desde desarrollo, añade explícitamente tus orígenes y redirects de loopback solo en el entorno de dev, por ejemplo:
  - `PUBLIC_AUTH_ALLOWED_ORIGINS=http://localhost:8082`
  - `PUBLIC_CONTACT_ALLOWED_ORIGINS=http://localhost:8082`
  - `PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS=http://localhost:8082/reset-password`
  - `TURNSTILE_ALLOWED_HOSTNAMES=localhost`
- El rate limit público ahora depende de la RPC `public.check_public_rate_limit` y ya no usa memoria local del worker.
- `revenuecat-sync` ahora falla cerrado si no configuras `REVENUECAT_WEBHOOK_AUTH_TOKEN`. Cuando actives RevenueCat, añade también:
  - `REVENUECAT_SECRET_API_KEY`
  - `REVENUECAT_WEBHOOK_AUTH_TOKEN`
  - `REVENUECAT_ENTITLEMENT_ID`
  - `REVENUECAT_ALLOWED_ORIGINS`

Ejemplo de configuración y despliegue:

```bash
npx supabase secrets set --project-ref skxasszsdwtlsqlkukri \
  TURNSTILE_SECRET_KEY=your_secret \
  PUBLIC_CONTACT_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net \
  PUBLIC_AUTH_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net \
  PUBLIC_AUTH_ALLOWED_RESET_REDIRECTS=https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password \
  TURNSTILE_ALLOWED_HOSTNAMES=buddybalance.net,www.buddybalance.net \
  ADMIN_ALLOWED_ORIGINS=https://buddybalance.net,https://www.buddybalance.net \
  ADMIN_ALLOWED_RESET_REDIRECTS=buddybalance://reset-password,https://buddybalance.net/reset-password,https://www.buddybalance.net/reset-password

npx supabase functions deploy public-contact --project-ref skxasszsdwtlsqlkukri
npx supabase functions deploy public-auth --project-ref skxasszsdwtlsqlkukri --no-verify-jwt
npx supabase functions deploy admin-user-management --project-ref skxasszsdwtlsqlkukri --no-verify-jwt
```
