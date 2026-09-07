import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Text } from '../Text';
import {
  COMMISSION,
  LADDER_CEILING,
  LADDER_SANES_REQUIRED,
  LADDER_STEP,
  TIERS,
  money,
} from '../../domain';
import {
  borderCurve,
  borderWidth,
  radius,
  spacing,
  useTheme,
} from '../../theme';

interface ClubRulesSheetProps {
  visible: boolean;
  onClose: () => void;
}

interface Rule {
  /** Optional lead-in shown above the rule, in muted type. */
  term?: string;
  text: string;
}

interface Section {
  title: string;
  intro?: string;
  rules: Rule[];
}

const juntos = `${Math.round(COMMISSION.juntos * 100)}%`;
const premium = `${(COMMISSION.premium * 100).toFixed(1).replace('.', ',')}%`;

/**
 * The Club's rules in full, as the master spec states them.
 *
 * Written out rather than summarised. This is the screen's long-form tier: the
 * cards above answer "where am I", and everything a careful reader would ask
 * next — what happens on a late payment, whether points expire, what the 0%
 * actually covers — is answered here without hedging.
 *
 * Figures come from the domain constants, so a country whose parameters differ
 * gets correct terms rather than Venezuela's numbers in Spanish prose.
 */
const SECTIONS: readonly Section[] = [
  {
    title: 'Dos caminos, un solo jugador',
    intro:
      'El Club tiene dos avances que corren por separado y nunca dependen uno del otro.',
    rules: [
      {
        term: 'Los puntos suben tu medalla',
        text: 'Se ganan pagando cuotas a tiempo. Deciden tu medalla y el monto máximo de cada SAN.',
      },
      {
        term: 'Los SANes perfectos desbloquean beneficios',
        text: 'Un SAN perfecto es uno completado con todos sus pagos a tiempo, de principio a fin. Deciden cuántos SANes juegas a la vez y el SAN al 0%.',
      },
      {
        text: 'Puedes tener una medalla alta y una racha baja, o al revés. Son cuentas distintas y ninguna se calcula a partir de la otra.',
      },
    ],
  },
  {
    title: 'Cómo se ganan los puntos',
    rules: [
      { term: 'Modelo Juntos · pago en fecha', text: '2 puntos por cada unidad pagada.' },
      {
        term: 'Modelo Juntos · pago antes de las 9:00 am',
        text: '4 puntos por cada unidad pagada. Es el doble, y es la única forma de acelerar tu medalla.',
      },
      { term: 'Modelo Premium · pago en fecha', text: '1 punto por cada unidad pagada.' },
      { term: 'Modelo Premium · pago anticipado', text: '2 puntos por cada unidad pagada.' },
      {
        term: 'Pago fuera de fecha',
        text: '0 puntos. No suma, y tampoco resta.',
      },
      {
        text: 'Los puntos vienen únicamente de pagos de cuotas. No hay puntos por referir, por activar notificaciones ni por ninguna otra acción.',
      },
    ],
  },
  {
    title: 'Las medallas',
    rules: [
      {
        term: 'Bronce · 0 a 299 puntos',
        text: `SANes de hasta ${money(TIERS[0].maxSanAmount)}.`,
      },
      {
        term: 'Plata · 300 a 799 puntos',
        text: `SANes de hasta ${money(TIERS[1].maxSanAmount)}.`,
      },
      {
        term: 'Oro · 800 a 1.499 puntos',
        text: `SANes de hasta ${money(TIERS[2].maxSanAmount)}.`,
      },
      {
        term: 'Diamante · 1.500 puntos en adelante',
        text: `SANes desde ${money(TIERS[3].maxSanAmount)}, sin tope: a partir de aquí el monto sigue creciendo por la escalera.`,
      },
      {
        text: 'La medalla nunca retrocede. Una vez que la alcanzas es permanente, y no se recalcula hacia atrás bajo ninguna condición.',
      },
    ],
  },
  {
    title: 'Los escalones de la racha',
    rules: [
      { term: 'Inicio', text: 'Juegas 1 SAN a la vez.' },
      { term: '3 SANes perfectos', text: 'Juegas 2 SANes a la vez.' },
      { term: '6 SANes perfectos', text: 'Juegas 3 SANes a la vez.' },
      {
        term: '12 SANes perfectos',
        text: 'Juegas 4 SANes a la vez, y uno de tus SANes va al 0% de comisión en Modelo Juntos.',
      },
      { text: 'Los SANes simultáneos aplican en ambos modelos, y la racha cuenta SANes perfectos de cualquier modelo.' },
    ],
  },
  {
    title: 'El SAN al 0%',
    rules: [
      {
        text: 'Aplica a un único SAN activo a la vez, y solo en Modelo Juntos. Los demás SANes que tengas abiertos pagan comisión normal.',
      },
      {
        term: 'Lo asigna el sistema',
        text: 'Lo lleva el primer SAN que abras con el beneficio activo. No se elige.',
      },
      {
        term: 'Las condiciones se congelan al abrir',
        text: 'Un SAN que arranca al 0% termina al 0%, incluso si caes en mora en el camino. Nunca se cobra comisión sobre las cuotas restantes de un SAN en curso.',
      },
      { text: 'En Modelo Premium no hay 0% ni descuento, en ningún nivel.' },
    ],
  },
  {
    title: 'La escalera Diamante',
    intro: `A partir de Diamante tu monto no se queda en ${money(TIERS[3].maxSanAmount)}.`,
    rules: [
      {
        text: `Completa ${LADDER_SANES_REQUIRED} SANes de tu monto actual sin mora y desbloqueas ${money(LADDER_STEP)} más, hasta ${money(LADDER_CEILING)}.`,
      },
      {
        term: 'Lo que desbloqueas es tuyo para siempre',
        text: 'El conteo es acumulativo: una mora en el camino no borra los SANes ya contados ni baja el monto que alcanzaste.',
      },
    ],
  },
  {
    title: 'Qué pasa si te atrasas',
    rules: [
      {
        term: 'Tu medalla y tus puntos no se tocan',
        text: 'La mora no resta puntos y no baja la medalla, nunca.',
      },
      {
        term: 'Bajas un solo escalón de racha',
        text: 'De 12 a 6, de 6 a 3, de 3 al inicio. Un episodio de mora cuesta un escalón, sin importar cuántas cuotas venzan dentro de él. Nunca caes dos de golpe.',
      },
      {
        term: 'No abres SANes nuevos',
        text: 'Con una cuota vencida activa sigues jugando los SANes que ya tienes, pero no entras a ninguno nuevo hasta ponerte al día con las cuotas vencidas y sus recargos.',
      },
      {
        term: 'La mora se cobra aparte',
        text: 'Con el Recargo por Gestión de Cobranza, no quitándote lo que ganaste.',
      },
      {
        text: 'El progreso parcial hacia el siguiente escalón sí se pierde: si ibas por 4 SANes perfectos rumbo al 12, esos 4 vuelven a cero al caer.',
      },
    ],
  },
  {
    title: 'Comisiones',
    rules: [
      { term: 'Modelo Juntos', text: `${juntos}, igual en todas las medallas.` },
      { term: 'Modelo Premium', text: `${premium}, igual en todas las medallas.` },
      {
        text: 'La medalla no cambia la comisión. Lo que crece con ella es tu capacidad: montos más altos, y en Diamante sin tope.',
      },
    ],
  },
  {
    title: 'Inactividad',
    rules: [
      {
        text: 'Si pasas 6 meses sin participar en un SAN y sin iniciar sesión, tus puntos vencen — pero conservas tu medalla. Al volver acumulas desde 0 puntos manteniendo el nivel que alcanzaste.',
      },
    ],
  },
  {
    title: 'El Club en tu país',
    rules: [
      {
        text: 'Los montos, la escalera y la tasa de puntos son parámetros de cada país y se expresan en su moneda local. La mecánica es la misma en todos; solo cambian las cifras.',
      },
      {
        text: 'El programa de referidos no forma parte del Club: no otorga puntos ni afecta medallas o rachas.',
      },
    ],
  },
] as const;

/**
 * The Club's full terms.
 *
 * Deliberately long. Everything above it on the screen is compressed to the
 * one fact each card owns, which works for the reader who wants to know where
 * they stand and fails the one who wants to know exactly how the thing works.
 * This is for the second reader, and it does not summarise at them: a rules
 * screen that leaves out the awkward clause is worse than no rules screen,
 * because it teaches people the terms are not where the answers are.
 */
export function ClubRulesSheet({ visible, onClose }: ClubRulesSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: theme.text.primary + '66' }]}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      />

      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface.canvas },
        ]}
      >
        <View style={[styles.grabber, { backgroundColor: theme.border.strong }]} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="titleSm">Términos del Club</Text>
            <Text variant="bodySm" color="secondary">
              Las reglas completas, sin resumir.
            </Text>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Cerrar"
            style={({ pressed }) => [
              styles.close,
              { backgroundColor: theme.surface.inset, opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Svg width={17} height={17} viewBox="0 0 24 24">
              <Path
                d="M6 6l12 12M18 6L6 18"
                stroke={theme.text.primary}
                strokeWidth={2.2}
                strokeLinecap="round"
                fill="none"
              />
            </Svg>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {SECTIONS.map((section) => (
            <View
              key={section.title}
              style={[styles.section, { backgroundColor: theme.surface.raised }]}
            >
              <Text variant="labelSm" color="accent">
                {section.title.toUpperCase()}
              </Text>

              {section.intro && (
                <Text variant="bodySm" color="secondary">
                  {section.intro}
                </Text>
              )}

              {/*
                Keyed by position, not by content.

                Two rules legitimately say the same thing — Juntos paid on time
                and Premium paid early both award 2 points — so `rule.text`
                collided and React dropped one of them. `term` cannot stand in
                either: it is optional, and the rules that lack it would all
                share a key of `undefined`.

                Position is safe here in the way it usually is not: this list is
                a static constant that is never reordered, filtered or appended
                to at runtime, so an index IS a stable identity rather than a
                guess at one.
              */}
              {section.rules.map((rule, ruleIndex) => (
                <View key={ruleIndex} style={styles.rule}>
                  {/*
                    A rule is a paragraph, not a bullet with a checkmark. Half
                    of these are limits — what you lose, what stays blocked —
                    and a green tick beside "no abres SANes nuevos" reads as
                    the app congratulating the user for it.
                  */}
                  <View
                    style={[styles.marker, { backgroundColor: theme.border.strong }]}
                  />
                  <View style={styles.ruleText}>
                    {rule.term && <Text variant="label">{rule.term}</Text>}
                    <Text variant="bodySm" color="secondary">
                      {rule.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

          <Text variant="labelSm" color="muted" style={styles.footer}>
            Club TuTurno · Estos términos describen la mecánica vigente del
            programa.
          </Text>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderCurve,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.base,
    // Nearly full height: this is a reading surface, and a short sheet full of
    // long text is mostly scrollbar.
    maxHeight: '92%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: radius.pill,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.base,
  },
  headerText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  close: {
    // The 48pt minimum touch target, written out: this block runs as the module
    // loads, inside the Club's import graph.
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderCurve,
  },
  rule: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  marker: {
    width: borderWidth.thick,
    // Stretches to the rule's own height, so a long paragraph keeps its rail
    // instead of being marked by a dot floating at the top of it.
    alignSelf: 'stretch',
    borderRadius: radius.pill,
  },
  ruleText: {
    flex: 1,
    gap: spacing['2xs'],
  },
  footer: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
});
