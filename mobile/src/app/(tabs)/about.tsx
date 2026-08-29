import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandHeader } from '@/components/BrandHeader';
import { AppText, Card, Hero } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';

const FEATURES = [
  {
    title: 'Analyse détaillée',
    text: "Nous examinons méticuleusement chaque match et fournissons une analyse critique, fondée sur les données, pour t'aider à comprendre les forces en présence sur le terrain."
  },
  {
    title: 'Statistiques des équipes',
    text: "Nous tenons compte des statistiques clés des équipes et des joueurs pour affiner nos pronostics. Notre but : te permettre de porter un regard plus éclairé sur les matchs que tu suis."
  },
  {
    title: 'Couverture mondiale',
    text: "Nous couvrons les plus grandes ligues mondiales : soccer, football américain, basketball, baseball, hockey et tennis. Nos analyses proviennent de sources fiables et de données à jour."
  },
  {
    title: 'Gratuit et accessible',
    text: "Lowkey Sports est et restera gratuit. Notre objectif est de rendre l'information sportive accessible à tous, sans frais cachés."
  }
];

export default function AboutScreen() {
  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <BrandHeader />

        <Hero compact>
          <AppText style={styles.title}>À propos de nous</AppText>
          <AppText muted>
            Lowkey Sports offre des analyses et des pronostics sportifs de qualité, sans parier.
          </AppText>
        </Hero>

        <View style={styles.list}>
          {FEATURES.map((feature) => (
            <Card key={feature.title} style={styles.card}>
              <AppText bold style={styles.cardTitle}>
                {feature.title}
              </AppText>
              <AppText muted>{feature.text}</AppText>
            </Card>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg
  },
  scroll: {
    flex: 1
  },
  content: {
    paddingHorizontal: spacing.three,
    paddingBottom: spacing.five
  },
  title: {
    fontSize: 26,
    fontWeight: '800'
  },
  list: {
    gap: spacing.two
  },
  card: {
    gap: spacing.one
  },
  cardTitle: {
    color: colors.gold
  }
});