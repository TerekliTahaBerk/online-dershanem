import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandLogos } from '@/design/brand';
import { Screen, Text } from '@/design/primitives';
import { auth, space } from '@/design/tokens';

/** Web AuthCard hierarchy with native keyboard scrolling and safe areas. */
export function AuthScreen({ title, description, children, footer }: PropsWithChildren<{ title: string; description?: string; footer?: ReactNode }>) {
  return <Screen edges={['top', 'left', 'right', 'bottom']} backgroundColor={auth.canvas} contentStyle={styles.screen}>
    <View style={styles.column}>
      <BrandLogos />
      <View style={styles.heading}>
        <Text variant="authTitle" accessibilityRole="header" style={styles.center}>{title}</Text>
        {description ? <Text tone="secondary" variant="secondary" style={styles.center}>{description}</Text> : null}
      </View>
      <View style={styles.form}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  </Screen>;
}

const styles = StyleSheet.create({
  screen: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space[6], paddingVertical: space[10] },
  column: { width: '100%', maxWidth: auth.columnWidth, alignSelf: 'center' },
  heading: { marginTop: space[6], marginBottom: space[6], gap: space[2] },
  form: { gap: space[4] },
  footer: { marginTop: space[6], gap: space[2] },
  center: { textAlign: 'center' },
});
