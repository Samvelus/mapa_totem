// data.js
// Handles fetching and caching the GeoJSON map data (salas, pontos, floor)

export const geoData = {
    salas: null,
    pontos: null,
    floor: null
};

export async function loadGeoJSON() {
    try {
        const [salasResponse, pontosResponse, floorResponse] = await Promise.all([
            fetch("../assets/data/salas.geojson"),
            fetch("../assets/data/pontos.geojson"),
            fetch("../assets/data/floor.geojson")
        ]);

        if (!salasResponse.ok) throw new Error('Erro ao carregar salas.geojson');
        if (!pontosResponse.ok) throw new Error('Erro ao carregar pontos.geojson');
        if (!floorResponse.ok) throw new Error('Erro ao carregar floor.geojson');

        geoData.salas = await salasResponse.json();
        geoData.pontos = await pontosResponse.json();
        geoData.floor = await floorResponse.json();

        return true;
    } catch (error) {
        console.error("Erro no loadGeoJSON:", error);
        return false;
    }
}
