import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { COLORS } from '../constants/theme'
import { Worker } from '../types'
import { iconFor } from '../data/catalog'

export default function WorkerCard({ worker, onSelect }: { worker: Worker; onSelect: () => void }) {
  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onSelect}>
      <View style={styles.top}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{worker.name[0]}</Text></View>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{worker.name}</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>✓ Verified</Text></View>
          </View>
          <Text style={styles.service}>{iconFor(worker.service)} {worker.service}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>★ {worker.rating}</Text>
            <Text style={styles.meta}>{worker.jobs} jobs</Text>
            <Text style={styles.meta}>{worker.distance}</Text>
          </View>
        </View>
      </View>
      <View style={styles.divider} />
      <View style={styles.bottom}>
        <View>
          <Text style={styles.available}>● Available now</Text>
          <Text style={styles.small}>Ready for your booking</Text>
        </View>
        <View style={styles.select}><Text style={styles.selectText}>Select ›</Text></View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: COLORS.navy,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: COLORS.white, fontSize: 24, fontWeight: '800' },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  name: { color: COLORS.navy, fontSize: 17, fontWeight: '800' },
  badge: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7,
  },
  badgeText: { color: COLORS.green, fontSize: 10, fontWeight: '800' },
  service: { color: COLORS.teal, fontSize: 13, fontWeight: '700', marginTop: 6 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 7, flexWrap: 'wrap' },
  rating: { color: '#D97706', fontSize: 13, fontWeight: '800', marginRight: 12 },
  meta: { color: COLORS.gray, fontSize: 12, marginRight: 12 },
  divider: { height: 1, backgroundColor: '#EEF2F6', marginVertical: 14 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  available: { color: COLORS.green, fontSize: 13, fontWeight: '800' },
  small: { color: COLORS.gray, fontSize: 11, marginTop: 3 },
  select: {
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
})
