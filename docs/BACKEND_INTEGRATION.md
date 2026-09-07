# Integración de backend

## Contrato de lectura

La UI consume este objeto:

```ts
interface ClubSnapshot {
  club: ClubState;
  isDelinquent: boolean;
  hasActiveSan: boolean;
  pointsProgress?: ClubPointsProgressPayload | null;
}
```

Ejemplo equivalente a los datos demo:

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

Para Diamante:

```json
{
  "club": {
    "points": {
      "points": 1820,
      "tier": "diamante",
      "pointsExpireAt": null
    },
    "streak": {
      "step": 6,
      "progressToNext": 1,
      "zeroCommissionSanId": null
    },
    "ladder": {
      "currentMax": 500,
      "completedAtCurrentMax": 1
    },
    "cuotaStreak": 9
  },
  "isDelinquent": false,
  "hasActiveSan": true
}
```

## Campos clave

| Campo | Responsable | Uso |
| --- | --- | --- |
| `points.points` | Backend | Balance confirmado |
| `points.tier` | Backend | Medalla permanente actual |
| `streak.step` | Backend | Último beneficio desbloqueado: 0, 3, 6 o 12 |
| `streak.progressToNext` | Backend | SANes perfectos después del escalón |
| `cuotaStreak` | Backend | Racha motivacional visible en el Home |
| `ladder.currentMax` | Backend | Monto actual de la escalera Diamante |
| `ladder.completedAtCurrentMax` | Backend | Progreso 0/2 o 1/2 en el monto actual |
| `isDelinquent` | Backend | Bloqueo visual de beneficios/racha |
| `pointsProgress` | Backend opcional | Resumen precalculado; la UI tiene fallback |

## Eventos y celebraciones

Después de confirmar un pago, el backend debería devolver de forma atómica el
snapshot actualizado y `PaymentClubUpdate`. La pantalla de felicitación utiliza
directamente:

- puntos antes, ganados y después;
- medalla anterior/nueva cuando existe ascenso;
- racha antes/después y el hito desbloqueado;
- texto/recompensa ya confirmados.

No conviene emitir una celebración optimista. Si el pago falla o se marca tarde,
la app no debe mostrar puntos ni promoción.

Para una celebración de racha basta con los conteos confirmados:

```json
{ "from": 5, "to": 6 }
```

El componente detecta que `6` desbloquea un beneficio. Para progreso ordinario:

```json
{ "from": 7, "to": 8 }
```

## Sustituir la demo

1. Implementar `ClubRepository.getSnapshot()` con el cliente HTTP existente.
2. Sustituir `useClubDemo()` en `ClubHandoffHome.tsx` por el hook/store real.
3. Pasar el snapshot a `ClubProgress` y `ClubScreen` sin modificar componentes.
4. Montar `PointsCelebration` y `StreakCelebration` cerca de la raíz de la app.
5. Eliminar `src/demo` y confirmar que no queden imports a `DevControls`.
6. Mantener las pruebas de `src/domain/club.spec.ts` o trasladarlas al backend.

## Configuración remota futura

Los umbrales V1 están en `TIERS`, `STREAK_BENEFITS`, `LADDER_SANES_REQUIRED`,
`LADDER_STEP` y `LADDER_CEILING`. Si esos valores cambian por país, el backend
debe incluir una configuración versionada. No se deben dispersar condicionales
por pantalla.
