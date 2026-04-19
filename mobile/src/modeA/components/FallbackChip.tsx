// Small pill label that flags a row whose value came from a documented
// default rather than a live Orthogonal parse. Mirrors the web
// FallbackChip so the two platforms signal fallback data the same way.

import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius } from '../theme';

export function FallbackChip() {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>via fallback</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.hairline,
    backgroundColor: colors.cardElevated,
    alignSelf: 'flex-start',
  },
  text: {
    color: colors.textDim,
    fontFamily: fonts.mono,
    fontSize: 9.5,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
