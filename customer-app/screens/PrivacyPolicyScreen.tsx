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
  'PrivacyPolicy'
>

export default function PrivacyPolicyScreen({
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

        <View style={styles.header}>
          <View style={styles.icon}>
            <Text style={styles.iconText}>
              🔒
            </Text>
          </View>

          <Text style={styles.title}>
            Privacy Policy
          </Text>

          <Text style={styles.subtitle}>
            How TempStaff handles information
            associated with your account.
          </Text>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>
            Important
          </Text>

          <Text style={styles.noticeText}>
            This screen is a presentation template
            for the TempStaff privacy policy. Replace
            the placeholder sections below with the
            final policy approved for your business
            before publishing the app.
          </Text>
        </View>

        <PolicySection
          number="01"
          title="Information we collect"
        >
          <Text style={styles.body}>
            TempStaff may collect information needed
            to create and manage your account,
            process bookings, provide staffing
            services, and communicate with you.
          </Text>

          <Text style={styles.body}>
            The final policy should specify the exact
            categories of personal information
            collected by the TempStaff customer app.
          </Text>
        </PolicySection>

        <PolicySection
          number="02"
          title="How we use information"
        >
          <Text style={styles.body}>
            Information associated with your account
            may be used to provide and operate
            TempStaff services, manage bookings,
            provide customer support, and maintain
            account security.
          </Text>

          <Text style={styles.body}>
            The final policy should identify each
            purpose and the applicable legal basis
            where required.
          </Text>
        </PolicySection>

        <PolicySection
          number="03"
          title="Bookings and service information"
        >
          <Text style={styles.body}>
            Information connected with your bookings,
            including service details and saved
            addresses, may be used to provide the
            requested staffing service.
          </Text>

          <Text style={styles.body}>
            Only information necessary for the
            relevant service should be described here
            in the final approved policy.
          </Text>
        </PolicySection>

        <PolicySection
          number="04"
          title="Payment information"
        >
          <Text style={styles.body}>
            Payments may be processed through payment
            services integrated with TempStaff.
          </Text>

          <Text style={styles.body}>
            The final policy must identify the actual
            payment processor or processors used by
            the production application and explain
            what payment information TempStaff
            receives or stores.
          </Text>
        </PolicySection>

        <PolicySection
          number="05"
          title="Information sharing"
        >
          <Text style={styles.body}>
            The final privacy policy should explain
            when information may be shared with
            workers, service providers, technology
            providers, payment processors, or other
            third parties.
          </Text>

          <Text style={styles.body}>
            It should also identify any required
            disclosures and the circumstances in
            which they occur.
          </Text>
        </PolicySection>

        <PolicySection
          number="06"
          title="Data security"
        >
          <Text style={styles.body}>
            TempStaff should describe the technical
            and organizational measures used to
            protect customer information.
          </Text>

          <Text style={styles.body}>
            Security practices should be described
            accurately and should not promise a level
            of protection that the production system
            does not provide.
          </Text>
        </PolicySection>

        <PolicySection
          number="07"
          title="Your privacy rights"
        >
          <Text style={styles.body}>
            Depending on applicable law, customers may
            have rights concerning access, correction,
            deletion, restriction, portability, or
            objection to certain processing of their
            personal information.
          </Text>

          <Text style={styles.body}>
            The final policy should state which rights
            apply and how customers can exercise them.
          </Text>
        </PolicySection>

        <PolicySection
          number="08"
          title="Account deletion"
        >
          <Text style={styles.body}>
            Customers can request deletion of their
            TempStaff account and associated personal
            information through the account-management
            process provided by the application.
          </Text>

          <Text style={styles.body}>
            The final policy should specify retention
            requirements and any information that must
            be retained for legal, security, or
            operational reasons.
          </Text>
        </PolicySection>

        <PolicySection
          number="09"
          title="Changes to this policy"
        >
          <Text style={styles.body}>
            TempStaff may update its privacy policy
            when its services, practices, or legal
            requirements change.
          </Text>

          <Text style={styles.body}>
            The production policy should explain how
            customers will be notified of material
            changes and include the effective date.
          </Text>
        </PolicySection>

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>
            Privacy questions
          </Text>

          <Text style={styles.contactText}>
            Add your official privacy contact email
            and business details here before
            deployment.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>
            TempStaff
          </Text>

          <Text style={styles.footerText}>
            Privacy Policy
          </Text>

          <Text style={styles.footerText}>
            Effective date: Add approved date
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function PolicySection({
  number,
  title,
  children,
}: {
  number: string
  title: string
  children: React.ReactNode
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.number}>
          <Text style={styles.numberText}>
            {number}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>
          {title}
        </Text>
      </View>

      {children}
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

  header: {
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 23,
  },

  icon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },

  iconText: {
    fontSize: 27,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },

  notice: {
    backgroundColor: '#FFF7E8',
    borderWidth: 1,
    borderColor: '#F4D99B',
    borderRadius: 17,
    padding: 15,
    marginBottom: 22,
  },

  noticeTitle: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 4,
  },

  noticeText: {
    color: '#78350F',
    fontSize: 11,
    lineHeight: 17,
  },

  section: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 11,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },

  number: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  numberText: {
    color: COLORS.teal,
    fontSize: 10,
    fontWeight: '900',
  },

  sectionTitle: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '900',
  },

  body: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6,
  },

  contactCard: {
    backgroundColor: COLORS.navy,
    borderRadius: 18,
    padding: 18,
    marginTop: 5,
  },

  contactTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },

  contactText: {
    color: '#D7E3EF',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  footer: {
    alignItems: 'center',
    marginTop: 22,
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