export interface GpsReading {
  lat: number;
  lng: number;
  accuracy: number;
}

/** Lê a posição atual. Devolve null se o aluno negar, não houver GPS ou demorar demais. */
export function getPosition(timeoutMs = 8000): Promise<GpsReading | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}
