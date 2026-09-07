# Arquitectura

## Objetivo

El repositorio funciona como aplicación de referencia y como paquete visual
copiable. El Home simula la interfaz anterior: aloja únicamente la tarjeta del
Club. Todo lo demás pertenece al módulo nuevo.

## Flujo de datos

```text
Backend futuro / demo local
          │
          ▼
    ClubSnapshot
          │
    ┌─────┴───────────┐
    ▼                 ▼
ClubProgress      ClubScreen
                      │
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   ClubHero      Beneficios     Términos
         │
         └── racha + escalera Diamante

Eventos confirmados por backend
          │
          ├── PaymentClubUpdate ──► PointsCelebration
          └── { from, to } ───────► StreakCelebration
```

## Capas

### `src/data`

Define la frontera pública `ClubSnapshot` y `ClubRepository`. No contiene red
ni fixtures. Esta es la capa que debe implementar el equipo de backend/app.

### `src/demo`

Contiene los valores hardcodeados y mutaciones de demostración. Es reemplazable
en bloque y no debe viajar a producción. `DevControls` existe únicamente para
esta entrega.

### `src/domain`

Contiene reglas puras y tipos: puntos, medallas permanentes, rachas, beneficios,
escalera Diamante y recompensas por pago. Las funciones no dependen de React ni
de una API, por lo que pueden probarse y compararse con respuestas del servidor.

### `src/components`

Contiene componentes presentacionales compartidos. `ClubProgress` es la pieza
que se inserta en el Home anterior. Las celebraciones son modales de nivel raíz.

### `src/screens`

`ClubHandoffHome` ensambla la demo. `ClubScreen` consume exclusivamente el
contrato de Club y abre beneficios/términos dentro del mismo módulo.

## Expo y React 19

La entrega usa Expo SDK 57, React Native 0.86.3 y React 19.2.3. Expo administra
la compilación nativa y el arranque en iOS, Android y web; el código visual sigue
siendo React Native y puede integrarse en otra app que tenga Expo Modules.

Los providers se montan una sola vez en `App.tsx`:

1. `ThemeProvider`
2. `GestureHandlerRootView`
3. `SafeAreaProvider`

Las pantallas del Club no deben crear un segundo store de negocio. Reciben un
snapshot inmutable y eventos confirmados.

## Three.js

La medalla interactiva vive en `BronzeCoin3D.dom.tsx` y utiliza Three.js con
`@react-three/fiber`. El sufijo `.dom.tsx` indica una vista DOM aislada de Expo.
La textura visible es el recurso WebP oficial de cada medalla.

`InteractiveBronzeMedal.tsx` mantiene primero la medalla estática y reemplaza
esa capa cuando la vista 3D termina de cargar. De esta forma:

- la UI tiene una imagen inmediata;
- un fallo de WebGL/DOM no deja un espacio vacío;
- la pantalla sigue siendo capturable y funcional sin interacción 3D.

No se usa `expo-three`. La dependencia directa es `three`, renderizada por
React Three Fiber dentro de la vista DOM.

## Decisiones de integración

- El backend es autoridad sobre puntos, racha, medalla y escalera.
- Una medalla desbloqueada nunca se recalcula hacia abajo a partir de puntos.
- Los dos carriles, puntos y racha de SANes perfectos, siguen independientes.
- La UI no calcula una recompensa a partir de una animación; anima el resultado
  confirmado que recibe.
- Los parámetros Venezuela están hardcodeados en `src/domain/types.ts` para la
  V1 y pueden migrar luego a configuración remota.
