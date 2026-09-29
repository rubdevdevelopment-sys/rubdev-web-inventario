'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { 
  Car, ArrowLeft, RefreshCw, DollarSign, 
  Sparkles, CheckCircle, Package, Camera, Tag, Award
} from 'lucide-react';

interface AutoCatalogo {
  id: string;
  modelo_nombre: string;
  origen_franquicia: string;
  categoria: string;
  imagen_referencia_url: string | null;
}

interface MiColeccionItem {
  id: string;
  catalogo_id: string;
  fabricante_diecast: string;
  escala: string;
  estado: string;
  precio_pagado_cop: number;
  estado_empaque: string;
  foto_mi_pieza_url?: string | null;
  fecha_adquisicion?: string | null;
  autos_catalogo_maestro?: AutoCatalogo;
}

export default function MiVitrinaColeccion() {
  const [items, setItems] = useState<MiColeccionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');

  // Cargar elementos de la vitrina con join al catálogo maestro
  const fetchVitrina = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('autos_mi_coleccion')
        .select(`
          *,
          autos_catalogo_maestro (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Error al cargar vitrina:", error);
      } else if (data) {
        setItems(data);
      }
    } catch (err) {
      console.error("Error inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVitrina();
  }, []);

  // Métricas Calculadas
  const totalInversion = items.reduce((sum, item) => sum + (item.precio_pagado_cop || 0), 0);
  const totalPiezas = items.length;
  const adquiridas = items.filter(i => i.estado === 'ADQUIRIDO').length;
  const buscando = items.filter(i => i.estado === 'BUSCANDO' || i.estado === 'DESEADO').length;
  const conFotoReal = items.filter(i => Boolean(i.foto_mi_pieza_url)).length;

  // Filtrado de lista
  const itemsFiltrados = items.filter(item => {
    if (filtroEstado === 'TODOS') return true;
    return item.estado === filtroEstado;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header Topbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Link href="/autos" className="text-slate-400 hover:text-white transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <Award className="w-6 h-6 text-red-500" />
            <h1 className="text-lg font-bold tracking-wider text-white">
              Vitrina Personal <span className="text-red-500">& Métricas</span>
            </h1>
          </div>
        </div>

        <button
          onClick={fetchVitrina}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-2 text-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Actualizar Vitrina</span>
        </button>
      </header>

      <main className="max-w-7xl mx-auto w-full p-6 space-y-8 flex-1">
        {/* Panel de Métricas y Estadísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Inversión Estimada</p>
              <p className="text-xl font-black text-emerald-400">
                ${totalInversion.toLocaleString('es-CO')} <span className="text-[10px] text-slate-500">COP</span>
              </p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Total Registradas</p>
              <p className="text-2xl font-bold text-slate-100">{totalPiezas} piezas</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">En Vitrina (Adquiridas)</p>
              <p className="text-2xl font-bold text-emerald-400">{adquiridas}</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-xl">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">Fotos Reales Cargadas</p>
              <p className="text-2xl font-bold text-amber-400">{conFotoReal} / {totalPiezas}</p>
            </div>
          </div>
        </div>

        {/* Filtros por Estado */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Filtrar mi colección:
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'TODOS', label: 'Ver Todos' },
              { id: 'ADQUIRIDO', label: '✓ En Vitrina' },
              { id: 'BUSCANDO', label: '🔍 Buscando' },
              { id: 'APARTADO', label: '📌 Apartados' },
              { id: 'VENTA', label: '🏷️ Venta / Intercambio' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFiltroEstado(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                  filtroEstado === f.id
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grilla de Piezas en Vitrina */}
        {loading ? (
          <div className="text-center py-16 text-slate-500">Cargando vitrina personal...</div>
        ) : itemsFiltrados.length === 0 ? (
          <div className="text-center py-16 text-slate-500 bg-slate-900/50 rounded-3xl border border-slate-800">
            No se encontraron piezas en esta categoría.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {itemsFiltrados.map((item) => {
              const autoMaestro = item.autos_catalogo_maestro;
              const imagen = item.foto_mi_pieza_url || autoMaestro?.imagen_referencia_url;

              return (
                <div 
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition"
                >
                  <div className="space-y-3">
                    {/* Visualización de la Fotografía */}
                    {imagen ? (
                      <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-800">
                        <img 
                          src={imagen} 
                          alt={autoMaestro?.modelo_nombre || 'Pieza'} 
                          className="w-full h-full object-cover"
                        />
                        {item.foto_mi_pieza_url && (
                          <span className="absolute top-2 right-2 bg-slate-900/90 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold px-2 py-0.5 rounded-lg">
                            Foto Real
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="h-48 w-full rounded-2xl bg-slate-950 flex items-center justify-center text-slate-600 text-xs border border-slate-800">
                        Sin Fotografía
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                        {autoMaestro?.origen_franquicia || 'Diecast'}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        {item.estado}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {autoMaestro?.modelo_nombre || 'Modelo Desconocido'}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Fabricante: <strong className="text-slate-200">{item.fabricante_diecast}</strong> ({item.escala})
                      </p>
                    </div>

                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-400">
                        <span>Empaque:</span>
                        <strong className="text-slate-200">{item.estado_empaque}</strong>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Valor Pagado/Estimado:</span>
                        <strong className="text-emerald-400">${item.precio_pagado_cop?.toLocaleString('es-CO')} COP</strong>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}