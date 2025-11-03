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
const elementos = {
    // Pantallas
    perfilScreen: document.getElementById('perfil-screen'),
    configPerfilScreen: document.getElementById('config-perfil-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    // Sistema de Pestañas
    tabButtons: document.querySelectorAll('.tab-button'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Indicadores
    statusIndicator: document.getElementById('status-indicator'),
    statusText: document.getElementById('status-text'),
    autoCalcIndicator: document.getElementById('auto-calc-indicator'),
    
    // Formularios
    tarifaInput: document.getElementById('tarifa'),
    minutosInput: document.getElementById('minutos'),
    distanciaInput: document.getElementById('distancia'),
    
    // Resultado Rápido
    resultadoRapido: document.getElementById('resultado-rapido'),
    resultadoBadge: document.getElementById('resultado-badge'),
    resultadoEmoji: document.getElementById('resultado-emoji'),
    resultadoTexto: document.getElementById('resultado-texto'),
    metricaMinuto: document.getElementById('metrica-minuto'),
    metricaKm: document.getElementById('metrica-km'),
    
    // Botones de Acción
    aceptarViajeBtn: document.getElementById('aceptar-viaje'),
    rechazarViajeBtn: document.getElementById('rechazar-viaje'),
    aceptarViajeTabBtn: document.getElementById('aceptar-viaje-tab'),
    rechazarViajeTabBtn: document.getElementById('rechazar-viaje-tab'),
    
    // Modales
    modalFondo: document.getElementById('modalFondo'),
    modalContenido: document.getElementById('modalContenido'),
    modalResultadosDoble: document.getElementById('modalResultadosDoble'),
    modalBadge: document.getElementById('modal-badge'),
    modalEmoji: document.getElementById('modal-emoji'),
    modalTexto: document.getElementById('modal-texto'),
    
    // Historial
    historyList: document.getElementById('history-list'),
    clearHistoryBtn: document.getElementById('clear-history'),
    exportarHistorialBtn: document.getElementById('exportar-historial'),
    
    // Estadísticas
    statsViajes: document.getElementById('stats-viajes'),
    statsGanancia: document.getElementById('stats-ganancia'),
    statsTiempo: document.getElementById('stats-tiempo'),
    statsRentables: document.getElementById('stats-rentables'),
    statsGananciaHora: document.getElementById('stats-ganancia-hora'),
    statsViajePromedio: document.getElementById('stats-viaje-promedio'),
    
    // Perfiles
    perfilesLista: document.getElementById('perfiles-lista'),
    nuevoPerfilBtn: document.getElementById('nuevo-perfil-btn'),
    perfilForm: document.getElementById('perfil-form'),
    volverPerfilesBtn: document.getElementById('volver-perfiles'),
    cancelarPerfilBtn: document.getElementById('cancelar-perfil'),
    cambiarPerfilBtn: document.getElementById('cambiar-perfil'),
    
    // Tema
    themeToggle: document.getElementById('theme-toggle'),

     // Estadísticas - VERIFICA QUE ESTOS ID COINCIDAN CON TU HTML
    statsViajes: document.getElementById('stats-viajes'),
    statsGanancia: document.getElementById('stats-ganancia'),
    statsTiempo: document.getElementById('stats-tiempo'),
    statsRentables: document.getElementById('stats-rentables'),
    statsGananciaHora: document.getElementById('stats-ganancia-hora'),
    statsViajePromedio: document.getElementById('stats-viaje-promedio'),
    
    // Exportación
    exportModal: document.getElementById('exportModal'),
    exportarPdfBtn: document.getElementById('exportar-pdf'),

    // Sincronización
    syncPanel: document.getElementById('sync-panel')
};

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
        
    } else {
        console.log('🆕 No hay código de usuario, mostrando modal...');
        showUserCodeModal();
        userCodeSystem.initialized = false;
    }
    
    return userCodeSystem.initialized;
}

function generateUserCode() {
    console.log('🎲 Generando código válido...');
    
    const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const numbers = '23456789';
    
    let code = '';
    
    // 3 letras
    for (let i = 0; i < 3; i++) {
        code += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    
    // 3 números  
    for (let i = 0; i < 3; i++) {
        code += numbers.charAt(Math.floor(Math.random() * numbers.length));
    }
    
    console.log('✅ Código generado:', code);
    
    const input = document.getElementById('user-code-input');
    input.value = code;
    
    // Auto-seleccionar y enfocar
    input.focus();
    input.select();
    
    // Mostrar mensaje de éxito
    const statusDiv = document.getElementById('code-status');
    if (statusDiv) {
        statusDiv.style.display = 'block';
        statusDiv.textContent = '✅ Código generado! Haz clic en "Conectar"';
        statusDiv.style.background = '#d4edda';
        statusDiv.style.color = '#155724';
    }
    
    input.style.borderColor = '#28a745';
    
    mostrarStatus('¡Código generado! Haz clic en "Conectar"', 'success');
}

function setUserCode() {
    console.log('🔄 Intentando establecer código de usuario...');
    
    const input = document.getElementById('user-code-input');
    const statusDiv = document.getElementById('code-status');
    
    if (!input) {
        console.error('❌ No se encontró el input de código');
        mostrarStatus('Error: No se puede encontrar el campo de código', 'error');
        return;
    }
    
    let code = input.value.trim().toUpperCase();
    console.log('📝 Código ingresado:', code);
    
    function showCodeStatus(message, type) {
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.textContent = message;
            statusDiv.style.background = type === 'error' ? '#f8d7da' : '#d4edda';
            statusDiv.style.color = type === 'error' ? '#721c24' : '#155724';
            statusDiv.style.border = type === 'error' ? '1px solid #f5c6cb' : '1px solid #c3e6cb';
        }
    }
    
    const codeRegex = /^[A-Z0-9]{3,6}$/;
    
    if (!code) {
        showCodeStatus('❌ Por favor escribe un código o genera uno automático', 'error');
        input.focus();
        input.style.borderColor = '#dc3545';
        return;
    }
    
    if (!codeRegex.test(code)) {
        showCodeStatus('❌ Formato inválido. Usa 3-6 letras/números (ej: ABC123)', 'error');
        input.focus();
        input.style.borderColor = '#dc3545';
        return;
    }
    
    showCodeStatus('✅ Código válido! Conectando...', 'success');
    input.style.borderColor = '#28a745';
    
    console.log('✅ Código válido, estableciendo...');
    
    userCodeSystem.userCode = code;
    userCodeSystem.userId = 'user_' + code;
    userCodeSystem.initialized = true;
    
    localStorage.setItem('ubercalc_user_code', code);
    
    console.log('✅ Código de usuario establecido:', code);
    console.log('✅ UserID:', userCodeSystem.userId);
    
    setTimeout(async () => {
        try {
            hideUserCodeModal();
            showUserCodeBanner();
            
            console.log('🔄 Inicializando Firebase Sync para el nuevo usuario...');
            const firebaseReady = await initializeFirebaseSyncWithRetry();
            
            if (firebaseReady) {
                console.log('✅ Firebase Sync inicializado para nuevo usuario');
                await cargarDatos();
            }
            
            // LÓGICA SIMPLIFICADA: SIEMPRE mostrar pantalla de perfiles para nuevos códigos
            console.log('👤 NUEVO USUARIO, mostrando pantalla de perfiles...');
            mostrarPantalla('perfil');
            mostrarStatus(`¡Bienvenido! Crea tu primer perfil para comenzar`, 'success');
            
        } catch (error) {
            console.error('❌ Error en setUserCode:', error);
            mostrarStatus('Error al conectar. Intenta nuevamente.', 'error');
        }
    }, 1500);
}

function showUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    if (modal) {
        modal.style.display = 'flex';
        console.log('✅ Modal de código mostrado');
    }
}

function hideUserCodeModal() {
    console.log('🔄 Ejecutando hideUserCodeModal()...');
    
    const modal = document.getElementById('user-code-modal');
    if (modal) {
        console.log('✅ Modal encontrado, aplicando métodos de ocultación...');
        
        // Método 1: Usar classList para agregar clase hidden
        modal.classList.add('hidden');
        console.log('   - Clase "hidden" agregada');
        
        // Método 2: Establecer display none directamente
        modal.style.display = 'none';
        console.log('   - display: none aplicado');
        
        // Método 3: Remover atributo style que pueda tener display:flex
        modal.removeAttribute('style');
        console.log('   - atributo style removido');
        
        // Método 4: Aplicar estilos CSS directamente
        modal.style.cssText = 'display: none !important; visibility: hidden !important;';
        console.log('   - cssText aplicado');
        
        console.log('🎉 Todos los métodos de ocultación aplicados');
    } else {
        console.error('❌ No se encontró el modal de código');
    }
}

function showUserCodeBanner() {
    const banner = document.getElementById('user-code-banner');
    const bannerMain = document.getElementById('user-code-banner-main');
    const display = document.getElementById('user-code-display');
    const displayMain = document.getElementById('user-code-display-main');
    
    if (banner && display && userCodeSystem.userCode) {
        display.textContent = `Código: ${userCodeSystem.userCode}`;
        banner.style.display = 'flex';
    }
    
    if (bannerMain && displayMain && userCodeSystem.userCode) {
        displayMain.textContent = `Código: ${userCodeSystem.userCode}`;
        bannerMain.style.display = 'flex';
    }
    
    console.log('✅ Banner de código mostrado:', userCodeSystem.userCode);
}

function cambiarUsuario() {
    console.log('🔄 Iniciando cambio de usuario...');
    
    if (confirm('¿Estás seguro de que quieres cambiar de usuario? Podrás volver a este usuario con el mismo código.')) {
        
        // 1. Cerrar todos los modales abiertos primero
        cerrarModal();
        cerrarExportModal();
        cerrarSyncPanel();
        
        // 2. Limpiar localStorage del código
        localStorage.removeItem('ubercalc_user_code');
        localStorage.removeItem('ubercalc_user_id');
        
        // 3. Resetear el estado del sistema de código
        userCodeSystem.userCode = null;
        userCodeSystem.userId = null;
        userCodeSystem.initialized = false;
        
        // 4. Reiniciar Firebase Sync
        if (firebaseSync) {
            // Detener la escucha en tiempo real primero
            if (firebaseSync.unsubscribe) {
                firebaseSync.unsubscribe();
            }
            firebaseSync.initialized = false;
            firebaseSync.userId = null;
            firebaseSync = null;
        }
        
        // 5. Limpiar formularios
        limpiarFormulario();
        
        // 6. Ocultar banners
        const banner = document.getElementById('user-code-banner');
        const bannerMain = document.getElementById('user-code-banner-main');
        if (banner) banner.style.display = 'none';
        if (bannerMain) bannerMain.style.display = 'none';
        
        // 7. MOSTRAR MODAL DE CÓDIGO automáticamente
        console.log('🔄 Mostrando modal para nuevo código...');
        
        setTimeout(() => {
            showUserCodeModal();
            
            // Limpiar el input del código
            const codeInput = document.getElementById('user-code-input');
            if (codeInput) {
                codeInput.value = '';
                codeInput.focus();
            }
            
            console.log('✅ Modal de código mostrado para cambio de usuario');
        }, 300);
        
    } else {
        console.log('❌ Cambio de usuario cancelado');
    }
}

// =============================================
// CLASE FIREBASE SYNC - NUEVA ESTRUCTURA
// =============================================

class FirebaseSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.initializing = false;
        this.db = null;
        this.unsubscribe = null;
    }

    async initialize() {
        if (this.initialized) {
            console.log('✅ Firebase Sync ya estaba inicializado');
            return true;
        }

        if (this.initializing) {
            console.log('⏳ Firebase Sync ya se está inicializando...');
            return false;
        }

        this.initializing = true;

        try {
            console.log('📡 Inicializando Firebase Sync con nueva estructura...');
            
            // 1. Verificar si Firebase está disponible
            if (typeof firebase === 'undefined') {
                throw new Error('Firebase no está cargado. Verifica que el SDK de Firebase esté incluido.');
            }
            
            // 2. Inicializar Firebase
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            
            // 3. Inicializar Firestore
            this.db = firebase.firestore();
            
            // 4. Obtener User ID del sistema de código
            this.userId = this.getUserId();
            console.log('👤 User ID obtenido:', this.userId);
            
            this.initialized = true;
            this.initializing = false;
            
            console.log('✅ Firebase Sync con nueva estructura inicializado CORRECTAMENTE');
            console.log('👤 User ID:', this.userId);
            
            this.actualizarUIEstado('connected');
            return true;
            
        } catch (error) {
            this.initializing = false;
            console.error('❌ Error inicializando Firebase Sync:', error);
            this.actualizarUIEstado('error');
            return false;
        }
    }

    getUserId() {
        if (userCodeSystem.initialized && userCodeSystem.userId) {
            console.log('🔗 Usando userId del sistema de código:', userCodeSystem.userId);
            return userCodeSystem.userId;
        }
        
        let userId = localStorage.getItem('ubercalc_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ubercalc_user_id', userId);
            console.log('🆕 Nuevo User ID generado (fallback):', userId);
        }
        return userId;
    }

    // =============================================
    // MÉTODOS PARA PERFILES - NUEVA ESTRUCTURA
    // =============================================

    async saveProfile(profile) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede guardar perfil');
            return false;
        }

        try {
            console.log('💾 Guardando perfil en Firebase (nueva estructura)...', profile.id);
            
            const profileRef = this.db.collection('users').doc(this.userId)
                .collection('profiles').doc(profile.id);
            
            await profileRef.set({
                ...profile,
                lastSync: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.lastSyncTime = new Date().toISOString();
            console.log('✅ Perfil guardado en Firebase correctamente:', profile.nombre);
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando perfil en Firebase:', error);
            return false;
        }
    }

    async deleteProfile(profileId) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede eliminar perfil');
            return false;
        }

        try {
            console.log('🗑️ Eliminando perfil de Firebase:', profileId);
            
            const profileRef = this.db.collection('users').doc(this.userId)
                .collection('profiles').doc(profileId);
            
            await profileRef.delete();
            console.log('✅ Perfil eliminado de Firebase correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando perfil de Firebase:', error);
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede cargar perfiles');
            return null;
        }

        try {
            console.log('📥 Cargando perfiles desde Firebase (nueva estructura)...');
            
            const profilesRef = this.db.collection('users').doc(this.userId)
                .collection('profiles');
            
            const snapshot = await profilesRef.orderBy('fechaCreacion', 'desc').get();
            
            if (!snapshot.empty) {
                const profiles = [];
                snapshot.forEach(doc => {
                    profiles.push(doc.data());
                });
                
                console.log('✅ Perfiles cargados desde Firebase:', profiles.length);
                this.actualizarUIEstado('connected');
                return profiles;
            } else {
                console.log('📭 No se encontraron perfiles en Firebase para este usuario');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando perfiles desde Firebase:', error);
            this.actualizarUIEstado('error');
            return null;
        }
    }

    // =============================================
    // MÉTODOS PARA VIAJES - NUEVA ESTRUCTURA
    // =============================================

    async saveTrip(trip) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede guardar viaje');
            return false;
        }

        try {
            console.log('💾 Guardando viaje en Firebase (nueva estructura)...', trip.id);
            
            const tripRef = this.db.collection('users').doc(this.userId)
                .collection('trips').doc(trip.id);
            
            await tripRef.set({
                ...trip,
                lastSync: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.lastSyncTime = new Date().toISOString();
            console.log('✅ Viaje guardado en Firebase correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando viaje en Firebase:', error);
            return false;
        }
    }

    async loadTrips(profileId = null) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede cargar viajes');
            return null;
        }

        try {
            console.log('📥 Cargando viajes desde Firebase (nueva estructura)...');
            
            let tripsRef = this.db.collection('users').doc(this.userId)
                .collection('trips');
            
            // Si se especifica un perfil, filtrar por él
            if (profileId) {
                tripsRef = tripsRef.where('perfilId', '==', profileId);
            }
            
            const snapshot = await tripsRef.orderBy('timestamp', 'desc').limit(100).get();
            
            if (!snapshot.empty) {
                const trips = [];
                snapshot.forEach(doc => {
                    trips.push(doc.data());
                });
                
                console.log('✅ Viajes cargados desde Firebase:', trips.length);
                return trips;
            } else {
                console.log('📭 No se encontraron viajes en Firebase para este usuario');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando viajes desde Firebase:', error);
            return null;
        }
    }

    async deleteTrip(tripId) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede eliminar viaje');
            return false;
        }

        try {
            console.log('🗑️ Eliminando viaje de Firebase:', tripId);
            
            const tripRef = this.db.collection('users').doc(this.userId)
                .collection('trips').doc(tripId);
            
            await tripRef.delete();
            console.log('✅ Viaje eliminado de Firebase correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando viaje de Firebase:', error);
            return false;
        }
    }

    async clearAllTrips() {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede limpiar viajes');
            return false;
        }

        try {
            console.log('🗑️ Eliminando todos los viajes de Firebase...');
            
            const tripsRef = this.db.collection('users').doc(this.userId)
                .collection('trips');
            
            const snapshot = await tripsRef.get();
            
            const batch = this.db.batch();
            snapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log('✅ Todos los viajes eliminados de Firebase');
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando viajes de Firebase:', error);
            return false;
        }
    }

    // =============================================
    // ESCUCHA EN TIEMPO REAL - NUEVA ESTRUCTURA
    // =============================================

    listenForChanges(callback) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede escuchar cambios');
            return null;
        }

        try {
            console.log('👂 Escuchando cambios en tiempo real para:', this.userId);
            
            // Escuchar cambios en perfiles
            const unsubscribeProfiles = this.db.collection('users').doc(this.userId)
                .collection('profiles')
                .onSnapshot((snapshot) => {
                    console.log('🔄 Cambios detectados en perfiles Firebase');
                    const profiles = [];
                    snapshot.forEach(doc => {
                        profiles.push(doc.data());
                    });
                    
                    // Notificar cambios en perfiles
                    callback({ type: 'profiles', data: profiles });
                }, (error) => {
                    console.error('❌ Error escuchando cambios en perfiles:', error);
                });

            // Escuchar cambios en viajes
            const unsubscribeTrips = this.db.collection('users').doc(this.userId)
                .collection('trips')
                .orderBy('timestamp', 'desc')
                .limit(50)
                .onSnapshot((snapshot) => {
                    console.log('🔄 Cambios detectados en viajes Firebase');
                    const trips = [];
                    snapshot.forEach(doc => {
                        trips.push(doc.data());
                    });
                    
                    // Notificar cambios en viajes
                    callback({ type: 'trips', data: trips });
                }, (error) => {
                    console.error('❌ Error escuchando cambios en viajes:', error);
                });

            // Retornar función para desuscribir ambos listeners
            return () => {
                unsubscribeProfiles();
                unsubscribeTrips();
            };
            
        } catch (error) {
            console.error('❌ Error configurando listeners:', error);
            return null;
        }
    }

    // =============================================
    // MÉTODOS AUXILIARES
    // =============================================

    async getSyncStatus() {
        if (!this.initialized) return 'not_configured';

        try {
            // Obtener conteo de perfiles
            const profilesSnapshot = await this.db.collection('users').doc(this.userId)
                .collection('profiles').get();
            
            // Obtener conteo de viajes
            const tripsSnapshot = await this.db.collection('users').doc(this.userId)
                .collection('trips').get();
            
            return {
                status: 'connected',
                lastSync: this.lastSyncTime,
                profilesCount: profilesSnapshot.size,
                tripsCount: tripsSnapshot.size
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estado de sync:', error);
            return {
                status: 'error',
                lastSync: null,
                profilesCount: 0,
                tripsCount: 0
            };
        }
    }

    actualizarUIEstado(estado) {
        try {
            // Actualizar el botón en lugar de la barra
            actualizarUISyncBoton(estado);
        } catch (error) {
            console.error('❌ Error actualizando UI de sync:', error);
        }
    }

    getDeviceInfo() {
        return {
            id: this.userId,
            name: this.guessDeviceName(),
            type: this.detectDeviceType(),
            userAgent: navigator.userAgent.substring(0, 100),
            lastSync: this.lastSyncTime || new Date().toISOString()
        };
    }

    guessDeviceName() {
        const ua = navigator.userAgent;
        let name = 'Dispositivo';
        
        if (/Mobile|Android|iPhone/i.test(ua)) {
            name = /Tablet|iPad/i.test(ua) ? 'Tableta' : 'Teléfono';
        } else if (/Windows/i.test(ua)) {
            name = 'Computadora Windows';
        } else if (/Mac/i.test(ua)) {
            name = 'Computadora Mac';
        } else if (/Linux/i.test(ua)) {
            name = 'Computadora Linux';
        }
        
        return name;
    }

    detectDeviceType() {
        const ua = navigator.userAgent;
        if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
            return /Tablet|iPad/i.test(ua) ? 'tablet' : 'mobile';
        }
        return 'desktop';
    }
}

// =============================================
// FUNCIONES DE PERSISTENCIA ACTUALIZADAS
// =============================================

async function guardarDatos() {
    console.log('💾 Guardando datos (solo local)...');
    
    // Guardar SOLO en LocalStorage - SIN sincronización automática
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
// NUEVAS FUNCIONES PARA OPTIMIZAR SINCRONIZACIÓN
// =============================================

function guardarDatosLocal() {
    console.log('💾 Guardando datos solo en localStorage...');
    
    localStorage.setItem('uberCalc_data', JSON.stringify({
        perfiles,
        perfilActual,
        historial,
        version: '2.0',
        ultimaActualizacion: new Date().toISOString()
    }));
}

function iniciarEscuchaFirebase() {
    if (!firebaseSync || !firebaseSync.initialized) {
        console.log('❌ Firebase Sync no disponible para escucha');
        return;
    }
    
    try {
        console.log('👂 Iniciando escucha en tiempo real de Firebase...');
        
        firebaseSync.unsubscribe = firebaseSync.listenForChanges((change) => {
            console.log('🔄 Datos actualizados desde la nube:', change.type);
            
            if (change.type === 'profiles') {
                console.log('✅ Actualizando perfiles desde la nube:', change.data.length);
                perfiles = change.data;
                
                // Actualizar perfil actual si es necesario
                if (perfiles.length > 0) {
                    const currentProfileId = perfilActual?.id;
                    perfilActual = perfiles.find(p => p.id === currentProfileId) || perfiles[0];
                }
                
                // Actualizar interfaz
                actualizarInterfazPerfiles();
            }
            
            if (change.type === 'trips') {
                console.log('✅ Actualizando viajes desde la nube:', change.data.length);
                historial = change.data;
                
                // Actualizar interfaz
                actualizarHistorial();
                actualizarEstadisticas();
            }
            
            // Guardar localmente los datos actualizados
            guardarDatosLocal();
        });
        
        console.log('✅ Escucha de Firebase iniciada correctamente');
        
    } catch (error) {
        console.error('❌ Error iniciando escucha en tiempo real:', error);
    }
}

// =============================================
// FUNCIÓN CARGAR DATOS - COMPLETAMENTE REESCRITA
// =============================================

async function cargarDatos() {
    console.log('🔄 Cargando datos (SOLUCIÓN DEFINITIVA)...');
    
    // 1. PRIMERO cargar de localStorage para tener algo rápido
    try {
        const datosGuardados = localStorage.getItem('uberCalc_data');
        if (datosGuardados) {
            const datos = JSON.parse(datosGuardados);
            perfiles = datos.perfiles || [];
            perfilActual = datos.perfilActual || null;
            historial = datos.historial || [];
            console.log('💾 Datos locales cargados:', { 
                perfiles: perfiles.length, 
                historial: historial.length 
            });
        }
    } catch (error) {
        console.error('Error cargando datos locales:', error);
        perfiles = [];
        historial = [];
    }

    // 2. LUEGO intentar cargar desde Firebase
    if (firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Intentando cargar desde Firebase...');
            
            // Cargar perfiles de Firebase
            const cloudProfiles = await firebaseSync.loadProfiles();
            if (cloudProfiles && cloudProfiles.length > 0) {
                console.log('✅ Perfiles de Firebase:', cloudProfiles.length);
                perfiles = cloudProfiles;
            }
            
            // Cargar viajes de Firebase
            const cloudTrips = await firebaseSync.loadTrips();
            if (cloudTrips && cloudTrips.length > 0) {
                console.log('✅ Viajes de Firebase:', cloudTrips.length);
                historial = cloudTrips;
            }
            
        } catch (error) {
            console.error('❌ Error cargando Firebase:', error);
        }
    }

    // 3. Establecer perfil actual si es necesario
    if (!perfilActual && perfiles.length > 0) {
        perfilActual = perfiles[0];
        console.log('✅ Perfil actual establecido:', perfilActual.nombre);
    }

    console.log('🎉 Carga finalizada:', {
        perfiles: perfiles.length,
        historial: historial.length,
        perfilActual: perfilActual?.nombre || 'null'
    });

    // 4. FORZAR ACTUALIZACIÓN DE INTERFAZ
    actualizarInterfazPerfiles();
    actualizarEstadisticas();
    actualizarHistorial();
    
    // Guardar los datos combinados
    guardarDatos();
}

// =============================================
// FUNCIONES DE SINCRONIZACIÓN
// =============================================

async function initializeFirebaseSyncWithRetry(maxRetries = 3, delay = 2000) {
    console.log('🔄 Inicializando Firebase Sync con reintentos...');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`📡 Intento ${attempt} de ${maxRetries}...`);
        
        try {
            // Crear nueva instancia de FirebaseSync
            firebaseSync = new FirebaseSync();
            
            // Inicializar
            const success = await firebaseSync.initialize();
            
            if (success) {
                console.log(`✅ Firebase Sync inicializado correctamente en intento ${attempt}`);
                return true;
            }
            
            console.warn(`⚠️ Intento ${attempt} falló, reintentando en ${delay}ms...`);
            
        } catch (error) {
            console.error(`❌ Error en intento ${attempt}:`, error);
        }
        
        // Esperar antes del próximo intento
        if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    console.error(`❌ Todos los ${maxRetries} intentos fallaron`);
    return false;
}

async function mostrarPanelSync() {
    console.log('🌐 Mostrando panel de sincronización');
    
    // Forzar actualización antes de mostrar
    await actualizarPanelSync();
    
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'flex';
    }
}

function cerrarSyncPanel() {
    console.log('❌ Cerrando panel de sincronización');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
}

async function sincronizarConFirebase() {
    if (!firebaseSync || !firebaseSync.initialized) {
        console.log('❌ Firebase Sync no disponible');
        return;
    }
    
    console.log('🔄 INICIANDO SINCRONIZACIÓN MANUAL CON FIREBASE...');
    mostrarStatus('🔄 Sincronizando con Firebase...', 'info');
    
    try {
        // 1. Sincronizar perfiles
        console.log('📤 Sincronizando perfiles...');
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        
        // 2. Sincronizar solo viajes aceptados (últimos 20)
        console.log('📤 Sincronizando viajes aceptados...');
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

async function forzarSincronizacion() {
    await sincronizarConFirebase();
}

async function forzarSincronizacionCompleta() {
    if (!firebaseSync || !firebaseSync.initialized) {
        console.warn('❌ Firebase Sync no disponible para sincronización completa');
        return false;
    }
    
    try {
        console.log('🔄 Forzando sincronización completa (nueva estructura)...');
        
        // 1. Subir datos locales a Firebase
        for (const perfil of perfiles) {
            await firebaseSync.saveProfile(perfil);
        }
        for (const viaje of historial.slice(0, 100)) {
            await firebaseSync.saveTrip(viaje);
        }
        console.log('✅ Datos locales subidos a Firebase');
        
        // 2. Descargar datos más recientes de Firebase
        const cloudProfiles = await firebaseSync.loadProfiles();
        const cloudTrips = await firebaseSync.loadTrips();
        
        // 3. Usar datos de Firebase (son los más recientes)
        if (cloudProfiles && cloudProfiles.length > 0) {
            perfiles = cloudProfiles;
            console.log('✅ Perfiles sincronizados:', perfiles.length);
        }
        
        if (cloudTrips && cloudTrips.length > 0) {
            historial = cloudTrips;
            console.log('✅ Viajes sincronizados:', historial.length);
        }
        
        // 4. Actualizar perfil actual
        if (perfiles.length > 0 && !perfilActual) {
            perfilActual = perfiles[0];
        }
        
        // 5. Actualizar interfaz
        actualizarInterfazPerfiles();
        actualizarHistorial();
        actualizarEstadisticas();
        
        // 6. Guardar localmente
        guardarDatos();
        
        console.log('✅ Sincronización completa exitosa (nueva estructura)');
        mostrarStatus('Sincronización completa exitosa', 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Error en sincronización completa:', error);
        mostrarStatus('Error en sincronización', 'error');
        return false;
    }
}

// =============================================
// FUNCIÓN PARA SINCRONIZAR DATOS DE FIREBASE A LOCAL
// =============================================

async function sincronizarFirebaseALocal() {
    console.log('🔄 Sincronizando datos de Firebase a local...');
    
    if (!firebaseSync || !firebaseSync.initialized) {
        console.log('❌ Firebase Sync no disponible');
        return;
    }
    
    try {
        // Cargar perfiles desde Firebase
        const cloudProfiles = await firebaseSync.loadProfiles();
        if (cloudProfiles && cloudProfiles.length > 0) {
            perfiles = cloudProfiles;
            console.log('✅ Perfiles sincronizados desde Firebase:', perfiles.length);
        }
        
        // Cargar viajes desde Firebase
        const cloudTrips = await firebaseSync.loadTrips();
        if (cloudTrips && cloudTrips.length > 0) {
            historial = cloudTrips;
            console.log('✅ Viajes sincronizados desde Firebase:', historial.length);
        }
        
        // Actualizar perfil actual
        if (perfiles.length > 0 && !perfilActual) {
            perfilActual = perfiles[0];
        }
        
        // Actualizar interfaz
        actualizarInterfazPerfiles();
        actualizarEstadisticas();
        actualizarHistorial();
        
        // Guardar localmente
        guardarDatos();
        
        console.log('✅ Sincronización Firebase->Local completada');
        mostrarStatus('Datos sincronizados correctamente', 'success');
        
    } catch (error) {
        console.error('❌ Error sincronizando Firebase->Local:', error);
        mostrarStatus('Error sincronizando datos', 'error');
    }
}

// =============================================
// BOTÓN PARA FORZAR SINCRONIZACIÓN DESDE FIREBASE
// =============================================

async function forzarSincronizacionDesdeFirebase() {
    console.log('🔄 Forzando sincronización desde Firebase...');
    mostrarStatus('🔄 Sincronizando desde Firebase...', 'info');
    
    await sincronizarFirebaseALocal();
}

// =============================================
// AGREGAR BOTÓN DE SINCRONIZACIÓN MANUAL
// =============================================

function agregarBotonSincronizacionManual() {
    // Buscar si ya existe el botón
    let syncButton = document.getElementById('sync-from-firebase-btn');
    
    if (!syncButton) {
        // Crear botón en el panel de sync
        const syncActionsPanel = document.querySelector('.sync-actions-panel');
        if (syncActionsPanel) {
            syncButton = document.createElement('button');
            syncButton.id = 'sync-from-firebase-btn';
            syncButton.className = 'primary-button';
            syncButton.innerHTML = `
                <span class="button-icon">⬇️</span>
                Cargar desde Firebase
            `;
            syncButton.onclick = forzarSincronizacionDesdeFirebase;
            
            syncActionsPanel.appendChild(syncButton);
        }
    }
}

async function actualizarPanelSync() {
    console.log('🔄 Actualizando estado de sincronización');
    
    if (!firebaseSync) {
        console.log('📱 Firebase Sync no disponible');
        return;
    }

    try {
        // Obtener estado de sincronización
        const syncStatus = await firebaseSync.getSyncStatus();
        
        // Actualizar contadores
        const profilesCount = document.getElementById('cloud-profiles-count');
        const tripsCount = document.getElementById('cloud-history-count');
        
        if (profilesCount) profilesCount.textContent = syncStatus.profilesCount;
        if (tripsCount) tripsCount.textContent = syncStatus.tripsCount;
        
        // Actualizar estado principal
        const firebaseStatus = document.getElementById('firebase-status');
        const lastSyncTime = document.getElementById('last-sync-time');
        
        if (firebaseStatus) firebaseStatus.textContent = syncStatus.status === 'connected' ? 'Conectado' : 'Error';
        if (lastSyncTime) lastSyncTime.textContent = syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : '--';
        
        // Actualizar información del dispositivo
        const deviceInfo = firebaseSync.getDeviceInfo();
        const currentDeviceName = document.getElementById('current-device-name');
        const currentDeviceId = document.getElementById('current-device-id');
        const currentDeviceIcon = document.getElementById('current-device-icon');
        
        if (currentDeviceName) currentDeviceName.textContent = deviceInfo.name;
        if (currentDeviceId) currentDeviceId.textContent = `ID: ${userCodeSystem.userCode || 'Sin código'}`;
        if (currentDeviceIcon) {
            currentDeviceIcon.textContent = deviceInfo.type === 'mobile' ? '📱' : 
                                          deviceInfo.type === 'tablet' ? '📱' : '💻';
        }
        
        console.log('✅ Panel de sync actualizado');
        
    } catch (error) {
        console.error('❌ Error actualizando panel de sync:', error);
    }
}

function mostrarInfoSync() {
    alert(`🌐 SINCRONIZACIÓN CON FIREBASE - NUEVA ESTRUCTURA

✅ Cómo funciona:
1. Tus perfiles se guardan individualmente en Firebase
2. Cada viaje es un documento independiente
3. Todos tus dispositivos acceden a los mismos datos
4. Los cambios se sincronizan automáticamente
5. Tus datos están seguros en tu base de datos de Firebase

📱 Dispositivos conectados: Todos los que usen tu mismo código

💡 Características:
• Sincronización en tiempo real
• Sin conflictos entre dispositivos
• Respaldo seguro en la nube
• Totalmente gratuito

🔒 Tus datos son privados y solo tú puedes acceder a ellos`);
}

async function diagnosticarSync() {
    console.log('🔧 INICIANDO DIAGNÓSTICO COMPLETO...');
    
    console.log('📊 DATOS LOCALES:');
    console.log('• Perfiles:', perfiles.length);
    console.log('• Historial total:', historial.length);
    console.log('• Viajes aceptados:', historial.filter(item => item.aceptado).length);
    console.log('• Perfil actual:', perfilActual?.nombre);
    console.log('• Primer viaje:', historial[0]);
    
    console.log('📱 ELEMENTOS DEL DOM:');
    console.log('• statsViajes:', !!elementos.statsViajes);
    console.log('• statsGanancia:', !!elementos.statsGanancia);
    console.log('• historyList:', !!elementos.historyList);
    
    // Verificar Firebase
    if (firebaseSync && firebaseSync.initialized) {
        console.log('☁️ FIREBASE:');
        try {
            const cloudTrips = await firebaseSync.loadTrips();
            console.log('• Viajes en Firebase:', cloudTrips?.length);
            console.log('• Primer viaje Firebase:', cloudTrips?.[0]);
        } catch (error) {
            console.error('• Error cargando Firebase:', error);
        }
    }
    
    // Forzar actualización de UI
    actualizarEstadisticas();
    actualizarHistorial();
    
    const diagnostico = `
🎉 DIAGNÓSTICO COMPLETADO

📊 DATOS LOCALES:
• Perfiles: ${perfiles.length}
• Historial total: ${historial.length}
• Viajes aceptados: ${historial.filter(item => item.aceptado).length}
• Perfil actual: ${perfilActual?.nombre || 'Ninguno'}

☁️ FIREBASE:
• Estado: ${firebaseSync?.initialized ? 'Conectado' : 'No conectado'}
• Viajes en nube: ${document.getElementById('cloud-history-count')?.textContent || '?'}

📱 INTERFAZ:
• Estadísticas: ${elementos.statsViajes ? 'OK' : 'ERROR'}
• Historial: ${elementos.historyList ? 'OK' : 'ERROR'}

🔧 ACCIONES RECOMENDADAS:
1. Usa "Cargar desde Firebase" para traer datos
2. Verifica que los viajes tengan "aceptado: true"
3. Los viajes RECHAZADOS no se muestran en el historial
    `;
    
    alert(diagnostico);
}

// =============================================
// INICIALIZACIÓN DE LA APLICACIÓN ACTUALIZADA
// =============================================

async function inicializarApp() {
    console.log('📡 Inicializando UberCalc con Sincronización Multi-Dispositivo...');
    
    try {
        // 1. PRIMERO: Inicializar sistema de código de usuario
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return;
        }
        
        // 2. LUEGO: Inicializar Firebase Sync con nueva estructura
        console.log('🔄 Inicializando Firebase Sync con nueva estructura...');
        const firebaseReady = await initializeFirebaseSyncWithRetry();
        
        if (firebaseReady) {
            console.log('✅ Firebase Sync con nueva estructura inicializado, cargando datos...');
            await cargarDatos();
            
            // Agregar botón de sincronización manual
            agregarBotonSincronizacionManual();
            
        } else {
            console.log('📱 Firebase Sync no disponible, usando almacenamiento local');
            await cargarDatos();
        }
        
        aplicarTemaGuardado();
        actualizarInterfazPerfiles();
        
        // 3. DECIDIR qué pantalla mostrar
        if (perfiles.length === 0) {
            console.log('👤 Sin perfiles, mostrando pantalla de perfiles...');
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            console.log('🏠 Mostrando pantalla principal con perfil:', perfilActual.nombre);
            mostrarPantalla('main');
            // FORZAR ACTUALIZACIÓN INMEDIATA
            setTimeout(() => {
                actualizarEstadisticas();
                actualizarHistorial();
            }, 500);
        } else {
            console.log('👤 Mostrando pantalla de perfiles (perfilActual es null)');
            mostrarPantalla('perfil');
        }
        
        // Actualizar UI de sync
        actualizarPanelSync();
        
        console.log('🎉 UberCalc con Sincronización Multi-Dispositivo inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar la aplicación. Por favor, recarga la página.', 'error');
    }
}

// =============================================
// FUNCIONES ORIGINALES (MANTENIDAS)
// =============================================

// --- Inicialización ---
document.addEventListener('DOMContentLoaded', function() {
    inicializarApp();
    configurarEventListeners();
});

function configurarEventListeners() {
    // Sistema de Pestañas
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', () => cambiarPestana(button.dataset.tab));
    });
    
    // Cálculo Automático - USANDO input en lugar de change para mejor respuesta
    elementos.tarifaInput.addEventListener('input', manejarCalculoAutomatico);
    elementos.minutosInput.addEventListener('input', manejarCalculoAutomatico);
    elementos.distanciaInput.addEventListener('input', manejarCalculoAutomatico);
    
    // Botones de Acción
    elementos.aceptarViajeBtn.addEventListener('click', () => procesarViaje(true));
    elementos.rechazarViajeBtn.addEventListener('click', () => procesarViaje(false));
    
    // Historial
    elementos.clearHistoryBtn.addEventListener('click', limpiarHistorial);
    elementos.exportarHistorialBtn.addEventListener('click', mostrarModalExportacion);
    
    // Perfiles
    elementos.nuevoPerfilBtn.addEventListener('click', () => mostrarConfigPerfil());
    elementos.volverPerfilesBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    elementos.cancelarPerfilBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    elementos.cambiarPerfilBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    elementos.perfilForm.addEventListener('submit', guardarPerfil);
    
    // Tema
    elementos.themeToggle.addEventListener('click', alternarTema);
    
    // Exportación - SOLO PDF
    elementos.exportarPdfBtn.addEventListener('click', exportarPDF);
    
    // Configuración de Unidades
    document.getElementById('tipo-medida').addEventListener('change', actualizarUnidades);
    document.getElementById('tipo-combustible').addEventListener('change', actualizarUnidades);
    document.getElementById('moneda').addEventListener('change', actualizarUnidades);

    // Sincronización - Agregar event listener para Enter en el código de usuario
    const syncStatusBtn = document.getElementById('sync-status-btn');
    if (syncStatusBtn) {
        syncStatusBtn.addEventListener('click', mostrarPanelSync);
    }
}

// --- Sistema de Pestañas ---
function cambiarPestana(tabId) {
    // Actualizar botones de pestañas
    elementos.tabButtons.forEach(button => {
        button.classList.toggle('active', button.dataset.tab === tabId);
    });
    
    // Actualizar contenido de pestañas
    elementos.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
    
    // Actualizar datos si es necesario
    if (tabId === 'resumen') {
        actualizarEstadisticas();
    } else if (tabId === 'historial') {
        actualizarHistorial();
    }
}

// --- CÁLCULO AUTOMÁTICO CORREGIDO ---
function manejarCalculoAutomatico() {
    // Limpiar timeout anterior
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    
    // Establecer nuevo timeout (más rápido - 500ms)
    timeoutCalculo = setTimeout(calcularAutomatico, 500);
}

function calcularAutomatico() {
    const tarifa = parseFloat(elementos.tarifaInput.value) || 0;
    const minutos = parseFloat(elementos.minutosInput.value) || 0;
    const distancia = parseFloat(elementos.distanciaInput.value) || 0;
    
    // Verificar si tenemos todos los datos necesarios
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        elementos.autoCalcIndicator.classList.remove('hidden');
        
        // Calcular resultado INMEDIATAMENTE
        const resultado = calcularRentabilidad(tarifa, minutos, distancia);
        
        if (resultado) {
            calculoActual = resultado;
            mostrarResultadoRapido(resultado);
        } else {
            elementos.autoCalcIndicator.classList.add('hidden');
            elementos.resultadoRapido.classList.add('hidden');
            cerrarModalRapido();
        }
    } else {
        elementos.autoCalcIndicator.classList.add('hidden');
        elementos.resultadoRapido.classList.add('hidden');
        cerrarModalRapido();
        
        // Mostrar mensaje si falta perfil
        if (tarifa > 0 && minutos > 0 && distancia > 0 && !perfilActual) {
            mostrarStatus('⚠️ Selecciona un perfil primero', 'warning');
        }
    }
}

function mostrarResultadoRapido(resultado) {
    if (!resultado) return;
    
    // Ocultar el resultado rápido antiguo (si existe)
    elementos.resultadoRapido.classList.add('hidden');
    
    // Crear modal flotante si no existe
    let modalRapido = document.getElementById('modal-rapido');
    if (!modalRapido) {
        modalRapido = document.createElement('div');
        modalRapido.id = 'modal-rapido';
        modalRapido.className = 'modal-rapido hidden';
        modalRapido.innerHTML = `
            <div class="modal-rapido-contenido">
                <button class="modal-rapido-cerrar" onclick="cerrarModalRapido()">×</button>
                <div class="modal-rapido-header">
                    <div class="modal-rapido-badge" id="modal-rapido-badge">
                        <span class="modal-rapido-emoji" id="modal-rapido-emoji">✅</span>
                        <span class="modal-rapido-texto" id="modal-rapido-texto">RENTABLE</span>
                    </div>
                </div>
                <div class="modal-rapido-metricas">
                    <div class="modal-rapido-metrica">
                        <div class="modal-rapido-metrica-icono">⏱️</div>
                        <div class="modal-rapido-metrica-valor" id="modal-rapido-minuto">--/min</div>
                        <div class="modal-rapido-metrica-label">Por minuto</div>
                    </div>
                    <div class="modal-rapido-metrica">
                        <div class="modal-rapido-metrica-icono">🛣️</div>
                        <div class="modal-rapido-metrica-valor" id="modal-rapido-km">--/km</div>
                        <div class="modal-rapido-metrica-label">Por distancia</div>
                    </div>
                </div>
                <div class="modal-rapido-acciones">
                    <button class="secondary-button" onclick="procesarViajeRapido(false)">
                        <span class="button-icon">❌</span>
                        Rechazar Viaje
                    </button>
                    <button class="primary-button" id="modal-rapido-aceptar" onclick="procesarViajeRapido(true)">
                        <span class="button-icon">✅</span>
                        Aceptar Viaje
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modalRapido);
    }
    
    // Actualizar contenido
    const modalBadge = document.getElementById('modal-rapido-badge');
    document.getElementById('modal-rapido-emoji').textContent = resultado.emoji;
    document.getElementById('modal-rapido-texto').textContent = resultado.texto;
    document.getElementById('modal-rapido-minuto').textContent = `${formatearMoneda(resultado.gananciaPorMinuto)}/min`;
    
    const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
    document.getElementById('modal-rapido-km').textContent = `${formatearMoneda(resultado.gananciaPorKm)}/${distanciaLabel}`;
    
    // Configurar estilos según rentabilidad
    modalBadge.className = 'modal-rapido-badge';
    modalBadge.classList.add(resultado.rentabilidad);
    
    // Configurar botón de aceptar según rentabilidad
    const btnAceptar = document.getElementById('modal-rapido-aceptar');
    btnAceptar.className = 'primary-button';
    btnAceptar.classList.add(resultado.rentabilidad);
    
    // Mostrar modal
    modalRapido.classList.remove('hidden');
    
    // Guardar cálculo actual para uso posterior
    calculoActual = resultado;
    
}

function cerrarModalRapido() {
    const modalRapido = document.getElementById('modal-rapido');
    if (modalRapido) {
        modalRapido.classList.add('hidden');
    }
    if (window.modalRapidoTimeout) {
        clearTimeout(window.modalRapidoTimeout);
    }
}

// =============================================
// FUNCIONES CORREGIDAS PARA PROCESAR VIAJES
// =============================================

async function procesarViaje(aceptado) {
    console.log('🔄 Procesando viaje:', { aceptado, calculoActual: !!calculoActual });
    
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }

    // Verificar que tenemos perfilActual
    if (!perfilActual) {
        mostrarError('No hay perfil seleccionado. Por favor, selecciona un perfil primero.');
        return;
    }

    try {
        // Guardar en historial
        await guardarEnHistorial(calculoActual, aceptado);
        
        if (aceptado) {
            mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
        } else {
            mostrarStatus('❌ Viaje rechazado', 'info');
        }

        // Limpiar formulario
        limpiarFormulario();
        cerrarModal();
        
        // Actualizar interfaz INMEDIATAMENTE
        actualizarEstadisticas();
        actualizarHistorial();
        
        // Cambiar a pestaña de historial si se aceptó
        if (aceptado) {
            setTimeout(() => {
                cambiarPestana('historial');
                // Forzar actualización después de cambiar pestaña
                setTimeout(() => {
                    actualizarEstadisticas();
                    actualizarHistorial();
                }, 100);
            }, 500);
        }
        
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

    // Verificar que tenemos perfilActual
    if (!perfilActual) {
        mostrarError('No hay perfil seleccionado. Por favor, selecciona un perfil primero.');
        return;
    }

    // Cerrar modal rápido primero
    cerrarModalRapido();
    
    // Guardar en historial (esto actualizará automáticamente las estadísticas)
    guardarEnHistorial(calculoActual, aceptado);
    
    if (aceptado) {
        mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        mostrarStatus('❌ Viaje rechazado', 'info');
    }
    
    // Limpiar formulario
    limpiarFormulario();
    
    // Actualizar interfaz INMEDIATAMENTE
    actualizarEstadisticas();
    actualizarHistorial();
    
    // Cambiar a pestaña de historial si se aceptó
    if (aceptado) {
        setTimeout(() => {
            cambiarPestana('historial');
            // Forzar actualización después de cambiar pestaña
            setTimeout(() => {
                actualizarEstadisticas();
                actualizarHistorial();
            }, 100);
        }, 500);
    }
}

// =============================================
// GUARDAR EN HISTORIAL - VERSIÓN DEFINITIVA
// =============================================

async function guardarEnHistorial(resultado, aceptado) {
    console.log('💾 GUARDANDO EN HISTORIAL - VERSIÓN DEFINITIVA...', { aceptado });
    
    // Crear el item del historial
    const historialItem = {
        ...resultado,
        aceptado: aceptado,
        id: 'viaje_' + Date.now(),
        perfilId: perfilActual?.id,
        perfilNombre: perfilActual?.nombre,
        timestamp: new Date().toISOString()
    };
    
    console.log('📝 Item a guardar:', historialItem);
    
    // AGREGAR AL HISTORIAL LOCAL
    historial.unshift(historialItem);
    console.log('✅ Agregado al historial local. Total:', historial.length);
    
    // GUARDAR EN FIREBASE SOLO SI FUE ACEPTADO
    if (aceptado && firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Guardando en Firebase...');
            await firebaseSync.saveTrip(historialItem);
            console.log('✅ Guardado en Firebase');
        } catch (error) {
            console.error('❌ Error guardando en Firebase:', error);
        }
    }
    
    // GUARDAR EN LOCALSTORAGE SIEMPRE
    guardarDatos();
    console.log('✅ Datos guardados en localStorage');
    
    // ACTUALIZAR INTERFAZ INMEDIATAMENTE
    console.log('🔄 Actualizando interfaz...');
    actualizarEstadisticas();
    actualizarHistorial();
    
    console.log('🎉 Proceso de guardado completado');
}

function resetearInterfazCalculo() {
  if (elementos.aceptarViajeTabBtn) {
        elementos.aceptarViajeTabBtn.className = 'primary-button';
        elementos.aceptarViajeTabBtn.classList.remove('rentable', 'oportunidad', 'no-rentable');
    }
    calculoActual = null;
}

// --- FUNCIONES DE CÁLCULO CORREGIDAS ---
function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) {
        return null;
    }
    
    try {
        // Calcular costo del combustible
        const combustibleUsado = distancia / perfilActual.rendimiento;
        const costoCombustible = combustibleUsado * perfilActual.precioCombustible;
        
        // Calcular costos de mantenimiento (proporcionales)
        const costoMantenimientoPorKm = (perfilActual.costoMantenimiento || 0) / 1500; // 1500 km mensuales estimados
        const costoSeguroPorMinuto = (perfilActual.costoSeguro || 0) / (30 * 24 * 60); // Costo por minuto
        
        const costoMantenimiento = distancia * costoMantenimientoPorKm;
        const costoSeguro = minutos * costoSeguroPorMinuto;
        
        const costoTotal = costoCombustible + costoMantenimiento + costoSeguro;
        const gananciaNeta = tarifa - costoTotal;
        
        // Calcular métricas por minuto y por km
        const gananciaPorMinuto = tarifa / minutos;
        const gananciaPorKm = tarifa / distancia;
        
        // Determinar rentabilidad
        let rentabilidad;
        let emoji;
        let texto;
        
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
            tarifa,
            minutos,
            distancia,
            gananciaNeta,
            gananciaPorMinuto,
            gananciaPorKm,
            costoCombustible,
            costoMantenimiento,
            costoSeguro,
            costoTotal,
            rentabilidad,
            emoji,
            texto,
            timestamp: new Date().toISOString()
        };
        
        return resultado;
        
    } catch (error) {
        mostrarError('Error en el cálculo. Verifica los datos ingresados.');
        return null;
    }
}

function mostrarModalResultados(resultado) {
    if (!resultado) return;
    
    elementos.modalEmoji.textContent = resultado.emoji;
    elementos.modalTexto.textContent = resultado.texto;
    
    // Configurar badge según rentabilidad
    elementos.modalBadge.className = 'result-badge';
    elementos.modalBadge.classList.add(resultado.rentabilidad);
    
    // Limpiar resultados anteriores
    elementos.modalResultadosDoble.innerHTML = '';
    
    // Agregar clase compacta para móvil
    if (window.innerWidth <= 768) {
        elementos.modalContenido.classList.add('modal-resultados-compacto');
    } else {
        elementos.modalContenido.classList.remove('modal-resultados-compacto');
    }
    
    // Crear columnas de resultados COMPACTAS
    const columnaMinuto = crearColumnaResultadoCompacta(
        '⏱️ Minuto',
        `${formatearMoneda(resultado.gananciaPorMinuto)}/min`,
        `Umbral: ${formatearMoneda(perfilActual.umbralMinutoRentable)}`,
        resultado.rentabilidad
    );
    
    const distanciaLabel = perfilActual.tipoMedida === 'mi' ? 'mi' : 'km';
    const columnaDistancia = crearColumnaResultadoCompacta(
        '🛣️ Distancia',
        `${formatearMoneda(resultado.gananciaPorKm)}/${distanciaLabel}`,
        `Umbral: ${formatearMoneda(perfilActual.umbralKmRentable)}`,
        resultado.rentabilidad
    );
    
    elementos.modalResultadosDoble.appendChild(columnaMinuto);
    elementos.modalResultadosDoble.appendChild(columnaDistancia);
    
    // Agregar información adicional con DESGLOSE COMPACTO
    const infoAdicional = document.createElement('div');
    infoAdicional.className = 'metricas-adicionales';
    infoAdicional.style.gridColumn = '1 / -1';
    infoAdicional.style.marginTop = '15px';
    infoAdicional.style.padding = '12px';
    infoAdicional.style.background = 'var(--light-grey)';
    infoAdicional.style.borderRadius = '8px';
    infoAdicional.style.fontSize = window.innerWidth <= 480 ? '0.85em' : '0.9em';
    
    infoAdicional.innerHTML = `
        <h4 style="margin: 0 0 12px 0; text-align: center; color: var(--text-primary); font-size: ${window.innerWidth <= 480 ? '1em' : '1.1em'};">💰 Desglose Rápido</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: inherit;">
            <div style="grid-column: 1 / -1; text-align: center; padding: 8px; background: var(--card-bg); border-radius: 6px; border: 2px solid var(--success-green);">
                <strong style="color: var(--success-green); font-size: 0.9em;">Ganancia Ofrecida</strong><br>
                <span style="font-size: 1.1em; font-weight: bold;">${formatearMoneda(resultado.tarifa)}</span>
            </div>
            <div style="padding: 6px; background: var(--card-bg); border-radius: 5px; border-left: 3px solid var(--error-red); font-size: 0.9em;">
                <strong>⛽ Combustible</strong><br>
                ${formatearMoneda(resultado.costoCombustible)}
            </div>
            <div style="padding: 6px; background: var(--card-bg); border-radius: 5px; border-left: 3px solid var(--error-red); font-size: 0.9em;">
                <strong>🔧 Manten.</strong><br>
                ${formatearMoneda(resultado.costoMantenimiento)}
            </div>
            <div style="padding: 6px; background: var(--card-bg); border-radius: 5px; border-left: 3px solid var(--error-red); font-size: 0.9em;">
                <strong>🛡️ Seguro</strong><br>
                ${formatearMoneda(resultado.costoSeguro)}
            </div>
            <div style="grid-column: 1 / -1; text-align: center; padding: 10px; background: var(--card-bg); border-radius: 6px; border: 2px solid var(--secondary-orange); margin-top: 5px;">
                <strong style="color: var(--secondary-orange); font-size: 0.9em;">GANANCIA NETA</strong><br>
                <span style="font-size: 1.2em; font-weight: bold; color: var(--secondary-orange);">${formatearMoneda(resultado.gananciaNeta)}</span>
            </div>
        </div>
    `;
    
    elementos.modalResultadosDoble.appendChild(infoAdicional);
    
    // Guardar cálculo actual
    calculoActual = resultado;
    
    // Mostrar modal
    elementos.modalFondo.style.display = 'flex';
    
    // Enfocar el botón de aceptar para mejor usabilidad
    setTimeout(() => {
        elementos.aceptarViaje.focus();
    }, 300);
}

// NUEVA FUNCIÓN PARA COLUMNAS COMPACTAS
function crearColumnaResultadoCompacta(titulo, valor, comparacion, rentabilidad) {
    const columna = document.createElement('div');
    columna.className = 'resultado-columna';
    
    const tituloElem = document.createElement('h3');
    tituloElem.textContent = titulo;
    tituloElem.style.margin = '0 0 8px 0';
    tituloElem.style.fontSize = window.innerWidth <= 480 ? '0.85em' : '0.9em';
    tituloElem.style.fontWeight = '600';
    
    const valorElem = document.createElement('div');
    valorElem.className = `resultado-valor ${rentabilidad}`;
    valorElem.textContent = valor;
    valorElem.style.fontSize = window.innerWidth <= 480 ? '1.1em' : '1.2em';
    valorElem.style.fontWeight = 'bold';
    valorElem.style.margin = '5px 0';
    
    const comparacionElem = document.createElement('div');
    comparacionElem.className = 'resultado-comparacion';
    comparacionElem.textContent = comparacion;
    comparacionElem.style.fontSize = window.innerWidth <= 480 ? '0.7em' : '0.75em';
    comparacionElem.style.color = 'var(--text-secondary)';
    comparacionElem.style.lineHeight = '1.3';
    
    columna.appendChild(tituloElem);
    columna.appendChild(valorElem);
    columna.appendChild(comparacionElem);
    
    return columna;
}

// =============================================
// ACTUALIZAR HISTORIAL - VERSIÓN DEFINITIVA
// =============================================

function actualizarHistorial() {
    console.log('📋 ACTUALIZANDO HISTORIAL - VERSIÓN DEFINITIVA...');
    console.log('📊 Total viajes en sistema:', historial.length);
    console.log('✅ Viajes aceptados:', historial.filter(item => item.aceptado).length);
    
    if (!elementos.historyList) {
        console.error('❌ Elemento historyList no encontrado');
        return;
    }
    
    // Limpiar el historial
    elementos.historyList.innerHTML = '';
    
    // Filtrar SOLO viajes ACEPTADOS
    const viajesAceptados = historial.filter(item => item.aceptado === true);
    console.log('🎯 Viajes aceptados para mostrar:', viajesAceptados.length);
    
    if (viajesAceptados.length === 0) {
        elementos.historyList.innerHTML = `
            <div class="history-item" style="text-align: center; padding: 30px; color: #666;">
                <div style="font-size: 1.2em; margin-bottom: 10px;">No hay viajes aceptados</div>
                <div style="font-size: 0.9em;">
                    Los viajes que aceptes aparecerán aquí<br>
                    Total de viajes en sistema: ${historial.length}
                </div>
            </div>
        `;
        return;
    }
    
    // Ordenar por fecha (más recientes primero)
    const historialOrdenado = viajesAceptados.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    
    // Mostrar máximo 15 viajes
    const mostrar = historialOrdenado.slice(0, 15);
    
    console.log('🔄 Mostrando viajes:', mostrar.length);
    
    mostrar.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${item.rentabilidad}`;
        
        // Formatear fecha y hora
        const fechaObj = new Date(item.timestamp);
        const hora = fechaObj.toLocaleTimeString('es-DO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const fecha = fechaObj.toLocaleDateString('es-DO');
        
        const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
        const detalles = `${formatearMoneda(item.tarifa)} • ${item.minutos}min • ${item.distancia}${distanciaLabel}`;
        
        historyItem.innerHTML = `
            <div class="history-info">
                <div class="history-time">${hora} - ${fecha}</div>
                <div class="history-details">${detalles}</div>
                <div style="font-size: 0.8em; color: #666; margin-top: 4px;">
                    ${item.texto} ${item.emoji} • Ganancia neta: ${formatearMoneda(item.gananciaNeta)}
                </div>
            </div>
            <div class="history-status">✅</div>
        `;
        
        // Hacer clickable
        historyItem.addEventListener('click', () => {
            mostrarDetallesViaje(item);
        });
        
        elementos.historyList.appendChild(historyItem);
    });
    
    console.log('✅ Historial actualizado correctamente');
}

// =============================================
// ACTUALIZAR ESTADÍSTICAS - VERSIÓN DEFINITIVA
// =============================================

function actualizarEstadisticas() {
    console.log('📊 ACTUALIZANDO ESTADÍSTICAS - VERSIÓN DEFINITIVA...');
    
    // Verificar que los elementos existen
    if (!elementos.statsViajes || !elementos.statsGanancia) {
        console.error('❌ Elementos de estadísticas no encontrados');
        return;
    }
    
    const hoy = new Date().toDateString();
    console.log('📅 Fecha de hoy:', hoy);
    
    // Filtrar viajes ACEPTADOS de HOY
    const viajesHoy = historial.filter(item => {
        // Solo viajes aceptados
        if (!item.aceptado) {
            return false;
        }
        
        // Verificar fecha
        try {
            const itemDate = new Date(item.timestamp).toDateString();
            return itemDate === hoy;
        } catch (error) {
            console.warn('⚠️ Error procesando fecha:', item);
            return false;
        }
    });
    
    console.log('✅ Viajes aceptados hoy:', viajesHoy.length);
    
    // Calcular estadísticas
    const totalViajes = viajesHoy.length;
    const gananciaTotal = viajesHoy.reduce((sum, item) => sum + (item.tarifa || 0), 0);
    const tiempoTotal = viajesHoy.reduce((sum, item) => sum + (item.minutos || 0), 0);
    const viajesRentables = viajesHoy.filter(item => item.rentabilidad === 'rentable').length;
    
    console.log('💰 Ganancia total:', gananciaTotal);
    console.log('⏱️ Tiempo total:', tiempoTotal);
    
    // ACTUALIZAR LA INTERFAZ
    elementos.statsViajes.textContent = totalViajes;
    elementos.statsGanancia.textContent = formatearMoneda(gananciaTotal);
    
    if (elementos.statsTiempo) {
        elementos.statsTiempo.textContent = `${tiempoTotal}min`;
    }
    
    if (elementos.statsRentables) {
        elementos.statsRentables.textContent = viajesRentables;
    }
    
    // Calcular métricas adicionales
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    
    if (elementos.statsGananciaHora) {
        elementos.statsGananciaHora.textContent = formatearMoneda(gananciaPorHora);
    }
    
    if (elementos.statsViajePromedio) {
        elementos.statsViajePromedio.textContent = formatearMoneda(viajePromedio);
    }
    
    console.log('✅ Estadísticas actualizadas correctamente');
}

async function limpiarHistorial() {
    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        // Limpiar en Firebase
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.clearAllTrips();
        }
        
        historial = [];
        guardarDatos();
        actualizarHistorial();
        actualizarEstadisticas();
        mostrarStatus('🗑️ Historial limpiado correctamente', 'success');
    }
}

function mostrarDetallesViaje(viaje) {
    const detalles = `
📊 DETALLES DEL VIAJE
⏰ Hora: ${new Date(viaje.timestamp).toLocaleTimeString()}

💰 GANANCIA OFRECIDA: ${formatearMoneda(viaje.tarifa)}

📈 MÉTRICAS:
⏱️ Por minuto: ${formatearMoneda(viaje.gananciaPorMinuto)}/min
🛣️ Por ${perfilActual?.tipoMedida === 'mi' ? 'millas' : 'km'}: ${formatearMoneda(viaje.gananciaPorKm)}/${perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km'}

💸 DESGLOSE DE COSTOS:
⛽ Combustible: ${formatearMoneda(viaje.costoCombustible)}
🔧 Mantenimiento: ${formatearMoneda(viaje.costoMantenimiento)}
🛡️ Seguro: ${formatearMoneda(viaje.costoSeguro)}
💵 TOTAL COSTOS: ${formatearMoneda(viaje.costoTotal)}

🎯 RESULTADO FINAL:
💵 GANANCIA NETA: ${formatearMoneda(viaje.gananciaNeta)}
${viaje.emoji} ${viaje.texto}

✅ ESTADO: ${viaje.aceptado ? 'ACEPTADO' : 'RECHAZADO'}
    `;
    
    alert(detalles);
}

// --- Gestión de Perfiles ---
function mostrarConfigPerfil(perfil = null) {
    const form = elementos.perfilForm;
    
    if (perfil) {
        // Editar perfil existente
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
        // Nuevo perfil
        form.reset();
        document.getElementById('perfil-id').value = '';
        
        // Valores por defecto
        document.getElementById('umbral-minuto-rentable').value = '6.00';
        document.getElementById('umbral-km-rentable').value = '25.00';
        document.getElementById('umbral-minuto-oportunidad').value = '5.00';
        document.getElementById('umbral-km-oportunidad').value = '23.00';
    }
    
    actualizarUnidades();
    mostrarPantalla('config-perfil');
}

async function guardarPerfil(event) {
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
    
    // Validar datos requeridos
    if (!perfil.nombre || !perfil.rendimiento || !perfil.precioCombustible) {
        mostrarError('Por favor, completa todos los campos requeridos');
        return;
    }
    
    if (perfilId) {
        // Actualizar perfil existente
        const index = perfiles.findIndex(p => p.id === perfilId);
        if (index !== -1) {
            perfiles[index] = perfil;
        }
    } else {
        // Nuevo perfil
        perfiles.push(perfil);
    }
    
    // Si es el primer perfil o estamos editando el actual, establecer como actual
    if (!perfilActual || perfilId === perfilActual.id) {
        perfilActual = perfil;
    }
    
    // Guardar en Firebase si está disponible
    if (firebaseSync && firebaseSync.initialized) {
        await firebaseSync.saveProfile(perfil);
    }
    
    guardarDatos();
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
    mostrarStatus('💾 Perfil guardado exitosamente', 'success');
}

function actualizarInterfazPerfiles() {
    if (!elementos.perfilesLista) return;
    
    elementos.perfilesLista.innerHTML = '';
    
    if (perfiles.length === 0) {
        elementos.perfilesLista.innerHTML = `
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
        
        elementos.perfilesLista.appendChild(perfilItem);
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

async function eliminarPerfil(perfilId) {
    if (perfiles.length <= 1) {
        mostrarError('No puedes eliminar el único perfil existente');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este perfil? Esta acción no se puede deshacer.')) {
        // Eliminar de Firebase
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.deleteProfile(perfilId);
        }
        
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        // Si eliminamos el perfil actual, seleccionar otro
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
        }
        
        guardarDatos();
        actualizarInterfazPerfiles();
        mostrarStatus('🗑️ Perfil eliminado correctamente', 'success');
    }
}

function actualizarUnidades() {
    const tipoMedida = document.getElementById('tipo-medida')?.value || perfilActual?.tipoMedida || 'km';
    const tipoCombustible = document.getElementById('tipo-combustible')?.value || perfilActual?.tipoCombustible || 'glp';
    const moneda = document.getElementById('moneda')?.value || perfilActual?.moneda || 'DOP';
    
    // Actualizar unidades en configuración
    const rendimientoUnit = document.getElementById('rendimiento-unit');
    const precioCombustibleUnit = document.getElementById('precio-combustible-unit');
    const umbralKmUnit = document.getElementById('umbral-km-unit');
    const umbralKmOportunidadUnit = document.getElementById('umbral-km-oportunidad-unit');
    
    if (rendimientoUnit) {
        rendimientoUnit.textContent = tipoMedida === 'mi' ? 'mpg' : 'Km/Gl';
    }
    if (precioCombustibleUnit) {
        precioCombustibleUnit.textContent = `${moneda}/Gl`;
    }
    if (umbralKmUnit) {
        umbralKmUnit.textContent = `${moneda}/${tipoMedida === 'mi' ? 'mi' : 'Km'}`;
    }
    if (umbralKmOportunidadUnit) {
        umbralKmOportunidadUnit.textContent = `${moneda}/${tipoMedida === 'mi' ? 'mi' : 'Km'}`;
    }
    
    // Actualizar unidades en pantalla principal
    const distanciaUnit = document.getElementById('distancia-unit');
    const monedaTarifa = document.getElementById('moneda-tarifa');
    
    if (distanciaUnit) {
        distanciaUnit.textContent = tipoMedida === 'mi' ? 'mi' : 'Km';
    }
    if (monedaTarifa) {
        monedaTarifa.textContent = moneda;
    }
    
    // Actualizar unidades de costos mensuales
    document.querySelectorAll('.costo-mensual').forEach(el => {
        el.textContent = moneda;
    });
    
    // Actualizar unidades de umbrales por minuto
    document.querySelectorAll('.umbral-minuto').forEach(el => {
        el.textContent = `${moneda}/min`;
    });
}

// --- Gestión de Tema ---
function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('uberCalc_theme', newTheme);
    
    // Actualizar icono
    const themeIcon = elementos.themeToggle.querySelector('.theme-icon');
    themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

function aplicarTemaGuardado() {
    const savedTheme = localStorage.getItem('uberCalc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = elementos.themeToggle.querySelector('.theme-icon');
    themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

// --- EXPORTACIÓN MEJORADA - SOLO PDF ---
function mostrarModalExportacion() {
    if (historial.length === 0) {
        mostrarError('No hay datos en el historial para exportar');
        return;
    }
    
    // Actualizar estadísticas antes de exportar
    actualizarEstadisticas();
    elementos.exportModal.style.display = 'flex';
}

function exportarPDF() {
    mostrarStatus('🔄 Generando PDF...', 'info');
    
    // Crear contenido del PDF
    const contenido = generarContenidoPDF();
    
    // Método mejorado para móvil - Crear blob y descargar
    const blob = new Blob([contenido], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Crear enlace de descarga
    const link = document.createElement('a');
    link.href = url;
    link.download = `UberCalc_Reporte_${new Date().toISOString().split('T')[0]}.html`;
    link.style.display = 'none';
    
    // Agregar al documento y hacer click
    document.body.appendChild(link);
    link.click();
    
    // Limpiar
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Mostrar mensaje de éxito
    setTimeout(() => {
        mostrarStatus('📄 PDF generado correctamente', 'success');
        cerrarExportModal();
    }, 1000);
}

function generarContenidoPDF() {
    const stats = window.estadisticasExportacion || {};
    const viajesAceptados = historial.filter(item => item.aceptado).length;
    const viajesRentables = historial.filter(item => item.aceptado && item.rentabilidad === 'rentable').length;
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte UberCalc</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            line-height: 1.4;
            color: #333;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 20px 0;
        }
        .summary-card {
            padding: 15px;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        .summary-card.ingresos {
            background-color: #e8f5e8;
            border-color: #4CAF50;
        }
        .summary-card.costos {
            background-color: #ffe8e8;
            border-color: #f44336;
        }
        .summary-card.rendimiento {
            background-color: #e8f4ff;
            border-color: #2196F3;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            font-size: 12px;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        th { 
            background-color: #f2f2f2; 
            font-weight: bold;
        }
        .rentable { background-color: #d4edda; }
        .oportunidad { background-color: #fff3cd; }
        .no-rentable { background-color: #f8d7da; }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 0.9em;
        }
        .valor-destacado {
            font-size: 1.3em;
            font-weight: bold;
            margin: 5px 0;
        }
        .valor-positivo { color: #4CAF50; }
        .valor-negativo { color: #f44336; }
        .desglose-costos {
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }
        @media print {
            body { margin: 10px; }
            .summary-grid { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚗 UberCalc - Reporte Completo</h1>
        <p><strong>Generado el:</strong> ${new Date().toLocaleString('es-DO')}</p>
        <p><strong>Perfil:</strong> ${perfilActual?.nombre || 'No especificado'}</p>
        <p><strong>Total de registros:</strong> ${historial.length}</p>
    </div>

    <div class="summary-grid">
        <div class="summary-card ingresos">
            <h3>💰 INGRESOS</h3>
            <div class="valor-destacado valor-positivo">${formatearMoneda(stats.gananciaTotal || 0)}</div>
            <p><strong>Ganancia Neta:</strong> ${formatearMoneda(stats.gananciaNetaTotal || 0)}</p>
            <p><strong>Viajes Aceptados:</strong> ${viajesAceptados}</p>
            <p><strong>Viaje Promedio:</strong> ${formatearMoneda(stats.viajePromedio || 0)}</p>
        </div>
        
        <div class="summary-card costos">
            <h3>💸 COSTOS TOTALES</h3>
            <div class="valor-destacado valor-negativo">${formatearMoneda((stats.costoCombustibleTotal || 0) + (stats.costoMantenimientoTotal || 0) + (stats.costoSeguroTotal || 0))}</div>
            <p><strong>⛽ Combustible:</strong> ${formatearMoneda(stats.costoCombustibleTotal || 0)}</p>
            <p><strong>🔧 Mantenimiento:</strong> ${formatearMoneda(stats.costoMantenimientoTotal || 0)}</p>
            <p><strong>🛡️ Seguro:</strong> ${formatearMoneda(stats.costoSeguroTotal || 0)}</p>
        </div>
        
        <div class="summary-card rendimiento" style="grid-column: 1 / -1;">
            <h3>📊 RENDIMIENTO</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                <div>
                    <strong>Ganancia/Hora:</strong><br>
                    <span class="valor-destacado valor-positivo">${formatearMoneda(stats.gananciaPorHora || 0)}</span>
                </div>
                <div>
                    <strong>Tiempo Total:</strong><br>
                    <span class="valor-destacado">${stats.tiempoTotal || 0} min</span>
                </div>
                <div>
                    <strong>Eficiencia:</strong><br>
                    <span class="valor-destacado valor-positivo">${viajesAceptados > 0 ? ((viajesRentables / viajesAceptados) * 100).toFixed(1) : 0}%</span>
                </div>
            </div>
        </div>
    </div>

    <div class="desglose-costos">
        <h3>📈 RESUMEN FINANCIERO</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <strong>Ingresos Totales:</strong> ${formatearMoneda(stats.gananciaTotal || 0)}
            </div>
            <div>
                <strong>Costos Totales:</strong> ${formatearMoneda((stats.costoCombustibleTotal || 0) + (stats.costoMantenimientoTotal || 0) + (stats.costoSeguroTotal || 0))}
            </div>
            <div style="grid-column: 1 / -1; text-align: center; padding: 10px; background: white; border-radius: 5px; margin-top: 10px;">
                <strong style="color: #f5a623; font-size: 1.2em;">GANANCIA NETA TOTAL: ${formatearMoneda(stats.gananciaNetaTotal || 0)}</strong>
            </div>
        </div>
    </div>

    <h3>📋 DETALLE DE VIAJES (${historial.length} registros)</h3>
    <table>
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Hora</th>
                <th>Ganancia</th>
                <th>Minutos</th>
                <th>Distancia</th>
                <th>Combustible</th>
                <th>Mantenimiento</th>
                <th>Seguro</th>
                <th>Ganancia Neta</th>
                <th>Rentabilidad</th>
                <th>Aceptado</th>
            </tr>
        </thead>
        <tbody>
            ${historial.map(item => {
                const fecha = new Date(item.timestamp).toLocaleDateString();
                const hora = new Date(item.timestamp).toLocaleTimeString();
                const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
                
                return `
                    <tr class="${item.rentabilidad}">
                        <td>${fecha}</td>
                        <td>${hora}</td>
                        <td>${formatearMoneda(item.tarifa)}</td>
                        <td>${item.minutos}</td>
                        <td>${item.distancia} ${distanciaLabel}</td>
                        <td>${formatearMoneda(item.costoCombustible)}</td>
                        <td>${formatearMoneda(item.costoMantenimiento)}</td>
                        <td>${formatearMoneda(item.costoSeguro)}</td>
                        <td>${formatearMoneda(item.gananciaNeta)}</td>
                        <td>${item.texto}</td>
                        <td>${item.aceptado ? '✅ Sí' : '❌ No'}</td>
                    </tr>
                `;
            }).join('')}
        </tbody>
    </table>

    <div class="footer">
        <p>Exportado desde UberCalc - Calculadora Inteligente para Conductores</p>
        <p>¡Sigue maximizando tus ganancias! 🚗💨</p>
    </div>

    <script>
        // Auto-print en dispositivos de escritorio
        if (window.innerWidth > 768) {
            window.print();
        }
    </script>
</body>
</html>`;
}

// --- Utilidades ---
function mostrarPantalla(pantalla) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (pantalla === 'perfil') {
        elementos.perfilScreen.classList.add('active');
    } else if (pantalla === 'config-perfil') {
        elementos.configPerfilScreen.classList.add('active');
    } else if (pantalla === 'main') {
        elementos.mainScreen.classList.add('active');
        actualizarUnidades();
        actualizarEstadisticas();
        actualizarHistorial();
    }
}

function validarFormulario() {
    const tarifa = elementos.tarifaInput.value;
    const minutos = elementos.minutosInput.value;
    const distancia = elementos.distanciaInput.value;
    
    // Validar que todos los campos tengan valor
    if (!tarifa || !minutos || !distancia) {
        mostrarError('Por favor, completa todos los campos del viaje');
        return false;
    }
    
    // Validar tarifa
    if (parseFloat(tarifa) <= 0) {
        mostrarError('La tarifa debe ser mayor a 0');
        return false;
    }
    
    // Validar minutos
    if (parseFloat(minutos) <= 0) {
        mostrarError('El tiempo debe ser mayor a 0');
        return false;
    }
    
    // Validar distancia
    if (parseFloat(distancia) <= 0) {
        mostrarError('La distancia debe ser mayor a 0');
        return false;
    }
    
    // Validar perfil
    if (!perfilActual) {
        mostrarError('Debes seleccionar un perfil primero');
        return false;
    }
    
    return true;
}

function mostrarError(mensaje) {
    mostrarStatus(mensaje, 'error');
}

function mostrarStatus(mensaje, tipo = 'info') {
    if (!elementos.statusIndicator || !elementos.statusText) return;
    
    elementos.statusText.textContent = mensaje;
    elementos.statusIndicator.className = `status-indicator ${tipo}`;
    elementos.statusIndicator.classList.remove('hidden');
    
    setTimeout(() => {
        if (elementos.statusIndicator) {
            elementos.statusIndicator.classList.add('hidden');
        }
    }, 3000);
}

function limpiarFormulario() {
    console.log('🧹 Limpiando formulario...');
    
    elementos.tarifaInput.value = '';
    elementos.minutosInput.value = '';
    elementos.distanciaInput.value = '';
    elementos.autoCalcIndicator.classList.add('hidden');
    elementos.resultadoRapido.classList.add('hidden');
    resetearInterfazCalculo();
    calculoActual = null;
    
    // Cerrar modal rápido si está abierto
    cerrarModalRapido();
    
    console.log('✅ Formulario limpiado');
}

function cerrarModal() {
    elementos.modalFondo.style.display = 'none';
}

function cerrarExportModal() {
    elementos.exportModal.style.display = 'none';
}

function formatearMoneda(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

// =============================================
// ACTUALIZAR UI DE SYNC EN BOTÓN
// =============================================

function actualizarUISyncBoton(estado) {
    try {
        const syncBtn = document.getElementById('sync-status-btn');
        const syncIcon = document.getElementById('sync-btn-icon');
        
        if (!syncBtn || !syncIcon) {
            console.warn('❌ Botón de sync no encontrado');
            return;
        }
        
        // Remover clases anteriores
        syncBtn.className = 'secondary-button small';
        syncBtn.title = 'Estado de sincronización';
        
        switch(estado) {
            case 'connected':
                syncIcon.textContent = '✅';
                syncBtn.title = 'Conectado a Firebase';
                syncBtn.style.borderColor = 'var(--success-green)';
                break;
            case 'syncing':
                syncIcon.textContent = '🔄';
                syncBtn.title = 'Sincronizando...';
                syncBtn.style.borderColor = 'var(--primary-blue)';
                break;
            case 'error':
                syncIcon.textContent = '❌';
                syncBtn.title = 'Error de conexión';
                syncBtn.style.borderColor = 'var(--error-red)';
                break;
            default:
                syncIcon.textContent = '🌐';
                syncBtn.title = 'Conectando...';
                syncBtn.style.borderColor = 'var(--border-color)';
        }
        
        console.log(`🔄 Estado de sync en botón actualizado: ${estado}`);
        
    } catch (error) {
        console.error('❌ Error actualizando UI de sync en botón:', error);
    }
}

// =============================================
// MANEJAR CIERRE AUTOMÁTICO AL INTERACTUAR CON FORMULARIO
// =============================================

// Cerrar modal rápido cuando el usuario empiece a modificar los inputs
function configurarCierreModalRapido() {
    const inputs = [elementos.tarifaInput, elementos.minutosInput, elementos.distanciaInput];
    
    inputs.forEach(input => {
        input.addEventListener('input', function() {
            // Si el modal rápido está abierto y el usuario modifica un valor, cerrarlo
            const modalRapido = document.getElementById('modal-rapido');
            if (modalRapido && !modalRapido.classList.contains('hidden')) {
                cerrarModalRapido();
                mostrarStatus('Cálculo actualizado - Ingresa los nuevos valores', 'info');
            }
        });
    });
}

// =============================================
// MANEJAR CAMBIOS DE TAMAÑO PARA OPTIMIZAR MODAL
// =============================================

// Manejar cambios de tamaño de ventana para optimizar modal
window.addEventListener('resize', function() {
    if (elementos.modalFondo.style.display === 'flex') {
        // Re-renderizar modal si está abierto para ajustarse al nuevo tamaño
        if (calculoActual) {
            setTimeout(() => {
                mostrarModalResultados(calculoActual);
            }, 100);
        }
    }
});

// =============================================
// INICIALIZACIÓN FINAL
// =============================================

// Llamar esta función en la inicialización
document.addEventListener('DOMContentLoaded', function() {
    configurarCierreModalRapido();
});

// --- Forzar cálculo inicial si hay datos ---
setTimeout(() => {
    if (elementos.tarifaInput.value && elementos.minutosInput.value && elementos.distanciaInput.value) {
        calcularAutomatico();
    }
}, 1000);

// =============================================
// DIAGNÓSTICO RÁPIDO
// =============================================

function diagnosticoRapido() {
    console.log('🔧 DIAGNÓSTICO RÁPIDO');
    console.log('Perfil actual:', perfilActual?.nombre);
    console.log('Total historial:', historial.length);
    console.log('Viajes aceptados:', historial.filter(item => item.aceptado).length);
    console.log('Viajes rechazados:', historial.filter(item => !item.aceptado).length);
    
    // Mostrar los últimos 3 viajes
    console.log('Últimos 3 viajes:', historial.slice(0, 3));
    
    alert(`DIAGNÓSTICO:
• Perfil: ${perfilActual?.nombre || 'Ninguno'}
• Total viajes: ${historial.length}
• Aceptados: ${historial.filter(item => item.aceptado).length}
• Rechazados: ${historial.filter(item => !item.aceptado).length}

Revisa la consola para más detalles.`);
}

// --- Funciones Globales para HTML ---
window.cerrarModal = cerrarModal;
window.cerrarExportModal = cerrarExportModal;
window.cerrarSyncPanel = cerrarSyncPanel;
window.mostrarConfigPerfil = mostrarConfigPerfil;
window.seleccionarPerfil = seleccionarPerfil;
window.editarPerfil = editarPerfil;
window.eliminarPerfil = eliminarPerfil;
window.mostrarPanelSync = mostrarPanelSync;
window.forzarSincronizacion = forzarSincronizacion;
window.forzarSincronizacionCompleta = forzarSincronizacionCompleta;
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticarSync = diagnosticarSync;
window.actualizarPanelSync = actualizarPanelSync;
window.diagnosticoRapido = diagnosticoRapido;

// Funciones del sistema de código
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.showUserCodeModal = showUserCodeModal;
window.cambiarUsuario = cambiarUsuario;

// Funciones del modal rápido
window.cerrarModalRapido = cerrarModalRapido;
window.procesarViajeRapido = procesarViajeRapido;

// Funciones de sincronización nuevas
window.forzarSincronizacionDesdeFirebase = forzarSincronizacionDesdeFirebase;

// --- Prevenir cierre accidental ---
window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = elementos.tarifaInput.value || 
                                 elementos.minutosInput.value || 
                                 elementos.distanciaInput.value;
    
    if (tieneDatosPendientes) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

// --- Cerrar modal al hacer clic fuera ---
window.onclick = function(event) {
    if (event.target === elementos.modalFondo) {
        cerrarModal();
    }
    if (event.target === elementos.exportModal) {
        cerrarExportModal();
    }
    if (event.target === elementos.syncPanel) {
        cerrarSyncPanel();
    }
}

// Función para verificar el estado actual
function verificarEstado() {
    console.log('=== VERIFICACIÓN DE ESTADO ===');
    console.log('Perfil actual:', perfilActual);
    console.log('Perfiles disponibles:', perfiles.length);
    console.log('Historial:', historial.length);
    console.log('Elementos cargados:', {
        statsViajes: !!elementos.statsViajes,
        statsGanancia: !!elementos.statsGanancia,
        historyList: !!elementos.historyList
    });
    console.log('=== FIN VERIFICACIÓN ===');
}

// Llamar esta función para debug
setTimeout(verificarEstado, 2000);

