'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Car, Search, Plus, ArrowLeft, 
  BookmarkCheck, Lock, LogOut, RefreshCw, Upload, Edit3, Camera, Layers 
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
  foto_auto_real_url?: string | null;
  foto_mi_pieza_url?: string | null;
  observaciones?: string | null;
}

export default function CatalogoAutos() {
  const [catalogo, setCatalogo] = useState<AutoCatalogo[]>([]);
  const [misAutos, setMisAutos] = useState<MiColeccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('TODOS');
  const [session, setSession] = useState<any>(null);

  // Modal para agregar/editar variante en la colección
  const [selectedAuto, setSelectedAuto] = useState<AutoCatalogo | null>(null);
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [fabricante, setFabricante] = useState('Hot Wheels Premium');
  const [escala, setEscala] = useState('1:64');
  const [estado, setEstado] = useState('ADQUIRIDO');
  const [precioCop, setPrecioCop] = useState('0');
  const [empaque, setEmpaque] = useState('EN_BLISTER');
  const [observaciones, setObservaciones] = useState('');

  // Doble imagen (Real vs Mi Pieza)
  const [fileReal, setFileReal] = useState<File | null>(null);
  const [previewReal, setPreviewReal] = useState<string | null>(null);

  const [filePieza, setFilePieza] = useState<File | null>(null);
  const [previewPieza, setPreviewPieza] = useState<string | null>(null);

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

  // Abrir modal para NUEVA variante o EDICIÓN de una variante específica
  const handleOpenModal = (auto: AutoCatalogo, varianteExistente?: MiColeccion) => {
    if (!session) {
      alert('🔒 Acceso protegido: Debes iniciar sesión como Administrador para registrar o modificar piezas.');
      return;
    }

    setSelectedAuto(auto);

    if (varianteExistente) {
      setEditingRecordId(varianteExistente.id);
      setFabricante(varianteExistente.fabricante_diecast || 'Hot Wheels Premium');
      setEscala(varianteExistente.escala || '1:64');
      setEstado(varianteExistente.estado || 'ADQUIRIDO');
      setPrecioCop(varianteExistente.precio_pagado_cop ? varianteExistente.precio_pagado_cop.toString() : '0');
      setEmpaque(varianteExistente.estado_empaque || 'EN_BLISTER');
      setObservaciones(varianteExistente.observaciones || '');
      setPreviewReal(varianteExistente.foto_auto_real_url || null);
      setPreviewPieza(varianteExistente.foto_mi_pieza_url || null);
    } else {
      setEditingRecordId(null);
      setFabricante('Hot Wheels Premium');
      setEscala('1:64');
      setEstado('ADQUIRIDO');
      setPrecioCop('0');
      setEmpaque('EN_BLISTER');
      setObservaciones('');
      setPreviewReal(auto.imagen_referencia_url || null);
      setPreviewPieza(null);
    }
    setFileReal(null);
    setFilePieza(null);
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

    let urlReal = previewReal;
    if (fileReal) {
      const uploaded = await uploadFoto(fileReal);
      if (uploaded) urlReal = uploaded;
    }

    let urlPieza = previewPieza;
    if (filePieza) {
      const uploaded = await uploadFoto(filePieza);
      if (uploaded) urlPieza = uploaded;
    }

    const payload = {
      catalogo_id: selectedAuto.id,
      fabricante_diecast: fabricante,
      escala: escala,
      estado: estado,
      precio_pagado_cop: parseFloat(precioCop) || 0,
      estado_empaque: empaque,
      foto_auto_real_url: urlReal,
      foto_mi_pieza_url: urlPieza,
      observaciones: observaciones,
      fecha_adquisicion: new Date().toISOString().split('T')[0]
    };

    let error = null;

    if (editingRecordId) {
      const res = await supabase
        .from('autos_mi_coleccion')
        .update(payload)
        .eq('id', editingRecordId);
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
      alert(`✅ ¡Variante de ${selectedAuto.modelo_nombre} guardada exitosamente en tu vitrina!`);
      setSelectedAuto(null);
      setEditingRecordId(null);
      fetchData();
    }
    setSaving(false);
  };

  const eliminarVariante = async (idVariante: string) => {
    if (!confirm('¿Estás seguro de eliminar esta variante de tu colección?')) return;
    const { error } = await supabase.from('autos_mi_coleccion').delete().eq('id', idVariante);
    if (error) alert(`Error al eliminar: ${error.message}`);
    else fetchData();
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
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 sm:px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <Link href="/" className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 shrink-0">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
                RubDev <span className="text-red-500">AutoCollection</span>
              </h1>
              <p className="text-xs text-red-400 font-medium">Catálogo Maestro & Vitrina Multivariante</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Recargar Catálogo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/autos/mi-coleccion"
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
          >
            <BookmarkCheck className="w-4 h-4 text-red-400" />
            <span>Mi Vitrina ({misAutos.filter(a => a.estado === 'ADQUIRIDO').length})</span>
          </Link>

          {!session ? (
            <Link
              href="/inventarioescuela/login?next=/autos"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold rounded-xl transition"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Acceso Admin</span>
            </Link>
          ) : (
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-slate-800 rounded-xl transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir ({session.user.email?.split('@')[0]})</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6 sm:space-y-8 flex-1">
        {/* Banner Presentación */}
        <div className="bg-gradient-to-r from-slate-900 via-red-950/20 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <span className="text-xs font-bold text-red-500 uppercase tracking-widest">
              Catálogo Maestro con 100+ Modelos
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Colección de Autos & Clásicos Colombianos
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mt-2 leading-relaxed">
              Explora modelos reales, de cine y clásicos de Colombia. Ahora puedes registrar múltiples variantes de un mismo auto (diferentes escalas, fabricantes o empaques) con doble fotografía.
            </p>
          </div>
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl text-center shrink-0 w-full md:w-auto min-w-[200px]">
            <p className="text-xs text-slate-400 uppercase font-semibold">Piezas en Vitrina</p>
            <p className="text-3xl font-black text-red-500 mt-1">{misAutos.length}</p>
          </div>
        </div>

        {/* Buscador & Filtros */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar auto o franquicia (ej. Renault 4, Batman)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {[
              { id: 'TODOS', label: 'Todos' },
              { id: 'CINE_TV', label: '🎬 Cine & TV' },
              { id: 'ANIME_COMIC', label: '⚡ Ánime & Cómics' },
              { id: 'ICONO_HISTORICO', label: '📜 Históricos' },
              { id: 'SUPERDEPORTIVO', label: '🏎️ Superdeportivos' },
              { id: 'CLASICOS_COLOMBIA', label: '🚗 Clásicos Colombianos' }
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
              // Obtenemos todas las variantes registradas para este modelo en la colección del usuario
              const variantesDelAuto = misAutos.filter((m) => m.catalogo_id === auto.id);

              return (
                <div
                  key={auto.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between hover:border-slate-700 transition overflow-hidden"
                >
                  <div className="space-y-3">
                    {/* Imagen de referencia del carro real (o la primera foto real subida) */}
                    {auto.imagen_referencia_url ? (
                      <div className="relative h-44 w-full rounded-2xl overflow-hidden mb-3 border border-slate-800">
                        <img 
                          src={auto.imagen_referencia_url} 
                          alt={auto.modelo_nombre} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-[10px] text-slate-300 border border-slate-800 font-medium">
                          Vehículo Real / Referencia
                        </div>
                      </div>
                    ) : null}

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                        {auto.origen_franquicia}
                      </span>
                      
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-red-400" />
                        {variantesDelAuto.length} {variantesDelAuto.length === 1 ? 'Variante' : 'Variantes'}
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

                    {/* Listado de variantes si el usuario ya tiene piezas guardadas */}
                    {variantesDelAuto.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-slate-800 space-y-2">
                        <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">Mis Variantes Guardadas:</p>
                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                          {variantesDelAuto.map((v) => (
                            <div key={v.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2.5">
                                {v.foto_mi_pieza_url ? (
                                  <img src={v.foto_mi_pieza_url} alt="Mi Pieza" className="w-10 h-10 object-cover rounded-lg border border-slate-800 shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-slate-600 shrink-0">🚗</div>
                                )}
                                <div>
                                  <p className="font-bold text-white">{v.fabricante_diecast} <span className="text-slate-400 font-normal">({v.escala})</span></p>
                                  <p className="text-[10px] text-slate-400">{v.estado_empaque} · <span className="text-emerald-400 font-semibold">${v.precio_pagado_cop?.toLocaleString()} COP</span></p>
                                </div>
                              </div>
                              {session && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => handleOpenModal(auto, v)}
                                    className="p-1.5 bg-slate-800 hover:bg-amber-600 text-slate-300 hover:text-white rounded-lg transition"
                                    title="Editar esta variante"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => eliminarVariante(v.id)}
                                    className="p-1.5 bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white rounded-lg transition"
                                    title="Eliminar variante"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botón para agregar nueva variante */}
                  <div className="mt-6 pt-4 border-t border-slate-800">
                    {session ? (
                      <button
                        onClick={() => handleOpenModal(auto)}
                        className="w-full py-2.5 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-500 text-white transition flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/20"
                      >
                        <Plus className="w-4 h-4" />
                        Añadir Nueva Variante / Escala / Proveedor
                      </button>
                    ) : (
                      <Link
                        href="/inventarioescuela/login?next=/autos"
                        className="w-full py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-medium rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        Inicia sesión para gestionar tu vitrina
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Inteligente para Registrar / Editar Variante con Doble Foto */}
      {session && selectedAuto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingRecordId ? 'Editar Variante:' : 'Registrar Variante:'}{' '}
                <span className="text-red-500">{selectedAuto.modelo_nombre}</span>
              </h3>
              <button
                onClick={() => setSelectedAuto(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarColeccion} className="space-y-4">
              
              {/* Sección de Doble Fotografía */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Foto 1: Carro Real */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">1. Foto del Carro Real</label>
                  <div className="border border-dashed border-slate-800 rounded-2xl p-3 text-center bg-slate-950/50 hover:border-red-500/50 transition relative">
                    {previewReal ? (
                      <div className="relative">
                        <img src={previewReal} alt="Real" className="h-28 w-full object-cover rounded-xl" />
                        <button type="button" onClick={() => { setFileReal(null); setPreviewReal(null); }} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[10px]">✕</button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1 py-4">
                        <Upload className="w-5 h-5 text-slate-500" />
                        <span className="text-[11px] text-slate-400">Subir foto real</span>
                        <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setFileReal(e.target.files[0]); setPreviewReal(URL.createObjectURL(e.target.files[0])); } }} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>

                {/* Foto 2: Mi Pieza */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">2. Foto de Tu Pieza</label>
                  <div className="border border-dashed border-slate-800 rounded-2xl p-3 text-center bg-slate-950/50 hover:border-red-500/50 transition relative">
                    {previewPieza ? (
                      <div className="relative">
                        <img src={previewPieza} alt="Mi Pieza" className="h-28 w-full object-cover rounded-xl" />
                        <button type="button" onClick={() => { setFilePieza(null); setPreviewPieza(null); }} className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 text-[10px]">✕</button>
                      </div>
                    ) : (
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1 py-4">
                        <Camera className="w-5 h-5 text-blue-400" />
                        <span className="text-[11px] text-slate-400">Subir foto de tu miniatura</span>
                        <input type="file" accept="image/*" onChange={(e) => { if (e.target.files?.[0]) { setFilePieza(e.target.files[0]); setPreviewPieza(URL.createObjectURL(e.target.files[0])); } }} className="hidden" />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Fabricante Diecast</label>
                  <select
                    value={fabricante}
                    onChange={(e) => setFabricante(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="Hot Wheels Premium">Hot Wheels Premium</option>
                    <option value="Hot Wheels Mainline">Hot Wheels Mainline</option>
                    <option value="Greenlight Hollywood">Greenlight Hollywood</option>
                    <option value="Matchbox Collectors">Matchbox Collectors</option>
                    <option value="Jada Toys">Jada Toys</option>
                    <option value="Maisto">Maisto</option>
                    <option value="Bburago">Bburago</option>
                    <option value="Solido">Solido</option>
                    <option value="Tomica">Tomica</option>
                    <option value="Kyosho">Kyosho</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Escala</label>
                  <select
                    value={escala}
                    onChange={(e) => setEscala(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="1:64">1:64 (Estándar / Blister)</option>
                    <option value="1:43">1:43 (Mediano / Detalle)</option>
                    <option value="1:24">1:24 (Grande)</option>
                    <option value="1:18">1:18 (Coleccionista Premium)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Estado en la Vitrina</label>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500 font-semibold"
                  >
                    <option value="ADQUIRIDO">✓ Adquirido / En Vitrina</option>
                    <option value="BUSCANDO">🔍 Buscando</option>
                    <option value="DESEADO">★ En Lista de Deseos</option>
                    <option value="APARTADO">📌 Apartado / Reservado</option>
                    <option value="INTERCAMBIO">🔄 Para Intercambio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Estado del Empaque</label>
                  <select
                    value={empaque}
                    onChange={(e) => setEmpaque(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="EN_BLISTER">En Blister / Empaque Original</option>
                    <option value="SUELTO">Suelto / Loose</option>
                    <option value="EN_CAJA_ACRILICA">En Caja Acrílica Protectora</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Precio Pagado (COP $)</label>
                  <input
                    type="number"
                    value={precioCop}
                    onChange={(e) => setPrecioCop(e.target.value)}
                    placeholder="Ej: 45000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Observaciones / Color / Variante</label>
                  <input
                    type="text"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Ej: Edición especial roja / Llantas de goma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setSelectedAuto(null)}
                  className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-medium hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-medium hover:bg-red-500 transition shadow-lg shadow-red-500/20"
                >
                  {saving ? 'Guardando...' : editingRecordId ? 'Actualizar Variante' : 'Guardar en Mi Vitrina'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pie de Página */}
      <footer className="w-full mt-auto py-6 border-t border-slate-800/80 bg-slate-950 text-slate-500 text-xs text-center print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="font-medium">
            RubDev AutoCollection · Catálogo & Vitrina de Vehículos de Colección
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            © {new Date().getFullYear()} <strong className="text-slate-200">RubDev.net</strong> ®. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}