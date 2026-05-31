import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { getEvents } from '../services/eventsService';

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function loadEvents() {
      const result = await getEvents();

      setEvents(result.events);
      setErrorMessage(result.errorMessage);
      setLoading(false);
    }

    loadEvents();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#5361FF" />

        <Text style={styles.loadingText}>Etkinlikler yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.homeButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.homeButtonIcon}>⌂</Text>
      </Pressable>

      <View style={styles.headerTextArea}>
        <Text style={styles.header}>Etkinlikler</Text>

        <Text style={styles.subHeader}>
          Bandırma’daki güncel kültür ve sanat etkinlikleri
        </Text>
      </View>

      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Bağlantı kurulamadı</Text>

          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {!errorMessage && events.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Şu anda gösterilecek etkinlik bulunmuyor.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('EventDetail', { item })}
          >
            <Text style={styles.category}>{item.category}</Text>

            <Text style={styles.title}>{item.title}</Text>

            <Text style={styles.info}>📅 {item.date}</Text>

            <Text style={styles.info}>🕒 {item.time}</Text>

            <Text style={styles.info}>📍 {item.location}</Text>

            <Text style={styles.detail}>Detayları görüntüle →</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: '#F5F7FC',
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F7FC',
  },

  loadingText: {
    marginTop: 12,
    color: '#475569',
    fontWeight: '600',
  },

  homeButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },

  homeButtonIcon: {
    fontSize: 24,
    color: '#182033',
    fontWeight: '900',
  },

  headerTextArea: {
    alignItems: 'center',
    marginBottom: 16,
  },

  header: {
    fontSize: 28,
    fontWeight: '900',
    color: '#182033',
    textAlign: 'center',
  },

  subHeader: {
    marginTop: 5,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
  },

  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },

  errorTitle: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 5,
  },

  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    lineHeight: 19,
  },

  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },

  emptyText: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },

  listContent: {
    paddingBottom: 24,
  },

  card: {
    backgroundColor: '#FFFFFF',
    padding: 18,
    borderRadius: 18,
    marginBottom: 14,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },

  category: {
    color: '#5361FF',
    fontWeight: '700',
    marginBottom: 8,
  },

  title: {
    fontSize: 18,
    fontWeight: '900',
    color: '#182033',
    marginBottom: 10,
  },

  info: {
    color: '#64748B',
    marginBottom: 6,
  },

  detail: {
    color: '#5361FF',
    fontWeight: '800',
    marginTop: 10,
  },
});