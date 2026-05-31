import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Linking,
  Alert,
} from 'react-native';

export default function EventDetailScreen({ route, navigation }) {
  const { item } = route.params;

  async function openOfficialPage() {
    if (!item.detailUrl) {
      Alert.alert(
        'Bağlantı bulunamadı',
        'Bu örnek etkinlik için resmî bağlantı bulunmuyor.'
      );
      return;
    }

    const supported = await Linking.canOpenURL(item.detailUrl);

    if (supported) {
      await Linking.openURL(item.detailUrl);
    } else {
      Alert.alert('Hata', 'Etkinlik bağlantısı açılamadı.');
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonIcon}>←</Text>
        </Pressable>
      </View>

      <View style={styles.badge}>
        <Text style={styles.badgeText}>{item.category}</Text>
      </View>

      <Text style={styles.title}>{item.title}</Text>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📅</Text>

          <View style={styles.infoTextArea}>
            <Text style={styles.infoLabel}>Tarih</Text>
            <Text style={styles.infoValue}>{item.date}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>🕒</Text>

          <View style={styles.infoTextArea}>
            <Text style={styles.infoLabel}>Saat</Text>
            <Text style={styles.infoValue}>{item.time}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📍</Text>

          <View style={styles.infoTextArea}>
            <Text style={styles.infoLabel}>Konum</Text>
            <Text style={styles.infoValue}>{item.location}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Etkinlik Hakkında</Text>

      <Text style={styles.description}>{item.description}</Text>

      <Pressable style={styles.linkButton} onPress={openOfficialPage}>
        <Text style={styles.linkButtonText}>Resmî Sayfayı Aç</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FC',
  },
  content: {
    padding: 20,
    paddingBottom: 36,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B1F2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  backButtonIcon: {
    fontSize: 20,
    color: '#182033',
    fontWeight: '800',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    marginBottom: 14,
  },
  badgeText: {
    color: '#5361FF',
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    fontSize: 27,
    fontWeight: '900',
    color: '#182033',
    lineHeight: 35,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#1B1F2A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  infoTextArea: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#8A92A3',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 15,
    color: '#182033',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#182033',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    lineHeight: 24,
    color: '#5F6B7A',
  },
  linkButton: {
    marginTop: 28,
    backgroundColor: '#5B6EF5',
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});