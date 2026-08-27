

import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import {
  NativeStackScreenProps,
} from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import Header from '../components/Header'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'AboutUs'
>

export default function AboutUsScreen({
  navigation,
}: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <Header
          onBack={() => navigation.goBack()}
        />

        <View style={styles.hero}>
          <View style={styles.logoMark}>
            <Text style={styles.logoText}>
              TS
            </Text>
          </View>

          <Text style={styles.title}>
            About TempStaff
          </Text>

          <Text style={styles.subtitle}>
            Flexible staffing made simple.
          </Text>
        </View>

        <View style={styles.introCard}>
          <Text style={styles.introTitle}>
            Staffing when you need it
          </Text>

          <Text style={styles.body}>
            TempStaff connects businesses with
            temporary staff for short-term and
            flexible staffing needs.
          </Text>

          <Text style={styles.body}>
            Our goal is to make finding and
            managing temporary workers simpler,
            faster, and more transparent.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          What TempStaff helps with
        </Text>

        <FeatureCard
          number="01"
          title="Flexible staffing"
          text="Find temporary staff based on your business needs and schedule."
        />

        <FeatureCard
          number="02"
          title="Simple bookings"
          text="Create, manage, and keep track of your staffing bookings from one place."
        />

        <FeatureCard
          number="03"
          title="Convenient management"
          text="Keep your booking information, addresses, and account details organized."
        />

        <View style={styles.missionCard}>
          <Text style={styles.missionLabel}>
            OUR APPROACH
          </Text>

          <Text style={styles.missionTitle}>
            Built around your business
          </Text>

          <Text style={styles.missionText}>
            TempStaff is designed to reduce the
            friction involved in temporary staffing
            so businesses can focus on their work.
          </Text>
        </View>

        <View style={styles.valuesCard}>
          <ValueRow
            title="Simple"
            text="Straightforward booking and account management."
          />

          <ValueRow
            title="Flexible"
            text="Staffing options designed around changing business needs."
          />

          <ValueRow
            title="Reliable"
            text="Clear booking information helps you stay in control."
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            TempStaff
          </Text>

          <Text style={styles.footerText}>
            Temporary staffing, simplified.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function FeatureCard({
  number,
  title,
  text,
}: {
  number: string
  title: string
  text: string
}) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.numberBox}>
        <Text style={styles.numberText}>
          {number}
        </Text>
      </View>

      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>
          {title}
        </Text>

        <Text style={styles.featureText}>
          {text}
        </Text>
      </View>
    </View>
  )
}

function ValueRow({
  title,
  text,
}: {
  title: string
  text: string
}) {
  return (
    <View style={styles.valueRow}>
      <View style={styles.check}>
        <Text style={styles.checkText}>
          ✓
        </Text>
      </View>

      <View style={styles.valueContent}>
        <Text style={styles.valueTitle}>
          {title}
        </Text>

        <Text style={styles.valueText}>
          {text}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },

  page: {
    padding: 22,
    paddingBottom: 45,
  },

  hero: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 25,
  },

  logoMark: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },

  logoText: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
    letterSpacing: 1,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.teal,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 5,
  },

  introCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 19,
    marginBottom: 25,
  },

  introTitle: {
    color: COLORS.navy,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 9,
  },

  body: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 11,
  },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 10,
  },

  numberBox: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  numberText: {
    color: COLORS.teal,
    fontSize: 11,
    fontWeight: '900',
  },

  featureContent: {
    flex: 1,
  },

  featureTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
  },

  featureText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 3,
  },

  missionCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 20,
    marginTop: 15,
    marginBottom: 15,
  },

  missionLabel: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },

  missionTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 6,
  },

  missionText: {
    color: '#D7E3EF',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },

  valuesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
  },

  
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
  },

  check: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ECFDF3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  checkText: {
    color: COLORS.green,
    fontSize: 14,
    fontWeight: '900',
  },

  valueContent: {
    flex: 1,
  },

  valueTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
  },

  valueText: {
    color: COLORS.gray,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 2,
  },

  footer: {
    alignItems: 'center',
    marginTop: 24,
  },

  footerTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
  },

  footerText: {
    color: COLORS.gray,
    fontSize: 10,
    marginTop: 3,
  },
})