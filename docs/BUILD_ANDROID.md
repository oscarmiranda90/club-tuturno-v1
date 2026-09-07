# Ejecutar y generar un APK

## Desarrollo con Expo

```bash
npm install
npm start
```

Luego escanea el QR con Expo Go o pulsa `a` para abrir Android. También puedes
usar directamente:

```bash
npm run android
```

## APK compartible con EAS

El perfil `preview` de `eas.json` ya define `android.buildType: "apk"`. El repo
no incluye el `projectId`, propietario ni credenciales de la app oficial.

La primera vez, el responsable de la cuenta debe enlazar este proyecto:

```bash
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile preview
```

EAS entregará una URL para descargar el APK. La documentación oficial del flujo
es <https://docs.expo.dev/build-reference/apk/>.

## Build nativo local

Para generar y ejecutar el proyecto Android nativo en una máquina con Android
Studio/SDK configurado:

```bash
npx expo run:android
```

Este comando crea `android/` localmente; la carpeta está ignorada porque el
repositorio utiliza el flujo administrado de Expo como fuente de verdad.

## Identidad aislada

- Slug: `club-tuturno-v1`
- Android package: `com.tuturno.club.v1.demo`
- iOS bundle: `com.tuturno.club.v1.demo`

Antes de publicar, el equipo debe reemplazar estos identificadores y decidir si
el módulo se integra en la app oficial o se distribuye como aplicación separada.
