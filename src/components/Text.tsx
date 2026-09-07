import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { textStyles, useTheme, type TextStyleToken } from '../theme';

type ColorToken =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'inverse'
  | 'accent'
  | 'onBrand'
  | 'onBrandMuted';

interface TextProps extends RNTextProps {
  variant?: TextStyleToken;
  color?: ColorToken;
}

/**
 * The only text primitive in the app. Screens must not use RN's Text directly —
 * routing every string through this component is what keeps the type scale and
 * both themes consistent as the product grows.
 */
export function Text({
  variant = 'body',
  color = 'primary',
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();

  return (
    <RNText
      style={[textStyles[variant], { color: theme.text[color] }, style]}
      {...rest}
    />
  );
}
