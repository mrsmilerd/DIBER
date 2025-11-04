// =============================================
// UBER CALC - Calculadora Inteligente para Conductores
// Versión Mejorada con Sistema de Pestañas Y SINCRONIZACIÓN MULTI-DISPOSITIVO
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

// Inicializar elementos DOM de forma segura
function inicializarElementosDOM() {
    const ids = [
        'perfil-screen', 'config-perfil-screen', 'main-screen',
        'status-indicator', 'status-text', 'auto-calc-indicator',
        'tarifa', 'minutos', 'distancia',
        'resultado-rapido', 'resultado-badge', 'resultado-emoji', 'resultado-texto',
        'metrica-minuto', 'metrica-km',
        'aceptar-viaje', 'rechazar-viaje', 'aceptar-viaje-tab', 'rechazar-viaje-tab',
        'modalFondo', 'modalContenido', 'modalResultadosDoble', 'modal-badge', 'modal-emoji', 'modal-texto',
        'history-list', 'clear-history', 'exportar-historial',
        'stats-viajes', 'stats-ganancia', 'stats-tiempo', 'stats-rentables', 'stats-ganancia-hora', 'stats-viaje-promedio',
        'perfiles-lista', 'nuevo-perfil-btn', 'perfil-form', 'volver-perfiles', 'cancelar-perfil', 'cambiar-perfil',
        'theme-toggle', 'exportModal', 'exportar-pdf', 'sync-panel'
    ];

    ids.forEach(id => {
        elementos[id] = document.getElementById(id);
    });

    // Elementos adicionales
    elementos.tabButtons = document.querySelectorAll('.tab-button');
    elementos.tabContents = document.querySelectorAll('.tab-content');
}

// =============================================
// SISTEMA DE HISTORIAL
// =============================================

// Inicializar historial
historial = JSON.parse(localStorage.getItem('historialViajes')) || [];

function agregarAlHistorial(viaje) {
    console.log('➕ agregarAlHistorial() llamado con:', viaje);
    
    if (!viaje.tarifa && !viaje.ganancia) {
        console.error('❌ Error: Viaje sin tarifa/ganancia');
        return;
    }

    const tarifa = viaje.tarifa || viaje.ganancia || 0;
    const minutos = viaje.minutos || 0;
    const distancia = viaje.distancia || 0;
    const porMinuto = viaje.gananciaPorMinuto || (minutos > 0 ? (tarifa / minutos) : 0);
    const porKm = viaje.gananciaPorKm || (distancia > 0 ? (tarifa / distancia) : 0);
    
    let rentable = false;
    if (viaje.rentabilidad) {
        rentable = (viaje.rentabilidad === 'rentable');
    } else if (perfilActual) {
        rentable = (porMinuto >= perfilActual.umbralMinutoRentable && 
                   porKm >= perfilActual.umbralKmRentable);
    }

    const nuevoViaje = {
        ganancia: tarifa,
        minutos: minutos,
        distancia: distancia,
        porMinuto: porMinuto,
        porKm: porKm,
        rentable: rentable,
        fecha: new Date().toLocaleString('es-DO'),
        id: 'viaje_' + Date.now(),
        tarifa: tarifa,
        gananciaPorMinuto: porMinuto,
        gananciaPorKm: porKm,
        rentabilidad: rentable ? 'rentable' : 'no-rentable',
        emoji: viaje.emoji || (rentable ? '✅' : '❌'),
        texto: viaje.texto || (rentable ? 'RENTABLE' : 'NO RENTABLE'),
        aceptado: viaje.aceptado !== undefined ? viaje.aceptado : true,
        timestamp: viaje.timestamp || new Date().toISOString(),
        gananciaNeta: viaje.gananciaNeta || 0,
        costoCombustible: viaje.costoCombustible || 0,
        costoMantenimiento: viaje.costoMantenimiento || 0,
        costoSeguro: viaje.costoSeguro || 0,
        costoTotal: viaje.costoTotal || 0
    };
    
    console.log('📝 Viaje procesado para historial:', nuevoViaje);

    historial.unshift(nuevoViaje);
    
    if (historial.length > 50) {
        historial = historial.slice(0, 50);
    }
    
    localStorage.setItem('historialViajes', JSON.stringify(historial));
    console.log('💾 Historial guardado. Total viajes:', historial.length);
    
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

    if (!historial || historial.length === 0) {
        elementos['history-list'].innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📋</span>
                <h3>No hay viajes en el historial</h3>
                <p>Los viajes que aceptes aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    const viajesParaMostrar = historial.slice(0, 15);
    
    elementos['history-list'].innerHTML = viajesParaMostrar.map((viaje, index) => {
        const ganancia = viaje.ganancia || 0;
        const minutos = viaje.minutos || 0;
        const distancia = viaje.distancia || 0;
        const porMinuto = viaje.porMinuto || 0;
        const porKm = viaje.porKm || 0;
        const rentable = Boolean(viaje.rentable);
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
                    <span class="metric">🛣️ ${distancia}km</span>
                    <span class="metric">💰 ${formatearMoneda(parseFloat(porMinuto))}/min</span>
                    <span class="metric">📏 ${formatearMoneda(parseFloat(porKm))}/km</span>
                </div>
            </div>
            <div class="history-actions">
                <button onclick="eliminarDelHistorial(${index})" class="delete-btn" title="Eliminar">
                    🗑️
                </button>
            </div>
        </div>
        `;
    }).join('');
    
    console.log('✅ Historial actualizado correctamente');
}

function eliminarDelHistorial(index) {
    if (confirm('¿Estás seguro de que quieres eliminar este viaje del historial?')) {
        historial.splice(index, 1);
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
    }
}

function limpiarHistorialCompleto() {
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        historial = [];
        localStorage.setItem('historialViajes', JSON.stringify(historial));
        actualizarHistorialConFiltros();
        actualizarEstadisticas();
        mostrarMensaje('Historial limpiado correctamente', 'success');
    }
}

// =============================================
// SISTEMA DE PESTAÑAS
// =============================================

function inicializarTabs() {
    console.log('🔄 Inicializando sistema de pestañas...');
    
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            console.log('📁 Cambiando a pestaña:', tabId);
            cambiarPestana(tabId);
        });
    });
}

function cambiarPestana(tabId) {
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
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    timeoutCalculo = setTimeout(calcularAutomatico, 500);
}

function calcularAutomatico() {
    const tarifa = parseFloat(elementos.tarifa.value) || 0;
    const minutos = parseFloat(elementos.minutos.value) || 0;
    const distancia = parseFloat(elementos.distancia.value) || 0;
    
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        elementos['auto-calc-indicator'].classList.remove('hidden');
        const resultado = calcularRentabilidad(tarifa, minutos, distancia);
        
        if (resultado) {
            calculoActual = resultado;
            mostrarResultadoRapido(resultado);
        }
    } else {
        elementos['auto-calc-indicator'].classList.add('hidden');
        elementos['resultado-rapido'].classList.add('hidden');
        cerrarModalRapido();
    }
}

function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) return null;
    
    try {
        const combustibleUsado = distancia / perfilActual.rendimiento;
        const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
        
        const costoMantenimientoPorKm = (perfilActual.costoMantenimiento || 0) / 1500;
        const costoSeguroPorMinuto = (perfilActual.costoSeguro || 0) / (30 * 24 * 60);
        
        const costoMantenimiento = distancia * costoMantenimientoPorKm;
        const costoSeguro = minutos * costoSeguroPorMinuto;
        const costoTotal = costoCombustible + costoMantenimiento + costoSeguro;
        const gananciaNeta = tarifa - costoTotal;
        
        const gananciaPorMinuto = tarifa / minutos;
        const gananciaPorKm = tarifa / distancia;
        
        let rentabilidad, emoji, texto;
        
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
        
        return {
            tarifa, minutos, distancia, gananciaNeta, gananciaPorMinuto, gananciaPorKm,
            costoCombustible, costoMantenimiento, costoSeguro, costoTotal,
            rentabilidad, emoji, texto, timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        mostrarError('Error en el cálculo. Verifica los datos ingresados.');
        return null;
    }
}

// =============================================
// SISTEMA DE PERFILES
// =============================================

function mostrarConfigPerfil(perfil = null) {
    if (perfil) {
        document.getElementById('perfil-id').value = perfil.id;
        document.getElementById('nombre-perfil').value = perfil.nombre;
        document.getElementById('tipo-medida').value = perfil.tipoMedida;
        document.getElementById('tipo-combustible').value = perfil.tipoCombustible;
        document.getElementById('rendimiento').value = perfil.rendimiento;
        document.getElementById('precio-combustible').value = perfil.precioCombustible;
        document.getElementById('moneda').value = perfil.moneda;
        document.getElementById('umbral-minuto-rentable').value = perfil.umbralMinutoRentable;
        document.getElementById('umbral-km-rentable').value = perfil.umbralKmRentable;
        document.getElementById('umbral-minuto-oportunidad').value = perfil.umbralMinutoOportunidad;
        document.getElementById('umbral-km-oportunidad').value = perfil.umbralKmOportunidad;
        document.getElementById('costo-seguro').value = perfil.costoSeguro || 0;
        document.getElementById('costo-mantenimiento').value = perfil.costoMantenimiento || 0;
    } else {
        elementos['perfil-form'].reset();
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
// SISTEMA DE CÓDIGO DE USUARIO
// =============================================

async function initializeUserCodeSystem() {
    console.log('🔐 Inicializando sistema de código de usuario...');
    
    const savedCode = localStorage.getItem('ubercalc_user_code');
    
    if (savedCode) {
        userCodeSystem.userCode = savedCode;
        userCodeSystem.userId = 'user_' + savedCode;
        userCodeSystem.initialized = true;
        
        console.log('✅ Código de usuario cargado:', userCodeSystem.userCode);
        hideUserCodeModal();
        showUserCodeBanner();
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
    input.value = code;
    input.focus();
    input.select();
}

function setUserCode() {
    const input = document.getElementById('user-code-input');
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
    
    localStorage.setItem('ubercalc_user_code', code);
    
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
    if (modal) modal.style.display = 'flex';
}

function hideUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    if (modal) modal.style.display = 'none';
}

function showUserCodeBanner() {
    const banner = document.getElementById('user-code-banner');
    const display = document.getElementById('user-code-display');
    
    if (banner && display && userCodeSystem.userCode) {
        display.textContent = `Código: ${userCodeSystem.userCode}`;
        banner.style.display = 'flex';
    }
}

// =============================================
// FUNCIONES PRINCIPALES
// =============================================

async function initializeFirebaseSync() {
    console.log('🔄 Inicializando Firebase Sync...');
    
    firebaseSync = new FirebaseSync();
    const success = await firebaseSync.initialize();
    
    if (success) {
        console.log('✅ Firebase Sync listo para usar');
        return true;
    } else {
        console.log('📱 Usando almacenamiento local solamente');
        return false;
    }
}

async function cargarDatos() {
    console.log('🔄 Cargando datos...');
    
    // Cargar de localStorage primero
    try {
        const datosGuardados = localStorage.getItem('uberCalc_data');
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            perfiles = datos.perfiles || [];
            perfilActual = datos.perfilActual || null;
            historial = datos.historial || [];
            console.log('💾 Datos locales cargados');
        }
    } catch (error) {
        console.error('Error cargando datos locales:', error);
        perfiles = [];
        historial = [];
    }

    // Intentar cargar desde Firebase
    if (firebaseSync && firebaseSync.initialized) {
        try {
            const cloudProfiles = await firebaseSync.loadProfiles();
            if (cloudProfiles && cloudProfiles.length > 0) {
                perfiles = cloudProfiles;
                console.log('✅ Perfiles de Firebase cargados:', perfiles.length);
            }
            
            const cloudTrips = await firebaseSync.loadTrips();
            if (cloudTrips && cloudTrips.length > 0) {
                historial = cloudTrips;
                console.log('✅ Viajes de Firebase cargados:', historial.length);
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
    
    guardarDatos();
}

function guardarDatos() {
    console.log('💾 Guardando datos...');
    
    localStorage.setItem('uberCalc_data', JSON.stringify({
        perfiles,
        perfilActual,
        historial,
        version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    }));

    console.log('✅ Datos guardados localmente');
}

// =============================================
// FUNCIONES DE UTILIDAD
// =============================================

function mostrarPantalla(pantalla) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (pantalla === 'perfil') {
        elementos['perfil-screen'].classList.add('active');
    } else if (pantalla === 'config-perfil') {
        elementos['config-perfil-screen'].classList.add('active');
    } else if (pantalla === 'main') {
        elementos['main-screen'].classList.add('active');
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
    const gananciaTotal = viajesHoy.reduce((sum, item) => sum + (item.tarifa || 0), 0);
    const tiempoTotal = viajesHoy.reduce((sum, item) => sum + (item.minutos || 0), 0);
    const viajesRentables = viajesHoy.filter(item => item.rentabilidad === 'rentable').length;
    
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
    
    if (elementos['stats-ganancia-hora']) {
        elementos['stats-ganancia-hora'].textContent = formatearMoneda(gananciaPorHora);
    }
    
    if (elementos['stats-viaje-promedio']) {
        elementos['stats-viaje-promedio'].textContent = formatearMoneda(viajePromedio);
    }
}

function actualizarEstadisticasDia(viaje) {
    // Implementación básica - puedes expandir esto
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
    if (elementos.tarifa) elementos.tarifa.value = '';
    if (elementos.minutos) elementos.minutos.value = '';
    if (elementos.distancia) elementos.distancia.value = '';
    if (elementos['auto-calc-indicator']) elementos['auto-calc-indicator'].classList.add('hidden');
    if (elementos['resultado-rapido']) elementos['resultado-rapido'].classList.add('hidden');
    calculoActual = null;
    cerrarModalRapido();
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
    }
}

// =============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================

async function inicializarApp() {
    console.log('🚀 Inicializando UberCalc...');
    
    inicializarElementosDOM();
    
    try {
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }
        
        await initializeFirebaseSync();
        await cargarDatos();
        
        aplicarTemaGuardado();
        
        if (perfiles.length === 0) {
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            mostrarPantalla('main');
        } else {
            mostrarPantalla('perfil');
        }
        
        console.log('🎉 UberCalc inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar la aplicación. Por favor, recarga la página.', 'error');
    }
}

// =============================================
// CONFIGURACIÓN DE EVENT LISTENERS
// =============================================

function configurarEventListeners() {
    // Sistema de Pestañas
    inicializarTabs();
    
    // Cálculo Automático
    if (elementos.tarifa) {
        elementos.tarifa.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.minutos) {
        elementos.minutos.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.distancia) {
        elementos.distancia.addEventListener('input', manejarCalculoAutomatico);
    }
    
    // Botones de Acción
    if (elementos['aceptar-viaje']) {
        elementos['aceptar-viaje'].addEventListener('click', () => procesarViaje(true));
    }
    if (elementos['rechazar-viaje']) {
        elementos['rechazar-viaje'].addEventListener('click', () => procesarViaje(false));
    }
    
    // Historial
    if (elementos['clear-history']) {
        elementos['clear-history'].addEventListener('click', limpiarHistorialCompleto);
    }
    
    // Perfiles
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
    
    // Tema
    if (elementos['theme-toggle']) {
        elementos['theme-toggle'].addEventListener('click', alternarTema);
    }
}

function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('uberCalc_theme', newTheme);
}

function aplicarTemaGuardado() {
    const savedTheme = localStorage.getItem('uberCalc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

// =============================================
// FUNCIONES GLOBALES
// =============================================

window.cerrarModal = cerrarModal;
window.cerrarModalRapido = cerrarModalRapido;
window.mostrarConfigPerfil = mostrarConfigPerfil;
window.seleccionarPerfil = seleccionarPerfil;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.cambiarUsuario = cambiarUsuario;
window.eliminarDelHistorial = eliminarDelHistorial;
window.procesarViajeRapido = procesarViajeRapido;

// Función procesarViaje para el modal rápido
function procesarViaje(aceptado) {
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    agregarAlHistorial({
        ...calculoActual,
        aceptado: aceptado
    });
    
    if (aceptado) {
        mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        mostrarStatus('❌ Viaje rechazado', 'info');
    }

    limpiarFormulario();
    cerrarModal();
    
    actualizarEstadisticas();
    actualizarHistorialConFiltros();
}

function cambiarUsuario() {
    if (confirm('¿Estás seguro de que quieres cambiar de usuario?')) {
        localStorage.removeItem('ubercalc_user_code');
        userCodeSystem.userCode = null;
        userCodeSystem.userId = null;
        userCodeSystem.initialized = false;
        
        const banner = document.getElementById('user-code-banner');
        if (banner) banner.style.display = 'none';
        
        showUserCodeModal();
    }
}

// =============================================
// INICIALIZACIÓN FINAL
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM cargado, inicializando aplicación...');
    inicializarApp();
    configurarEventListeners();
});

// Prevenir cierre accidental
window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = (elementos.tarifa && elementos.tarifa.value) || 
                                 (elementos.minutos && elementos.minutos.value) || 
                                 (elementos.distancia && elementos.distancia.value);
    
    if (tieneDatosPendientes) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Cerrar modal al hacer clic fuera
window.onclick = function(event) {
    if (elementos.modalFondo && event.target === elementos.modalFondo) {
        cerrarModal();
    }
    if (elementos.exportModal && event.target === elementos.exportModal) {
        elementos.exportModal.style.display = 'none';
    }
    if (elementos.syncPanel && event.target === elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
};
