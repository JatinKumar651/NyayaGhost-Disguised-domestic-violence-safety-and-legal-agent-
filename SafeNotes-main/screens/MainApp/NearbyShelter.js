// ONLY CHANGED UI & STYLES - ALL LOGIC REMAINS SAME

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Linking,
  Alert,
  Dimensions,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { theme } from "../../constants/colors";
import BackButton from '../../components/UI/BackButton';


const shelterData = [
  {
    id: "1",
    name: "SOS Children's Village Rajpura",
    address: "ICL Rd, Rajpura, Punjab",
    lat: 30.484,
    lon: 76.573,
    phone: "01143239200",
    hours: "Open 24 hours",
  },
  {
    id: "2",
    name: "Lok Bhalai Charitable Trust Rajpura",
    address: "H.No. 9 Block-E, Distt, near NTC School, Rajpura",
    lat: 30.4855,
    lon: 76.57,
    phone: null,
    hours: null,
  },
  {
    id: "3",
    name: "AASHRAY NGO",
    address: "256, Ground floor, Rajpura",
    lat: 30.4805,
    lon: 76.574,
    phone: "09815151895",
    hours: "Closed ⋅ Opens 9 am Mon",
  },
  {
    id: "4",
    name: "Umang Welfare Foundation",
    address: "55, Street Number 9, Rajpura",
    lat: 30.4835,
    lon: 76.571,
    phone: "09814826256",
    hours: "Open 24 hours",
  },
  {
    id: "5",
    name: "Gur Aasra Trust",
    address: "Gur Aasra Trust, Rajpura",
    lat: 30.487,
    lon: 76.569,
    phone: "09814016598",
    hours: "Open ⋅ Closes 9 pm",
  },
  {
    id: "7",
    name: "H A Welfare Foundation (hawf)",
    address: "Rajpura",
    lat: 30.482,
    lon: 76.572,
    phone: null,
    hours: "Open ⋅ Closes 5 pm",
  },
  {
    id: "8",
    name: "Prabh Aasra",
    address: "Village Padiala, Rajpura",
    lat: 30.47,
    lon: 76.58,
    phone: "08288034555",
    hours: "Open ⋅ Closes 7:30 pm",
  },
  {
    id: "9",
    name: "There For U Foundation",
    address: "B-83, The Mall Rd, Rajpura",
    lat: 30.483,
    lon: 76.574,
    phone: null,
    hours: "Open ⋅ Closes 8 pm",
  },
  {
    id: "10",
    name: "Shelter For Urban Homeless",
    address: "Dara Studio Chowk, Rajpura",
    lat: 30.48,
    lon: 76.5705,
    phone: "09878444924",
    hours: null,
  },

  {
    id: "12",
    name: "Serve humanity Serve God Charitable Trust",
    address: "Kheri Chowk - Kharar Rd",
    lat: 30.726,
    lon: 76.685,
    phone: "09814119214",
    hours: "Open 24 hours",
  },
  {
    id: "13",
    name: "Jyoti Sarup Kanya Asra Society",
    address: "PJVJ+F2F Ajit Enclave, Randhawa Road",
    lat: 30.72,
    lon: 76.68,
    phone: "09815610209",
    hours: "Open 24 hours",
  },
  {
    id: "16",
    name: "Gur Aasra Trust (Ropar)",
    address: "Ropar, Punjab",
    lat: 30.968,
    lon: 76.54,
    phone: "09815595500",
    hours: "Open ⋅ Closes 8 pm",
  },
  {
    id: "18",
    name: "Ni Aasre Da Aasra - Shelter home",
    address: "Ni Aasre, Da Aasra Society, near Mustafabad",
    lat: 30.48,
    lon: 76.59,
    phone: "09857366381",
    hours: "Open 24 hours",
  },
];

export default function NearbyShelter({ navigation }) {
  const screenHeight = Dimensions.get("window").height;

  // --- STATE & HOOKS (NO CHANGES TO LOGIC) ---
  const [userLocation, setUserLocation] = useState(null);
  const [region, setRegion] = useState(null);
  const [results, setResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [nearbyToggle, setNearbyToggle] = useState(false);
  const [searchClicked, setSearchClicked] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const mapRef = useRef(null);
  const locationWatcher = useRef(null);

  // --- LOCATION LOGIC (UNCHANGED) ---
  async function getAddressFromCoords(latitude, longitude) {
    try {
      const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (geocode.length > 0) {
        const place = geocode[0];
        return [
          place.name,
          place.street,
          place.district,
          place.city,
          place.region,
          place.postalCode,
          place.country,
        ]
          .filter(Boolean)
          .join(", ");
      }
    } catch (e) {
      console.warn("Reverse geocode error:", e);
    }
    return "Address not available";
  }

  useEffect(() => {
    (async () => {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission needed", "Allow location to use this feature.");
        setLoadingLocation(false);
        return;
      }

      if (!locationWatcher.current) {
        locationWatcher.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Highest, distanceInterval: 10 },
          async (loc) => {
            const { latitude, longitude } = loc.coords;
            const address = await getAddressFromCoords(latitude, longitude);
            setUserLocation({ latitude, longitude });
            setRegion({
              latitude,
              longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });

            if (!nearbyToggle || (nearbyToggle && !searchClicked)) {
              setResults([
                {
                  id: "live_location",
                  name: "Your Current Location",
                  address,
                  lat: latitude,
                  lon: longitude,
                  phone: null,
                },
              ]);
            }
            setLoadingLocation(false);
          }
        );
      }
    })();

    return () => {
      if (locationWatcher.current) {
        locationWatcher.current.remove();
        locationWatcher.current = null;
      }
    };
  }, [nearbyToggle, searchClicked]);

  // --- SEARCH & OTHER FUNCTIONS (UNCHANGED) ---
  function onSearch() {
    if (!nearbyToggle) {
      Alert.alert(
        "Toggle is OFF",
        "Please turn ON the Nearby Shelter toggle to search."
      );
      return;
    }

    if (!userLocation) {
      Alert.alert("Location not available", "Please enable location or try again.");
      return;
    }

    setLoadingResults(true);

    function haversineDistance(lat1, lon1, lat2, lon2) {
      const toRad = (v) => (v * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }

    const withDistance = shelterData
      .map((shelter) => {
        const dist = haversineDistance(
          userLocation.latitude,
          userLocation.longitude,
          shelter.lat,
          shelter.lon
        );
        return { ...shelter, distanceKm: dist };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);

    setResults(withDistance);
    setLoadingResults(false);

    setRegion({
      latitude: userLocation.latitude,
      longitude: userLocation.longitude,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    });

    setSearchClicked(true);
  }

  function openCall(phone) {
    if (!phone) {
      Alert.alert("No phone number", "No phone number listed.");
      return;
    }
    const phoneNumber = phone.replace(/\s+/g, "");
    Linking.openURL(`tel:${phoneNumber}`);
  }

  function openDetails(item) {
    setSelectedResult(item);
    setDetailsModalVisible(true);
  }

  function renderResultItem({ item }) {
    return (
      <TouchableOpacity
        style={styles.resultCard}
        onPress={() => {
          setRegion((r) => ({
            ...r,
            latitude: item.lat,
            longitude: item.lon,
          }));
          openDetails(item);
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.resultName}>{item.name}</Text>
          <Text style={styles.resultAddr}>
            {item.address || "Address not listed"}
          </Text>
          <Text style={styles.resultCoords}>
            Lat: {item.lat.toFixed(5)}, Lon: {item.lon.toFixed(5)}
          </Text>
          <View style={styles.resultMeta}>
            <Text style={styles.resultMetaText}>
              {item.distanceKm != null ? `${item.distanceKm.toFixed(2)} km` : ""}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.callBtn}
          onPress={() => openCall(item.phone)}
        >
          <Text style={styles.callBtnText}>📞</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      
      {/* Absolute positioned back button */}
      <BackButton 
        style={styles.backButton}
        onPress={() => navigation.goBack()} 
      />

      <Text style={styles.pageTitle}>Nearby Shelters</Text>

      {/* Nearby toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Shelters</Text>
        <TouchableOpacity
          style={[styles.toggleButton, nearbyToggle ? styles.toggleOn : styles.toggleOff]}
          onPress={() => {
            setNearbyToggle(!nearbyToggle);
            setSearchClicked(false);
            if (nearbyToggle) {
              setResults([
                {
                  id: "live_location",
                  name: "Your Current Location",
                  address: results[0]?.address || "",
                  lat: userLocation?.latitude || 0,
                  lon: userLocation?.longitude || 0,
                  phone: null,
                },
              ]);
            }
          }}
        >
          <Text style={styles.toggleText}>{nearbyToggle ? "ON" : "OFF"}</Text>
        </TouchableOpacity>
      </View>

      {/* Search Button */}
      <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
        <Text style={styles.searchBtnText}>Search</Text>
      </TouchableOpacity>

      {/* Map container */}
      <View style={styles.mapContainer}>
        {region ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            region={region}
          >
            {userLocation && (
              <Marker
                coordinate={userLocation}
                title="You"
                pinColor='#9c711bff'
              />
            )}

            {nearbyToggle && searchClicked &&
              results.map(
                (r) =>
                  r.lat &&
                  r.lon && (
                    <Marker
                      key={r.id}
                      coordinate={{ latitude: r.lat, longitude: r.lon }}
                      title={r.name}
                      description={r.address}
                      onPress={() => openDetails(r)}
                       pinColor='#9c711bff'// Green for shelters
                    />
                  )
              )}
          </MapView>
        ) : (
          <View style={styles.mapPlaceholder}>
            <Text>Fetching map region...</Text>
          </View>
        )}
      </View>

      {/* Results */}
      <View style={styles.resultsList}>
        <FlatList
          data={results}
          keyExtractor={(i) => i.id}
          renderItem={renderResultItem}
        />
      </View>

      {/* Modal */}
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {selectedResult && (
              <>
                <Text style={styles.modalTitle}>{selectedResult.name}</Text>
                <Text style={styles.modalAddr}>{selectedResult.address}</Text>
                <TouchableOpacity
                  style={styles.modalActionBtn}
                  onPress={() => openCall(selectedResult.phone)}
                >
                  <Text style={styles.modalActionText}>Call Shelter</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setDetailsModalVisible(false)}
                >
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// 🎨 Premium Light Theme Styles
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  backButton: {
    position: "absolute",
    top: Platform.OS === "android" ? 20 : 60,
    left: 15,
    zIndex: 999,
  },
  pageTitle: {
    fontSize: 45,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    paddingVertical: 15,
    paddingTop: 70,

  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 10,
  },
  toggleLabel: {
    fontSize: 18,
    color: "#333",
    fontWeight: "600",
  },
  toggleButton: {
    width: 70,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  toggleOn: {
    backgroundColor: "#4CAF50",
  },
  toggleOff: {
    backgroundColor: "#ccc",
  },
  toggleText: {
    color: "#fff",
    fontWeight: "bold",
  },
  searchBtn: {
    backgroundColor: "#0e4784ff",
    marginHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 15,
  },
  searchBtnText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  mapContainer: {
    height: 250,
    marginHorizontal: 20,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#E9ECEF",
    marginBottom: 15,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultCard: {
    backgroundColor: '#9c711bff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  resultName: {
    fontWeight: "600",
    fontSize: 16,
    color: "#ffffffff",
  },
  resultAddr: {
    fontSize: 12,
    color: "#ffffffff",
  },
  resultCoords: {
    fontSize: 10,
    color: "#ffffffff",
  },
  resultMeta: {
    marginTop: 5,
  },
  resultMetaText: {
    fontSize: 10,
    color: "#ffffffff",
  },
  callBtn: {
    backgroundColor: "#ffffffff",
    padding: 10,
    borderRadius: 50,
    marginLeft: 10,
  },
  callBtnText: {
    color: "#fff",
    fontSize: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    width: "85%",
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: 20,
    color: "#333",
    marginBottom: 10,
  },
  modalAddr: {
    fontSize: 14,
    color: "#555",
    marginBottom: 15,
  },
  modalActionBtn: {
    backgroundColor: "#28A745",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  modalActionText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  modalCloseText: {
    color: "#007BFF",
    fontWeight: "bold",
    textAlign: "center",
  },
});
