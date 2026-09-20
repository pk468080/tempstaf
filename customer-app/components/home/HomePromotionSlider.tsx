import { StyleSheet, Text, View } from 'react-native'

export default function HomePromotionSlider() {
	return (
		<View style={styles.container}>
			<Text style={styles.title}>Trusted help, when you need it</Text>
			<Text style={styles.subtitle}>Book verified professionals for your home.</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		marginHorizontal: 20,
		marginVertical: 12,
		padding: 18,
		borderRadius: 16,
		backgroundColor: '#E0F2FE',
	},
	title: { fontSize: 18, fontWeight: '700', color: '#0C4A6E' },
	subtitle: { marginTop: 6, color: '#075985' },
})
