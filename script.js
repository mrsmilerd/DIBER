// =============================================
// DIBER - Calculadora Inteligente para Conductores
// Versión Corregida y Sincronizada con HTML
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let firebaseSync;
let filtroActual = 'hoy';

// --- Sistema de Código de Usuario ---
let userCodeSystem = {
    userId: null,
    userCode: null,
    initialized: false
};

// --- Variables de Control de Inicialización ---
let firebaseInitialized = false;
let loadingData = false;
let appInitialized = false;

// --- Sistema de Tráfico ---
let trafficAnalyzer = null;
let trafficInitialized = false;

// --- Configuración Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyCf5j5Pu-go6ipUw2EnTO2OnKgvYLzkonY",
  authDomain: "diber-32875.firebaseapp.com",
  projectId: "diber-32875",
  storageBucket: "diber-32875.firebasestorage.app",
  messagingSenderId: "260349079723",
  appId: "1:260349079723:web:babe1cc51e8bb067ba87ee"
};

// --- Elementos DOM ---
const elementos = {};

// =============================================
// INICIALIZACIÓN DE ELEMENTOS DOM - CORREGIDA
// =============================================

function inicializarElementosDOM() {
    console.log('🔍 Inicializando elementos DOM...');
    
    const ids = [
        'perfil-screen', 'config-perfil-screen', 'main-screen',
        'status-indicator', 'status-text', 
        'tarifa', 'minutos', 'distancia',
        'aceptar-viaje', 'rechazar-viaje',
        'modalFondo', 'modalContenido', 'modalResultadosDoble', 'modal-badge', 'modal-emoji', 'modal-texto',
        'history-list', 'clear-history', 'exportar-historial',
        'stats-viajes', 'stats-ganancia', 'stats-tiempo', 'stats-rentables',
        'perfiles-lista', 'nuevo-perfil-btn', 'perfil-form', 'volver-perfiles', 'cancelar-perfil', 'cambiar-perfil',
        'theme-toggle', 'exportModal', 'exportar-pdf', 'sync-panel',
        'sync-status-btn', 'sync-btn-icon',
        'rendimiento-ganancia-hora-linea', 'rendimiento-viaje-promedio-linea',
        'rendimiento-ganancia-hora-card', 'rendimiento-distancia-total-card',
        'rendimiento-eficiencia-card', 'rendimiento-eficiencia-badge',
        'user-code-modal', 'user-code-input',
        'activar-ubicacion-btn', 'location-status',
        'modal-rapido', 'modal-trafico-header', 'modal-trafico-status', 'modal-trafico-condition',
        'modal-tiempo-original', 'modal-tiempo-real', 'modal-resultado-principal',
        'modal-badge-rentabilidad', 'modal-badge-subtitle',
        'modal-impacto-trafico', 'modal-impacto-content',
        'modal-badge-rechazar', 'modal-badge-aceptar', 'modal-btn-aceptar',
        'code-status', 'sync-perfil-info', 'sync-panel-status', 'current-device-icon',
        'current-device-name', 'current-device-id', 'firebase-status', 'last-sync-time',
        'cloud-profiles-count', 'cloud-history-count', 'force-sync-btn'
    ];

    ids.forEach(id => {
        elementos[id] = document.getElementById(id);
        if (!elementos[id]) {
            console.warn(`⚠️ Elemento no encontrado: ${id}`);
        }
    });

    elementos.tabButtons = document.querySelectorAll('.tab-button');
    elementos.tabContents = document.querySelectorAll('.tab-content');
    
    console.log('✅ Elementos DOM inicializados correctamente');
}

// =============================================
// SISTEMA DE CÓDIGO DE USUARIO - CORREGIDO
// =============================================

async function initializeUserCodeSystem() {
    console.log('🔐 Inicializando sistema de código de usuario...');
    
    const savedCode = localStorage.getItem('DIBER_user_code');
    
    if (savedCode) {
        userCodeSystem.userCode = savedCode;
        userCodeSystem.userId = 'user_' + savedCode;
        userCodeSystem.initialized = true;
        
        console.log('✅ Código de usuario cargado:', userCodeSystem.userCode);
        hideUserCodeModal();
        showUserCodeBanner();
        
        await initializeFirebaseSync();
        return true;
    } else {
        showUserCodeModal();
        return false;
    }
}

function generateUserCode() {
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    
    let code = '';
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    for (let i = 0; i < 3; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    const input = document.getElementById('user-code-input');
    if (input) {
        input.value = code;
        input.focus();
        input.select();
    }
}

function setUserCode() {
    const input = document.getElementById('user-code-input');
    if (!input) return;
    
    let code = input.value.trim().toUpperCase();
    
    const codeRegex = /^[A-Z0-9]{3,6}$/;
    
    if (!code) {
        mostrarStatus('❌ Por favor escribe un código o genera uno automático', 'error');
        return;
    }
    
    if (!codeRegex.test(code)) {
        mostrarStatus('❌ Formato inválido. Usa 3-6 letras/números (ej: ABC123)', 'error');
        return;
    }
    
    userCodeSystem.userCode = code;
    userCodeSystem.userId = 'user_' + code;
    userCodeSystem.initialized = true;
    
    localStorage.setItem('DIBER_user_code', code);
    
    hideUserCodeModal();
    showUserCodeBanner();
    
    mostrarStatus('✅ Código de usuario establecido', 'success');
    
    setTimeout(async () => {
        await initializeFirebaseSync();
        await cargarDatos();
        
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else {
            mostrarPantalla('main');
        }
    }, 1000);
}

function showUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('active');
    }
}

function hideUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('active');
    }
}

function showUserCodeBanner() {
    const headerLeft = document.querySelector('.header-left');
    if (!headerLeft) {
        console.error('❌ No se encontró header-left');
        return;
    }
    
    let codeButton = document.getElementById('user-code-button');
    
    if (!codeButton) {
        codeButton = document.createElement('button');
        codeButton.id = 'user-code-button';
        codeButton.className = 'secondary-button small user-code-button';
        codeButton.title = 'Código de sincronización: ' + (userCodeSystem.userCode || '');
        codeButton.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 8px 10px;
            cursor: pointer;
            color: var(--text-primary);
            font-size: 1.1em;
            width: 40px;
            height: 40px;
            transition: all 0.3s;
        `;
        
        headerLeft.appendChild(codeButton);
        
        console.log('✅ Botón de código creado en header-left');
        elementos['user-code-button'] = codeButton;
    }
    
    if (userCodeSystem.userCode) {
        codeButton.innerHTML = `<span class="button-icon">🔑</span>`;
        codeButton.title = 'Código de sincronización: ' + userCodeSystem.userCode;
        
        codeButton.style.display = 'flex';
        codeButton.onclick = mostrarInfoUserCode;
        
        console.log('✅ Botón de código actualizado (solo emoji)');
    }
}

function hideUserCodeBanner() {
    const codeButton = document.getElementById('user-code-button');
    if (codeButton) {
        codeButton.style.display = 'none';
    }
}

function mostrarInfoUserCode() {
    if (userCodeSystem.userCode) {
        mostrarStatus(`🔑 Código: ${userCodeSystem.userCode} - Haz clic para cambiar`, 'info');
        
        setTimeout(() => {
            if (confirm(`Tu código actual es: ${userCodeSystem.userCode}\n\n¿Quieres cambiar de código?`)) {
                cambiarUsuario();
            }
        }, 2000);
    }
}

function cambiarUsuario() {
    if (confirm('¿Estás seguro de que quieres cambiar de usuario?\n\nEsto cerrará tu sesión actual.')) {
        localStorage.removeItem('DIBER_user_code');
        userCodeSystem.userCode = null;
        userCodeSystem.userId = null;
        userCodeSystem.initialized = false;
        
        hideUserCodeBanner();
        showUserCodeModal();
        
        mostrarStatus('🔑 Sesión cerrada. Ingresa un nuevo código.', 'info');
    }
}

// =============================================
// SISTEMA DE SINCRONIZACIÓN MULTI-DISPOSITIVO
// =============================================

class FirebaseSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.db = null;
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            console.log('📡 Inicializando Firebase Sync...');
            
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase no está cargado');
            }
            
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            this.db = firebase.firestore();
            this.userId = userCodeSystem.userId;
            
            this.initialized = true;
            console.log('✅ Firebase Sync inicializado CORRECTAMENTE');
            return true;
            
        } catch (error) {
            console.error('❌ Error inicializando Firebase Sync:', error);
            return false;
        }
    }

    async saveProfile(profile) {
        if (!this.initialized) return false;

        try {
            const profileRef = this.db.collection('users').doc(this.userId)
                .collection('profiles').doc(profile.id);
            
            await profileRef.set({
                ...profile,
                lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ Perfil guardado en Firebase:', profile.nombre);
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando perfil en Firebase:', error);
            return false;
        }
    }

    async saveTrip(trip) {
        if (!this.initialized) return false;

        try {
            const tripRef = this.db.collection('users').doc(this.userId)
                .collection('trips').doc(trip.id);
            
            await tripRef.set({
                ...trip,
                lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ Viaje guardado en Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando viaje en Firebase:', error);
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) return null;

        try {
            const profilesRef = this.db.collection('users').doc(this.userId)
                .collection('profiles');
            
            const snapshot = await profilesRef.orderBy('fechaCreacion', 'desc').get();
            
            if (!snapshot.empty) {
                const profiles = [];
                snapshot.forEach(doc => {
                    profiles.push(doc.data());
                });
                
                console.log('✅ Perfiles cargados desde Firebase:', profiles.length);
                return profiles;
            } else {
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando perfiles desde Firebase:', error);
            return null;
        }
    }

    async loadTrips() {
        if (!this.initialized) return null;

        try {
            const tripsRef = this.db.collection('users').doc(this.userId)
                .collection('trips');
            
            const snapshot = await tripsRef.orderBy('timestamp', 'desc').limit(100).get();
            
            if (!snapshot.empty) {
                const trips = [];
                snapshot.forEach(doc => {
                    trips.push(doc.data());
                });
                
                console.log('✅ Viajes cargados desde Firebase:', trips.length);
                return trips;
            } else {
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando viajes desde Firebase:', error);
            return null;
        }
    }
}

// =============================================
// FUNCIONES PRINCIPALES - CORREGIDAS
// =============================================

async function initializeFirebaseSync() {
    console.log('🔄 Inicializando Firebase Sync...');
    
    if (firebaseInitialized && firebaseSync && firebaseSync.initialized) {
        console.log('✅ Firebase Sync ya estaba inicializado');
        return true;
    }
    
    firebaseSync = new FirebaseSync();
    const success = await firebaseSync.initialize();
    
    if (success) {
        console.log('✅ Firebase Sync inicializado CORRECTAMENTE');
        firebaseInitialized = true;
        
        if (!loadingData) {
            setTimeout(async () => {
                await cargarDatos();
            }, 1000);
        }
        
        return true;
    } else {
        console.log('📱 Usando almacenamiento local solamente');
        firebaseInitialized = false;
        return false;
    }
}

async function cargarDatos() {
    if (loadingData) {
        console.log('⏳ Carga de datos en progreso, omitiendo...');
        return;
    }
    
    loadingData = true;
    console.log('🔄 Cargando datos...');
    
    try {
        try {
            const historialGuardado = localStorage.getItem('historialViajes');
            if (historialGuardado) {
                historial = JSON.parse(historialGuardado);
                console.log('💾 Historial local cargado:', historial.length, 'viajes');
            }
            
            const datosGuardados = localStorage.getItem('DIBER_data');
            if (datosGuardados) {
                const datos = JSON.parse(datosGuardados);
                perfiles = datos.perfiles || [];
                perfilActual = datos.perfilActual || null;
                console.log('💾 Datos generales cargados LOCALMENTE');
            }
        } catch (error) {
            console.error('Error cargando datos locales:', error);
            perfiles = [];
            historial = [];
        }

        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Verificando sincronización con Firebase...');
                
                if (perfiles.length === 0) {
                    const cloudProfiles = await firebaseSync.loadProfiles();
                    if (cloudProfiles && cloudProfiles.length > 0) {
                        console.log('✅ Perfiles de Firebase cargados (sin datos locales):', cloudProfiles.length);
                        perfiles = cloudProfiles;
                    }
                } else {
                    console.log('📱 Usando datos locales, omitiendo carga de Firebase');
                }
                
                const cloudTrips = await firebaseSync.loadTrips();
                if (cloudTrips && cloudTrips.length > 0) {
                    console.log('✅ Viajes de Firebase cargados:', cloudTrips.length);
                    
                    const combinedHistorial = [...historial];
                    cloudTrips.forEach(cloudTrip => {
                        const exists = combinedHistorial.some(localTrip => localTrip.id === cloudTrip.id);
                        if (!exists) {
                            combinedHistorial.push(cloudTrip);
                        }
                    });
                    
                    historial = combinedHistorial
                        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                        .slice(0, 100);
                    
                    console.log('🔄 Historial combinado:', historial.length, 'viajes');
                    
                    localStorage.setItem('historialViajes', JSON.stringify(historial));
                }
            } catch (error) {
                console.error('❌ Error cargando Firebase:', error);
            }
        }

        if (!perfilActual && perfiles.length > 0) {
            perfilActual = perfiles[0];
        }

        actualizarInterfazPerfiles();
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
        console.log('🎉 Carga de datos completada');
        console.log('📊 Resumen final:', {
            perfiles: perfiles.length,
            historial: historial.length,
            perfilActual: perfilActual?.nombre,
            rendimiento: perfilActual?.rendimiento
        });
        
    } finally {
        loadingData = false;
    }
}

async function guardarDatos() {
    console.log('💾 Guardando datos...');
    
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    
    localStorage.setItem('DIBER_data', JSON.stringify({
        perfiles,
        perfilActual,
        historial,
        version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    }));

    console.log('✅ Datos guardados localmente');
    
    if (firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Sincronizando perfiles con Firebase...');
            for (const perfil of perfiles) {
                await firebaseSync.saveProfile(perfil);
            }
            console.log('✅ Perfiles sincronizados con Firebase');
        } catch (error) {
            console.error('❌ Error sincronizando con Firebase:', error);
        }
    }
}

// =============================================
// SISTEMA DE HISTORIAL
// =============================================

historial = JSON.parse(localStorage.getItem('historialViajes')) || [];

async function agregarAlHistorial(viaje) {
    console.log('➕ agregarAlHistorial() llamado con:', viaje);
    
    if (!viaje || (!viaje.tarifa && !viaje.ganancia)) {
        console.error('❌ Error: Viaje sin datos esenciales');
        return;
    }

    const tarifa = viaje.tarifa || viaje.ganancia || 0;
    const minutos = viaje.minutos || 0;
    const distancia = viaje.distancia || 0;
    const porMinuto = viaje.gananciaPorMinuto || (minutos > 0 ? (tarifa / minutos) : 0);
    const porKm = viaje.gananciaPorKm || (distancia > 0 ? (tarifa / distancia) : 0);
    
    let rentabilidad, emoji, texto;
    
    if (viaje.rentabilidad) {
        rentabilidad = viaje.rentabilidad;
        emoji = viaje.emoji;
        texto = viaje.texto;
    } else if (perfilActual) {
        if (porMinuto >= perfilActual.umbralMinutoRentable && 
            porKm >= perfilActual.umbralKmRentable) {
            rentabilidad = 'rentable';
            emoji = '✅';
            texto = 'RENTABLE';
        } else if (porMinuto >= perfilActual.umbralMinutoOportunidad && 
                   porKm >= perfilActual.umbralKmOportunidad) {
            rentabilidad = 'oportunidad';
            emoji = '⚠️';
            texto = 'OPORTUNIDAD';
        } else {
            rentabilidad = 'no-rentable';
            emoji = '❌';
            texto = 'NO RENTABLE';
        }
    } else {
        rentabilidad = 'no-rentable';
        emoji = '❌';
        texto = 'NO RENTABLE';
    }

    const nuevoViaje = {
        id: 'viaje_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        ganancia: tarifa,
        tarifa: tarifa,
        minutos: minutos,
        distancia: distancia,
        porMinuto: parseFloat(porMinuto.toFixed(2)),
        porKm: parseFloat(porKm.toFixed(2)),
        gananciaPorMinuto: parseFloat(porMinuto.toFixed(2)),
        gananciaPorKm: parseFloat(porKm.toFixed(2)),
        rentable: rentabilidad === 'rentable',
        rentabilidad: rentabilidad,
        emoji: emoji,
        texto: texto,
        aceptado: viaje.aceptado !== undefined ? viaje.aceptado : true,
        fecha: new Date().toLocaleString('es-DO', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }),
        timestamp: new Date().toISOString(),
        gananciaNeta: viaje.gananciaNeta || 0,
        costoCombustible: viaje.costoCombustible || 0,
        costoMantenimiento: viaje.costoMantenimiento || 0,
        costoSeguro: viaje.costoSeguro || 0,
        costoTotal: viaje.costoTotal || 0,
        perfilId: perfilActual?.id,
        perfilNombre: perfilActual?.nombre
    };
    
    console.log('📝 Viaje procesado para historial:', nuevoViaje);

    historial.unshift(nuevoViaje);
    
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    guardarDatos();
    
    console.log('💾 Historial guardado localmente. Total viajes:', historial.length);
    
    if (firebaseSync && firebaseSync.initialized && nuevoViaje.aceptado) {
        try {
            console.log('☁️ Intentando sincronizar con Firebase...');
            const exito = await firebaseSync.saveTrip(nuevoViaje);
            if (exito) {
                console.log('✅ Viaje sincronizado con Firebase');
                mostrarStatus('✅ Viaje guardado y sincronizado', 'success');
            } else {
                console.log('⚠️ Viaje guardado localmente (Firebase falló)');
                mostrarStatus('✅ Viaje guardado localmente', 'success');
            }
        } catch (error) {
            console.error('❌ Error sincronizando con Firebase:', error);
            mostrarStatus('✅ Viaje guardado localmente', 'success');
        }
    } else {
        console.log('📱 Viaje guardado localmente (Firebase no disponible)');
        mostrarStatus('✅ Viaje guardado localmente', 'success');
    }
    
    if (nuevoViaje.aceptado) {
        actualizarEstadisticasDia(nuevoViaje);
    }
    
    setTimeout(() => {
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
    }, 100);
}

function actualizarHistorialConFiltros() {
    console.log('🔄 actualizarHistorialConFiltros() ejecutándose...');
    
    if (!elementos['history-list']) {
        console.error('❌ Elemento history-list no encontrado');
        return;
    }

    const viajesFiltrados = filtrarHistorial(historial, filtroActual);
    
    if (!viajesFiltrados || viajesFiltrados.length === 0) {
        elementos['history-list'].innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <h3>No hay viajes en el historial</h3>
                <p>Los viajes que aceptes aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    elementos['history-list'].innerHTML = viajesFiltrados.map((viaje, index) => {
        const ganancia = viaje.ganancia || viaje.tarifa || 0;
        const minutos = viaje.minutos || 0;
        const distancia = viaje.distancia || 0;
        const porMinuto = viaje.porMinuto || viaje.gananciaPorMinuto || 0;
        const porKm = viaje.porKm || viaje.gananciaPorKm || 0;
        const rentable = viaje.rentable !== undefined ? 
                 Boolean(viaje.rentable) : 
                 (viaje.rentabilidad === 'rentable');
        const fecha = viaje.fecha || 'Fecha desconocida';
        
        return `
        <div class="history-item ${rentable ? 'rentable' : 'no-rentable'}">
            <div class="history-header">
                <span class="history-badge ${rentable ? 'badge-rentable' : 'badge-no-rentable'}">
                    ${rentable ? '✅ RENTABLE' : '❌ NO RENTABLE'}
                </span>
                <span class="history-date">${fecha}</span>
            </div>
            <div class="history-details">
                <div class="history-route">
                    <strong>Ganancia:</strong> ${formatearMoneda(ganancia)}
                </div>
                <div class="history-metrics">
                    <span class="metric">⏱️ ${minutos}min</span>
                    <span class="metric">🛣️ ${distancia}${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</span>
                    <span class="metric">💰 ${formatearMoneda(porMinuto)}/min</span>
                    <span class="metric">📏 ${formatearMoneda(porKm)}/${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</span>
                </div>
            </div>
            <div class="history-actions">
                <button onclick="eliminarDelHistorial('${viaje.id}')" class="delete-btn" title="Eliminar">
                    🗑️
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    console.log('✅ Historial actualizado correctamente');
}

async function eliminarDelHistorial(viajeId) {
    console.log('🗑️ Intentando eliminar viaje con ID:', viajeId);
    
    const index = historial.findIndex(viaje => viaje.id === viajeId);
    
    if (index === -1) {
        console.error('❌ Viaje no encontrado con ID:', viajeId);
        mostrarError('No se pudo encontrar el viaje para eliminar');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este viaje del historial?')) {
        historial.splice(index, 1);
        
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        console.log('✅ Viaje eliminado correctamente. Nuevo total:', historial.length);
        
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        
        mostrarMensaje('Viaje eliminado correctamente', 'success');
        
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Intentando eliminar de Firebase...');
                const tripRef = firebaseSync.db.collection('users').doc(userCodeSystem.userId)
                    .collection('trips').doc(viajeId);
                
                await tripRef.delete();
                console.log('✅ Viaje eliminado de Firebase');
            } catch (error) {
                console.error('❌ Error eliminando de Firebase:', error);
            }
        }
    }
}

async function limpiarHistorialCompleto() {
    console.log('🗑️ Solicitando limpiar historial completo...');
    
    if (historial.length === 0) {
        mostrarMensaje('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres limpiar TODO el historial?\n\nSe eliminarán ${historial.length} viajes.\n\n⚠️ Esta acción NO se puede deshacer.`)) {
        historial = [];
        
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        guardarDatos();
        
        console.log('✅ Historial completo limpiado');
        
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        
        mostrarMensaje(`✅ Historial limpiado correctamente (${historial.length} viajes)`, 'success');
        
        if (firebaseSync && firebaseSync.initialized) {
            try {
                console.log('☁️ Intentando limpiar Firebase...');
                const tripsRef = firebaseSync.db.collection('users').doc(userCodeSystem.userId)
                    .collection('trips');
                
                const snapshot = await tripsRef.get();
                const batch = firebaseSync.db.batch();
                
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                
                await batch.commit();
                console.log('✅ Historial de Firebase limpiado');
            } catch (error) {
                console.error('❌ Error limpiando Firebase:', error);
            }
        }
    }
}

// =============================================
// SISTEMA DE FILTRADO DE HISTORIAL
// =============================================

function filtrarHistorial(historial, filtro) {
    if (!historial || historial.length === 0) return [];
    
    const ahora = new Date();
    
    switch (filtro) {
        case 'hoy':
            const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
            return historial.filter(viaje => {
                try {
                    const fechaViaje = new Date(viaje.timestamp);
                    return fechaViaje >= hoy;
                } catch (error) {
                    return false;
                }
            });
            
        case 'semana':
            const inicioSemana = new Date(ahora);
            inicioSemana.setDate(ahora.getDate() - ahora.getDay());
            inicioSemana.setHours(0, 0, 0, 0);
            return historial.filter(viaje => {
                try {
                    const fechaViaje = new Date(viaje.timestamp);
                    return fechaViaje >= inicioSemana;
                } catch (error) {
                    return false;
                }
            });
            
        case 'mes':
            const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
            return historial.filter(viaje => {
                try {
                    const fechaViaje = new Date(viaje.timestamp);
                    return fechaViaje >= inicioMes;
                } catch (error) {
                    return false;
                }
            });
            
        case 'todos':
        default:
            return historial;
    }
}

function cambiarFiltroHistorial(nuevoFiltro) {
    filtroActual = nuevoFiltro;
    
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filtro === nuevoFiltro);
    });
    
    actualizarHistorialConFiltros();
}

// =============================================
// SISTEMA DE PESTAÑAS
// =============================================

function inicializarTabs() {
    console.log('🔄 Inicializando sistema de pestañas...');
    
    if (!elementos.tabButtons || elementos.tabButtons.length === 0) {
        console.error('❌ No se encontraron botones de pestañas');
        return;
    }
    
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            console.log('📁 Cambiando a pestaña:', tabId);
            cambiarPestana(tabId);
        });
    });
    
    console.log('✅ Sistema de pestañas inicializado');
}

function cambiarPestana(tabId) {
    if (!elementos.tabButtons || !elementos.tabContents) return;
    
    elementos.tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
    
    elementos.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
    
    if (tabId === 'resumen') {
        actualizarEstadisticas();
    } else if (tabId === 'historial') {
        actualizarHistorialConFiltros();
    }
}

// =============================================
// SISTEMA DE CÁLCULO
// =============================================

function manejarCalculoAutomatico() {
    console.log('🔄 Input cambiado, manejando cálculo automático...');
    
    // Limpiar timeout anterior
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    
    // Configurar nuevo timeout
    timeoutCalculo = setTimeout(calcularAutomatico, 800);
}

function calcularAutomatico() {
    console.log('🧮 Ejecutando cálculo automático...');
    
    if (!elementos.tarifa || !elementos.minutos || !elementos.distancia) {
        console.error('❌ Elementos de formulario no encontrados');
        return;
    }
    
    const tarifa = parseFloat(elementos.tarifa.value) || 0;
    const minutos = parseFloat(elementos.minutos.value) || 0;
    const distancia = parseFloat(elementos.distancia.value) || 0;
    
    console.log('📊 Datos ingresados:', { tarifa, minutos, distancia });
    
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        console.log('✅ Datos completos, calculando rentabilidad...');
        
        const resultado = calcularRentabilidad(tarifa, minutos, distancia);
        
        if (resultado) {
            calculoActual = resultado;
            console.log('🎯 Resultado del cálculo:', resultado);
            
            // 🚨 SOLO MOSTRAR MODAL POP-UP, NO RESULTADO INSTANTÁNEO
            mostrarModalRapidoSimplificado(resultado);
        } else {
            console.error('❌ Error en el cálculo de rentabilidad');
        }
    } else {
        console.log('📝 Datos incompletos, ocultando modal...');
        cerrarModalRapido();
    }
}

function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) {
        console.error('❌ No hay perfil actual para calcular');
        return null;
    }
    
    try {
        console.log('🔧 Calculando rentabilidad con perfil:', perfilActual.nombre);
        
        const combustibleUsado = distancia / perfilActual.rendimiento;
        const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
        
        const costoMantenimientoPorKm = (perfilActual.costoMantenimiento || 0) / 1500;
        const costoSeguroPorMinuto = (perfilActual.costoSeguro || 0) / (30 * 24 * 60);
        
        const costoMantenimiento = distancia * costoMantenimientoPorKm;
        const costoSeguro = minutos * costoSeguroPorMinuto;
        const costoTotal = costoCombustible + costoMantenimiento + costoSeguro;
        const gananciaNeta = tarifa - costoTotal;
        
        const gananciaPorMinuto = minutos > 0 ? (tarifa / minutos) : 0;
        const gananciaPorKm = distancia > 0 ? (tarifa / distancia) : 0;
        
        let rentabilidad, emoji, texto;
        
        console.log('📐 Umbrales del perfil:', {
            minRent: perfilActual.umbralMinutoRentable,
            kmRent: perfilActual.umbralKmRentable,
            minOport: perfilActual.umbralMinutoOportunidad,
            kmOport: perfilActual.umbralKmOportunidad
        });
        
        console.log('📊 Métricas calculadas:', {
            gananciaPorMinuto,
            gananciaPorKm
        });
        
        if (gananciaPorMinuto >= perfilActual.umbralMinutoRentable && 
            gananciaPorKm >= perfilActual.umbralKmRentable) {
            rentabilidad = 'rentable';
            emoji = '✅';
            texto = 'RENTABLE';
        } else if (gananciaPorMinuto >= perfilActual.umbralMinutoOportunidad && 
                   gananciaPorKm >= perfilActual.umbralKmOportunidad) {
            rentabilidad = 'oportunidad';
            emoji = '⚠️';
            texto = 'OPORTUNIDAD';
        } else {
            rentabilidad = 'no-rentable';
            emoji = '❌';
            texto = 'NO RENTABLE';
        }
        
        const resultado = {
            tarifa, minutos, distancia, gananciaNeta, gananciaPorMinuto, gananciaPorKm,
            costoCombustible, costoMantenimiento, costoSeguro, costoTotal,
            rentabilidad, emoji, texto, timestamp: new Date().toISOString()
        };
        
        console.log('🎉 Resultado final:', resultado);
        return resultado;
        
    } catch (error) {
        console.error('❌ Error en el cálculo:', error);
        mostrarError('Error en el cálculo. Verifica los datos ingresados.');
        return null;
    }
}

// =============================================
// SISTEMA DE PERFILES
// =============================================

function mostrarConfigPerfil(perfil = null) {
    const form = elementos['perfil-form'];
    if (!form) return;
    
    if (perfil) {
        document.getElementById('perfil-id').value = perfil.id;
        document.getElementById('nombre-perfil').value = perfil.nombre;
        document.getElementById('tipo-medida').value = perfil.tipoMedida;
        document.getElementById('tipo-combustible').value = perfil.tipoCombustible;
        document.getElementById('rendimiento').value = perfil.rendimiento;
        document.getElementById('precio-combustible').value = perfil.precioCombustible;
        document.getElementById('moneda').value = perfil.moneda;
        
        document.getElementById('umbral-minuto-rentable').value = perfil.umbralMinutoRentable || 6.00;
        document.getElementById('umbral-km-rentable').value = perfil.umbralKmRentable || 25.00;
        document.getElementById('umbral-minuto-oportunidad').value = perfil.umbralMinutoOportunidad || 5.00;
        document.getElementById('umbral-km-oportunidad').value = perfil.umbralKmOportunidad || 23.00;
        
        document.getElementById('costo-seguro').value = perfil.costoSeguro || 0;
        document.getElementById('costo-mantenimiento').value = perfil.costoMantenimiento || 0;
    } else {
        form.reset();
        document.getElementById('perfil-id').value = '';
        document.getElementById('umbral-minuto-rentable').value = '6.00';
        document.getElementById('umbral-km-rentable').value = '25.00';
        document.getElementById('umbral-minuto-oportunidad').value = '5.00';
        document.getElementById('umbral-km-oportunidad').value = '23.00';
    }
    
    actualizarUnidades();
    mostrarPantalla('config-perfil');
}

function guardarPerfil(event) {
    event.preventDefault();
    
    const perfilId = document.getElementById('perfil-id').value;
    
    const perfil = {
        id: perfilId || 'perfil_' + Date.now(),
        nombre: document.getElementById('nombre-perfil').value,
        tipoMedida: document.getElementById('tipo-medida').value,
        tipoCombustible: document.getElementById('tipo-combustible').value,
        rendimiento: parseFloat(document.getElementById('rendimiento').value),
        precioCombustible: parseFloat(document.getElementById('precio-combustible').value),
        moneda: document.getElementById('moneda').value,
        umbralMinutoRentable: parseFloat(document.getElementById('umbral-minuto-rentable').value),
        umbralKmRentable: parseFloat(document.getElementById('umbral-km-rentable').value),
        umbralMinutoOportunidad: parseFloat(document.getElementById('umbral-minuto-oportunidad').value),
        umbralKmOportunidad: parseFloat(document.getElementById('umbral-km-oportunidad').value),
        costoSeguro: parseFloat(document.getElementById('costo-seguro').value) || 0,
        costoMantenimiento: parseFloat(document.getElementById('costo-mantenimiento').value) || 0,
        fechaCreacion: perfilId ? perfiles.find(p => p.id === perfilId)?.fechaCreacion || new Date().toISOString() : new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
    
    if (!perfil.nombre || !perfil.rendimiento || !perfil.precioCombustible) {
        mostrarError('Por favor, completa todos los campos requeridos');
        return;
    }
    
    console.log('💾 Guardando perfil con rendimiento:', perfil.rendimiento);
    console.log('💾 Umbrales guardados:', {
        minRent: perfil.umbralMinutoRentable,
        kmRent: perfil.umbralKmRentable,
        minOport: perfil.umbralMinutoOportunidad,
        kmOport: perfil.umbralKmOportunidad
    });
    
    if (perfilId) {
        const index = perfiles.findIndex(p => p.id === perfilId);
        if (index !== -1) {
            perfiles[index] = perfil;
        }
    } else {
        perfiles.push(perfil);
    }
    
    if (!perfilActual || perfilId === perfilActual.id) {
        perfilActual = perfil;
    }
    
    guardarDatos();
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
    mostrarStatus('💾 Perfil guardado exitosamente', 'success');
}

function actualizarInterfazPerfiles() {
    if (!elementos['perfiles-lista']) return;
    
    elementos['perfiles-lista'].innerHTML = '';
    
    if (perfiles.length === 0) {
        elementos['perfiles-lista'].innerHTML = `
            <div class="perfil-item" style="text-align: center; opacity: 0.7;">
                <div class="perfil-nombre">No hay perfiles creados</div>
                <div class="perfil-detalles">Crea tu primer perfil para comenzar</div>
            </div>
        `;
        return;
    }
    
    perfiles.forEach(perfil => {
        const perfilItem = document.createElement('div');
        perfilItem.className = `perfil-item ${perfil.id === perfilActual?.id ? 'active' : ''}`;
        
        const unidadRendimiento = perfil.tipoMedida === 'mi' ? 'mpg' : 'Km/Gl';
        const detalles = `${perfil.rendimiento} ${unidadRendimiento} • ${perfil.moneda}`;
        
        perfilItem.innerHTML = `
            <div class="perfil-nombre">${perfil.nombre}</div>
            <div class="perfil-detalles">
                <span>${detalles}</span>
                <span>${perfil.tipoCombustible.toUpperCase()}</span>
            </div>
            <div class="perfil-acciones">
                <button class="secondary-button small" onclick="seleccionarPerfil('${perfil.id}')">
                    <span class="button-icon">🚗</span>
                    Usar
                </button>
                <button class="secondary-button small" onclick="editarPerfil('${perfil.id}')">
                    <span class="button-icon">✏️</span>
                    Editar
                </button>
                <button class="secondary-button small" onclick="eliminarPerfil('${perfil.id}')">
                    <span class="button-icon">🗑️</span>
                    Eliminar
                </button>
            </div>
        `;
        
        elementos['perfiles-lista'].appendChild(perfilItem);
    });
}

function seleccionarPerfil(perfilId) {
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        perfilActual = perfil;
        guardarDatos();
        mostrarPantalla('main');
        mostrarStatus(`🚗 Perfil "${perfil.nombre}" activado`, 'success');
        actualizarUnidades();
        actualizarEstadisticas();
    }
}

function editarPerfil(perfilId) {
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        mostrarConfigPerfil(perfil);
    }
}

function eliminarPerfil(perfilId) {
    if (perfiles.length <= 1) {
        mostrarError('No puedes eliminar el único perfil existente');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este perfil? Esta acción no se puede deshacer.')) {
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
        }
        
        guardarDatos();
        actualizarInterfazPerfiles();
        mostrarStatus('🗑️ Perfil eliminado correctamente', 'success');
    }
}

// =============================================
// FUNCIONES DE UTILIDAD - ACTUALIZADAS
// =============================================

function mostrarPantalla(pantalla) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (pantalla === 'perfil') {
        if (elementos['perfil-screen']) {
            elementos['perfil-screen'].classList.add('active');
        }
    } else if (pantalla === 'config-perfil') {
        if (elementos['config-perfil-screen']) {
            elementos['config-perfil-screen'].classList.add('active');
        }
    } else if (pantalla === 'main') {
        if (elementos['main-screen']) {
            elementos['main-screen'].classList.add('active');
        }
        actualizarUnidades();
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
    }
}

function actualizarEstadisticas() {
    console.log('📊 Actualizando estadísticas...');
    
    if (!elementos['stats-viajes'] || !elementos['stats-ganancia']) {
        return;
    }
    
    const hoy = new Date().toDateString();
    const viajesHoy = historial.filter(item => {
        if (!item.aceptado) return false;
        try {
            const itemDate = new Date(item.timestamp).toDateString();
            return itemDate === hoy;
        } catch (error) {
            return false;
        }
    });
    
    const totalViajes = viajesHoy.length;
    const gananciaTotal = viajesHoy.reduce((sum, item) => sum + (item.ganancia || item.tarifa || 0), 0);
    const tiempoTotal = viajesHoy.reduce((sum, item) => sum + (item.minutos || 0), 0);
    const distanciaTotal = viajesHoy.reduce((sum, item) => sum + (item.distancia || 0), 0);
    
    const viajesRentables = viajesHoy.filter(item => {
        return item.rentable === true || item.rentabilidad === 'rentable';
    }).length;
    
    elementos['stats-viajes'].textContent = totalViajes;
    elementos['stats-ganancia'].textContent = formatearMoneda(gananciaTotal);
    
    if (elementos['stats-tiempo']) {
        elementos['stats-tiempo'].textContent = `${tiempoTotal}min`;
    }
    
    if (elementos['stats-rentables']) {
        elementos['stats-rentables'].textContent = viajesRentables;
    }
    
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    const eficiencia = totalViajes > 0 ? (viajesRentables / totalViajes * 100) : 0;
    
    actualizarRendimientoUnificado(gananciaPorHora, viajePromedio, distanciaTotal, eficiencia);
    
    console.log('📈 Estadísticas de HOY actualizadas:', {
        totalViajes,
        viajesRentables,
        eficiencia: `${eficiencia.toFixed(1)}%`,
        gananciaTotal: formatearMoneda(gananciaTotal),
        gananciaPorHora: formatearMoneda(gananciaPorHora),
        distanciaTotal: `${distanciaTotal} km`,
        fecha: hoy
    });
}

function actualizarRendimientoUnificado(gananciaPorHora, viajePromedio, distanciaTotal, eficiencia) {
    console.log('🎯 Actualizando rendimiento unificado...');
    
    const elementosRendimiento = {
        'rendimiento-ganancia-hora-card': formatearMoneda(gananciaPorHora),
        'rendimiento-viaje-promedio-linea': formatearMoneda(viajePromedio),
        'rendimiento-distancia-total-card': `${distanciaTotal} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}`,
        'rendimiento-ganancia-hora-linea': `${formatearMoneda(gananciaPorHora)} por hora`,
        'rendimiento-eficiencia-card': `${eficiencia.toFixed(1)}%`,
        'rendimiento-eficiencia-badge': `Eficiencia: ${eficiencia.toFixed(1)}%`
    };
    
    Object.entries(elementosRendimiento).forEach(([id, valor]) => {
        const elemento = document.getElementById(id);
        if (elemento) {
            elemento.textContent = valor;
        }
    });
    
    const progresoFill = document.getElementById('progreso-eficiencia-fill');
    if (progresoFill) {
        progresoFill.style.width = `${Math.min(eficiencia, 100)}%`;
        
        if (eficiencia >= 80) {
            progresoFill.style.background = 'linear-gradient(90deg, #00b09b 0%, #96c93d 100%)';
        } else if (eficiencia >= 60) {
            progresoFill.style.background = 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)';
        } else if (eficiencia >= 40) {
            progresoFill.style.background = 'linear-gradient(90deg, #ff9a9e 0%, #fecfef 100%)';
        } else {
            progresoFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ffa8a8 100%)';
        }
    }
    
    console.log('✅ Rendimiento unificado actualizado con diseño mejorado');
}

function obtenerEstadisticasCompletas() {
    const viajesAceptados = historial.filter(v => v.aceptado === true);
    const totalViajes = viajesAceptados.length;
    
    const viajesRentables = viajesAceptados.filter(v => {
        return v.rentable === true || v.rentabilidad === 'rentable';
    }).length;
    
    const gananciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.ganancia || v.tarifa || 0), 0);
    const tiempoTotal = viajesAceptados.reduce((sum, v) => sum + (v.minutos || 0), 0);
    const distanciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.distancia || 0), 0);
    
    const costoCombustibleTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoCombustible || 0), 0);
    const costoMantenimientoTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoMantenimiento || 0), 0);
    const costoSeguroTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoSeguro || 0), 0);
    const costoTotal = costoCombustibleTotal + costoMantenimientoTotal + costoSeguroTotal;
    
    const gananciaNeta = gananciaTotal - costoTotal;
    const eficiencia = totalViajes > 0 ? (viajesRentables / totalViajes * 100) : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;

    return {
        viajesAceptados,
        totalViajes,
        viajesRentables,
        gananciaTotal,
        tiempoTotal,
        distanciaTotal,
        costoCombustibleTotal,
        costoMantenimientoTotal,
        costoSeguroTotal,
        costoTotal,
        gananciaNeta,
        eficiencia,
        viajePromedio,
        gananciaPorHora
    };
}

function actualizarEstadisticasDia(viaje) {
    console.log('📊 Actualizando estadísticas del día:', viaje);
}

function actualizarUnidades() {
    const tipoMedida = perfilActual?.tipoMedida || 'km';
    const moneda = perfilActual?.moneda || 'DOP';
    
    const distanciaUnit = document.getElementById('distancia-unit');
    const monedaTarifa = document.getElementById('moneda-tarifa');
    
    if (distanciaUnit) {
        distanciaUnit.textContent = tipoMedida === 'mi' ? 'mi' : 'Km';
    }
    if (monedaTarifa) {
        monedaTarifa.textContent = moneda;
    }
}

function formatearMoneda(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

function mostrarError(mensaje) {
    mostrarStatus(mensaje, 'error');
}

function mostrarStatus(mensaje, tipo = 'info') {
    if (!elementos['status-indicator'] || !elementos['status-text']) return;
    
    elementos['status-text'].textContent = mensaje;
    elementos['status-indicator'].className = `status-indicator ${tipo}`;
    elementos['status-indicator'].classList.remove('hidden');
    
    setTimeout(() => {
        elementos['status-indicator'].classList.add('hidden');
    }, 3000);
}

function mostrarMensaje(mensaje, tipo = 'info') {
    mostrarStatus(mensaje, tipo);
}

function limpiarFormulario() {
    console.log('🧹 Limpiando formulario...');
    
    // SOLO limpiar cuando el usuario lo decida explícitamente
    // No limpiar automáticamente durante el cálculo
}

function limpiarFormularioCompleto() {
    console.log('🗑️ Limpiando formulario completo...');
    
    if (elementos.tarifa) elementos.tarifa.value = '';
    if (elementos.minutos) elementos.minutos.value = '';
    if (elementos.distancia) elementos.distancia.value = '';
    
    calculoActual = null;
    cerrarModalRapido();
    
    console.log('✅ Formulario limpiado completamente');
}

function cerrarModal() {
    if (elementos.modalFondo) {
        elementos.modalFondo.style.display = 'none';
    }
}

function cerrarModalRapido() {
    const modalRapido = document.getElementById('modal-rapido');
    if (modalRapido) {
        modalRapido.classList.add('hidden');
        // Limpiar formulario al cerrar modal
        limpiarFormularioCompleto();
    }
}

function cerrarExportModal() {
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'none';
    }
}

function cerrarSyncPanel() {
    console.log('❌ Cerrando panel de sincronización');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
}

// =============================================
// FUNCIONES DE PROCESAMIENTO DE VIAJES
// =============================================

function procesarViaje(aceptado) {
    console.log('🔄 Procesando viaje:', { aceptado, calculoActual: !!calculoActual });
    
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    if (!perfilActual) {
        mostrarError('No hay perfil seleccionado. Por favor, selecciona un perfil primero.');
        return;
    }

    try {
        guardarEnHistorial(calculoActual, aceptado);
        
        if (aceptado) {
            mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
        } else {
            mostrarStatus('❌ Viaje rechazado', 'info');
        }

        // LIMPIAR FORMULARIO SOLO DESPUÉS DE PROCESAR
        limpiarFormularioCompleto();
        cerrarModal();
        
        actualizarEstadisticas();
        actualizarHistorialConFiltros();
        
    } catch (error) {
        console.error('❌ Error procesando viaje:', error);
        mostrarError('Error al procesar el viaje');
    }
}

function procesarViajeRapido(aceptado) {
    console.log('⚡ Procesando viaje rápido:', { aceptado, calculoActual: !!calculoActual });
    
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    cerrarModalRapido();
    
    const viajeParaHistorial = {
        ...calculoActual,
        aceptado: aceptado,
        rentable: calculoActual.rentabilidad === 'rentable',
        emoji: calculoActual.emoji,
        texto: calculoActual.texto
    };
    
    agregarAlHistorial(viajeParaHistorial);
    
    if (aceptado) {
        mostrarMensaje('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        mostrarMensaje('❌ Viaje rechazado', 'info');
    }
    
    // LIMPIAR FORMULARIO SOLO DESPUÉS DE PROCESAR
    limpiarFormularioCompleto();
    
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
}

function guardarEnHistorial(resultado, aceptado) {
    console.log('💾 GUARDANDO EN HISTORIAL...', { aceptado, resultado });
    
    if (!resultado) {
        console.error('❌ No hay resultado para guardar');
        return;
    }

    const historialItem = {
        ...resultado,
        aceptado: aceptado,
        id: 'viaje_' + Date.now(),
        perfilId: perfilActual?.id,
        perfilNombre: perfilActual?.nombre,
        timestamp: new Date().toISOString(),
        rentable: resultado.rentabilidad === 'rentable',
        emoji: resultado.emoji,
        texto: resultado.texto
    };
    
    console.log('📝 Item a guardar:', historialItem);
    console.log('🎯 Rentabilidad del viaje:', historialItem.rentabilidad, 'Rentable:', historialItem.rentable);
    
    historial.unshift(historialItem);
    console.log('✅ Agregado al historial local. Total:', historial.length);
    
    if (aceptado && firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Guardando en Firebase...');
            firebaseSync.saveTrip(historialItem);
            console.log('✅ Guardado en Firebase');
        } catch (error) {
            console.error('❌ Error guardando en Firebase:', error);
        }
    }
    
    guardarDatos();
    console.log('✅ Datos guardados en localStorage');
    
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
    
    console.log('🎉 Proceso de guardado completado');
}

// =============================================
// SISTEMA DE RESULTADO RÁPIDO - MODIFICADO
// =============================================

function mostrarResultadoRapido(resultado) {
    if (!resultado) {
        console.error('❌ No hay resultado para mostrar');
        return;
    }

    console.log('🚀 Mostrando resultado rápido:', resultado);

    // Actualizar resultado rápido en la interfaz principal
    if (elementos['resultado-rapido']) {
        elementos['resultado-rapido'].classList.remove('hidden');
        
        if (elementos['resultado-emoji']) {
            elementos['resultado-emoji'].textContent = resultado.emoji;
        }
        if (elementos['resultado-texto']) {
            elementos['resultado-texto'].textContent = resultado.texto;
        }
        if (elementos['resultado-badge']) {
            elementos['resultado-badge'].className = `resultado-badge ${resultado.rentabilidad}`;
        }
        if (elementos['metrica-minuto']) {
            elementos['metrica-minuto'].textContent = formatearMoneda(resultado.gananciaPorMinuto);
        }
        if (elementos['metrica-km']) {
            elementos['metrica-km'].textContent = formatearMoneda(resultado.gananciaPorKm);
        }
    }

    // Mostrar modal rápido mejorado
    mostrarModalRapidoMejorado(resultado);
}

function mostrarModalRapidoSimplificado(resultado) {
    if (!resultado) return;

    let modal = document.getElementById('modal-rapido');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-rapido';
        modal.className = 'modal-rapido-mejorado hidden';
        document.body.appendChild(modal);
    }

    const tieneTrafico = resultado.trafficAnalysis;
    const trafficInfo = tieneTrafico ? resultado.trafficAnalysis.trafficInfo : { emoji: '🚦', text: 'SIN DATOS' };
    const tiempoReal = tieneTrafico ? resultado.trafficAnalysis.adjustedTime : resultado.minutos;
    
    modal.innerHTML = `
        <div class="modal-rapido-contenido-mejorado">
            <div class="modal-trafico-header ${tieneTrafico ? 'trafico-' + resultado.trafficAnalysis.trafficCondition : 'trafico-low'}">
                <div class="trafico-status" id="modal-trafico-status">
                    <span class="trafico-emoji-big">${trafficInfo.emoji}</span>
                    <div class="trafico-info">
                        <div class="trafico-title">Análisis de Tráfico</div>
                        <div class="trafico-condition" id="modal-trafico-condition">${trafficInfo.text.toUpperCase()}</div>
                    </div>
                </div>
                <button class="modal-cerrar-elegante" onclick="cerrarModalRapido()">
                    <span>×</span>
                </button>
            </div>

            <div class="tiempo-ajustado-section">
                <div class="tiempo-original">
                    <span class="tiempo-label">Tiempo estimado:</span>
                    <span class="tiempo-valor" id="modal-tiempo-original">${resultado.minutos || 0} min</span>
                </div>
                <div class="flecha-ajuste">↓</div>
                <div class="tiempo-real">
                    <span class="tiempo-label">Con tráfico real:</span>
                    <span class="tiempo-valor destacado" id="modal-tiempo-real">${tiempoReal} min</span>
                </div>
            </div>

            <!-- 🎯 SOLO INFORMACIÓN DE RENTABILIDAD - ELIMINADAS MÉTRICAS BÁSICAS -->
            <div class="resultado-principal" id="modal-resultado-principal">
                <div class="badge-rentabilidad ${resultado.rentabilidad}" id="modal-badge-rentabilidad">
                    <div class="badge-emoji">${resultado.emoji}</div>
                    <div class="badge-content">
                        <div class="badge-title">${resultado.texto}</div>
                        <div class="badge-subtitle" id="modal-badge-subtitle">${obtenerSubtituloRentabilidad(resultado)}</div>
                    </div>
                </div>
            </div>

            <!-- 📊 MÉTRICAS DE RENTABILIDAD ÚTILES -->
            <div class="metricas-grid-mejorado">
                <div class="metrica-card">
                    <div class="metrica-icono">💰</div>
                    <div class="metrica-content">
                        <div class="metrica-valor">${formatearMoneda(resultado.gananciaPorMinuto)}/min</div>
                        <div class="metrica-label">Ganancia por minuto</div>
                    </div>
                </div>
                <div class="metrica-card">
                    <div class="metrica-icono">📈</div>
                    <div class="metrica-content">
                        <div class="metrica-valor">${formatearMoneda(resultado.gananciaPorKm)}/${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</div>
                        <div class="metrica-label">Ganancia por km</div>
                    </div>
                </div>
                <div class="metrica-card">
                    <div class="metrica-icono">🎯</div>
                    <div class="metrica-content">
                        <div class="metrica-valor">${calcularEficiencia(resultado)}%</div>
                        <div class="metrica-label">Nivel de eficiencia</div>
                    </div>
                </div>
            </div>

            ${tieneTrafico ? `
            <div class="impacto-trafico" id="modal-impacto-trafico">
                <div class="impacto-header">
                    <span class="impacto-icon">📈</span>
                    <span class="impacto-title">Impacto del Tráfico</span>
                </div>
                <div class="impacto-content" id="modal-impacto-content">
                    ${obtenerMensajeImpacto(resultado.trafficAnalysis)}
                </div>
            </div>
            ` : ''}

            <div class="acciones-mejoradas">
                <button class="btn-rechazar-elegante" onclick="procesarViajeRapido(false)">
                    <span class="btn-icon">❌</span>
                    <span class="btn-text">Rechazar Viaje</span>
                    <span class="btn-badge" id="modal-badge-rechazar">No rentable</span>
                </button>
                <button class="btn-aceptar-elegante" onclick="procesarViajeRapido(true)" id="modal-btn-aceptar">
                    <span class="btn-icon">✅</span>
                    <span class="btn-text">Aceptar Viaje</span>
                    <span class="btn-badge" id="modal-badge-aceptar">${resultado.rentabilidad === 'rentable' ? 'Recomendado' : 'Con cuidado'}</span>
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    console.log('✅ Modal pop-up simplificado mostrado');
}

// =============================================
// FUNCIONES AUXILIARES
// =============================================

function obtenerSubtituloRentabilidad(resultado) {
    const porMinuto = resultado.gananciaPorMinuto;
    if (porMinuto >= 20) return 'Excelentes ganancias';
    if (porMinuto >= 15) return 'Buenas condiciones';
    if (porMinuto >= 10) return 'Condiciones regulares';
    return 'Ganancias bajas';
}

function obtenerMensajeImpacto(trafficAnalysis) {
    if (!trafficAnalysis) return 'Sin datos de tráfico';
    
    const ajuste = trafficAnalysis.adjustment;
    if (ajuste > 50) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Viaje significativamente afectado`;
    if (ajuste > 20) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Considerar el impacto`;
    if (ajuste > 0) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Impacto mínimo`;
    return 'Tráfico fluido - Sin impacto en el tiempo';
}

function calcularEficiencia(resultado) {
    // Calcular eficiencia basada en ganancia por minuto
    const eficiencia = Math.min((resultado.gananciaPorMinuto / 25) * 100, 100);
    return eficiencia.toFixed(0);
}

function obtenerMensajeImpacto(trafficAnalysis) {
    if (!trafficAnalysis) return 'Sin datos de tráfico';
    
    const ajuste = trafficAnalysis.adjustment;
    if (ajuste > 50) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Viaje significativamente afectado`;
    if (ajuste > 20) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Considerar el impacto`;
    if (ajuste > 0) return `El tráfico aumenta el tiempo en un <strong>${ajuste}%</strong> - Impacto mínimo`;
    return 'Tráfico fluido - Sin impacto en el tiempo';
}

// =============================================
// SISTEMA DE ANÁLISIS DE TRÁFICO
// =============================================

class TrafficRadiusAnalyzer {
    constructor() {
        this.radiusKm = 10;
        this.congestionLevels = {
            low: { factor: 1.0, emoji: '✅', color: '#4CAF50', text: 'Fluido' },
            moderate: { factor: 1.3, emoji: '⚠️', color: '#FF9800', text: 'Moderado' },
            heavy: { factor: 1.7, emoji: '🚗', color: '#F44336', text: 'Pesado' },
            severe: { factor: 2.2, emoji: '🚨', color: '#D32F2F', text: 'Muy Pesado' }
        };
        this.lastLocation = null;
    }

    async quickTrafficAnalysis(userMinutes) {
        console.log('⚡ Análisis rápido de tráfico...');
        
        try {
            const location = await this.getQuickLocation();
            const trafficCondition = this.instantTrafficCheck();
            const adjustedTime = Math.ceil(userMinutes * this.congestionLevels[trafficCondition].factor);
            
            return {
                originalTime: userMinutes,
                adjustedTime: adjustedTime,
                trafficCondition: trafficCondition,
                trafficInfo: this.congestionLevels[trafficCondition],
                adjustment: ((this.congestionLevels[trafficCondition].factor - 1) * 100).toFixed(0),
                isSignificant: adjustedTime > userMinutes * 1.2,
                location: location
            };
            
        } catch (error) {
            console.log('🔄 Usando estimación conservadora');
            return this.getConservativeEstimate(userMinutes);
        }
    }

    async getQuickLocation() {
        if (this.lastLocation && Date.now() - this.lastLocation.timestamp < 30000) {
            return this.lastLocation.coords;
        }
        
        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    };
                    
                    this.lastLocation = {
                        coords: coords,
                        timestamp: Date.now()
                    };
                    
                    resolve(coords);
                },
                (error) => {
                    console.warn('Error obteniendo ubicación:', error);
                    reject(error);
                },
                { 
                    enableHighAccuracy: false,
                    timeout: 3000,
                    maximumAge: 60000
                }
            );
        });
    }

    instantTrafficCheck() {
        const now = new Date();
        const hour = now.getHours();
        const day = now.getDay();
        const isWeekend = day === 0 || day === 6;
        
        if (isWeekend) {
            if (hour >= 11 && hour <= 20) return 'moderate';
            return 'low';
        } else {
            if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) return 'heavy';
            if ((hour >= 12 && hour <= 14)) return 'moderate';
            return 'low';
        }
    }

    getConservativeEstimate(userMinutes) {
        const hour = new Date().getHours();
        const isPeak = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
        const factor = isPeak ? 1.6 : 1.2;
        
        return {
            originalTime: userMinutes,
            adjustedTime: Math.ceil(userMinutes * factor),
            trafficCondition: isPeak ? 'heavy' : 'moderate',
            trafficInfo: this.congestionLevels[isPeak ? 'heavy' : 'moderate'],
            adjustment: ((factor - 1) * 100).toFixed(0),
            isSignificant: true,
            location: null
        };
    }
}

async function inicializarSistemaTrafico() {
    console.log('🚗 Inicializando sistema de análisis de tráfico...');
    
    try {
        trafficAnalyzer = new TrafficRadiusAnalyzer();
        trafficInitialized = true;
        console.log('✅ Sistema de tráfico inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error inicializando sistema de tráfico:', error);
    }
}

// =============================================
// CONFIGURACIÓN DE EVENT LISTENERS
// =============================================

function configurarEventListeners() {
    console.log('🎯 Configurando event listeners...');
    
    inicializarTabs();
    
    // Event listeners para inputs
    if (elementos.tarifa) {
        elementos.tarifa.addEventListener('input', manejarCalculoAutomatico);
    }
    
    if (elementos.minutos) {
        elementos.minutos.addEventListener('input', manejarCalculoAutomatico);
    }
    
    if (elementos.distancia) {
        elementos.distancia.addEventListener('input', manejarCalculoAutomatico);
    }
    
    // Botones de acción
    if (elementos['aceptar-viaje']) {
        elementos['aceptar-viaje'].addEventListener('click', () => procesarViaje(true));
    }
    
    if (elementos['rechazar-viaje']) {
        elementos['rechazar-viaje'].addEventListener('click', () => procesarViaje(false));
    }
    
    // Botón para limpiar manualmente
    const botonLimpiar = document.getElementById('limpiar-formulario');
    if (!botonLimpiar) {
        // Crear botón de limpiar si no existe
        const actionsContainer = document.querySelector('.action-buttons');
        if (actionsContainer) {
            const limpiarBtn = document.createElement('button');
            limpiarBtn.id = 'limpiar-formulario';
            limpiarBtn.className = 'secondary-button';
            limpiarBtn.innerHTML = '<span class="button-icon">🧹</span> Limpiar';
            limpiarBtn.onclick = limpiarFormularioCompleto;
            actionsContainer.appendChild(limpiarBtn);
        }
    }
    
    if (elementos.tarifa) {
        elementos.tarifa.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.minutos) {
        elementos.minutos.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.distancia) {
        elementos.distancia.addEventListener('input', manejarCalculoAutomatico);
    }
    
    if (elementos['aceptar-viaje']) {
        elementos['aceptar-viaje'].addEventListener('click', () => procesarViaje(true));
    }
    if (elementos['rechazar-viaje']) {
        elementos['rechazar-viaje'].addEventListener('click', () => procesarViaje(false));
    }
    
    if (elementos['clear-history']) {
        elementos['clear-history'].addEventListener('click', limpiarHistorialCompleto);
    }
    
    if (elementos['exportar-historial']) {
        elementos['exportar-historial'].addEventListener('click', mostrarExportModal);
    }
    
    if (elementos['nuevo-perfil-btn']) {
        elementos['nuevo-perfil-btn'].addEventListener('click', () => mostrarConfigPerfil());
    }
    
    if (elementos['volver-perfiles']) {
        elementos['volver-perfiles'].addEventListener('click', () => mostrarPantalla('perfil'));
    }
    
    if (elementos['cancelar-perfil']) {
        elementos['cancelar-perfil'].addEventListener('click', () => mostrarPantalla('perfil'));
    }
    
    if (elementos['cambiar-perfil']) {
        elementos['cambiar-perfil'].addEventListener('click', () => mostrarPantalla('perfil'));
    }
    
    if (elementos['perfil-form']) {
        elementos['perfil-form'].addEventListener('submit', guardarPerfil);
    }
    
    if (elementos['theme-toggle']) {
        elementos['theme-toggle'].addEventListener('click', alternarTema);
    }
    
    if (elementos['sync-status-btn']) {
        elementos['sync-status-btn'].addEventListener('click', mostrarPanelSync);
    }
    
    if (elementos['activar-ubicacion-btn']) {
        elementos['activar-ubicacion-btn'].addEventListener('click', activarUbicacion);
    }
    
    document.querySelectorAll('.filtro-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            cambiarFiltroHistorial(btn.dataset.filtro);
        });
    });
    
    console.log('✅ Event listeners configurados correctamente');
}

function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('DIBER_theme', newTheme);
    
    const themeIcon = elementos['theme-toggle']?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

function aplicarTemaGuardado() {
    const savedTheme = localStorage.getItem('DIBER_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = elementos['theme-toggle']?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// =============================================
// FUNCIÓN PARA ACTIVAR UBICACIÓN
// =============================================

function activarUbicacion() {
    console.log('📍 Activando sistema de ubicación...');
    
    const btn = document.getElementById('activar-ubicacion-btn');
    const status = document.getElementById('location-status');
    
    if (btn) {
        btn.innerHTML = '<span class="button-icon">🔄</span> Obteniendo ubicación...';
        btn.disabled = true;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            console.log('✅ Ubicación obtenida correctamente');
            
            if (btn) {
                btn.style.display = 'none';
            }
            if (status) {
                status.classList.remove('hidden');
            }
            
            if (trafficAnalyzer) {
                trafficAnalyzer.lastLocation = {
                    coords: {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    },
                    timestamp: Date.now()
                };
            }
            
            mostrarMensaje('📍 Ubicación activada - Análisis de tráfico funcionando', 'success');
            
            const minutos = parseFloat(elementos.minutos?.value) || 0;
            if (minutos > 0) {
                setTimeout(calcularAutomatico, 500);
            }
        },
        (error) => {
            console.error('❌ Error obteniendo ubicación:', error);
            
            if (btn) {
                btn.innerHTML = '<span class="button-icon">📍</span> Activar Análisis de Tráfico';
                btn.disabled = false;
            }
            
            let mensaje = 'No se pudo obtener la ubicación. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    mensaje += 'Permiso denegado.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    mensaje += 'Ubicación no disponible.';
                    break;
                case error.TIMEOUT:
                    mensaje += 'Tiempo de espera agotado.';
                    break;
                default:
                    mensaje += 'Error desconocido.';
            }
            
            mostrarError(mensaje);
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// =============================================
// SISTEMA DE EXPORTACIÓN DE HISTORIAL
// =============================================

function exportarHistorial() {
    console.log('📤 Exportando historial...');
    
    if (!historial || historial.length === 0) {
        mostrarError('No hay historial para exportar');
        return;
    }

    try {
        let csvContent = "Fecha,Ganancia (RD$),Tiempo (min),Distancia (km),Ganancia/Minuto,Ganancia/Km,Rentabilidad\n";
        
        historial.forEach(viaje => {
            const fecha = viaje.fecha || 'Fecha desconocida';
            const ganancia = viaje.ganancia || viaje.tarifa || 0;
            const minutos = viaje.minutos || 0;
            const distancia = viaje.distancia || 0;
            const porMinuto = viaje.gananciaPorMinuto || viaje.porMinuto || 0;
            const porKm = viaje.gananciaPorKm || viaje.porKm || 0;
            const rentabilidad = viaje.texto || (viaje.rentable ? 'RENTABLE' : 'NO RENTABLE');
            
            csvContent += `"${fecha}",${ganancia},${minutos},${distancia},${porMinuto},${porKm},"${rentabilidad}"\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `DIBER_historial_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        mostrarMensaje('✅ Historial exportado correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error exportando historial:', error);
        mostrarError('Error al exportar el historial');
    }
}

function exportarHistorialPDF() {
    console.log('📄 Generando PDF con reporte COMPLETO Y DETALLADO...');
    
    if (!historial || historial.length === 0) {
        mostrarError('No hay historial para exportar');
        return;
    }

    try {
        const viajesFiltrados = filtrarHistorial(historial, filtroActual);
        const stats = obtenerEstadisticasCompletasConFiltro(viajesFiltrados);
        
        const infoFiltro = obtenerInfoFiltroPDF();
        
        const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>DIBER - Reporte Detallado</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 25px;
        }
        
        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
        }
        
        .header {
            background: linear-gradient(135deg, #1a73e8, #1565c0);
            color: white;
            padding: 40px 30px;
            text-align: center;
            border-radius: 15px 15px 0 0;
        }
        
        .logo { font-size: 3em; margin-bottom: 15px; }
        .title { font-size: 2.2em; font-weight: 700; margin-bottom: 10px; }
        .subtitle { font-size: 1.1em; opacity: 0.9; font-weight: 400; }
        .filtro-info { font-size: 1em; margin-top: 10px; opacity: 0.8; }
        
        .content { padding: 40px 30px; }
        
        .section {
            margin-bottom: 35px;
            background: #f8f9fa;
            border-radius: 15px;
            padding: 25px;
            border-left: 5px solid #1a73e8;
        }
        
        .section-title {
            font-size: 1.4em;
            font-weight: 600;
            color: #1a73e8;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-bottom: 25px;
        }
        
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            border: 2px solid #e9ecef;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: 700;
            color: #1a73e8;
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9em;
            color: #6c757d;
            font-weight: 500;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
        }
        
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .metric-value {
            font-size: 1.8em;
            font-weight: 700;
            color: #2e7d32;
            margin-bottom: 5px;
        }
        
        .metric-label {
            font-size: 0.9em;
            color: #6c757d;
            font-weight: 500;
        }
        
        .viajes-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            background: white;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .viajes-table th {
            background: #1a73e8;
            color: white;
            padding: 15px;
            text-align: left;
            font-weight: 600;
        }
        
        .viajes-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e9ecef;
        }
        
        .viajes-table tr:hover {
            background: #f8f9fa;
        }
        
        .badge {
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.8em;
            font-weight: 600;
        }
        
        .badge-rentable { background: #e8f5e8; color: #2e7d32; }
        .badge-oportunidad { background: #fff3cd; color: #856404; }
        .badge-no-rentable { background: #ffebee; color: #c62828; }
        
        .financial-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        
        .financial-card {
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
        }
        
        .financial-positive { border-top: 4px solid #2e7d32; }
        .financial-negative { border-top: 4px solid #c62828; }
        .financial-neutral { border-top: 4px solid #ff9800; }
        
        .footer {
            text-align: center;
            padding: 25px;
            background: #f8f9fa;
            color: #6c757d;
            font-size: 0.9em;
            border-top: 1px solid #e9ecef;
            border-radius: 0 0 15px 15px;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px;
            color: #6c757d;
        }
        
        @media print {
            body { padding: 0; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🚗</div>
            <h1 class="title">DIBER - Reporte Detallado</h1>
            <p class="subtitle">Análisis completo de tu actividad de conducción</p>
            <p class="filtro-info">${infoFiltro.titulo} • ${infoFiltro.subtitulo}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2 class="section-title">📊 Resumen Ejecutivo</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${stats.totalViajes}</div>
                        <div class="stat-label">Total Viajes</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.viajesRentables}</div>
                        <div class="stat-label">Viajes Rentables</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${stats.eficiencia.toFixed(1)}%</div>
                        <div class="stat-label">Tasa de Eficiencia</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${formatearMonedaPDF(stats.gananciaTotal)}</div>
                        <div class="stat-label">Ganancia Total</div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">🚀 Métricas de Rendimiento</h2>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value">${formatearMonedaPDF(stats.gananciaPorHora)}</div>
                        <div class="metric-label">Ganancia por Hora</div>
                        <div style="font-size: 0.9em; color: #6c757d; margin-top: 5px;">
                            Basado en ${stats.tiempoTotal} minutos trabajados
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${formatearMonedaPDF(stats.viajePromedio)}</div>
                        <div class="metric-label">Viaje Promedio</div>
                        <div style="font-size: 0.9em; color: #6c757d; margin-top: 5px;">
                            Por cada viaje aceptado
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${stats.distanciaTotal} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</div>
                        <div class="metric-label">Distancia Total</div>
                        <div style="font-size: 0.9em; color: #6c757d; margin-top: 5px;">
                            Recorrido total
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${Math.round(stats.tiempoTotal / 60)}h ${stats.tiempoTotal % 60}m</div>
                        <div class="metric-label">Tiempo Total</div>
                        <div style="font-size: 0.9em; color: #6c757d; margin-top: 5px;">
                            Tiempo invertido
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">📋 Detalle de Viajes (${viajesFiltrados.length})</h2>
                ${viajesFiltrados.length > 0 ? `
                <table class="viajes-table">
                    <thead>
                        <tr>
                            <th>Fecha/Hora</th>
                            <th>Ganancia</th>
                            <th>Tiempo</th>
                            <th>Distancia</th>
                            <th>Por Minuto</th>
                            <th>Por Km</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${viajesFiltrados.map(viaje => `
                            <tr>
                                <td>${viaje.fecha || 'N/A'}</td>
                                <td><strong>${formatearMonedaPDF(viaje.ganancia || viaje.tarifa)}</strong></td>
                                <td>${viaje.minutos || 0} min</td>
                                <td>${viaje.distancia || 0} ${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</td>
                                <td>${formatearMonedaPDF(viaje.gananciaPorMinuto || viaje.porMinuto)}/min</td>
                                <td>${formatearMonedaPDF(viaje.gananciaPorKm || viaje.porKm)}/${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}</td>
                                <td>
                                    <span class="badge ${obtenerClaseBadge(viaje)}">
                                        ${obtenerTextoBadge(viaje)}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : `
                <div class="empty-state">
                    <h3>No hay viajes en este período</h3>
                    <p>Los viajes aceptados aparecerán en el reporte</p>
                </div>
                `}
            </div>
            
            <div class="section">
                <h2 class="section-title">💰 Resumen Financiero</h2>
                <div class="financial-grid">
                    <div class="financial-card financial-positive">
                        <div class="stat-value">${formatearMonedaPDF(stats.gananciaTotal)}</div>
                        <div class="stat-label">Ingresos Totales</div>
                    </div>
                    <div class="financial-card financial-negative">
                        <div class="stat-value">${formatearMonedaPDF(stats.costoTotal)}</div>
                        <div class="stat-label">Costos Totales</div>
                    </div>
                    <div class="financial-card ${stats.gananciaNeta >= 0 ? 'financial-positive' : 'financial-negative'}">
                        <div class="stat-value">${formatearMonedaPDF(stats.gananciaNeta)}</div>
                        <div class="stat-label">Ganancia Neta</div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; background: white; padding: 15px; border-radius: 10px;">
                    <h4 style="color: #1a73e8; margin-bottom: 10px;">📈 Desglose de Costos</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                        <div><strong>Combustible:</strong> ${formatearMonedaPDF(stats.costoCombustibleTotal)}</div>
                        <div><strong>Mantenimiento:</strong> ${formatearMonedaPDF(stats.costoMantenimientoTotal)}</div>
                        <div><strong>Seguro:</strong> ${formatearMonedaPDF(stats.costoSeguroTotal)}</div>
                        <div><strong>Total Costos:</strong> ${formatearMonedaPDF(stats.costoTotal)}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p><strong>Reporte generado por DIBER</strong> • ${new Date().toLocaleString('es-DO')}</p>
            <p>Perfil activo: <strong>${perfilActual?.nombre || 'No especificado'}</strong> • ${infoFiltro.titulo}</p>
            <p style="margin-top: 10px;">¡Sigue maximizando tus ganancias! 🚀</p>
        </div>
    </div>
</body>
</html>
        `;

        const ventana = window.open('', '_blank');
        ventana.document.write(pdfContent);
        ventana.document.close();
        
        setTimeout(() => {
            ventana.print();
        }, 1000);
        
        mostrarMensaje('✅ PDF generado correctamente con filtro: ' + filtroActual, 'success');
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        mostrarError('Error al generar el PDF');
    }
}

function mostrarExportModal() {
    console.log('📤 Mostrando modal de exportación');
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'flex';
    }
}

function configurarModalExportacion() {
    console.log('🔧 Configurando modal de exportación');
    const btnExportarPDF = document.getElementById('exportar-pdf');
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', function() {
            console.log('📄 Click en exportar PDF');
            exportarHistorialPDF();
            cerrarExportModal();
        });
    }
}

function obtenerEstadisticasCompletasConFiltro(viajesFiltrados) {
    const viajesAceptados = viajesFiltrados.filter(v => v.aceptado === true);
    const totalViajes = viajesAceptados.length;
    
    const viajesRentables = viajesAceptados.filter(v => {
        return v.rentable === true || v.rentabilidad === 'rentable';
    }).length;
    
    const gananciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.ganancia || v.tarifa || 0), 0);
    const tiempoTotal = viajesAceptados.reduce((sum, v) => sum + (v.minutos || 0), 0);
    const distanciaTotal = viajesAceptados.reduce((sum, v) => sum + (v.distancia || 0), 0);
    
    const costoCombustibleTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoCombustible || 0), 0);
    const costoMantenimientoTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoMantenimiento || 0), 0);
    const costoSeguroTotal = viajesAceptados.reduce((sum, v) => sum + (v.costoSeguro || 0), 0);
    const costoTotal = costoCombustibleTotal + costoMantenimientoTotal + costoSeguroTotal;
    
    const gananciaNeta = gananciaTotal - costoTotal;
    const eficiencia = totalViajes > 0 ? (viajesRentables / totalViajes * 100) : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;

    return {
        viajesAceptados,
        totalViajes,
        viajesRentables,
        gananciaTotal,
        tiempoTotal,
        distanciaTotal,
        costoCombustibleTotal,
        costoMantenimientoTotal,
        costoSeguroTotal,
        costoTotal,
        gananciaNeta,
        eficiencia,
        viajePromedio,
        gananciaPorHora
    };
}

function obtenerInfoFiltroPDF() {
    const ahora = new Date();
    let titulo = '';
    let subtitulo = '';
    
    switch(filtroActual) {
        case 'hoy':
            const hoy = ahora.toLocaleDateString('es-DO');
            titulo = 'Reporte del Día';
            subtitulo = `Fecha: ${hoy}`;
            break;
        case 'semana':
            const inicioSemana = new Date(ahora);
            inicioSemana.setDate(ahora.getDate() - ahora.getDay());
            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 6);
            titulo = 'Reporte Semanal';
            subtitulo = `Semana: ${inicioSemana.toLocaleDateString('es-DO')} - ${finSemana.toLocaleDateString('es-DO')}`;
            break;
        case 'mes':
            const mes = ahora.toLocaleDateString('es-DO', { month: 'long', year: 'numeric' });
            titulo = 'Reporte Mensual';
            subtitulo = `Mes: ${mes.charAt(0).toUpperCase() + mes.slice(1)}`;
            break;
        case 'todos':
            titulo = 'Reporte Completo';
            subtitulo = 'Todos los viajes registrados';
            break;
        default:
            titulo = 'Reporte Personalizado';
            subtitulo = `Filtro: ${filtroActual}`;
    }
    
    return { titulo, subtitulo };
}

function formatearMonedaPDF(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

function obtenerClaseBadge(viaje) {
    const rentable = viaje.rentable !== undefined ? 
        Boolean(viaje.rentable) : 
        (viaje.rentabilidad === 'rentable');
    
    if (rentable) return 'badge-rentable';
    if (viaje.rentabilidad === 'oportunidad') return 'badge-oportunidad';
    return 'badge-no-rentable';
}

function obtenerTextoBadge(viaje) {
    const rentable = viaje.rentable !== undefined ? 
        Boolean(viaje.rentable) : 
        (viaje.rentabilidad === 'rentable');
    
    if (rentable) return 'RENTABLE';
    if (viaje.rentabilidad === 'oportunidad') return 'OPORTUNIDAD';
    return 'NO RENTABLE';
}

// =============================================
// FUNCIONES DE SINCRONIZACIÓN
// =============================================

function mostrarPanelSync() {
    console.log('🌐 Mostrando panel de sincronización');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'flex';
    }
}

async function forzarSincronizacion() {
    if (!firebaseSync || !firebaseSync.initialized) {
        console.log('❌ Firebase Sync no disponible');
        return;
    }
    
    console.log('🔄 INICIANDO SINCRONIZACIÓN MANUAL...');
    mostrarStatus('🔄 Sincronizando con Firebase...', 'info');
    
    try {
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        
        const viajesAceptados = historial.filter(item => item.aceptado).slice(0, 20);
        for (const viaje of viajesAceptados) {
            await firebaseSync.saveTrip(viaje);
        }
        
        console.log('✅ Sincronización manual completada');
        mostrarStatus('✅ Sincronización completada', 'success');
        
    } catch (error) {
        console.error('❌ Error en sincronización manual:', error);
        mostrarStatus('❌ Error en sincronización', 'error');
    }
}

function mostrarInfoSync() {
    alert(`🌐 SINCRONIZACIÓN CON FIREBASE

✅ Cómo funciona:
1. Tus perfiles se guardan individualmente en Firebase
2. Cada viaje es un documento independiente
3. Todos tus dispositivos acceden a los mismos datos
4. Los cambios se sincronizan automáticamente

📱 Dispositivos conectados: Todos los que usen tu mismo código

💡 Características:
• Sincronización en tiempo real
• Sin conflictos entre dispositivos
• Respaldo seguro en la nube
• Totalmente gratuito

🔒 Tus datos son privados y solo tú puedes acceder a ellos`);
}

async function verificarConexionFirebase() {
    console.log('📡 Verificando conexión Firebase...');
    
    if (!firebaseSync) {
        console.log('❌ FirebaseSync no está inicializado');
        return false;
    }
    
    try {
        const testRef = firebaseSync.db.collection('test').doc('connection_test');
        await testRef.set({
            test: true,
            timestamp: new Date().toISOString()
        }, { merge: true });
        
        console.log('✅ Conexión Firebase OK');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión Firebase:', error);
        return false;
    }
}

async function resincronizarCompleta() {
    console.log('🔄 INICIANDO RESINCRONIZACIÓN COMPLETA...');
    
    const firebaseOk = await verificarConexionFirebase();
    if (!firebaseOk) {
        mostrarError('No hay conexión con Firebase. Verifica tu internet.');
        return;
    }
    
    mostrarStatus('🔄 Sincronizando todos los datos...', 'info');
    
    try {
        console.log('📤 Subiendo perfiles...');
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        console.log('✅ Perfiles sincronizados:', perfiles.length);
        
        console.log('📤 Subiendo viajes...');
        const viajesParaSincronizar = historial.filter(item => item.aceptado).slice(0, 50);
        let viajesSubidos = 0;
        
        for (const viaje of viajesParaSincronizar) {
            const exito = await firebaseSync.saveTrip(viaje);
            if (exito) viajesSubidos++;
        }
        console.log('✅ Viajes sincronizados:', viajesSubidos, 'de', viajesParaSincronizar.length);
        
        console.log('📥 Recargando datos...');
        await cargarDatos();
        
        console.log('✅ Resincronización completada');
        mostrarStatus(`✅ Sincronizado: ${viajesSubidos} viajes, ${perfiles.length} perfiles`, 'success');
        
    } catch (error) {
        console.error('❌ Error en resincronización:', error);
        mostrarStatus('❌ Error en sincronización', 'error');
    }
}

function resetearSincronizacion() {
    console.log('🔄 RESETEANDO SISTEMA DE SINCRONIZACIÓN...');
    
    if (confirm('¿Estás seguro de que quieres resetear la sincronización? Esto no borrará tus datos locales.')) {
        firebaseSync = null;
        firebaseInitialized = false;
        location.reload();
    }
}

function diagnosticarSincronizacion() {
    console.log('🔍 DIAGNÓSTICO DE SINCRONIZACIÓN COMPLETO');
    
    console.log('🌐 FIREBASE:');
    console.log('• Inicializado:', firebaseSync?.initialized);
    console.log('• User ID:', userCodeSystem.userId);
    console.log('• User Code:', userCodeSystem.userCode);
    
    console.log('💾 DATOS LOCALES:');
    console.log('• Perfiles:', perfiles.length);
    console.log('• Historial:', historial.length, 'viajes');
    console.log('• Perfil actual:', perfilActual?.nombre);
    
    return {
        firebaseInicializado: firebaseSync?.initialized,
        userCode: userCodeSystem.userCode,
        perfilesCount: perfiles.length,
        historialCount: historial.length
    };
}

// =============================================
// INICIALIZACIÓN COMPLETA
// =============================================

async function inicializarApp() {
    if (window.appInitialized) {
        console.log('🚫 App ya inicializada, omitiendo...');
        return;
    }
    
    console.log('🚀 Inicializando DIBER...');
    
    inicializarElementosDOM();
    
    try {
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }
        
        await initializeFirebaseSync();
        await inicializarSistemaTrafico();
        await cargarDatos();
        
        aplicarTemaGuardado();
        configurarEventListeners();
        configurarModalExportacion();
        
        // 🚨 OCULTAR RESULTADO INSTANTÁNEO EN INTERFAZ
        actualizarInterfazFormulario();
        
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            mostrarPantalla('main');
        } else {
            mostrarPantalla('perfil');
        }
        
        window.appInitialized = true;
        console.log('🎉 DIBER inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar la aplicación. Por favor, recarga la página.', 'error');
    }
}

// =============================================
// AGREGAR ESTILOS CSS PARA OCULTAR ELEMENTOS
// =============================================

function agregarEstilosOcultos() {
    const styles = `
        /* Ocultar resultado instantáneo del formulario principal */
        #resultado-rapido,
        #resultado-badge,
        #resultado-emoji, 
        #resultado-texto,
        #metrica-minuto,
        #metrica-km {
            display: none !important;
        }
        
        /* Asegurar que el modal pop-up tenga buen espaciado */
        .modal-rapido-contenido-mejorado {
            padding: 0;
        }
        
        .metricas-grid-mejorado {
            margin: 20px 0;
        }
        
        .acciones-mejoradas {
            margin-top: 20px;
        }
    `;
    
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
}

// =============================================
// FUNCIONES GLOBALES
// =============================================

window.cerrarModal = cerrarModal;
window.cerrarModalRapido = cerrarModalRapido;
window.cerrarExportModal = cerrarExportModal;
window.cerrarSyncPanel = cerrarSyncPanel;
window.mostrarConfigPerfil = mostrarConfigPerfil;
window.seleccionarPerfil = seleccionarPerfil;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.cambiarUsuario = cambiarUsuario;
window.eliminarDelHistorial = eliminarDelHistorial;
window.limpiarHistorialCompleto = limpiarHistorialCompleto;
window.procesarViajeRapido = procesarViajeRapido;
window.mostrarPanelSync = mostrarPanelSync;
window.forzarSincronizacion = forzarSincronizacion;
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticarSync = diagnosticarSincronizacion;
window.exportarHistorial = exportarHistorial;
window.exportarHistorialPDF = exportarHistorialPDF;
window.mostrarExportModal = mostrarExportModal;
window.diagnosticarSincronizacion = diagnosticarSincronizacion;
window.resincronizarCompleta = resincronizarCompleta;
window.resetearSincronizacion = resetearSincronizacion;
window.verificarConexionFirebase = verificarConexionFirebase;
window.limpiarFormularioCompleto = limpiarFormularioCompleto;

// =============================================
// EJECUCIÓN PRINCIPAL
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando aplicación...');
    
    // Agregar estilos para ocultar elementos
    agregarEstilosOcultos();
    
    inicializarApp();
});

window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = (elementos.tarifa && elementos.tarifa.value) || 
                                 (elementos.minutos && elementos.minutos.value) || 
                                 (elementos.distancia && elementos.distancia.value);
    
    if (tieneDatosPendientes) {
        e.preventDefault();
        e.returnValue = '';
    }
});

window.onclick = function(event) {
    const modalRapido = document.getElementById('modal-rapido');
    if (modalRapido && event.target === modalRapido) {
        cerrarModalRapido();
    }
    
    if (typeof elementos !== 'undefined') {
        if (elementos.modalFondo && event.target === elementos.modalFondo) {
            cerrarModal();
        }
        if (elementos.exportModal && event.target === elementos.exportModal) {
            cerrarExportModal();
        }
        if (elementos.syncPanel && event.target === elementos.syncPanel) {
            cerrarSyncPanel();
        }
    }
};



