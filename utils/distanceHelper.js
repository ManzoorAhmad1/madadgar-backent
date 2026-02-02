// Helper function to calculate distance between two coordinates (Haversine formula)
export function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const lat1 = coord1[1];
  const lon1 = coord1[0];
  const lat2 = coord2[1];
  const lon2 = coord2[0];
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance; // in km
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Check if provider is near client location (within 100 meters = 0.1 km)
export function isProviderNearClient(providerCoords, clientCoords) {
  const distance = calculateDistance(providerCoords, clientCoords);
  return distance <= 0.1; // 100 meters threshold
}
