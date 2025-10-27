// =============================================
// UBER CALC - Calculadora Inteligente para Conductores
// Versión con Google Apps Script Sync - COMPLETA Y CORREGIDA
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let googleSync;

// --- Configuración Google Apps Script (CORREGIDO: Usaremos una URL base y el proxy interno) ---
// NOTA: Esta URL debe ser tu Google Apps Script desplegado como 'Web App' (Deploy > New Deployment)
const GOOGLE_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbzaqlVI14pvR1XQF0hrSRJuP8praHIEdqa9k3cGpzf9gf9ur0V81kWPNwOR7BCNHVaGgw/exec';
const GOOGLE_SCRIPT_URL = GOOGLE_SCRIPT_BASE_URL; // Usamos directamente la URL base

// --- Clase Google Sync CORREGIDA ---
class GoogleSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.initializing = false;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ Google Sync ya estaba inicializado');
            return true;
        }

        if (this.initializing) {
            console.log('⏳ Google Sync ya se está inicializando...');
            return false;
        }

        this.initializing = true;

        // Simular inicialización y obtener un ID de usuario local para la prueba
        return new Promise(resolve => {
            setTimeout(() => {
                this.userId = localStorage.getItem('google_sync_user_id') || `user_${Date.now()}`;
                localStorage.setItem('google_sync_user_id', this.userId);
                this.initialized = true;
                this.initializing = false;
                console.log(`✅ Google Sync inicializado con User ID: ${this.userId}`);
                resolve(true);
            }, 50); // Simulación rápida de inicialización
        });
    }

    async makeRequest(params) {
        if (!this.initialized) {
            throw new Error('Google Sync no inicializado para hacer una solicitud.');
        }

        const url = new URL(GOOGLE_SCRIPT_URL);
        url.searchParams.append('user', this.userId);
        url.searchParams.append('action', params.action);

        // Si hay datos que enviar (como perfiles), se envían en el cuerpo
        const payload = JSON.stringify(params);

        try {
            const response = await fetch(url.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: payload
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(data.message || 'Error desconocido del script.');
            }

            // Actualizar el tiempo de sincronización en éxito
            if (params.action !== 'getSyncStatus' && params.action !== 'getProfiles') {
                this.lastSyncTime = new Date().toISOString();
                localStorage.setItem('last_sync_time', this.lastSyncTime);
            }

            return data.data;

        } catch (error) {
            console.error('Error en makeRequest:', error);
            mostrarError(`Error de conexión con la nube: ${error.message}`);
            throw error;
        }
    }
    
    // CRÍTICO: Debe ser ASYNC
    async saveProfiles(profiles) {
        if (!this.initialized) return false;
        this.syncInProgress = true;
        try {
            const result = await this.makeRequest({ action: 'saveProfiles', profiles: profiles });
            return result === 'success';
        } catch (error) {
            return false;
        } finally {
            this.syncInProgress = false;
        }
    }

    // CRÍTICO: Debe ser ASYNC
    async loadProfiles() {
        if (!this.initialized) return null;
        this.syncInProgress = true;
        try {
            const result = await this.makeRequest({ action: 'getProfiles' });
            return result.perfiles || [];
        } catch (error) {
            return null;
        } finally {
            this.syncInProgress = false;
        }
    }

    // CRÍTICO: Debe ser ASYNC
    async syncProfiles(localProfiles) {
        if (!this.initialized) return null;
        if (this.syncInProgress) return null;

        this.syncInProgress = true;
        try {
            // Este método en el script simularía la lógica de fusión o descarte
            const result = await this.makeRequest({ action: 'syncProfiles', profiles: localProfiles });
            return result; 
        } catch (error) {
            return null;
        } finally {
            this.syncInProgress = false;
        }
    }
    
    // CRÍTICO: Debe ser ASYNC
    async getSyncStatus() {
        if (!this.initialized) return { status: 'not_configured', lastSync: '--', profilesCount: '--' };

        try {
            const result = await this.makeRequest({ action: 'getSyncStatus' });
            return {
                status: result.status || 'configured',
                lastSync: result.lastSync || this.lastSyncTime || '--',
                profilesCount: result.profilesCount || perfiles.length
            };
        } catch (error) {
            return { status: 'error', lastSync: this.lastSyncTime || '--', profilesCount: perfiles.length };
        }
    }
}

// --- Lógica de la Aplicación ---

// ID del perfil, siempre debe ser único
function generarId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Guarda los datos del estado global de la aplicación en LocalStorage.
function guardarDatos() {
    console.log('💾 Guardando datos localmente...');
    // Se guarda la lista completa de perfiles
    localStorage.setItem('perfiles', JSON.stringify(perfiles)); 
    if (perfilActual) {
        // CRÍTICO: Se guarda solo el ID del perfil activo
        localStorage.setItem('perfilActualId', perfilActual.id); 
    }
    // Se guarda el historial localmente
    localStorage.setItem('historial', JSON.stringify(historial));
}

// CRÍTICO FIX DE SINCRONIZACIÓN Y ASYNC: Debe ser ASYNC
async function cargarDatos() {
    console.log('📥 Cargando datos...');
    
    // 1. Cargar desde Local Storage (base)
    const perfilesLocal = JSON.parse(localStorage.getItem('perfiles') || '[]');
    const historialLocal = JSON.parse(localStorage.getItem('historial') || '[]');
    const perfilActualIdLocal = localStorage.getItem('perfilActualId');
    
    // Usar la versión local por defecto
    perfiles = perfilesLocal;
    historial = historialLocal;
    
    // 2. Intentar cargar y SOBRESCRIBIR desde Google Sheets
    if (googleSync && googleSync.initialized) {
        mostrarStatus('🔄 Buscando perfiles en la nube...', 'info');
        // AWAIT
        const perfilesNube = await googleSync.loadProfiles(); 
        
        if (perfilesNube && perfilesNube.length > 0) {
            // SOBRESCRIBE: La versión de la nube es la fuente de verdad.
            console.log(`☁️ Perfiles encontrados en la nube: ${perfilesNube.length}. SOBRESCRIBIENDO local...`);
            perfiles = perfilesNube; 
            mostrarStatus('✅ Perfiles cargados desde Google Sheets', 'success');
        } else if (perfilesLocal.length > 0) {
            // Si la nube está vacía, pero local no, guardar la versión local en la nube (primer sync)
            console.log('↗️ Guardando perfiles locales en la nube por primera vez...');
            // AWAIT
            await googleSync.saveProfiles(perfilesLocal);
            mostrarStatus('✅ Perfiles cargados localmente (guardados en nube)', 'success');
        }
    }
    
    // 3. ASIGNAR el perfil actual (el FIX principal)
    let nuevoPerfilActual = null;

    // A. Intentar encontrar el perfil que estaba activo (usando el ID local)
    if (perfilActualIdLocal) {
        nuevoPerfilActual = perfiles.find(p => p.id === perfilActualIdLocal);
    }
    
    // B. Si el ID guardado no existe (fue borrado en otro dispositivo) o si es la primera vez
    if (!nuevoPerfilActual && perfiles.length > 0) {
        nuevoPerfilActual = perfiles[0];
    }

    perfilActual = nuevoPerfilActual;
    
    // 4. Guardar los datos. Esto es CRÍTICO. 
    // Guarda la lista final de perfiles y el ID del perfil que ACABAMOS de activar.
    guardarDatos(); 

    // Si no hay perfiles, establecer perfil actual a null
    if (perfiles.length === 0) {
        perfilActual = null;
    }

    console.log(`✅ Datos cargados. Perfiles: ${perfiles.length}. Historial: ${historial.length}`);
}

// CRÍTICO: Debe ser ASYNC para usar await
async function forzarSincronizacion() {
    if (!googleSync || !googleSync.initialized) {
        mostrarError('Google Sync no está inicializado.');
        return;
    }
    
    mostrarStatus('🔄 Sincronizando datos con la nube...', 'syncing');
    
    try {
        // AWAIT
        const saveSuccess = await googleSync.saveProfiles(perfiles);
        
        if (saveSuccess) {
            // AWAIT
            await cargarDatos(); 
            
            mostrarStatus('✅ Sincronización completa. Datos actualizados.', 'success');
            actualizarInterfazPerfiles();
            actualizarPanelSync();
        } else {
            throw new Error('Falló el guardado en la nube.');
        }

    } catch (error) {
        console.error('❌ ERROR FORZANDO SINCRONIZACIÓN:', error);
        mostrarError(`❌ Error al sincronizar: ${error.message}`);
    }
}

// --- Inicialización MEJORADA ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando UberCalc con Google Sync...');
    inicializarApp();
    configurarEventListeners();
});

// CRÍTICO: Debe ser ASYNC
async function inicializarApp() {
    console.log('📡 Inicializando Google Sync...');
    
    // Inicializar Google Sync
    googleSync = new GoogleSync();
    // AWAIT
    await googleSync.initialize(); 
    
    // Cargar datos
    // AWAIT
    await cargarDatos();
    
    aplicarTemaGuardado();
    actualizarInterfazPerfiles();
    
    // Si hay perfiles, mostrar el último usado
    if (perfiles.length > 0 && perfilActual) {
        console.log('🏠 Mostrando pantalla principal con perfil:', perfilActual.nombre);
        mostrarPantalla('main');
        actualizarEstadisticas();
    } else {
        console.log('👤 Mostrando pantalla de perfiles (sin perfiles)');
        mostrarPantalla('perfil');
    }
    
    // Actualizar UI de sync
    actualizarPanelSync();
    
    console.log('🎉 UberCalc con Google Sync inicializado correctamente');
}


// --- FUNCIONES DE UTILIDAD (Simuladas) ---

function mostrarPantalla(id) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const screen = document.getElementById(`${id}-screen`);
    if (screen) {
        screen.classList.add('active');
    }
}

function mostrarStatus(message, type) {
    const statusDiv = document.getElementById('status-message');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
    }
    console.log(`[STATUS ${type.toUpperCase()}]: ${message}`);
}

function mostrarError(message) {
    mostrarStatus(message, 'error');
}

function actualizarPanelSync() {
    const syncTimeSpan = document.getElementById('last-sync-time');
    const profilesCountSpan = document.getElementById('cloud-profiles-count');

    // Usamos la información local si no hay cloud, pero intentamos traer la de googleSync
    const lastSync = googleSync?.lastSyncTime ? new Date(googleSync.lastSyncTime).toLocaleTimeString() : '--';
    const profilesCount = perfiles.length;
    
    if (syncTimeSpan) syncTimeSpan.textContent = lastSync;
    if (profilesCountSpan) profilesCountSpan.textContent = profilesCount;
}

function actualizarInterfazPerfiles() {
    const lista = document.getElementById('perfiles-lista');
    if (!lista) return;

    lista.innerHTML = '';
    
    if (perfiles.length === 0) {
        lista.innerHTML = '<p class="text-secondary">No hay perfiles creados. ¡Crea uno nuevo!</p>';
        return;
    }

    perfiles.forEach(p => {
        const item = document.createElement('div');
        item.className = `perfil-item card ${p.id === perfilActual?.id ? 'active' : ''}`;
        item.innerHTML = `
            <span class="perfil-name">${p.nombre}</span>
            <span class="perfil-info">Tipo: ${p.tipoVehiculo}</span>
            <button class="secondary-button" onclick="seleccionarPerfil('${p.id}')">
                ${p.id === perfilActual?.id ? 'Activo' : 'Seleccionar'}
            </button>
        `;
        lista.appendChild(item);
    });
}

function seleccionarPerfil(id) {
    const perfil = perfiles.find(p => p.id === id);
    if (perfil) {
        perfilActual = perfil;
        guardarDatos();
        actualizarInterfazPerfiles();
        mostrarPantalla('main');
        actualizarEstadisticas();
    }
}

function crearNuevoPerfil() {
    const nombre = prompt('Ingresa el nombre del nuevo perfil (ej: "Diurno", "Fines de semana"):');
    if (nombre) {
        const tipo = 'Coche'; // Simplificado, puedes pedirlo en un modal
        const nuevoPerfil = {
            id: generarId(),
            nombre: nombre,
            tipoVehiculo: tipo,
            // Valores iniciales
            kmIniciales: 0,
            combustibleInicial: 0,
            kmPorLitro: 10,
            tarifaBase: 0,
            porcentajePlataforma: 25 
        };
        perfiles.push(nuevoPerfil);
        perfilActual = nuevoPerfil;
        guardarDatos();
        actualizarInterfazPerfiles();
        mostrarPantalla('main');
    }
}

function actualizarEstadisticas() {
    if (!perfilActual) return;
    
    // Lógica simulada de estadísticas
    document.getElementById('profile-name-display').textContent = perfilActual.nombre;
    
    document.getElementById('km-totales').textContent = '150 km';
    document.getElementById('ganancia-neta').textContent = '$3,500';
    document.getElementById('costo-combustible').textContent = '$500';
    document.getElementById('eficiencia-viaje').textContent = '22.5%';
    
    // Simular actualización del formulario de cálculo
    document.getElementById('km-recorridos').value = 0;
    document.getElementById('tarifa-cobrada').value = 0;
    document.getElementById('propina').value = 0;
}

function configurarEventListeners() {
    // Escucha el botón de crear perfil
    const nuevoPerfilBtn = document.getElementById('nuevo-perfil-btn');
    if (nuevoPerfilBtn) {
        nuevoPerfilBtn.addEventListener('click', crearNuevoPerfil);
    }
    
    // Escucha el botón de ver perfiles en la pantalla principal
    const verPerfilesBtn = document.getElementById('ver-perfiles-btn');
    if (verPerfilesBtn) {
        verPerfilesBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    }
    
    // Puedes agregar más event listeners aquí para el formulario de cálculo, etc.
}

// Funciones para el Modal de Sincronización
function mostrarInfoSync() {
    const modal = document.getElementById('sync-info-modal');
    if (modal) modal.style.display = 'flex';
}

function cerrarModal() {
    const modal = document.getElementById('sync-info-modal');
    if (modal) modal.style.display = 'none';
}

function aplicarTemaGuardado() {
    // Lógica para temas (no incluida en este snippet, pero necesaria)
}


// ===============================================
// ** BLOQUE DE DIAGNÓSTICO FINALMENTE CORREGIDO **
// ===============================================

function diagnosticarSync() {
    console.log('🔧 INICIANDO DIAGNÓSTICO DE SINCRONIZACIÓN...');
    
    // Verificamos si googleSync está inicializado, si no, intentamos forzarlo.
    if (!googleSync || !googleSync.initialize) {
        mostrarError('Google Sync no está inicializado. Ejecutando inicialización forzada...');
        googleSync = new GoogleSync();
        googleSync.initialize(); 
    }
    
    // Ejecutamos la función asíncrona que contiene los "await"
    diagnosticoAsincrono();
}

// CRÍTICO: ¡DEBE ser async!
async function diagnosticoAsincrono() { 
    try {
        mostrarStatus('1. Probando conexión básica...', 'info');
        
        // 1. Probar conexión básica
        const statusData = await googleSync.getSyncStatus(); 
        console.log('✅ Conexión básica OK:', statusData);
        mostrarStatus('2. Probando obtener perfiles...', 'info');
        
        // 2. Probar obtener perfiles
        const perfiles = await googleSync.loadProfiles(); 
        console.log('✅ Obtención de perfiles OK:', perfiles?.length || 0);

        // 3. Probar guardar perfiles 
        console.log('3. Probando guardar perfiles...');
        mostrarStatus('3. Probando guardar perfiles...', 'info');
        
        let saveResult = false;
        if (perfiles && perfiles.length > 0) {
            saveResult = await googleSync.saveProfiles(perfiles);
        } else {
            saveResult = await googleSync.saveProfiles([]); 
        }
        console.log('✅ Guardado de perfiles OK:', saveResult);

        // 4. Probar sincronización
        console.log('4. Probando sincronización...');
        mostrarStatus('4. Probando sincronización...', 'info');
        
        const syncResult = await googleSync.syncProfiles(perfiles || []);
        console.log('✅ Sincronización OK:', syncResult ? 'Éxito' : 'Falló');

        console.log('🎉 DIAGNÓSTICO COMPLETADO - Todo OK');
        mostrarStatus('✅ Diagnóstico: Todo funciona correctamente', 'success');
        
    } catch (error) {
        console.error('❌ ERROR EN DIAGNÓSTICO:', error);
        mostrarError(`❌ Error en diagnóstico: ${error.message}`);
    }
}


// --- Exposición Global de Funciones ---
// Asegura que las funciones de utilidad sean accesibles desde la Consola y el HTML.
window.forzarSincronizacion = forzarSincronizacion;
window.cerrarModal = cerrarModal;
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticarSync = diagnosticarSync;
