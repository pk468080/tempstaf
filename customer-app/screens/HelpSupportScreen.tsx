import {
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { NativeStackScreenProps } from '@react-navigation/native-stack'

import { COLORS } from '../constants/theme'
import { RootStackParamList } from '../types'
import Header from '../components/Header'

type Props = NativeStackScreenProps<
  RootStackParamList,
  'HelpSupport'
>

const FAQS = [
  {
    question: 'How do I make a booking?',
    answer:
      'Choose the service you need, select your preferred date and time, review the booking details, and continue through the booking flow.',
  },
  {
    question: 'Can I manage an existing booking?',
    answer:
      'Yes. Your upcoming and previous bookings can be accessed from the My Bookings section.',
  },
  {
    question: 'How do I change my saved address?',
    answer:
      'Open Saved Addresses from your profile to manage the service locations saved to your account.',
  },
  {
    question: 'What if I need help with a worker?',
    answer:
      'Contact TempStaff support using the support options below and include your booking details so the team can assist you faster.',
  },
]

export default function HelpSupportScreen({
  navigation,
}: Props) {
  const openEmail = async () => {
    await Linking.openURL(
      'mailto:support@tempstaff.com'
    )
  }

  const openPhone = async () => {
    await Linking.openURL(
      'tel:+910000000000'
    )
  }

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
          <Text style={styles.title}>
            Help & Support
          </Text>

          <Text style={styles.subtitle}>
            Need assistance? Find answers or
            contact the TempStaff support team.
          </Text>
        </View>

        <View style={styles.contactCard}>
          <View style={styles.contactIcon}>
            <Text style={styles.contactIconText}>
              ?
            </Text>
          </View>

          <View style={styles.contactContent}>
            <Text style={styles.contactTitle}>
              We're here to help
            </Text>

            <Text style={styles.contactText}>
              Contact support if you have a
              question about your account or
              booking.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Contact support
        </Text>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={openEmail}
          activeOpacity={0.8}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>
              @
            </Text>
          </View>

          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Email support
            </Text>

            <Text style={styles.actionSubtitle}>
              Send us your question
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={openPhone}
          activeOpacity={0.8}
        >
          <View style={styles.actionIcon}>
            <Text style={styles.actionIconText}>
              ☎
            </Text>
          </View>

          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>
              Call support
            </Text>

            <Text style={styles.actionSubtitle}>
              Speak with our support team
            </Text>
          </View>

          <Text style={styles.arrow}>
            ›
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>
          Frequently asked questions
        </Text>

        {FAQS.map((faq, index) => (
          <View
            key={index}
            style={styles.faqCard}
          >
            <View style={styles.questionRow}>
              <View style={styles.questionNumber}>
                <Text
                  style={
                    styles.questionNumberText
                  }
                >
                  {index + 1}
                </Text>
              </View>

              <Text style={styles.question}>
                {faq.question}
              </Text>
            </View>

            <Text style={styles.answer}>
              {faq.answer}
            </Text>
          </View>
        ))}

        <View style={styles.bookingHelp}>
          <Text style={styles.bookingHelpTitle}>
            Have a booking-related issue?
          </Text>

          <Text style={styles.bookingHelpText}>
            Keep your booking ID available when
            contacting support. It helps us locate
            your booking quickly.
          </Text>
        </View>

        <Text style={styles.footer}>
          TempStaff Support
        </Text>
      </ScrollView>
    </SafeAreaView>
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
    marginBottom: 22,
  },

  title: {
    color: COLORS.navy,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
  },

  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },

  contactCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.navy,
    borderRadius: 20,
    padding: 18,
    marginBottom: 26,
  },

  contactIcon: {
    width: 45,
    height: 45,
    borderRadius: 23,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  contactIconText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '900',
  },

  contactContent: {
    flex: 1,
  },

  contactTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '900',
  },

  contactText: {
    color: '#D7E3EF',
    fontSize: 11,
    lineHeight: 17,
    marginTop: 4,
  },

  sectionTitle: {
    color: COLORS.navy,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 11,
  },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 10,
  },

  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#E8F6F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  actionIconText: {
    color: COLORS.teal,
    fontSize: 17,
    fontWeight: '900',
  },

  actionContent: {
    flex: 1,
  },

  actionTitle: {
    color: COLORS.navy,
    fontSize: 14,
    fontWeight: '900',
  },

  actionSubtitle: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 3,
  },

  arrow: {
    color: COLORS.navy,
    fontSize: 28,
    fontWeight: '400',
    marginLeft: 8,
  },

  faqCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },

  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  questionNumber: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: COLORS.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  questionNumberText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
  },

  question: {
    flex: 1,
    color: COLORS.navy,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
  },

  answer: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 11,
    paddingLeft: 37,
  },

  bookingHelp: {
    backgroundColor: '#E8F6F6',
    borderRadius: 16,
    padding: 15,
    marginTop: 15,
  },

  bookingHelpTitle: {
    color: COLORS.navy,
    fontSize: 13,
    fontWeight: '900',
  },

  bookingHelpText: {
    color: COLORS.gray,
    fontSize: 11,
    lineHeight: 17,
    marginTop: 5,
  },

  footer: {
    color: COLORS.gray,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 22,
  },
})