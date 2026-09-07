# Inventario de pantallas y capturas

## Pantallas principales

1. **Home mínimo — tarjeta normal.** Bronce con puntos y racha.
2. **Home mínimo — tarjeta verde.** Activa el control «Verde».
3. **Club — Bronce.** Hero, beneficio de monto y termómetro de racha.
4. **Club — Plata.** Selecciona Plata en DEV y abre el Club.
5. **Club — Oro.** Selecciona Oro en DEV y abre el Club.
6. **Club — Diamante.** Selecciona Diamante y muestra la escalera horizontal.
7. **Beneficios — Bronce.** Abre «Conoce tus beneficios».
8. **Beneficios — Plata.** Desliza a la tarjeta Plata.
9. **Beneficios — Oro.** Desliza a la tarjeta Oro.
10. **Beneficios — Diamante.** Desliza a la tarjeta Diamante.
11. **Términos del Club.** Abre el enlace al pie del Club y captura el contenido largo.

## Celebraciones y estados

12. **Pago confirmado.** Pulsa «Felicitar pago».
13. **Ascenso de medalla.** Pulsa «Subir de nivel».
14. **Racha en progreso.** Usa una racha que no cruce 3, 6 o 12 y pulsa «Subir la racha».
15. **Racha con beneficio desbloqueado.** Deja la racha en 2, 5 u 11 y pulsa el mismo botón.
16. **Diamante 1/2.** Desde Diamante, pulsa una vez «Avanzar escalera».
17. **Diamante nuevo monto.** Pulsa por segunda vez para subir el máximo en $100.
18. **Tema oscuro.** Repite Home y Club con el botón de apariencia.

## Estados recomendados para QA

- Bronce + racha 12 para confirmar que los carriles son independientes.
- Diamante + racha 0 por la misma razón.
- Diamante en $1.000 para validar el techo de la escalera.
- Texto grande y Reducir movimiento activado en el dispositivo.
- Pantalla corta y pantalla alta para revisar el modo compacto del Club.

Los controles DEV están fuera del Club para que ninguna captura de la pantalla
principal tenga herramientas de prueba superpuestas.
