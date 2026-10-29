

import pandas as pd
from supabase import create_client, Client

# Configuración de conexión a Supabase
NEXT_PUBLIC_SUPABASE_URL = "https://ykpffodouzipefqyvjqd.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3PgfhSvSXqaEjqB65TfWTw_AQhZXhBA"

supabase: Client = create_client(
    NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)

# 1. Cargar archivo Excel
df = pd.read_excel('inventario general EJ.xlsx')
df.columns = df.columns.str.strip().str.lower()

# 2. Cargar Mapa de Categorías
res_cat = supabase.table('categorias').select('id, nombre').execute()
cat_map = {c['nombre']: c['id'] for c in res_cat.data}
default_cat_id = list(cat_map.values())[0] if cat_map else None

# 3. Cache / Diccionario de Funcionarios en Supabase
res_func = supabase.table('funcionarios').select(
    'id, nombre_completo').execute()
func_map = {f['nombre_completo'].strip().upper(): f['id']
            for f in res_func.data}


def obtener_o_crear_funcionario(nombre_raw, source_name_raw):
    # Intentar obtener el nombre directamente de la columna 'nombre'
    if pd.notna(nombre_raw) and str(nombre_raw).strip():
        nombre = str(nombre_raw).strip().upper()
    elif pd.notna(source_name_raw) and str(source_name_raw).strip():
        # Resguardo usando 'source.name' limpiando extensiones
        nombre = re.sub(r'\.xlsx?$', '', str(source_name_raw),
                        flags=re.IGNORECASE).strip().upper()
    else:
        nombre = "RUBEN DARIO MONROY LEON"

    if nombre in func_map:
        return func_map[nombre]

    # Crear funcionario si no existe en la base de datos
    cedula_temp = f"TEMP-{len(func_map) + 1000}"
    res = supabase.table('funcionarios').insert({
        'cedula': cedula_temp,
        'nombre_completo': nombre,
        'dependencia': 'CONSEJO SUPERIOR DE LA JUDICATURA'
    }).execute()

    if res.data:
        new_id = res.data[0]['id']
        func_map[nombre] = new_id
        return new_id

    return list(func_map.values())[0]


# 4. Procesar activos
activos_a_insertar = []

for idx, row in df.iterrows():
    placa_raw = row.get('placa')
    if pd.isna(placa_raw):
        continue
    placa = str(placa_raw).strip()
    if not placa or placa.lower() == 'nan':
        continue

    # Extraer responsable desde la columna 'nombre' (o 'source.name' como respaldo)
    nombre_col = row.get('nombre')
    source_name = row.get('source.name') or row.get('source_name')
    func_id = obtener_o_crear_funcionario(nombre_col, source_name)

    desc = str(row.get('descripcion') or row.get(
        'descripcion_1') or 'SIN DESCRIPCION').strip().upper()

    # Categorización automática
    cat_id = default_cat_id
    if any(w in desc for w in ['SWITCH', 'ACCESS', 'ROUTER', 'RACK', 'RED']):
        cat_id = cat_map.get('Redes y Telecomunicaciones', default_cat_id)
    elif any(w in desc for w in ['PROYECTOR', 'TV', 'TELEVISOR', 'TELON', 'CAMARA', 'PARLANTE', 'PANTALLA', 'MICROFONO']):
        cat_id = cat_map.get('Audiovisuales y Multimedios', default_cat_id)
    elif any(w in desc for w in ['UPS', 'REGULADOR']):
        cat_id = cat_map.get('Infraestructura Eléctrica', default_cat_id)
    elif any(w in desc for w in ['SILLA', 'MESA', 'ESCRITORIO', 'ARCHIVADOR', 'ESTANTE', 'POLTRONA', 'CASILLERO']):
        cat_id = cat_map.get('Mobiliario y Enseres', default_cat_id)
    elif any(w in desc for w in ['AIRE', 'DESFIBRILADOR', 'ESCALERA']):
        cat_id = cat_map.get('Equipos Especiales', default_cat_id)
    elif any(w in desc for w in ['COMPUTADOR', 'PORTATIL', 'TECLADO', 'MOUSE', 'MONITOR', 'CPU']):
        cat_id = cat_map.get('Equipos de Cómputo y TI', default_cat_id)

    valor_raw = row.get('valor_articulo') or row.get('valor') or 0
    try:
        valor = float(valor_raw) if pd.notnull(valor_raw) else 0.0
    except:
        valor = 0.0

    activo = {
        "codigo_contable": str(row.get('codigo') or row.get('codigo_articulo') or '').strip(),
        "descripcion": desc,
        "placa": placa,
        "serie": str(row.get('serie', '')).strip() if pd.notnull(row.get('serie')) and str(row.get('serie')).lower() != 'nan' else None,
        "marca": str(row.get('marca', '')).strip() if pd.notnull(row.get('marca')) and str(row.get('marca')).lower() != 'nan' else None,
        "modelo": str(row.get('modelo', '')).strip() if pd.notnull(row.get('modelo')) and str(row.get('modelo')).lower() != 'nan' else None,
        "categoria_id": cat_id,
        "valor": valor,
        "num_documento": str(row.get('numero_documento') or row.get('codigo_externo') or '').strip(),
        "tipo_documento": str(row.get('tipo_movimiento') or 'TC').strip(),
        "funcionario_id": func_id,
        "ubicacion_actual": str(row.get('ubicacion') or 'Escuela Judicial Rodrigo Lara Bonilla').strip(),
        "estado_activo": "EN_SERVICIO"
    }
    activos_a_insertar.append(activo)

# 5. Carga por lotes a Supabase
batch_size = 200
for i in range(0, len(activos_a_insertar), batch_size):
    batch = activos_a_insertar[i:i + batch_size]
    supabase.table('activos').upsert(batch, on_conflict='placa').execute()

print(
    f"✅ ¡Importación finalizada! Se asociaron {len(func_map)} funcionarios y se guardaron {len(activos_a_insertar)} activos.")
