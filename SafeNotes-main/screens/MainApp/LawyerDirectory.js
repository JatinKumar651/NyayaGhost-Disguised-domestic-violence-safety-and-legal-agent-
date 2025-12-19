import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Linking,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import BackButton from '../../components/UI/BackButton';

const { width, height } = Dimensions.get('window');
const PRIMARY_COLOR = '#9c711bff';

// Chitkara University coordinates
const DEFAULT_LOCATION = {
  latitude: 30.702049, 
  longitude: 76.717945,
};

const lawyersData = [
  {
    id: "1",
    name: "Rakesh Mehta Advocate",
    address: "1810, MLA Road, Rajpura Town",
    lat: 30.467972,
    lon: 76.584306,
    phone: "09814810700",
    hours: "Closes 10 pm"
  },
  {
    id: "2",
    name: "Legal Consultants Advocate Jiten Sharma",
    address: "Cabin No. 25, Lawyer Complex Block C, District Courts, Rajpura",
    lat: 30.648694,
    lon: 76.391639,
    phone: "09988916061",
    hours: "Closes 5 pm"
  },
  {
    id: "3",
    name: "Adv Narender Pal Bhardwaj",
    address: "Unit No. 7, 6th Floor, Sushma Infinium, Ambala - Chandigarh Expy, Zirakpur, Gazipur, Punjab 140603",
    lat: 30.638194,
    lon: 76.825223,
    phone: "09914617739",
    hours: "Opens 10 am",
    notes: "LGBTQ+ friendly"
  },
  {
    id: "4",
    name: "Best Advocate Patiala",
    address: "Chamber No. 347, District Court, Yadvindra Complex, Patiala",
    lat: 30.338250,
    lon: 76.398527,
    phone: "09814343277",
    hours: "Open 24 hours"
  },
  {
    id: "5",
    name: "Advocate Kanwarjit Singh Pruthi",
    address: "House No. 9, Opposite Gurdwara Dukhniwaran Sahib, Patiala",
    lat: 30.346277,
    lon: 76.394500,
    phone: "09023590001",
    hours: "Open 24 hours"
  },
  {
    id: "6",
    name: "Advocate Amandeep Khaira",
    address: "Court Complex, Mall Road, Patiala",
    lat: 30.337444,
    lon: 76.398277,
    phone: "09206804000",
    hours: "Open 24 hours"
  },
  {
    id: "7",
    name: "Karnesh Verma Advocate",
    address: "Mohindra Complex, 24A, Street 2C, Patiala",
    lat: 30.313861,
    lon: 76.375973,
    phone: "09779655512",
    hours: "Closes 5 pm"
  },
];

export default function LawyerDirectory() {
  const [search, setSearch] = useState('');
  const [filteredLawyers, setFilteredLawyers] = useState(lawyersData);
  const mapRef = useRef(null);

  // Search filter
  useEffect(() => {
    if (search.trim() === '') {
      setFilteredLawyers(lawyersData);
    } else {
      const filtered = lawyersData.filter((lawyer) =>
        lawyer.name.toLowerCase().includes(search.toLowerCase()) ||
        lawyer.address.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredLawyers(filtered);
    }
  }, [search]);

  // Fit map to all markers
  useEffect(() => {
    if (mapRef.current && filteredLawyers.length > 0) {
      const coordinates = filteredLawyers.map(l => ({
        latitude: l.lat,
        longitude: l.lon,
      }));
      mapRef.current.fitToCoordinates(coordinates, {
        edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
        animated: true,
      });
    }
  }, [filteredLawyers]);

  const handleCall = (phone) => {
    if (!phone) return alert('Phone number not available');
    Linking.openURL(`tel:${phone}`);
  };

  const handleLawyerPress = (lawyer) => {
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: lawyer.lat,
        longitude: lawyer.lon,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  };

  const renderLawyerItem = ({ item }) => (
    <Pressable onPress={() => handleLawyerPress(item)}>
      <View style={styles.lawyerCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.lawyerName}>{item.name}</Text>
          <Text style={styles.lawyerAddress}>{item.address}</Text>
          {item.hours && <Text style={styles.lawyerHours}>Hours: {item.hours}</Text>}
        </View>
        <View style={styles.contactButtons}>
          <Pressable
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressedButton, !item.phone && styles.disabledButton]}
            onPress={() => handleCall(item.phone)}
            disabled={!item.phone}
          >
            <FontAwesome name="phone" size={22} color={item.phone ? PRIMARY_COLOR : '#aaa'} />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
          <View
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: height * 0.09, // 7% of screen height
      backgroundColor: PRIMARY_COLOR,
      zIndex: -1, // place behind other components
    }}
  />
      <KeyboardAvoidingView
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        
        {/* Top bar with BackButton */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: -50 }}>
            <Text style={{ fontSize: 40, fontWeight: '700', marginLeft: 20, marginTop: 130}}>Lawyer Directory</Text>
          <BackButton />
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
            
          <MaterialCommunityIcons name="magnify" size={24} color="#777" />
          <TextInput
            placeholder="Search lawyers or clinics"
            placeholderTextColor="#777"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={22} color="#777" />
            </Pressable>
          )}
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: DEFAULT_LOCATION.latitude,
              longitude: DEFAULT_LOCATION.longitude,
              latitudeDelta: 0.2,
              longitudeDelta: 0.2,
            }}
            showsUserLocation={false} // optional, since location is fixed
            loadingEnabled={true}
          >
            {filteredLawyers.map(lawyer => (
              <Marker
                key={lawyer.id}
                coordinate={{ latitude: lawyer.lat, longitude: lawyer.lon }}
                pinColor={PRIMARY_COLOR}
              >
                <Callout>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle}>{lawyer.name}</Text>
                    <Text style={styles.calloutText}>{lawyer.address}</Text>
                    {lawyer.phone ? (
                      <Text style={styles.calloutText}>Phone: {lawyer.phone}</Text>
                    ) : (
                      <Text style={[styles.calloutText, { fontStyle: 'italic', color: '#999' }]}>Phone: Not available</Text>
                    )}
                    {lawyer.hours && <Text style={styles.calloutText}>Hours: {lawyer.hours}</Text>}
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
        </View>

        {/* List */}
        <FlatList
          style={styles.list}
          data={filteredLawyers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderLawyerItem}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No results found.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 50 }}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: PRIMARY_COLOR,
    borderWidth: 1.5,
    borderRadius: 25,
    paddingHorizontal: 15,
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    marginTop:20,
  },
  searchInput: { flex: 1, height: 44, fontSize: 16, paddingHorizontal: 10, color: '#444' },
  mapContainer: { width: width, height: height * 0.3, borderBottomColor: '#ddd', borderBottomWidth: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  list: { flex: 1, paddingHorizontal: 14, marginTop: 6 },
  lawyerCard: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 18,
    marginVertical: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 4,
    shadowColor: PRIMARY_COLOR,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  lawyerName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  lawyerAddress: { fontSize: 14, color: '#000000ff' },
  lawyerHours: { fontSize: 13, color: '#000000ff', marginTop: 4, fontStyle: 'italic' },
  contactButtons: { flexDirection: 'row', marginLeft: 10 },
  iconButton: { backgroundColor: '#eee', borderRadius: 20, padding: 8, marginLeft: 12, justifyContent: 'center', alignItems: 'center' },
  pressedButton: { backgroundColor: PRIMARY_COLOR + 'bb' },
  disabledButton: { backgroundColor: '#ddd' },
  callout: { maxWidth: 220 },
  calloutTitle: { fontWeight: '700', color: PRIMARY_COLOR, fontSize: 16, marginBottom: 4 },
  calloutText: { fontSize: 14, color: '#444' },
  emptyContainer: { marginTop: 40, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16, fontStyle: 'italic' },
});

