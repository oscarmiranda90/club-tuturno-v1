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

## Stack congelado para esta entrega

- Expo SDK 57
- React Native 0.86.3
- React 19.2.3
- TypeScript 6
- Three.js 0.185 con React Three Fiber 9
- React Native Reanimated 4

La matriz oficial de Expo SDK 57 indica React Native 0.86 y React 19.2.3:
<https://docs.expo.dev/versions/v57.0.0/>.
