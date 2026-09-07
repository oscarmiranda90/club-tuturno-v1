/**
 * Tu Turno — Money formatting
 *
 * Every amount the user reads passes through here. Before this file the symbol
 * was typed by hand in thirty-odd places, which is why changing currency used
 * to mean touching thirty-odd files and hoping none were missed.
 *
 * Integrators changing country: change CURRENCY, and nothing else.
 */

/** The symbol shown to the user. Country parameter, not a design choice. */
const SYMBOL = '€';

/**
 * A whole amount: €100. Used for SAN sizes, payouts and tier ceilings, which
 * are always round numbers by product rule.
 */
export function money(amount: number): string {
  return `${SYMBOL}${amount}`;
}

/**
 * An exact amount with cents: €11,74. Used wherever the figure is a real
 * charge the user is about to transfer, where rounding would be a lie.
 *
 * The decimal separator is a comma, which is what a Venezuelan reader expects
 * and what their banking app shows them.
 */
export function moneyExact(amount: number): string {
  return `${SYMBOL}${amount.toFixed(2).replace('.', ',')}`;
}

/** The bare symbol, for the few places that compose their own string. */
export const CURRENCY_SYMBOL = SYMBOL;
