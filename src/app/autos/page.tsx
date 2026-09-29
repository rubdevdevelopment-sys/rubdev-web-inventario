'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Car, Search, Plus, ArrowLeft, 
  BookmarkCheck, Lock, LogOut, RefreshCw, Upload, Edit3, Camera 
} from 'lucide-react';

interface AutoCatalogo {
  id: string;
  modelo_nombre: string;
  origen_franquicia: string;
  categoria: string;
  anio_vehiculo_real: number | null;
  pais_origen: string | null;
  historia_resumen: string;
  datos_curiosos: string | null;
  imagen_referencia_url: string | null;
}

interface MiColeccion {
  id: string;
  catalogo_id: string;
  fabricante_diecast: string;
  escala: string;
  estado: string;
  precio_pagado_cop: number;
  estado_empaque: string;
  foto_mi_pieza_url?: string | null;
}

export default function CatalogoAutos() {
  const [catalogo, setCatalogo] = useState<AutoCatalogo[]>([]);
  const [misAutos, setMisAutos] = useState<MiColeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS');
  const [session, setSession] = useState<any>(null);

  // Modal para agregar/editar en la colección
  const [selectedAuto, setSelectedAuto] = useState<AutoCatalogo | null>(null);
  const [existingRecordId, setExistingRecordId] = useState<string | null>(null);
  const [fabricante, setFabricante] = useState('Hot Wheels Premium');
  const [escala, setEscala] = useState('1:64');
  const [estado, setEstado] = useState('BUSCANDO');
  const [precioCop, setPrecioCop] = useState('0');
  const [empaque, setEmpaque] = useState('EN_BLISTER');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Verificar sesión activa en Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Cargar datos del catálogo y colección
  const fetchData = async () => {
    setLoading(true);

    try {
      const { data: catData, error: catError } = await supabase
        .from('autos_catalogo_maestro')
        .select('*')
        .order('modelo_nombre');

      if (catError) console.error("Error Catálogo:", catError);

      const { data: miData, error: miError } = await supabase
        .from('autos_mi_coleccion')
        .select('*');

      if (miError) console.error("Error Mi Colección:", miError);

      if (catData) setCatalogo(catData);
      if (miData) setMisAutos(miData);
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Abrir modal solo si el usuario está autenticado
  const handleOpenModal = (auto: AutoCatalogo) => {
    if (!session) {
      alert('🔒 Acceso protegido: Debes iniciar sesión como Administrador para registrar o modificar piezas.');
      return;
    }

    setSelectedAuto(auto);
    const piezaExistente = misAutos.find((m) => m.catalogo_id === auto.id);

    if (piezaExistente) {
      setExistingRecordId(piezaExistente.id);
      setFabricante(piezaExistente.fabricante_diecast || 'Hot Wheels Premium');
      setEscala(piezaExistente.escala || '1:64');
      setEstado(piezaExistente.estado || 'ADQUIRIDO');
      setPrecioCop(piezaExistente.precio_pagado_cop ? piezaExistente.precio_pagado_cop.toString() : '0');
      setEmpaque(piezaExistente.estado_empaque || 'EN_BLISTER');
      setImagePreview(piezaExistente.foto_mi_pieza_url || null);
    } else {
      setExistingRecordId(null);
      setFabricante('Hot Wheels Premium');
      setEscala('1:64');
      setEstado('BUSCANDO');
      setPrecioCop('0');
      setEmpaque('EN_BLISTER');
      setImagePreview(null);
    }
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadFoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `fotos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('autos_galeria')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        console.error("Error al subir foto:", uploadError.message);
        return null;
      }

      const { data } = supabase.storage.from('autos_galeria').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error("Error inesperado en upload:", err);
      return null;
    }
  };

  const handleGuardarColeccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) {
      alert('Debes iniciar sesión como administrador para guardar cambios.');
      return;
    }
    if (!selectedAuto) return;
    setSaving(true);

    let fotoUrl: string | null = imagePreview;

    if (selectedFile) {
      const nuevaFotoUrl = await uploadFoto(selectedFile);
      if (nuevaFotoUrl) fotoUrl = nuevaFotoUrl;
    }

    const payload = {
      catalogo_id: selectedAuto.id,
      fabricante_diecast: fabricante,
      escala: escala,
      estado: estado,
      precio_pagado_cop: parseFloat(precioCop) || 0,
      estado_empaque: empaque,
      foto_mi_pieza_url: fotoUrl,
      fecha_adquisicion: new Date().toISOString().split('T')[0]
    };

    let error = null;

    if (existingRecordId) {
      const res = await supabase
        .from('autos_mi_coleccion')
        .update(payload)
        .eq('id', existingRecordId);
      error = res.error;
    } else {
      const res = await supabase
        .from('autos_mi_coleccion')
        .insert(payload);
      error = res.error;
    }

    if (error) {
      alert(`Error al guardar: ${error.message}`);
    } else {
      alert(`✅ ¡${selectedAuto.modelo_nombre} actualizado correctamente en tu vitrina!`);
      setSelectedAuto(null);
      setSelectedFile(null);
      setImagePreview(null);
      setExistingRecordId(null);
      fetchData();
    }
    setSaving(false);
  };

  const catalogoFiltrado = catalogo.filter((auto) => {
    const coincideBusqueda = 
      (auto.modelo_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
      (auto.origen_franquicia || '').toLowerCase().includes(busqueda.toLowerCase());
    const coincideCategoria = categoriaFiltro === 'TODOS' || auto.categoria === categoriaFiltro;
    return coincideBusqueda && coincideCategoria;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Topbar Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/inventarioescuela" className="text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Car className="w-6 h-6 text-red-500" />
            <h1 className="text-lg font-bold tracking-wider text-white">
              RubDev <span className="text-red-500">AutoCollection</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
            title="Recargar Catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/autos/mi-coleccion"
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <BookmarkCheck className="w-4 h-4 text-red-400" />
            Mi Vitrina ({misAutos.filter(a => a.estado === 'ADQUIRIDO').length})
          </Link>

          {!session ? (
            <Link
              href="/inventarioescuela/login?next=/autos"
              className="flex items-center gap-1.5 px-3 py-2 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl transition"
            >
              <Lock className="w-3.5 h-3.5" />
              Acceso Admin
            </Link>
          ) : (
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Salir ({session.user.email?.split('@')[0]})
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-8 flex-1">
        {/* Banner Presentación */}
        <div className="bg-gradient-to-r from-slate-900 via-red-950/20 to-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
              Catálogo Maestro Precargado
            </span>
            <h2 className="text-3xl font-extrabold text-white mt-1">
              Autos Icónicos del Mundo & Cine
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl mt-2">
              Explora la historia real, películas, series y cómics. Registra, sube o edita las fotografías reales de tus piezas en la vitrina.
            </p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center shrink-0 min-w-[200px]">
            <p className="text-xs text-slate-400 uppercase font-semibold">Modelos Disponibles</p>
            <p className="text-3xl font-black text-red-500 mt-1">{catalogo.length}</p>
          </div>
        </div>

        {/* Buscador & Filtros */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Buscar auto o película (ej. DeLorean, Batman)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'CINE_TV', label: '🎬 Cine & TV' },
              { id: 'ANIME_COMIC', label: '⚡ Ánime & Cómics' },
              { id: 'ICONO_HISTORICO', label: '📜 Históricos' },
              { id: 'SUPERDEPORTIVO', label: '🏎️ Superdeportivos' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setCategoriaFiltro(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  categoriaFiltro === f.id
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de Autos */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Cargando catálogo maestro...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catalogoFiltrado.map((auto) => {
              const miPieza = misAutos.find((m) => m.catalogo_id === auto.id);
              const estadoPieza = miPieza ? miPieza.estado : 'BUSCANDO';

              return (
                <div
                  key={auto.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition overflow-hidden"
                >
                  <div className="space-y-3">
                    {miPieza?.foto_mi_pieza_url ? (
                      <div className="relative h-48 w-full rounded-2xl overflow-hidden mb-3 border border-slate-800 group">
                        <img 
                          src={miPieza.foto_mi_pieza_url} 
                          alt={auto.modelo_nombre} 
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute top-2 right-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-lg text-[10px] text-emerald-400 border border-emerald-500/30">
                          Foto de Mi Pieza
                        </div>
                      </div>
                    ) : auto.imagen_referencia_url ? (
                      <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-3 border border-slate-800">
                        <img 
                          src={auto.imagen_referencia_url} 
                          alt={auto.modelo_nombre} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : null}

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                        {auto.origen_franquicia}
                      </span>
                      
                      <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                        estadoPieza === 'ADQUIRIDO' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        estadoPieza === 'APARTADO' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                        estadoPieza === 'INTERCAMBIO' || estadoPieza === 'VENTA' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        estadoPieza === 'EN_MANTENIMIENTO' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {estadoPieza === 'BUSCANDO' ? '🔍 Buscando' :
                         estadoPieza === 'DESEADO' ? '★ En Lista de Deseos' :
                         estadoPieza === 'APARTADO' ? '📌 Apartada' :
                         estadoPieza === 'ADQUIRIDO' ? '✓ Adquirida' :
                         estadoPieza === 'EN_MANTENIMIENTO' ? '🛠️ En Mantenimiento' :
                         estadoPieza === 'INTERCAMBIO' ? '🔄 Para Intercambio' : '🏷️ Para Venta'}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white">{auto.modelo_nombre}</h3>
                      <p className="text-xs text-slate-400">Año Real: {auto.anio_vehiculo_real || 'N/A'} · {auto.pais_origen}</p>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {auto.historia_resumen}
                    </p>

                    {auto.datos_curiosos && (
                      <div className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-xl text-[11px] text-slate-400">
                        <strong className="text-red-400 block mb-0.5">Dato Curioso:</strong>
                        {auto.datos_curiosos}
                      </div>
                    )}
                  </div>

                  {/* Botones protegidos por sesión */}
                  <div className="flex gap-2 mt-6">
                    {session ? (
                      <>
                        <button
                          onClick={() => handleOpenModal(auto)}
                          className={`flex-1 py-2.5 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5 ${
                            miPieza 
                              ? 'bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white border border-slate-700' 
                              : 'bg-red-600 hover:bg-red-500 text-white'
                          }`}
                        >
                          {miPieza ? (
                            <>
                              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                              Editar
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              Registrar
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleOpenModal(auto)}
                          className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                          title="Subir / Cambiar Fotografía de mi pieza"
                        >
                          <Camera className="w-4 h-4 text-blue-400" />
                          <span className="hidden sm:inline">Subir Foto</span>
                        </button>
                      </>
                    ) : (
                      <Link
                        href="/inventarioescuela/login?next=/autos"
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        Modo Consulta (Iniciar Sesión para Gestionar)
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Inteligente (Solo si hay sesión activa) */}
      {session && selectedAuto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">
              {existingRecordId ? 'Editar Registro:' : 'Registrar / Cargar Foto:'}{' '}
              <span className="text-red-500">{selectedAuto.modelo_nombre}</span>
            </h3>

            <form onSubmit={handleGuardarColeccion} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Fotografía Real de Tu Pieza
                </label>
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-4 text-center bg-slate-950/50 hover:border-red-500/50 transition relative">
                  {imagePreview ? (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Previsualización" 
                        className="h-36 w-full object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => { setSelectedFile(null); setImagePreview(null); }}
                        className="absolute top-2 right-2 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-1.5 text-xs shadow-lg"
                        title="Eliminar imagen"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center gap-1 py-2">
                      <Upload className="w-6 h-6 text-slate-500" />
                      <span className="text-xs text-slate-400 font-medium">Subir foto desde tu dispositivo</span>
                      <span className="text-[10px] text-slate-600">JPG, PNG o WebP (Máx. 5MB)</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Estado de la Pieza</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500 font-semibold"
                >
                  <option value="BUSCANDO">🔍 Buscando (Pendiente por conseguir)</option>
                  <option value="DESEADO">★ En Lista de Deseos (Wishlist)</option>
                  <option value="APARTADO">📌 Apartada / Reservada</option>
                  <option value="ADQUIRIDO">✓ Adquirida / En Vitrina</option>
                  <option value="EN_MANTENIMIENTO">🛠️ En Mantenimiento / Restauración</option>
                  <option value="INTERCAMBIO">🔄 Disponible para Intercambio</option>
                  <option value="VENTA">🏷️ Disponible para Venta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Fabricante Diecast</label>
                <select
                  value={fabricante}
                  onChange={(e) => setFabricante(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                >
                  <option value="Hot Wheels Premium">Hot Wheels Premium</option>
                  <option value="Greenlight Hollywood">Greenlight Hollywood</option>
                  <option value="Matchbox Collectors">Matchbox Collectors</option>
                  <option value="Jada Toys">Jada Toys</option>
                  <option value="Maisto">Maisto</option>
                  <option value="Bburago">Bburago</option>
                  <option value="Solido">Solido</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Escala</label>
                  <select
                    value={escala}
                    onChange={(e) => setEscala(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="1:64">1:64 (Económico)</option>
                    <option value="1:43">1:43 (Detalle)</option>
                    <option value="1:18">1:18 (Coleccionista)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Empaque</label>
                  <select
                    value={empaque}
                    onChange={(e) => setEmpaque(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="EN_BLISTER">En Blister / Empaque</option>
                    <option value="SUELTO">Suelto / Loose</option>
                    <option value="EN_CAJA_ACRILICA">En Caja Acrílica</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Precio Pagado o Estimado (COP $)</label>
                <input
                  type="number"
                  value={precioCop}
                  onChange={(e) => setPrecioCop(e.target.value)}
                  placeholder="Ej: 45000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setSelectedAuto(null); setSelectedFile(null); setImagePreview(null); }}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-500"
                >
                  {saving ? 'Guardando...' : existingRecordId ? 'Actualizar Datos' : 'Confirmar & Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}