import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const root = process.cwd();
const envPath = path.join(root, '.env.local');
const envFile = readFileSync(envPath, 'utf8');

for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;

    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const applyChanges = process.argv.includes('--apply');
const spreadsheetPath = process.argv.find((arg) => arg.startsWith('--file='))
    ?.slice('--file='.length) || 'inventario general EJ.xlsx';
const fields = ['numeracion_fisica', 'modelo', 'observaciones'];

if (!supabaseUrl) {
    throw new Error('Falta SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL en .env.local.');
}
if (applyChanges && !serviceRoleKey) {
    throw new Error(
        'Para aplicar cambios, agrega SUPABASE_SERVICE_ROLE_KEY a .env.local. No uses ni compartas esa clave en el código.'
    );
}
if (!applyChanges && !serviceRoleKey && !publishableKey) {
    throw new Error('No hay una clave de Supabase disponible para leer y generar la vista previa.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey || publishableKey);
const workbook = XLSX.readFile(path.resolve(root, spreadsheetPath), { raw: false });
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const sourceRows = XLSX.utils.sheet_to_json(firstSheet, { defval: null, raw: false });

function normalizeText(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text && text.toLowerCase() !== 'nan' ? text : null;
}

function normalizeRow(row) {
    const normalized = Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key.trim().toLowerCase(), value])
    );
    const placa = normalizeText(normalized.placa);
    if (!placa) return null;

    return {
        placa,
        numeracion_fisica: normalizeText(normalized.numeracion_fisica),
        modelo: normalizeText(normalized.modelo),
        observaciones: normalizeText(normalized.observaciones),
    };
}

const sourceByPlaca = new Map();
const conflictingPlacas = new Set();

for (const rawRow of sourceRows) {
    const row = normalizeRow(rawRow);
    if (!row) continue;

    const existing = sourceByPlaca.get(row.placa);
    if (!existing) {
        sourceByPlaca.set(row.placa, row);
        continue;
    }

    for (const field of fields) {
        if (existing[field] && row[field] && existing[field] !== row[field]) {
            conflictingPlacas.add(row.placa);
        } else if (!existing[field] && row[field]) {
            existing[field] = row[field];
        }
    }
}

const databaseAssets = [];
for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
        .from('activos')
        .select(`id, placa, ${fields.join(', ')}`)
        .range(offset, offset + 999);

    if (error) {
        throw new Error(`No se pudieron leer los activos. Aplique primero la migración SQL: ${error.message}`);
    }

    databaseAssets.push(...data);
    if (data.length < 1000) break;
}

const assetsByPlaca = new Map();
for (const asset of databaseAssets) {
    const placa = normalizeText(asset.placa);
    if (!placa) continue;
    const matches = assetsByPlaca.get(placa) || [];
    matches.push(asset);
    assetsByPlaca.set(placa, matches);
}

const plannedChanges = [];
let missingInDatabase = 0;
let skippedConflicts = 0;
let skippedDuplicateAssets = 0;

for (const [placa, source] of sourceByPlaca) {
    if (conflictingPlacas.has(placa)) {
        skippedConflicts += 1;
        continue;
    }

    const matches = assetsByPlaca.get(placa) || [];
    if (matches.length === 0) {
        missingInDatabase += 1;
        continue;
    }
    if (matches.length !== 1) {
        skippedDuplicateAssets += 1;
        continue;
    }

    const asset = matches[0];
    for (const field of fields) {
        const existingValue = normalizeText(asset[field]);
        const sourceValue = source[field];
        if (sourceValue && !existingValue) {
            plannedChanges.push({ id: asset.id, placa, field, value: sourceValue });
        }
    }
}

console.log(`Activos con placa en Excel: ${sourceByPlaca.size}`);
console.log(`Campos vacíos que se pueden completar: ${plannedChanges.length}`);
console.log(`Placas no encontradas en Supabase: ${missingInDatabase}`);
console.log(`Placas omitidas por datos distintos en Excel: ${skippedConflicts}`);
console.log(`Placas omitidas por duplicados en Supabase: ${skippedDuplicateAssets}`);

if (!applyChanges) {
    console.log('Vista previa únicamente; no se modificó Supabase. Ejecute con --apply para completar campos vacíos.');
} else {
    let updated = 0;
    let changedSincePreview = 0;

    for (const change of plannedChanges) {
        const { data, error } = await supabase
            .from('activos')
            .update({ [change.field]: change.value })
            .eq('id', change.id)
            .or(`${change.field}.is.null,${change.field}.eq.`)
            .select('id');

        if (error) {
            throw new Error(`Error al completar ${change.field} para placa ${change.placa}: ${error.message}`);
        }

        if (data.length > 0) updated += 1;
        else changedSincePreview += 1;
    }

    console.log(`Campos completados sin sobrescribir valores existentes: ${updated}`);
    console.log(`Campos omitidos porque cambiaron durante la ejecución: ${changedSincePreview}`);
}
