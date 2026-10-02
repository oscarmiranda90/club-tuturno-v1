# Club TuTurno V1

Entrega aislada de la nueva interfaz del Club para integrarla posteriormente en
la aplicación existente. El proyecto abre en un Home mínimo: solo muestra el
componente del Club y los controles de revisión. Al tocar la tarjeta se abre la
experiencia completa.

## Qué incluye

- Tarjeta del Club para el Home, en presentación normal y verde.
- Club completo con medalla, beneficios, racha y escalera Diamante.
- Carrusel «Conoce tus beneficios» y términos del Club.
- Celebración por pago, ascenso de medalla y avance de racha.
- Controles DEV para cambiar medalla, racha y escalera Diamante.
- Datos demostrativos centralizados y un contrato listo para backend.
- Tema claro/oscuro, recursos de medallas, mascota Tutu y escena 3D.

No contiene autenticación, pagos, grupos, navegación de la app anterior ni
servicios productivos. Tampoco está enlazado al proyecto EAS de TuTurno.

## Ejecutar

Requisitos: Node.js 22.13 o superior, npm y Expo Go o un simulador.

```bash
npm install
npm start
```

Atajos:

```bash
npm run ios
npm run android
npm run web
npm run check
```

## Recorrido de revisión

1. Toca la tarjeta del Club para abrir la pantalla principal.
2. Toca «Conoce tus beneficios» para revisar Bronce, Plata, Oro y Diamante.
3. Abre «Términos del Club» desde el pie de la pantalla.
4. Regresa al Home y abre «Controles DEV».
5. Cambia la medalla o usa los botones de pago, nivel, racha y escalera.
6. Para la escalera Diamante, pulsa «Avanzar escalera» dos veces por cada monto.

## Integración

El punto de entrada de datos es `ClubSnapshot`, definido en
`src/data/clubContract.ts`. La UI no importa fixtures. La demo implementa ese
contrato desde `src/demo/useClubDemo.ts`; el equipo puede sustituir ese hook por
su cliente HTTP, store o query cache.

Consulta:

- [Arquitectura](docs/ARCHITECTURE.md)
- [Contrato e integración de backend](docs/BACKEND_INTEGRATION.md)
- [Inventario de pantallas y capturas](docs/SCREEN_INVENTORY.md)
- [Generación del APK](docs/BUILD_ANDROID.md)

## Three.js explicado para principiantes y backend

Three.js es una biblioteca de JavaScript que dibuja objetos en tres dimensiones.
En este proyecto hace que la medalla tenga profundidad, iluminación y movimiento:
el usuario puede arrastrarla para girarla. La escena se dibuja en el dispositivo
del usuario; el backend entrega el estado del Club que decide qué medalla mostrar.

### Cómo se convierte un dato en una medalla 3D

```text
Backend o demo local
        ↓
ClubSnapshot: estado del Club
        ↓
club.points.tier: bronce, plata, oro o diamante
        ↓
Pantalla del Club → componente de medalla → escena Three.js
```

Por ejemplo, si el servidor devuelve `club.points.tier: "oro"`, la pantalla
selecciona la imagen de Oro, el color del borde y sus destellos. Cambiar ese campo
en el snapshot actualizado permite mostrar otra medalla.

Estos son los conceptos básicos de la escena:

| Concepto | Qué significa aquí |
| --- | --- |
| Escena | El espacio donde están la medalla, las luces y los efectos. |
| Cámara | El punto de vista desde el que vemos la medalla. |
| Geometría | La forma del objeto: un cilindro para el cuerpo y círculos para las caras. |
| Textura | La imagen WebP de la medalla colocada sobre sus caras. |
| Material | La apariencia de la superficie: color, brillo y acabado metálico. |
| Animación | Pequeños cambios de giro y efectos en cada cuadro de la imagen. |

La moneda se construye con código y con imágenes incluidas en `assets`. No
requiere descargar un modelo 3D desde el servidor.

### Dónde está implementado

- [BronzeCoin3D.dom.tsx](src/components/club/BronzeCoin3D.dom.tsx) construye la
  escena. Aunque su nombre menciona Bronce, maneja las cuatro medallas.
- [InteractiveBronzeMedal.tsx](src/components/club/InteractiveBronzeMedal.tsx)
  contiene `InteractiveTierMedal`, el componente que recibe el nivel y el tamaño.
  Muestra una medalla estática mientras carga la escena y la retira al recibir
  la señal `onReady`.
- [StaticTierMedal.tsx](src/components/club/StaticTierMedal.tsx) muestra la imagen
  estática, que también se usa en superficies pequeñas.

La escena utiliza **React Three Fiber**, que permite escribir objetos de
Three.js como componentes React. `<Canvas>` es la superficie de dibujo y
`useFrame()` actualiza el movimiento en cada cuadro. El arrastre cambia el giro;
al soltar, la moneda conserva inercia y luego continúa girando lentamente. Oro
tiene destellos y Diamante añade un halo.

La directiva `'use dom'` del archivo de la escena indica que contiene una vista
web. Expo la aloja dentro de una WebView en móvil, donde WebGL dibuja el 3D.
El componente de React Native le pasa el nivel de la medalla y recibe la señal
de que está lista para mostrarse.

### Qué debe conectar el equipo de backend

`ClubSnapshot` es el contrato de datos: describe la estructura que espera la
interfaz. Está definido junto con `ClubRepository` en
[clubContract.ts](src/data/clubContract.ts).

Este es un ejemplo completo de un snapshot de Bronce:

```json
{
  "club": {
    "points": {
      "points": 144,
      "tier": "bronce",
      "pointsExpireAt": null
    },
    "streak": {
      "step": 0,
      "progressToNext": 2,
      "zeroCommissionSanId": null
    },
    "ladder": null,
    "cuotaStreak": 2
  },
  "isDelinquent": false,
  "hasActiveSan": true,
  "pointsProgress": null
}
```

El servidor es responsable de los puntos, la medalla, la racha, la escalera
Diamante y el estado de mora. Los colores, las luces, las texturas y el giro
están definidos en el cliente y no necesitan campos adicionales en la API.

Para conectar la aplicación:

1. Implementar `ClubRepository.getSnapshot()` con el cliente HTTP de la app.
   Ese método devuelve una promesa con el `ClubSnapshot` recibido del servidor.
2. Sustituir `useClubDemo()` en
   [ClubHandoffHome.tsx](src/screens/ClubHandoffHome.tsx) por el hook o store real,
   es decir, la pieza que obtiene y mantiene los datos de la API.
3. Pasar el snapshot actualizado a `ClubProgress` y `ClubScreen`. Los componentes
   visuales ya usan ese contrato.
4. Después de confirmar un pago, entregar el snapshot actualizado junto con
   `PaymentClubUpdate` para mostrar la celebración con los resultados confirmados.
5. Retirar los datos y controles de demostración antes de producción.

La medalla desbloqueada es permanente y no baja por una reducción de puntos.
Puntos y racha son independientes: **la racha de beneficios cuenta SANes
completos perfectos, no cuotas pagadas a tiempo**. `cuotaStreak` es un contador
motivacional separado y no debe usarse para avanzar esa racha. Las animaciones
muestran el resultado confirmado; no conceden puntos ni beneficios.

Para probar el recorrido sin backend, ejecuta `npm start`, abre el Club y usa
los controles DEV para cambiar la medalla. Para implementar las reglas y los
eventos, consulta [Contrato e integración de backend](docs/BACKEND_INTEGRATION.md).

## Stack congelado para esta entrega

- Expo SDK 57
- React Native 0.86.3
- React 19.2.3
- TypeScript 6
- Three.js 0.185 con React Three Fiber 9
- React Native Reanimated 4

La matriz oficial de Expo SDK 57 indica React Native 0.86 y React 19.2.3:
<https://docs.expo.dev/versions/v57.0.0/>.
