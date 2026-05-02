import json
import math
import os

dir_path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'data')

with open(os.path.join(dir_path, 'floor.geojson'), 'r', encoding='utf-8') as f:
    floor = json.load(f)

min_lng = float('inf')
max_lng = float('-inf')
min_lat = float('inf')
max_lat = float('-inf')

for feat in floor['features']:
    if feat['geometry']['type'] == 'Polygon':
        for pt in feat['geometry']['coordinates'][0]:
            min_lng = min(min_lng, pt[0])
            max_lng = max(max_lng, pt[0])
            min_lat = min(min_lat, pt[1])
            max_lat = max(max_lat, pt[1])

def calc_dist(lat1, lon1, lat2, lon2):
    R = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1)*math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

width = calc_dist(min_lat, min_lng, min_lat, max_lng)
height = calc_dist(min_lat, min_lng, max_lat, min_lng)

print(f"Bounds: Lng: {min_lng} to {max_lng}, Lat: {min_lat} to {max_lat}")
print(f"Width: {width:.2f} meters, Height: {height:.2f} meters")
