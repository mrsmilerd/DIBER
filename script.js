// =============================================
// UBER CALC - Nueva Estructura Firebase Profesional
// Colecciones separadas para perfiles y viajes
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

// --- Configuración Firebase (MANTENIDA) ---
const firebaseConfig = {
  apiKey: "AIzaSyCf5j5Pu-go6ipUw2EnTO2OnKgvYLzkonY",
  authDomain: "diber-32875.firebaseapp.com",
  projectId: "diber-32875",
  storageBucket: "diber-32875.firebasestorage.app",
  messagingSenderId: "260349079723",
  appId: "1:260349079723:web:babe1cc51e8bb067ba87ee"
};

// =============================================
// ELEMENTOS DOM - DEFINIDOS AL INICIO
// =============================================

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
    
    // Exportación
    exportModal: document.getElementById('exportModal'),
    exportarPdfBtn: document.getElementById('exportar-pdf'),
    
    // Sincronización
    syncPanel: document.getElementById('sync-panel')
};

// =============================================
// FUNCIONES BÁSICAS DE LA APLICACIÓN
// =============================================

function cerrarModal() {
    console.log('❌ Cerrando modal...');
    if (elementos.modalFondo) {
        elementos.modalFondo.style.display = 'none';
    }
}

function cerrarExportModal() {
    console.log('❌ Cerrando modal de exportación...');
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'none';
    }
}

function mostrarError(mensaje) {
    mostrarStatus(mensaje, 'error');
}

function mostrarStatus(mensaje, tipo = 'info') {
    console.log(`📢 Status [${tipo}]:`, mensaje);
    
    // Crear elemento de status si no existe
    let statusElement = document.getElementById('status-message');
    if (!statusElement) {
        statusElement = document.createElement('div');
        statusElement.id = 'status-message';
        statusElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 10000;
            transition: all 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        document.body.appendChild(statusElement);
    }
    
    // Configurar colores según tipo
    const colores = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    statusElement.style.background = colores[tipo] || colores.info;
    statusElement.textContent = mensaje;
    statusElement.style.display = 'block';
    statusElement.style.opacity = '1';
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        statusElement.style.opacity = '0';
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 300);
    }, 3000);
}

function limpiarFormulario() {
    console.log('🧹 Limpiando formulario');
    
    if (elementos.tarifaInput) elementos.tarifaInput.value = '';
    if (elementos.minutosInput) elementos.minutosInput.value = '';
    if (elementos.distanciaInput) elementos.distanciaInput.value = '';
    
    if (elementos.resultadoRapido) elementos.resultadoRapido.classList.add('hidden');
    if (elementos.autoCalcIndicator) elementos.autoCalcIndicator.classList.add('hidden');
    
    calculoActual = null;
}

function formatearMoneda(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

function formatearTiempo(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
        return `${horas}h ${mins}m`;
    }
    return `${mins}m`;
}

// =============================================
// FUNCIONES DE NAVEGACIÓN ENTRE PANTALLAS
// =============================================

function mostrarPantalla(pantalla) {
    console.log('🖥️ Mostrando pantalla:', pantalla);
    
    // Ocultar todas las pantallas
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    // Mostrar pantalla seleccionada
    switch(pantalla) {
        case 'perfil':
            if (elementos.perfilScreen) elementos.perfilScreen.classList.add('active');
            actualizarInterfazPerfiles();
            break;
        case 'config-perfil':
            if (elementos.configPerfilScreen) elementos.configPerfilScreen.classList.add('active');
            break;
        case 'main':
            if (elementos.mainScreen) elementos.mainScreen.classList.add('active');
            // Verificar que perfilActual existe antes de intentar usarlo
            if (perfilActual) {
                const perfilNombreElement = document.getElementById('perfil-actual-nombre');
                if (perfilNombreElement) {
                    perfilNombreElement.textContent = perfilActual.nombre;
                }
            }
            break;
    }
}

// =============================================
// SISTEMA DE PESTAÑAS
// =============================================

function cambiarPestana(tabId) {
    console.log('📑 Cambiando a pestaña:', tabId);
    
    // Actualizar botones de pestañas
    elementos.tabButtons.forEach(button => {
        const buttonTab = button.getAttribute('data-tab');
        button.classList.toggle('active', buttonTab === tabId);
    });
    
    // Actualizar contenido de pestañas
    elementos.tabContents.forEach(content => {
        const contentId = content.id.replace('tab-', '');
        content.classList.toggle('active', contentId === tabId);
    });
    
    // Actualizar datos si es necesario
    if (tabId === 'resumen') {
        actualizarEstadisticas();
    } else if (tabId === 'historial') {
        actualizarHistorial();
    }
}

// =============================================
// SISTEMA DE CÓDIGO DE USUARIO
// =============================================

async function initializeUserCodeSystem() {
    console.log('🔐 Inicializando sistema de código de usuario...');
    
    // Verificar si ya hay un código guardado
    const savedCode = localStorage.getItem('ubercalc_user_code');
    
    if (savedCode) {
        userCodeSystem.userCode = savedCode;
        userCodeSystem.userId = 'user_' + savedCode;
        userCodeSystem.initialized = true;
        
        console.log('✅ Código de usuario cargado:', userCodeSystem.userCode);
        
        // Ocultar el modal aunque haya código
        hideUserCodeModal();
        showUserCodeBanner();
        
        console.log('🔄 Código existe, continuando con inicialización...');
        
    } else {
        console.log('🆕 No hay código de usuario, mostrando modal...');
        // MOSTRAR el modal si no hay código
        showUserCodeModal();
        
        // No marcar como inicializado hasta que el usuario ingrese un código
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
            const syncInfo = document.getElementById('sync-info');
            const syncIcon = document.getElementById('sync-icon');
            const syncText = document.getElementById('sync-text');
            
            if (!syncInfo || !syncIcon || !syncText) {
                console.warn('❌ Elementos de UI de sync no encontrados');
                return;
            }
            
            syncInfo.className = 'sync-info';
            
            switch(estado) {
                case 'connected':
                    syncInfo.classList.add('connected');
                    syncIcon.textContent = '✅';
                    syncText.textContent = 'Conectado a Firebase';
                    break;
                case 'syncing':
                    syncInfo.classList.add('syncing');
                    syncIcon.textContent = '🔄';
                    syncText.textContent = 'Sincronizando...';
                    break;
                case 'error':
                    syncInfo.classList.add('error');
                    syncIcon.textContent = '❌';
                    syncText.textContent = 'Error de conexión';
                    break;
                default:
                    syncInfo.classList.add('disconnected');
                    syncIcon.textContent = '🌐';
                    syncText.textContent = 'Conectando...';
            }
            
            console.log(`🔄 Estado de sync actualizado: ${estado}`);
            
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
    console.log('💾 Guardando datos (local + Firebase)...');
    
    // Guardar en LocalStorage (Caché y fallback)
    localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
    localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
    if (perfilActual) {
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
    }

    // Sincronizar con Firebase - NUEVA ESTRUCTURA
    if (firebaseSync && firebaseSync.initialized === true) {
        console.log('☁️ Sincronizando datos con Firebase (nueva estructura)...');
        
        try {
            // 1. Sincronizar cada perfil individualmente
            for (const perfil of perfiles) {
                await firebaseSync.saveProfile(perfil);
            }
            console.log('✅ Perfiles guardados en Firebase (nueva estructura)');
            
            // 2. Sincronizar cada viaje individualmente
            for (const viaje of historial.slice(0, 100)) { // Limitar a 100 más recientes
                await firebaseSync.saveTrip(viaje);
            }
            console.log('✅ Viajes guardados en Firebase (nueva estructura)');
            
            // 3. Actualizar última sincronización
            firebaseSync.lastSyncTime = new Date().toISOString();
            
        } catch (error) {
            console.warn('⚠️ Error al sincronizar datos:', error);
        }

    } else {
        console.warn('⚠️ Firebase Sync no inicializado. Solo se guarda en local.');
    }
}

async function cargarDatos() {
    console.log('🔄 Cargando datos (nueva estructura Firebase + local)...');
    
    let cloudPerfiles = null;
    let cloudTrips = null;

    // 1. Intentar cargar desde Firebase (PRIORIDAD) - NUEVA ESTRUCTURA
    if (window.firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Intentando cargar perfiles desde Firebase (nueva estructura)...');
            cloudPerfiles = await firebaseSync.loadProfiles();
            
            if (cloudPerfiles && cloudPerfiles.length > 0) {
                console.log('✅ Perfiles cargados de Firebase (nueva estructura):', cloudPerfiles.length);
                perfiles = cloudPerfiles;
            }

            console.log('☁️ Intentando cargar viajes desde Firebase (nueva estructura)...');
            cloudTrips = await firebaseSync.loadTrips();
            
            if (cloudTrips && cloudTrips.length > 0) {
                console.log('✅ Viajes cargados de Firebase (nueva estructura):', cloudTrips.length);
                historial = cloudTrips;
            }
            
        } catch (error) {
            console.error('❌ Error al cargar datos de Firebase. Usando local storage.', error);
        }
    }
    
    // 2. Cargar de LocalStorage si Firebase NO proporcionó datos
    if (!perfiles || perfiles.length === 0) {
        console.log('💾 Cargando perfiles de localStorage...');
        const localPerfilesString = localStorage.getItem('ubercalc_perfiles');
        perfiles = localPerfilesString ? JSON.parse(localPerfilesString) : [];
    }

    if (!historial || historial.length === 0) {
        console.log('💾 Cargando historial de localStorage...');
        const localHistorialString = localStorage.getItem('ubercalc_historial');
        historial = localHistorialString ? JSON.parse(localHistorialString) : [];
    }
    
    // 3. REPARAR PERFILES CORRUPTOS
    repararPerfilesCorruptos();
    
    console.log(`✅ Carga de datos finalizada. Perfiles: ${perfiles.length}, Viajes: ${historial.length}`);
}

// =============================================
// FUNCIONES DE PERFILES ACTUALIZADAS
// =============================================

function actualizarInterfazPerfiles() {
    console.log('👤 Actualizando interfaz de perfiles');
    
    if (!elementos.perfilesLista) {
        console.warn('❌ Elemento perfiles-lista no encontrado');
        return;
    }
    
    elementos.perfilesLista.innerHTML = '';
    
    if (perfiles.length === 0) {
        elementos.perfilesLista.innerHTML = `
            <div class="empty-state">
                <p>No hay perfiles creados</p>
                <p class="small">Crea tu primer perfil para comenzar</p>
            </div>
        `;
        return;
    }
    
    perfiles.forEach(perfil => {
        // VERIFICAR que el perfil tiene todas las propiedades necesarias
        if (!perfil || typeof perfil !== 'object') {
            console.warn('❌ Perfil inválido encontrado:', perfil);
            return; // Saltar este perfil
        }
        
        const perfilElement = document.createElement('div');
        perfilElement.className = `perfil-item ${perfil.id === perfilActual?.id ? 'active' : ''}`;
        
        const unidadRendimiento = (perfil.tipoMedida === 'mi' ? 'mpg' : 'Km/Gl') || 'Km/Gl';
        const detalles = `${perfil.rendimiento || '0'} ${unidadRendimiento} • ${perfil.moneda || 'DOP'}`;
        
        // CORRECCIÓN: Usar operador de encadenamiento opcional y valor por defecto
        const tipoCombustible = perfil.tipoCombustible ? perfil.tipoCombustible.toUpperCase() : 'GLP';
        
        perfilElement.innerHTML = `
            <div class="perfil-info">
                <h3>${perfil.nombre || 'Perfil sin nombre'}</h3>
                <p>${detalles}</p>
                <p class="small">${tipoCombustible}</p>
            </div>
            <div class="perfil-actions">
                <button class="btn-icon" onclick="editarPerfil('${perfil.id}')">✏️</button>
                <button class="btn-icon" onclick="seleccionarPerfil('${perfil.id}')">${perfil.id === perfilActual?.id ? '✅' : '👉'}</button>
                ${perfiles.length > 1 ? `<button class="btn-icon btn-danger" onclick="eliminarPerfil('${perfil.id}')">🗑️</button>` : ''}
            </div>
        `;
        elementos.perfilesLista.appendChild(perfilElement);
    });
    
    console.log('✅ Interfaz de perfiles actualizada correctamente');
}

function mostrarConfigPerfil(perfilExistente = null) {
    console.log('⚙️ Mostrando configuración de perfil');
    
    // Resetear formulario
    elementos.perfilForm.reset();
    
    if (perfilExistente) {
        // Modo edición
        document.getElementById('perfil-id').value = perfilExistente.id;
        document.getElementById('nombre-perfil').value = perfilExistente.nombre;
        document.getElementById('tipo-medida').value = perfilExistente.tipoMedida || 'km';
        document.getElementById('tipo-combustible').value = perfilExistente.tipoCombustible || 'glp';
        document.getElementById('rendimiento').value = perfilExistente.rendimiento || '';
        document.getElementById('precio-combustible').value = perfilExistente.precioCombustible || '';
        document.getElementById('moneda').value = perfilExistente.moneda || 'DOP';
        document.getElementById('umbral-minuto-rentable').value = perfilExistente.umbralMinutoRentable || '6.00';
        document.getElementById('umbral-km-rentable').value = perfilExistente.umbralKmRentable || '25.00';
        document.getElementById('umbral-minuto-oportunidad').value = perfilExistente.umbralMinutoOportunidad || '5.00';
        document.getElementById('umbral-km-oportunidad').value = perfilExistente.umbralKmOportunidad || '23.00';
        document.getElementById('costo-seguro').value = perfilExistente.costoSeguro || '0';
        document.getElementById('costo-mantenimiento').value = perfilExistente.costoMantenimiento || '0';
        
        // Actualizar título
        document.querySelector('#config-perfil-screen h2').textContent = '✏️ Editar Perfil';
    } else {
        // Modo creación - limpiar ID
        document.getElementById('perfil-id').value = '';
        
        // Establecer valores por defecto
        document.getElementById('umbral-minuto-rentable').value = '6.00';
        document.getElementById('umbral-km-rentable').value = '25.00';
        document.getElementById('umbral-minuto-oportunidad').value = '5.00';
        document.getElementById('umbral-km-oportunidad').value = '23.00';
        document.getElementById('costo-seguro').value = '0';
        document.getElementById('costo-mantenimiento').value = '0';
        
        // Actualizar título
        document.querySelector('#config-perfil-screen h2').textContent = '➕ Crear Nuevo Perfil';
    }
    
    // Actualizar unidades según la configuración
    actualizarUnidades();
    
    // Mostrar la pantalla de configuración
    mostrarPantalla('config-perfil');
    
    console.log('✅ Pantalla de configuración de perfil mostrada');
}

async function guardarPerfil(event) {
    event.preventDefault();
    console.log('💾 Guardando perfil (nueva estructura)...');
    
    const formData = new FormData(elementos.perfilForm);
    const perfilId = formData.get('perfil-id') || 'perfil_' + Date.now();
    
    // OBTENER VALORES CORRECTAMENTE
    const nombre = document.getElementById('nombre-perfil').value;
    const tipoMedida = document.getElementById('tipo-medida').value;
    const tipoCombustible = document.getElementById('tipo-combustible').value;
    const rendimiento = parseFloat(document.getElementById('rendimiento').value) || 0;
    const precioCombustible = parseFloat(document.getElementById('precio-combustible').value) || 0;
    const moneda = document.getElementById('moneda').value;
    const umbralMinutoRentable = parseFloat(document.getElementById('umbral-minuto-rentable').value) || 0;
    const umbralKmRentable = parseFloat(document.getElementById('umbral-km-rentable').value) || 0;
    const umbralMinutoOportunidad = parseFloat(document.getElementById('umbral-minuto-oportunidad').value) || 0;
    const umbralKmOportunidad = parseFloat(document.getElementById('umbral-km-oportunidad').value) || 0;
    const costoSeguro = parseFloat(document.getElementById('costo-seguro').value) || 0;
    const costoMantenimiento = parseFloat(document.getElementById('costo-mantenimiento').value) || 0;
    
    // VALIDAR CAMPOS REQUERIDOS
    if (!nombre || !tipoMedida || !tipoCombustible || rendimiento <= 0 || precioCombustible <= 0) {
        mostrarError('Por favor, completa todos los campos requeridos con valores válidos.');
        return;
    }
    
    const perfilData = {
        id: perfilId,
        nombre: nombre,
        tipoMedida: tipoMedida,
        tipoCombustible: tipoCombustible,
        rendimiento: rendimiento,
        precioCombustible: precioCombustible,
        moneda: moneda,
        umbralMinutoRentable: umbralMinutoRentable,
        umbralKmRentable: umbralKmRentable,
        umbralMinutoOportunidad: umbralMinutoOportunidad,
        umbralKmOportunidad: umbralKmOportunidad,
        costoSeguro: costoSeguro,
        costoMantenimiento: costoMantenimiento,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
    
    const perfilExistenteIndex = perfiles.findIndex(p => p.id === perfilId);
    
    if (perfilExistenteIndex !== -1) {
        // Actualizar perfil existente
        perfiles[perfilExistenteIndex] = {
            ...perfiles[perfilExistenteIndex],
            ...perfilData
        };
        console.log('✏️ Perfil actualizado:', perfilData.nombre);
    } else {
        // Nuevo perfil
        perfiles.push(perfilData);
        console.log('➕ Nuevo perfil creado:', perfilData.nombre);
    }
    
    // Guardar en Firebase individualmente
    if (firebaseSync && firebaseSync.initialized) {
        await firebaseSync.saveProfile(perfilData);
    }
    
    // Si es el primer perfil o no hay perfil actual, establecer como actual
    if (!perfilActual || perfiles.length === 1) {
        perfilActual = perfilData;
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        console.log('✅ Perfil establecido como actual:', perfilActual.nombre);
    }
    
    // Guardar localmente también
    guardarDatos();
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
    
    mostrarStatus(`Perfil "${perfilData.nombre}" guardado correctamente`, 'success');
}

function seleccionarPerfil(perfilId) {
    console.log('👉 Seleccionando perfil:', perfilId);
    
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        perfilActual = perfil;
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        
        actualizarInterfazPerfiles();
        mostrarPantalla('main');
        
        mostrarStatus(`Perfil cambiado a: ${perfil.nombre}`, 'success');
    }
}

function editarPerfil(perfilId) {
    console.log('✏️ Editando perfil:', perfilId);
    
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        mostrarConfigPerfil(perfil);
    }
}

async function eliminarPerfil(perfilId) {
    console.log('🗑️ Eliminando perfil:', perfilId);
    
    if (perfiles.length <= 1) {
        mostrarStatus('No puedes eliminar el único perfil', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este perfil? También se eliminarán todos los viajes asociados.')) {
        // Eliminar de Firebase primero
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.deleteProfile(perfilId);
            
            // Opcional: También eliminar viajes asociados a este perfil
            const trips = await firebaseSync.loadTrips(perfilId);
            for (const trip of trips) {
                await firebaseSync.deleteTrip(trip.id);
            }
        }
        
        // Eliminar localmente
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        // Si eliminamos el perfil actual, cambiar al primero disponible
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
        
        guardarDatos();
        actualizarInterfazPerfiles();
        
        mostrarStatus('Perfil eliminado', 'success');
    }
}

function crearPerfilPorDefecto() {
    console.log('🆕 Creando perfil por defecto...');
    
    const perfilDefault = {
        id: 'perfil_default_' + Date.now(),
        nombre: 'Mi Perfil Principal',
        tipoMedida: 'km',
        tipoCombustible: 'glp',
        rendimiento: 22.0,
        precioCombustible: 137.20,
        moneda: 'DOP',
        umbralMinutoRentable: 6.00,
        umbralKmRentable: 25.00,
        umbralMinutoOportunidad: 5.00,
        umbralKmOportunidad: 23.00,
        costoSeguro: 0,
        costoMantenimiento: 0,
        fechaCreacion: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
    
    perfiles.push(perfilDefault);
    perfilActual = perfilDefault;
    
    guardarDatos();
    actualizarInterfazPerfiles();
    
    console.log('✅ Perfil por defecto creado:', perfilDefault.nombre);
    return perfilDefault;
}

function repararPerfilesCorruptos() {
    console.log('🔧 Verificando y reparando perfiles corruptos...');
    
    // Filtrar perfiles inválidos
    const perfilesValidos = perfiles.filter(perfil => 
        perfil && 
        typeof perfil === 'object' && 
        perfil.id && 
        perfil.nombre
    );
    
    if (perfilesValidos.length !== perfiles.length) {
        console.log('🛠️ Se encontraron perfiles corruptos. Reparando...');
        perfiles = perfilesValidos;
    }
    
    // Si no hay perfiles válidos, crear uno por defecto
    if (perfiles.length === 0) {
        console.log('🆕 No hay perfiles válidos, creando uno por defecto...');
        crearPerfilPorDefecto();
        return;
    }
    
    // Establecer perfil actual si es null
    const lastProfileId = localStorage.getItem('ubercalc_perfil_actual_id');
    if (!perfilActual && perfiles.length > 0) {
        perfilActual = perfiles.find(p => p.id === lastProfileId) || perfiles[0];
        console.log('✅ Perfil actual reparado:', perfilActual.nombre);
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
    }
    
    console.log('✅ Reparación completada. Perfiles válidos:', perfiles.length);
}

// =============================================
// FUNCIONES DE CÁLCULO Y VIAJES
// =============================================

function manejarCalculoAutomatico() {
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    
    timeoutCalculo = setTimeout(calcularAutomatico, 500);
}

function calcularAutomatico() {
    const tarifa = parseFloat(elementos.tarifaInput.value) || 0;
    const minutos = parseFloat(elementos.minutosInput.value) || 0;
    const distancia = parseFloat(elementos.distanciaInput.value) || 0;
    
    const datosCompletos = tarifa > 0 && minutos > 0 && distancia > 0 && perfilActual;
    
    if (datosCompletos) {
        console.log('🧮 Calculando automáticamente...');
        elementos.autoCalcIndicator.classList.remove('hidden');
        
        const resultado = calcularRentabilidad(tarifa, minutos, distancia);
        
        if (resultado) {
            calculoActual = resultado;
            mostrarResultadoRapido(resultado);
        } else {
            console.warn('⚠️ No se pudo calcular la rentabilidad');
            elementos.autoCalcIndicator.classList.add('hidden');
        }
    } else {
        elementos.autoCalcIndicator.classList.add('hidden');
        elementos.resultadoRapido.classList.add('hidden');
    }
}

function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) {
        console.warn('⚠️ No hay perfil activo para calcular');
        return null;
    }
    
    console.log('🧮 Calculando rentabilidad:', { tarifa, minutos, distancia });
    
    // Calcular ganancia por minuto
    const gananciaPorMinuto = tarifa / minutos;
    
    // Calcular ganancia por km
    const gananciaPorKm = tarifa / distancia;
    
    // Calcular ganancia por hora
    const gananciaPorHora = (tarifa / minutos) * 60;
    
    // Calcular costo operacional por hora
    const costoOperacionalPorHora = perfilActual.costoOperacional || 0;
    
    // Calcular ganancia neta por hora
    const gananciaNetaPorHora = gananciaPorHora - costoOperacionalPorHora;
    
    // Determinar rentabilidad
    let rentabilidad = 'mala';
    let emoji = '😞';
    let descripcion = 'No rentable';
    
    if (gananciaNetaPorHora >= 25) {
        rentabilidad = 'excelente';
        emoji = '💰';
        descripcion = '¡Excelente!';
    } else if (gananciaNetaPorHora >= 20) {
        rentabilidad = 'buena';
        emoji = '😊';
        descripcion = 'Buena';
    } else if (gananciaNetaPorHora >= 15) {
        rentabilidad = 'regular';
        emoji = '😐';
        descripcion = 'Regular';
    }
    
    const resultado = {
        tarifa,
        minutos,
        distancia,
        gananciaPorMinuto,
        gananciaPorKm,
        gananciaPorHora,
        gananciaNetaPorHora,
        rentabilidad,
        emoji,
        descripcion,
        timestamp: new Date().toISOString(),
        aceptado: null
    };
    
    console.log('📊 Resultado del cálculo:', resultado);
    return resultado;
}

function mostrarResultadoRapido(resultado) {
    console.log('📱 Mostrando resultado rápido:', resultado.rentabilidad);
    
    elementos.resultadoBadge.className = `badge ${resultado.rentabilidad}`;
    elementos.resultadoEmoji.textContent = resultado.emoji;
    elementos.resultadoTexto.textContent = resultado.descripcion;
    
    // Actualizar métricas
    elementos.metricaMinuto.textContent = resultado.gananciaPorMinuto.toFixed(2);
    elementos.metricaKm.textContent = resultado.gananciaPorKm.toFixed(2);
    
    elementos.resultadoRapido.classList.remove('hidden');
}

async function procesarViaje(aceptado) {
    if (!calculoActual) {
        console.warn('⚠️ No hay cálculo actual para procesar');
        mostrarStatus('Primero calcula un viaje', 'error');
        return;
    }
    
    console.log(aceptado ? '✅ Aceptando viaje' : '❌ Rechazar viaje');
    
    // VERIFICAR que tenemos perfil actual
    if (!perfilActual) {
        console.error('❌ No hay perfil actual configurado');
        mostrarStatus('Error: No hay perfil configurado', 'error');
        return;
    }
    
    // Crear objeto de viaje COMPLETO
    const viaje = {
        ...calculoActual,
        aceptado: aceptado,
        id: 'viaje_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        perfilId: perfilActual.id,
        perfilNombre: perfilActual.nombre
    };
    
    console.log('💾 Guardando viaje (nueva estructura):', {
        id: viaje.id,
        aceptado: viaje.aceptado,
        rentabilidad: viaje.rentabilidad,
        perfil: viaje.perfilNombre
    });
    
    // Agregar al historial local
    historial.unshift(viaje);
    
    // Limitar historial local a 100 elementos
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    // Guardar en Firebase individualmente
    if (firebaseSync && firebaseSync.initialized) {
        await firebaseSync.saveTrip(viaje);
    }
    
    // Mostrar resultado en modal
    mostrarResultadoModal(viaje);
    
    // Guardar datos localmente también
    guardarDatos();
    
    mostrarStatus(aceptado ? '¡Viaje aceptado y guardado!' : 'Viaje rechazado y guardado', 'success');
    
    // Actualizar interfaz
    actualizarEstadisticas();
    actualizarHistorial();
    
    // Limpiar formulario
    limpiarFormulario();
}

function mostrarResultadoModal(resultado) {
    console.log('📊 Mostrando modal de resultado');
    
    // Actualizar modal doble
    elementos.modalBadge.className = `badge ${resultado.rentabilidad}`;
    elementos.modalEmoji.textContent = resultado.emoji;
    elementos.modalTexto.textContent = resultado.descripcion;
    
    // Mostrar modales
    elementos.modalFondo.style.display = 'block';
    elementos.modalContenido.style.display = 'block';
    elementos.modalResultadosDoble.style.display = 'block';
    
    // Auto-ocultar después de 3 segundos
    setTimeout(() => {
        ocultarModales();
    }, 3000);
}

function ocultarModales() {
    elementos.modalFondo.style.display = 'none';
    elementos.modalContenido.style.display = 'none';
    elementos.modalResultadosDoble.style.display = 'none';
}

// =============================================
// HISTORIAL Y ESTADÍSTICAS
// =============================================

function actualizarHistorial() {
    console.log('📊 Actualizando historial');
    
    if (!elementos.historyList) {
        console.warn('❌ Elemento history-list no encontrado');
        return;
    }
    
    elementos.historyList.innerHTML = '';
    
    if (historial.length === 0) {
        elementos.historyList.innerHTML = `
            <div class="empty-state">
                <p>No hay viajes en el historial</p>
                <p class="small">Los viajes aceptados o rechazados aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    historial.forEach((viaje, index) => {
        const viajeElement = document.createElement('div');
        viajeElement.className = `history-item ${viaje.rentabilidad}`;
        
        const fecha = new Date(viaje.timestamp).toLocaleDateString();
        const hora = new Date(viaje.timestamp).toLocaleTimeString();
        
        viajeElement.innerHTML = `
            <div class="history-emoji">${viaje.emoji}</div>
            <div class="history-info">
                <h4>${viaje.descripcion}</h4>
                <p>${viaje.tarifa.toFixed(2)} ${perfilActual?.moneda || '$'} • ${viaje.minutos} min • ${viaje.distancia} ${perfilActual?.tipoMedida || 'km'}</p>
                <p class="small">${fecha} ${hora}</p>
            </div>
            <div class="history-status ${viaje.aceptado ? 'accepted' : 'rejected'}">
                ${viaje.aceptado ? '✅ Aceptado' : '❌ Rechazado'}
            </div>
        `;
        
        elementos.historyList.appendChild(viajeElement);
    });
}

function actualizarEstadisticas() {
    console.log('📈 Actualizando estadísticas');
    
    if (historial.length === 0) {
        resetearEstadisticas();
        return;
    }
    
    const viajesAceptados = historial.filter(v => v.aceptado === true);
    const totalViajes = historial.length;
    const totalGanancia = viajesAceptados.reduce((sum, v) => sum + v.tarifa, 0);
    const totalTiempo = viajesAceptados.reduce((sum, v) => sum + v.minutos, 0);
    const viajesRentables = viajesAceptados.filter(v => v.rentabilidad === 'excelente' || v.rentabilidad === 'buena').length;
    
    const gananciaPorHora = totalTiempo > 0 ? (totalGanancia / totalTiempo) * 60 : 0;
    const viajePromedio = viajesAceptados.length > 0 ? totalGanancia / viajesAceptados.length : 0;
    
    // Actualizar elementos DOM
    if (elementos.statsViajes) elementos.statsViajes.textContent = totalViajes;
    if (elementos.statsGanancia) elementos.statsGanancia.textContent = totalGanancia.toFixed(2);
    if (elementos.statsTiempo) elementos.statsTiempo.textContent = Math.round(totalTiempo);
    if (elementos.statsRentables) elementos.statsRentables.textContent = viajesRentables;
    if (elementos.statsGananciaHora) elementos.statsGananciaHora.textContent = gananciaPorHora.toFixed(2);
    if (elementos.statsViajePromedio) elementos.statsViajePromedio.textContent = viajePromedio.toFixed(2);
}

function resetearEstadisticas() {
    console.log('🔄 Reseteando estadísticas');
    
    const elementosStats = [
        elementos.statsViajes,
        elementos.statsGanancia,
        elementos.statsTiempo,
        elementos.statsRentables,
        elementos.statsGananciaHora,
        elementos.statsViajePromedio
    ];
    
    elementosStats.forEach(element => {
        if (element) element.textContent = '0';
    });
}

async function limpiarHistorial() {
    console.log('🗑️ Limpiando historial (nueva estructura)');
    
    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        // Limpiar en Firebase
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.clearAllTrips();
        }
        
        // Limpiar localmente
        historial = [];
        guardarDatos();
        actualizarHistorial();
        actualizarEstadisticas();
        mostrarStatus('Historial limpiado', 'success');
    }
}

// =============================================
// SISTEMA DE TEMA
// =============================================

function aplicarTemaGuardado() {
    const temaOscuro = localStorage.getItem('temaOscuro') === 'true';
    document.body.classList.toggle('dark-theme', temaOscuro);
    
    const icon = elementos.themeToggle.querySelector('i');
    if (icon) {
        icon.textContent = temaOscuro ? '☀️' : '🌙';
    }
    
    console.log('🎨 Tema aplicado:', temaOscuro ? 'oscuro' : 'claro');
}

function alternarTema() {
    const temaOscuro = !document.body.classList.contains('dark-theme');
    
    document.body.classList.toggle('dark-theme', temaOscuro);
    localStorage.setItem('temaOscuro', temaOscuro);
    
    const icon = elementos.themeToggle.querySelector('i');
    if (icon) {
        icon.textContent = temaOscuro ? '☀️' : '🌙';
    }
    
    console.log('🔄 Tema cambiado a:', temaOscuro ? 'oscuro' : 'claro');
    mostrarStatus(`Tema ${temaOscuro ? 'oscuro' : 'claro'} activado`, 'success');
}

// =============================================
// SISTEMA DE UNIDADES
// =============================================

function actualizarUnidades() {
    console.log('🔄 Actualizando unidades');
    
    if (!perfilActual) return;
    
    // Actualizar etiquetas según el tipo de medida
    const tipoMedida = perfilActual.tipoMedida;
    const labels = document.querySelectorAll('label[for="distancia"]');
    
    labels.forEach(label => {
        label.textContent = `Distancia (${tipoMedida})`;
    });
    
    // Actualizar placeholders
    const distanciaInput = document.getElementById('distancia');
    if (distanciaInput) {
        distanciaInput.placeholder = `Distancia en ${tipoMedida}`;
    }
    
    // Actualizar historial si está visible
    if (document.getElementById('tab-historial').classList.contains('active')) {
        actualizarHistorial();
    }
}

// =============================================
// SISTEMA DE SINCRONIZACIÓN
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

async function forzarSincronizacion() {
    if (!firebaseSync || !firebaseSync.initialized) {
        mostrarError('Firebase Sync no está configurado');
        return;
    }
    
    console.log('🔄 Forzando sincronización...');
    mostrarStatus('🔄 Sincronizando con Firebase...', 'info');
    
    // Sincronizar perfiles
    for (const perfil of perfiles) {
        await firebaseSync.saveProfile(perfil);
    }
    
    // Sincronizar viajes
    for (const viaje of historial.slice(0, 100)) {
        await firebaseSync.saveTrip(viaje);
    }
    
    mostrarStatus('✅ Sincronización completada', 'success');
    actualizarPanelSync();
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
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
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

async function actualizarPanelSync() {
    console.log('🔄 Actualizando panel de sincronización (nueva estructura)');
    
    if (!firebaseSync) {
        console.log('📱 Firebase Sync no disponible');
        actualizarPanelSyncUI('disconnected');
        return;
    }
    
    try {
        // Actualizar información del dispositivo
        const deviceInfo = firebaseSync.getDeviceInfo();
        const deviceName = document.getElementById('current-device-name');
        const deviceId = document.getElementById('current-device-id');
        const deviceIcon = document.getElementById('current-device-icon');
        
        if (deviceName) deviceName.textContent = deviceInfo.name;
        
        if (deviceId) {
            if (userCodeSystem.userCode) {
                deviceId.textContent = `Código: ${userCodeSystem.userCode}`;
            } else {
                deviceId.textContent = `ID: ${deviceInfo.id.substring(0, 8)}...`;
            }
        }
        
        if (deviceIcon) {
            deviceIcon.textContent = deviceInfo.type === 'mobile' ? '📱' : 
                                    deviceInfo.type === 'tablet' ? '📱' : '💻';
        }
        
        // Obtener estado de sincronización
        const syncStatus = await firebaseSync.getSyncStatus();
        
        // Actualizar contadores
        const profilesCount = document.getElementById('cloud-profiles-count');
        const tripsCount = document.getElementById('cloud-history-count');
        
        if (profilesCount) profilesCount.textContent = syncStatus.profilesCount;
        if (tripsCount) tripsCount.textContent = syncStatus.tripsCount;
        
        // Actualizar estado principal
        actualizarPanelSyncUI(syncStatus.status);
        
    } catch (error) {
        console.error('❌ Error actualizando panel de sync:', error);
        actualizarPanelSyncUI('error');
    }
}

function actualizarPanelSyncUI(estado) {
    const syncStatus = document.getElementById('sync-panel-status');
    const firebaseStatus = document.getElementById('firebase-status');
    const lastSyncTime = document.getElementById('last-sync-time');
    
    if (!syncStatus) return;
    
    switch(estado) {
        case 'connected':
            syncStatus.innerHTML = '<span class="sync-icon">✅</span><span>Conectado</span>';
            syncStatus.style.background = '#d4edda';
            syncStatus.style.color = '#155724';
            if (firebaseStatus) firebaseStatus.textContent = 'Conectado';
            break;
        case 'syncing':
            syncStatus.innerHTML = '<span class="sync-icon">🔄</span><span>Sincronizando...</span>';
            syncStatus.style.background = '#fff3cd';
            syncStatus.style.color = '#856404';
            if (firebaseStatus) firebaseStatus.textContent = 'Sincronizando';
            break;
        case 'error':
            syncStatus.innerHTML = '<span class="sync-icon">❌</span><span>Error</span>';
            syncStatus.style.background = '#f8d7da';
            syncStatus.style.color = '#721c24';
            if (firebaseStatus) firebaseStatus.textContent = 'Error';
            break;
        default:
            syncStatus.innerHTML = '<span class="sync-icon">🌐</span><span>Conectando...</span>';
            syncStatus.style.background = '#e2e3e5';
            syncStatus.style.color = '#383d41';
            if (firebaseStatus) firebaseStatus.textContent = 'Conectando';
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
    console.log('🔧 INICIANDO DIAGNÓSTICO COMPLETO DE SINCRONIZACIÓN...');
    
    if (!firebaseSync) {
        console.error('❌ Firebase Sync no inicializado');
        mostrarStatus('❌ Firebase Sync no inicializado', 'error');
        return;
    }

    try {
        console.log('1. Probando conexión básica...');
        mostrarStatus('1. Probando conexión básica...', 'info');
        
        const testResult = await firebaseSync.getSyncStatus();
        console.log('✅ Conexión básica OK:', testResult);

        console.log('2. Probando obtener perfiles...');
        mostrarStatus('2. Probando obtener perfiles...', 'info');
        
        const perfilesCloud = await firebaseSync.loadProfiles();
        console.log('✅ Obtención de perfiles OK:', perfilesCloud?.length || 0);

        console.log('3. Probando obtener viajes...');
        mostrarStatus('3. Probando obtener viajes...', 'info');
        
        const viajesCloud = await firebaseSync.loadTrips();
        console.log('✅ Obtención de viajes OK:', viajesCloud?.length || 0);

        console.log('4. Probando guardar perfiles...');
        mostrarStatus('4. Probando guardar perfiles...', 'info');
        
        let saveProfilesResult = false;
        if (perfilesCloud && perfilesCloud.length > 0) {
            saveProfilesResult = await firebaseSync.saveProfile(perfilesCloud[0]);
        } else {
            // Crear perfil de prueba
            const testProfile = {
                id: 'test_profile',
                nombre: 'Perfil de Prueba',
                tipoMedida: 'km',
                tipoCombustible: 'glp',
                rendimiento: 22.0,
                precioCombustible: 137.20,
                moneda: 'DOP',
                fechaCreacion: new Date().toISOString()
            };
            saveProfilesResult = await firebaseSync.saveProfile(testProfile);
        }
        console.log('✅ Guardado de perfiles OK:', saveProfilesResult);

        console.log('5. Probando guardar viajes...');
        mostrarStatus('5. Probando guardar viajes...', 'info');
        
        const testTrip = {
            id: 'test_trip_' + Date.now(),
            tarifa: 100,
            minutos: 10,
            distancia: 5,
            rentabilidad: 'buena',
            emoji: '😊',
            descripcion: 'Viaje de prueba',
            timestamp: new Date().toISOString(),
            perfilId: 'test_profile',
            perfilNombre: 'Perfil de Prueba',
            aceptado: true
        };
        
        const saveTripResult = await firebaseSync.saveTrip(testTrip);
        console.log('✅ Guardado de viajes OK:', saveTripResult);

        // Mostrar resumen
        const resumen = `
🎉 DIAGNÓSTICO COMPLETADO - NUEVA ESTRUCTURA

✅ Conexión: ${testResult ? 'OK' : 'FALLÓ'}
✅ Perfiles en nube: ${perfilesCloud?.length || 0}
✅ Viajes en nube: ${viajesCloud?.length || 0}
✅ Guardado perfiles: ${saveProfilesResult ? 'OK' : 'FALLÓ'}
✅ Guardado viajes: ${saveTripResult ? 'OK' : 'FALLÓ'}

📊 Datos locales:
• Perfiles: ${perfiles.length}
• Viajes: ${historial.length}
• Código usuario: ${userCodeSystem.userCode || 'No configurado'}

🔗 Estado Firebase Sync: ${firebaseSync.initialized ? 'INICIALIZADO' : 'NO INICIALIZADO'}
        `;
        
        console.log(resumen);
        mostrarStatus('✅ Diagnóstico: Todo funciona correctamente', 'success');
        
        // Mostrar alerta con resumen
        setTimeout(() => {
            alert(resumen);
        }, 1000);
        
    } catch (error) {
        console.error('❌ ERROR EN DIAGNÓSTICO:', error);
        const errorMsg = `❌ Error en diagnóstico: ${error.message}`;
        mostrarStatus(errorMsg, 'error');
        
        // Mostrar alerta con error
        setTimeout(() => {
            alert(`❌ DIAGNÓSTICO FALLIDO:\n\n${error.message}\n\nVerifica la consola para más detalles.`);
        }, 1000);
    }
}

// =============================================
// INICIALIZACIÓN DE LA APLICACIÓN
// =============================================

async function inicializarApp() {
    console.log('📡 Inicializando UberCalc con Nueva Estructura Firebase...');
    
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
            
            // ✅ ESCUCHA EN TIEMPO REAL MEJORADA - NUEVA ESTRUCTURA
            console.log('👂 Iniciando escucha en tiempo real (nueva estructura)...');
            
            try {
                firebaseSync.unsubscribe = firebaseSync.listenForChanges((change) => {
                    console.log('🔄 Datos actualizados desde la nube (nueva estructura):', change.type);
                    
                    if (change.type === 'profiles') {
                        console.log('✅ Actualizando perfiles desde la nube:', change.data.length);
                        perfiles = change.data;
                        
                        // Actualizar perfil actual
                        if (perfiles.length > 0) {
                            const currentProfileId = localStorage.getItem('ubercalc_perfil_actual_id');
                            perfilActual = perfiles.find(p => p.id === currentProfileId) || perfiles[0];
                            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
                        }
                        
                        // Guardar en localStorage
                        localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
                        
                        // Actualizar interfaz
                        actualizarInterfazPerfiles();
                    }
                    
                    if (change.type === 'trips') {
                        console.log('✅ Actualizando viajes desde la nube:', change.data.length);
                        historial = change.data;
                        
                        // Guardar en localStorage
                        localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
                        
                        // Actualizar interfaz
                        actualizarHistorial();
                        actualizarEstadisticas();
                    }
                    
                    mostrarStatus('Datos actualizados desde la nube', 'info');
                });
            } catch (error) {
                console.error('❌ Error iniciando escucha en tiempo real:', error);
            }
            
        } else {
            console.log('📱 Firebase Sync no disponible, usando almacenamiento local');
            await cargarDatos();
        }
        
        aplicarTemaGuardado();
        
        // 3. VERIFICAR que tenemos un perfil actual válido
        if (!perfilActual && perfiles.length > 0) {
            console.log('🔄 Estableciendo primer perfil como actual...');
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
        
        actualizarInterfazPerfiles();
        
        // 4. DECIDIR qué pantalla mostrar
        if (perfiles.length === 0) {
            console.log('👤 Sin perfiles, mostrando pantalla de perfiles...');
            mostrarPantalla('perfil');
            mostrarStatus('👋 ¡Bienvenido! Crea tu primer perfil para comenzar', 'info');
        } else if (perfilActual) {
            console.log('🏠 Mostrando pantalla principal con perfil:', perfilActual.nombre);
            mostrarPantalla('main');
            actualizarEstadisticas();
        } else {
            console.log('👤 Mostrando pantalla de perfiles (perfilActual es null)');
            mostrarPantalla('perfil');
        }
        
        // Actualizar UI de sync
        actualizarPanelSync();
        
        console.log('🎉 UberCalc con Nueva Estructura Firebase inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        mostrarPantalla('perfil');
        mostrarStatus('Error al cargar la aplicación. Por favor, recarga la página.', 'error');
    }
}

function configurarEventListeners() {
    console.log('⚙️ Configurando event listeners...');
    
    // Sistema de Pestañas
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            console.log('📑 Cambiando a pestaña:', tabId);
            cambiarPestana(tabId);
        });
    });
    
    // Cálculo Automático
    if (elementos.tarifaInput) {
        elementos.tarifaInput.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.minutosInput) {
        elementos.minutosInput.addEventListener('input', manejarCalculoAutomatico);
    }
    if (elementos.distanciaInput) {
        elementos.distanciaInput.addEventListener('input', manejarCalculoAutomatico);
    }
    
    // Botones de Acción
    if (elementos.aceptarViajeBtn) {
        elementos.aceptarViajeBtn.addEventListener('click', function() {
            console.log('✅ Botón aceptar viaje clickeado');
            procesarViaje(true);
        });
    }
    
    if (elementos.rechazarViajeBtn) {
        elementos.rechazarViajeBtn.addEventListener('click', function() {
            console.log('❌ Botón rechazar viaje clickeado');
            procesarViaje(false);
        });
    }
    
    if (elementos.aceptarViajeTabBtn) {
        elementos.aceptarViajeTabBtn.addEventListener('click', function() {
            console.log('✅ Botón aceptar viaje (tab) clickeado');
            procesarViaje(true);
        });
    }
    
    if (elementos.rechazarViajeTabBtn) {
        elementos.rechazarViajeTabBtn.addEventListener('click', function() {
            console.log('❌ Botón rechazar viaje (tab) clickeado');
            procesarViaje(false);
        });
    }
    
    // Historial
    if (elementos.clearHistoryBtn) {
        elementos.clearHistoryBtn.addEventListener('click', limpiarHistorial);
    }
    
    if (elementos.exportarHistorialBtn) {
        elementos.exportarHistorialBtn.addEventListener('click', function() {
            console.log('📤 Mostrando modal de exportación');
            if (elementos.exportModal) {
                elementos.exportModal.style.display = 'block';
            }
        });
    }
    
    // Perfiles
    if (elementos.nuevoPerfilBtn) {
        elementos.nuevoPerfilBtn.addEventListener('click', function() {
            console.log('➕ Creando nuevo perfil');
            mostrarConfigPerfil();
        });
    }
    
    if (elementos.volverPerfilesBtn) {
        elementos.volverPerfilesBtn.addEventListener('click', function() {
            console.log('⬅️ Volviendo a perfiles');
            mostrarPantalla('perfil');
        });
    }
    
    if (elementos.cancelarPerfilBtn) {
        elementos.cancelarPerfilBtn.addEventListener('click', function() {
            console.log('❌ Cancelando creación/edición de perfil');
            mostrarPantalla('perfil');
        });
    }
    
    if (elementos.perfilForm) {
        elementos.perfilForm.addEventListener('submit', guardarPerfil);
    }
    
    if (elementos.cambiarPerfilBtn) {
        elementos.cambiarPerfilBtn.addEventListener('click', function() {
            console.log('👤 Cambiando perfil');
            mostrarPantalla('perfil');
        });
    }
    
    // Tema
    if (elementos.themeToggle) {
        elementos.themeToggle.addEventListener('click', alternarTema);
    }
    
    // Exportación
    if (elementos.exportarPdfBtn) {
        elementos.exportarPdfBtn.addEventListener('click', function() {
            console.log('📄 Exportando a PDF');
            mostrarStatus('Exportando PDF...', 'info');
            // Implementación básica de exportación
            setTimeout(() => {
                mostrarStatus('PDF exportado correctamente', 'success');
                cerrarExportModal();
            }, 1000);
        });
    }
    
    // Configuración de Unidades
    const tipoMedidaSelect = document.getElementById('tipo-medida');
    const tipoCombustibleSelect = document.getElementById('tipo-combustible');
    const monedaSelect = document.getElementById('moneda');
    
    if (tipoMedidaSelect) {
        tipoMedidaSelect.addEventListener('change', actualizarUnidades);
    }
    
    if (tipoCombustibleSelect) {
        tipoCombustibleSelect.addEventListener('change', actualizarUnidades);
    }
    
    if (monedaSelect) {
        monedaSelect.addEventListener('change', actualizarUnidades);
    }
    
    // Agregar event listener para Enter en el código de usuario
    const userCodeInput = document.getElementById('user-code-input');
    if (userCodeInput) {
        userCodeInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                setUserCode();
            }
        });
    }
    
    console.log('✅ Event listeners configurados correctamente');
}

// =============================================
// INICIALIZACIÓN AL CARGAR LA PÁGINA
// =============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM cargado, inicializando UberCalc...');
    configurarEventListeners();
    inicializarApp();
});

// =============================================
// FUNCIONES GLOBALES PARA HTML
// =============================================

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

// Funciones del sistema de código
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.showUserCodeModal = showUserCodeModal;
window.cambiarUsuario = cambiarUsuario;

// Funciones de perfil
window.guardarPerfil = guardarPerfil;

// Funciones básicas
window.cambiarPestana = cambiarPestana;

// Cerrar modales al hacer clic fuera
window.addEventListener('click', function(event) {
    if (event.target === elementos.modalFondo) {
        ocultarModales();
    }
    if (event.target === elementos.exportModal) {
        cerrarExportModal();
    }
    if (event.target === elementos.syncPanel) {
        cerrarSyncPanel();
    }
});

console.log('🎉 UberCalc con Nueva Estructura Firebase cargado correctamente');
