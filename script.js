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
// ELEMENTOS DOM - DEFINIDOS AL INICIO (ACTUALIZADO)
// =============================================

// --- Elementos DOM ---
const elementos = {
    // Pantallas
    perfilScreen: document.getElementById('perfil-screen'),
    configPerfilScreen: document.getElementById('config-perfil-screen'),
    mainScreen: document.getElementById('main-screen'),
    
    // --- Nuevos Elementos de Header/Nav ---
    mainHeader: document.getElementById('main-header'),
    profileAvatar: document.getElementById('profile-avatar'),
    bottomNavBar: document.getElementById('bottom-nav-bar'),

    // Sistema de Pestañas
    tabButtons: document.querySelectorAll('.tab-button'), // Selecciona botones del header y la nav inferior
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

/**
 * Función para actualizar el nombre del perfil y las iniciales del avatar en el encabezado.
 */
function actualizarHeader() {
    console.log('✨ Actualizando el encabezado y el perfil.');
    
    // 1. Perfil Nombre en Main Screen
    const perfilNombreElement = document.getElementById('perfil-actual-nombre');
    if (perfilNombreElement && perfilActual) {
        perfilNombreElement.textContent = perfilActual.nombre;
    }

    // 2. Avatar de Perfil con Iniciales
    if (elementos.profileAvatar && perfilActual) {
        // Generar iniciales a partir del nombre (máximo 2)
        const iniciales = perfilActual.nombre
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2); 
        
        elementos.profileAvatar.textContent = iniciales;
    }
}


// =============================================
// FUNCIONES DE NAVEGACIÓN ENTRE PANTALLAS (ACTUALIZADO)
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
            // Llamar a la función para actualizar el encabezado
            if (perfilActual) {
                actualizarHeader();
            }
            break;
    }
}

// =============================================
// SISTEMA DE PESTAÑAS (MANTENIDO)
// =============================================

function cambiarPestana(tabId) {
    console.log('📑 Cambiando a pestaña:', tabId);
    
    // Actualizar botones de pestañas (Selecciona todos los .tab-button)
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
        
        // Actualizar el avatar antes de cambiar de pantalla
        actualizarHeader();
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

    if (confirm('¿Estás seguro de que quieres eliminar este perfil? También se eliminarán los viajes asociados a él. Esta acción es IRREVERSIBLE.')) {
        
        // Eliminar de Firebase
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.deleteProfile(perfilId);
        }

        // Eliminar del array local
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        // Si el perfil eliminado era el actual, seleccionar el primero de la lista
        if (perfilActual?.id === perfilId) {
            perfilActual = perfiles[0] || null;
            if (perfilActual) {
                localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
                mostrarStatus(`Perfil eliminado. Seleccionado: ${perfilActual.nombre}`, 'warning');
            } else {
                localStorage.removeItem('ubercalc_perfil_actual_id');
                mostrarStatus('Perfil eliminado. Crea uno nuevo para continuar.', 'warning');
            }
        }

        // Eliminar viajes asociados (opcional, pero buena práctica)
        historial = historial.filter(viaje => viaje.perfilId !== perfilId);

        // Actualizar interfaz y guardar
        guardarDatos();
        actualizarInterfazPerfiles();
        actualizarEstadisticas();
        
        mostrarStatus('Perfil y viajes asociados eliminados correctamente', 'success');
        
        // Si no quedan perfiles, forzar a la pantalla de perfiles
        if (!perfilActual) {
            mostrarPantalla('perfil');
        }
    }
}

function repararPerfilesCorruptos() {
    // Si no hay perfiles, no hacer nada
    if (perfiles.length === 0) return;

    // Verificar si perfilActual es nulo pero hay perfiles guardados
    if (!perfilActual) {
        const lastUsedId = localStorage.getItem('ubercalc_perfil_actual_id');
        let foundProfile = perfiles.find(p => p.id === lastUsedId);

        if (foundProfile) {
            // Cargar el último perfil usado si existe
            perfilActual = foundProfile;
            console.log('🛠️ Perfil actual reparado (último usado):', perfilActual.nombre);
        } else {
            // Si no se encuentra el último usado, usar el primer perfil
            perfilActual = perfiles[0];
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
            console.log('🛠️ Perfil actual reparado (primer perfil):', perfilActual.nombre);
        }
    }
}


// =============================================
// FUNCIONES DE CÁLCULO
// =============================================

function actualizarUnidades() {
    const tipoMedida = document.getElementById('tipo-medida')?.value || perfilActual?.tipoMedida || 'km';
    
    // Etiqueta del Rendimiento
    const rendimientoLabel = document.getElementById('rendimiento-label');
    if (rendimientoLabel) {
        rendimientoLabel.textContent = `Rendimiento (${tipoMedida === 'mi' ? 'mpg' : 'Km/Gal'})`;
    }
    
    // Etiqueta de Distancia
    const distanciaLabel = document.getElementById('distancia-label');
    if (distanciaLabel) {
        distanciaLabel.textContent = `Distancia (${tipoMedida})`;
    }
    
    // Umbral Km Rentable
    const umbralKmRentableLabel = document.getElementById('umbral-km-rentable-label');
    if (umbralKmRentableLabel) {
        umbralKmRentableLabel.textContent = `Umbral Rentable (${tipoMedida === 'mi' ? '$/mi' : 'RD$/Km'})`;
    }
    
    // Umbral Km Oportunidad
    const umbralKmOportunidadLabel = document.getElementById('umbral-km-oportunidad-label');
    if (umbralKmOportunidadLabel) {
        umbralKmOportunidadLabel.textContent = `Umbral Oportunidad (${tipoMedida === 'mi' ? '$/mi' : 'RD$/Km'})`;
    }

    console.log(`📏 Unidades actualizadas a: ${tipoMedida}`);
}

function calcularCostoCombustible(distancia, perfil) {
    if (!perfil || !perfil.rendimiento || !perfil.precioCombustible || perfil.rendimiento <= 0) {
        console.warn('⚠️ Datos de perfil incompletos para cálculo de combustible');
        return 0;
    }

    const { rendimiento, precioCombustible, tipoMedida } = perfil;
    
    let distanciaEnUnidadBase = distancia;
    
    if (tipoMedida === 'mi') {
        // Asumiendo que la distancia de entrada ya está en la unidad del perfil (millas)
        // Por lo tanto, no se requiere conversión de distancia si la fórmula se basa en la unidad de perfil.
    } else {
        // Asumiendo que la distancia de entrada ya está en la unidad del perfil (kilómetros)
    }

    // Fórmula: (Distancia / Rendimiento) * PrecioCombustible
    const costo = (distanciaEnUnidadBase / rendimiento) * precioCombustible;

    return costo;
}

function calcularCostoOperacionalPorViaje(distancia, minutos, perfil) {
    if (!perfil) return 0;

    const { costoSeguro = 0, costoMantenimiento = 0 } = perfil;

    // Costo Fijo Diario (Seguro + Mantenimiento) / 8 horas * 60 minutos = Costo por minuto
    const costoMinutoFijo = ((costoSeguro + costoMantenimiento) / (8 * 60)) || 0;
    
    // Costo por tiempo
    const costoTiempo = costoMinutoFijo * minutos;

    // Costo por Distancia (Combustible)
    const costoCombustible = calcularCostoCombustible(distancia, perfil);

    const costoTotal = costoTiempo + costoCombustible;
    
    // Añadir un costo operacional fijo mínimo por viaje para cubrir otros gastos (ej: 5 RD$)
    const costoBase = 5; 
    
    return costoTotal + costoBase;
}

function realizarCalculo() {
    console.log('🧮 Iniciando cálculo...');

    if (!perfilActual) {
        mostrarError('Debes seleccionar o crear un perfil primero.');
        return;
    }

    const tarifa = parseFloat(elementos.tarifaInput.value) || 0;
    const minutos = parseFloat(elementos.minutosInput.value) || 0;
    const distancia = parseFloat(elementos.distanciaInput.value) || 0;
    
    if (tarifa <= 0 || (minutos <= 0 && distancia <= 0)) {
        elementos.resultadoRapido.classList.add('hidden');
        elementos.autoCalcIndicator.classList.add('hidden');
        return;
    }

    const costoOperacional = calcularCostoOperacionalPorViaje(distancia, minutos, perfilActual);
    const gananciaNeta = tarifa - costoOperacional;
    
    // Métricas de Rendimiento
    const costoPorMinuto = gananciaNeta / minutos || 0;
    const costoPorKm = gananciaNeta / distancia || 0;
    
    const esRentable = costoPorMinuto >= perfilActual.umbralMinutoRentable && costoPorKm >= perfilActual.umbralKmRentable;
    const esOportunidad = !esRentable && costoPorMinuto >= perfilActual.umbralMinutoOportunidad && costoPorKm >= perfilActual.umbralKmOportunidad;
    
    let badgeClase = 'info';
    let emoji = '🤔';
    let textoResultado = 'Aún no rentable';
    
    if (esRentable) {
        badgeClase = 'success';
        emoji = '🤑';
        textoResultado = '¡Súper Rentable!';
    } else if (esOportunidad) {
        badgeClase = 'warning';
        emoji = '🧐';
        textoResultado = 'Margen de Oportunidad';
    }

    // Actualizar resultados visibles
    elementos.resultadoRapido.classList.remove('hidden');
    elementos.resultadoBadge.className = `badge badge-${badgeClase}`;
    elementos.resultadoBadge.textContent = badgeClase === 'info' ? 'Aún no rentable' : badgeClase === 'warning' ? 'Oportunidad' : 'Rentable';
    elementos.resultadoEmoji.textContent = emoji;
    elementos.resultadoTexto.textContent = `${formatearMoneda(gananciaNeta)} ganancia neta`;
    
    elementos.metricaMinuto.textContent = formatearMoneda(costoPorMinuto) + (perfilActual.moneda === 'USD' ? '/min' : '/min');
    
    const unidadKm = perfilActual.tipoMedida === 'mi' ? '/mi' : '/Km';
    elementos.metricaKm.textContent = formatearMoneda(costoPorKm) + unidadKm;
    
    // Guardar el cálculo actual para el historial
    calculoActual = {
        id: 'viaje_' + Date.now(),
        perfilId: perfilActual.id,
        timestamp: new Date().toISOString(),
        tarifa: tarifa,
        minutos: minutos,
        distancia: distancia,
        costoOperacional: costoOperacional,
        gananciaNeta: gananciaNeta,
        rentabilidad: badgeClase
    };

    console.log('✅ Cálculo realizado. Ganancia Neta:', formatearMoneda(gananciaNeta), 'Rentabilidad:', badgeClase);
}

function iniciarCalculoAutomatico() {
    clearTimeout(timeoutCalculo);
    if (!elementos.autoCalcIndicator.classList.contains('hidden')) {
        elementos.autoCalcIndicator.classList.remove('hidden');
    }
    timeoutCalculo = setTimeout(() => {
        realizarCalculo();
        elementos.autoCalcIndicator.classList.add('hidden');
    }, 1000);
}

// =============================================
// FUNCIONES DE HISTORIAL Y ESTADÍSTICAS
// =============================================

function agregarHistorial(accion) {
    if (!calculoActual) {
        mostrarError('No hay un cálculo reciente para guardar.');
        return;
    }

    const viaje = {
        ...calculoActual,
        accion: accion, // 'Aceptado' o 'Rechazado'
        id: 'viaje_' + Date.now(),
        timestamp: new Date().toISOString()
    };

    historial.unshift(viaje); // Añadir al principio

    // Mantener el historial limpio (ej. últimos 200 viajes)
    if (historial.length > 200) {
        historial = historial.slice(0, 200);
    }

    // Mostrar modal con resultados
    mostrarModalResultados(viaje);

    // Guardar y actualizar
    guardarDatos();
    actualizarEstadisticas();
    limpiarFormulario();
    
    mostrarStatus(`Viaje ${accion.toLowerCase()} guardado.`, 'success');
    console.log(`✅ Viaje ${accion} guardado:`, viaje);
}

function mostrarModalResultados(viaje) {
    if (!elementos.modalFondo) return;
    
    elementos.modalFondo.style.display = 'flex';
    elementos.modalContenido.innerHTML = '';
    
    const perfil = perfiles.find(p => p.id === viaje.perfilId) || perfilActual;
    const moneda = perfil?.moneda || 'DOP';

    let badgeClase = 'info';
    let emoji = '🤔';
    
    if (viaje.rentabilidad === 'success' || viaje.rentabilidad === 'Rentable') {
        badgeClase = 'success';
        emoji = '🤑';
    } else if (viaje.rentabilidad === 'warning' || viaje.rentabilidad === 'Oportunidad') {
        badgeClase = 'warning';
        emoji = '🧐';
    }

    const contenido = `
        <div class="modal-header">
            <h2 style="margin: 0;">Resumen del Viaje</h2>
            <button class="btn-icon" onclick="cerrarModal()">❌</button>
        </div>
        <div class="modal-body">
            <div id="modalResultadosDoble" class="resultado-doble">
                <div id="modal-badge" class="badge badge-${badgeClase}">${viaje.rentabilidad || 'Info'}</div>
                <span id="modal-emoji" class="emoji">${emoji}</span>
            </div>
            <h3 id="modal-texto" style="text-align: center; margin-top: 10px;">
                ${formatearMoneda(viaje.gananciaNeta)} ganancia neta
            </h3>

            <div class="viaje-detalles">
                <p><strong>Decisión:</strong> <span class="badge badge-${viaje.accion === 'Aceptado' ? 'success' : 'danger'}">${viaje.accion}</span></p>
                <p><strong>Tarifa:</strong> ${formatearMoneda(viaje.tarifa)}</p>
                <p><strong>Duración:</strong> ${formatearTiempo(viaje.minutos)}</p>
                <p><strong>Distancia:</strong> ${viaje.distancia} ${perfil?.tipoMedida || 'Km'}</p>
            </div>

            <hr style="margin: 15px 0;">

            <div class="viaje-detalles">
                <p><strong>Costo Operacional:</strong> ${formatearMoneda(viaje.costoOperacional)}</p>
                <p><strong>Costo Combustible:</strong> ${formatearMoneda(calcularCostoCombustible(viaje.distancia, perfil))}</p>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn-primary" onclick="cerrarModal()">Entendido</button>
        </div>
    `;

    elementos.modalContenido.innerHTML = contenido;
}

function actualizarHistorial() {
    console.log('📜 Actualizando historial');
    if (!elementos.historyList) return;

    elementos.historyList.innerHTML = '';
    
    // Filtrar historial solo por el perfil actual
    const historialFiltrado = historial.filter(viaje => viaje.perfilId === perfilActual?.id);

    if (historialFiltrado.length === 0) {
        elementos.historyList.innerHTML = `
            <div class="empty-state">
                <p>No hay viajes registrados</p>
                <p class="small">Registra un viaje para verlo aquí</p>
            </div>
        `;
        return;
    }

    historialFiltrado.forEach(viaje => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        let badgeClase = 'info';
        if (viaje.rentabilidad === 'success' || viaje.rentabilidad === 'Rentable') {
            badgeClase = 'success';
        } else if (viaje.rentabilidad === 'warning' || viaje.rentabilidad === 'Oportunidad') {
            badgeClase = 'warning';
        }

        const perfil = perfiles.find(p => p.id === viaje.perfilId) || perfilActual;
        const unidadKm = perfil?.tipoMedida === 'mi' ? 'mi' : 'Km';
        const tiempoStr = formatearTiempo(viaje.minutos);
        const fechaStr = new Date(viaje.timestamp).toLocaleDateString('es-DO', { 
            hour: '2-digit', minute: '2-digit' 
        });

        item.innerHTML = `
            <div class="history-info">
                <span class="badge badge-${viaje.accion === 'Aceptado' ? 'success' : 'danger'}">${viaje.accion}</span>
                <h4>${formatearMoneda(viaje.gananciaNeta)}</h4>
                <p>
                    ${formatearMoneda(viaje.tarifa)} - 
                    ${tiempoStr} - 
                    ${viaje.distancia} ${unidadKm}
                </p>
                <p class="small">
                    ${fechaStr} | 
                    Rentabilidad: <span class="badge badge-sm badge-${badgeClase}">${viaje.rentabilidad}</span>
                </p>
            </div>
            <div class="history-actions">
                <button class="btn-icon" onclick="mostrarDetallesViaje('${viaje.id}')">👁️</button>
            </div>
        `;

        elementos.historyList.appendChild(item);
    });
}

function mostrarDetallesViaje(viajeId) {
    const viaje = historial.find(v => v.id === viajeId);
    if (viaje) {
        mostrarModalResultados(viaje);
    } else {
        mostrarError('Viaje no encontrado.');
    }
}

function actualizarEstadisticas() {
    console.log('📊 Actualizando estadísticas');

    // Filtrar historial solo por el perfil actual
    const viajes = historial.filter(viaje => viaje.perfilId === perfilActual?.id && viaje.accion === 'Aceptado');

    const totalViajes = viajes.length;
    
    // Sumas
    const totalGanancia = viajes.reduce((sum, v) => sum + v.gananciaNeta, 0);
    const totalTiempo = viajes.reduce((sum, v) => sum + v.minutos, 0); // en minutos
    
    // Rentabilidad
    const viajesRentables = viajes.filter(v => v.rentabilidad === 'success' || v.rentabilidad === 'Rentable').length;
    const porcentajeRentables = totalViajes > 0 ? (viajesRentables / totalViajes) * 100 : 0;
    
    // Promedios
    const gananciaPorHora = totalTiempo > 0 ? (totalGanancia / totalTiempo) * 60 : 0;
    const gananciaPromedioViaje = totalViajes > 0 ? totalGanancia / totalViajes : 0;

    // Actualizar DOM
    if (elementos.statsViajes) elementos.statsViajes.textContent = totalViajes;
    if (elementos.statsGanancia) elementos.statsGanancia.textContent = formatearMoneda(totalGanancia);
    if (elementos.statsTiempo) elementos.statsTiempo.textContent = formatearTiempo(totalTiempo);
    if (elementos.statsRentables) elementos.statsRentables.textContent = `${viajesRentables} (${porcentajeRentables.toFixed(0)}%)`;
    if (elementos.statsGananciaHora) elementos.statsGananciaHora.textContent = formatearMoneda(gananciaPorHora) + '/h';
    if (elementos.statsViajePromedio) elementos.statsViajePromedio.textContent = formatearMoneda(gananciaPromedioViaje);

    console.log(`✅ Estadísticas actualizadas. Viajes: ${totalViajes}, Ganancia Total: ${formatearMoneda(totalGanancia)}`);
}

async function limpiarHistorial() {
    console.log('🧹 Iniciando limpieza de historial');

    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío.', 'info');
        return;
    }

    if (confirm('¿Estás seguro de que quieres eliminar TODOS los viajes de tu historial? Esta acción es IRREVERSIBLE.')) {
        
        // Limpiar en Firebase
        if (firebaseSync && firebaseSync.initialized) {
            await firebaseSync.clearAllTrips();
        }

        // Limpiar en local
        historial = [];
        guardarDatos();
        actualizarHistorial();
        actualizarEstadisticas();
        
        mostrarStatus('Historial de viajes eliminado correctamente', 'success');
    } else {
        console.log('❌ Limpieza de historial cancelada');
    }
}

// =============================================
// FUNCIONES DE SINCRONIZACIÓN Y EXPORTACIÓN
// =============================================

function cerrarSyncPanel() {
    console.log('❌ Cerrando panel de sincronización...');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'none';
    }
}

function mostrarPanelSync() {
    console.log('🌐 Mostrando panel de sincronización...');
    if (elementos.syncPanel) {
        elementos.syncPanel.style.display = 'flex';
        actualizarPanelSync();
        mostrarInfoSync();
    }
}

async function actualizarPanelSync() {
    console.log('🔄 Actualizando panel de sync (datos)...');
    
    const syncStatus = await firebaseSync.getSyncStatus();
    
    const statusTextElement = document.getElementById('sync-status-text');
    const profilesCountElement = document.getElementById('profiles-count');
    const tripsCountElement = document.getElementById('trips-count');
    const lastSyncElement = document.getElementById('last-sync-time');

    if (statusTextElement) statusTextElement.textContent = syncStatus.status === 'connected' ? '✅ Conectado' : syncStatus.status === 'error' ? '❌ Error' : '🌐 Desconectado';
    if (profilesCountElement) profilesCountElement.textContent = syncStatus.profilesCount;
    if (tripsCountElement) tripsCountElement.textContent = syncStatus.tripsCount;
    
    if (lastSyncElement) {
        if (syncStatus.lastSync) {
            lastSyncElement.textContent = new Date(syncStatus.lastSync).toLocaleString('es-DO');
        } else {
            lastSyncElement.textContent = 'Nunca';
        }
    }
    
    firebaseSync.actualizarUIEstado(syncStatus.status);
    
    // Actualizar display de código de usuario
    const display = document.getElementById('user-code-display-main');
    if (display && userCodeSystem.userCode) {
        display.textContent = `Código: ${userCodeSystem.userCode}`;
    }
}

async function mostrarInfoSync() {
    console.log('📄 Mostrando información detallada de sincronización...');
    
    const infoContainer = document.getElementById('sync-device-info');
    if (!infoContainer) return;
    
    infoContainer.innerHTML = '<h4>Dispositivo Actual</h4>';
    const deviceInfo = firebaseSync.getDeviceInfo();
    
    infoContainer.innerHTML += `
        <p><strong>ID Usuario:</strong> ${deviceInfo.id}</p>
        <p><strong>Nombre Aproximado:</strong> ${deviceInfo.name}</p>
        <p><strong>Tipo:</strong> ${deviceInfo.type}</p>
        <p><strong>Última Interacción:</strong> ${new Date(deviceInfo.lastSync).toLocaleString('es-DO')}</p>
    `;
    
    // Agregar diagnóstico básico
    const diagnosticBtn = document.getElementById('diagnosticar-sync-btn');
    if (diagnosticBtn) {
        diagnosticBtn.onclick = diagnosticarSync;
    }
}

function diagnosticarSync() {
    console.log('🛠️ Ejecutando diagnóstico de sincronización...');
    
    const results = document.getElementById('sync-diagnostic-results');
    if (!results) return;
    
    results.innerHTML = '<h4>Resultados del Diagnóstico:</h4>';
    
    let passed = true;
    
    // Prueba 1: Estado de Firebase Sync
    const isInit = firebaseSync && firebaseSync.initialized;
    results.innerHTML += `<p>${isInit ? '✅' : '❌'} Firebase Sync Inicializado: ${isInit}</p>`;
    if (!isInit) passed = false;
    
    // Prueba 2: Código de Usuario
    const hasCode = userCodeSystem.initialized && userCodeSystem.userCode;
    results.innerHTML += `<p>${hasCode ? '✅' : '❌'} Código de Usuario Establecido: ${hasCode}</p>`;
    if (!hasCode) passed = false;

    // Prueba 3: Conexión a Internet
    const isOnline = navigator.onLine;
    results.innerHTML += `<p>${isOnline ? '✅' : '❌'} Conexión a Internet: ${isOnline ? 'Online' : 'Offline'}</p>`;
    if (!isOnline) {
        passed = false;
        mostrarStatus('Dispositivo sin conexión a internet.', 'error');
    }
    
    // Prueba 4: Presencia de Perfil Actual
    const hasProfile = !!perfilActual;
    results.innerHTML += `<p>${hasProfile ? '✅' : '❌'} Perfil Activo: ${hasProfile ? perfilActual.nombre : 'Ninguno'}</p>`;
    
    results.innerHTML += `
        <h4 style="margin-top: 15px;">Resumen:</h4>
        <p class="badge badge-${passed ? 'success' : 'danger'}" style="display: block;">${passed ? 'Estado Óptimo para Sync' : 'Revisar Puntos de Error'}</p>
    `;
    
    mostrarStatus(passed ? 'Diagnóstico completo. Listo para sincronizar.' : 'Se encontraron errores de sincronización. Revisa los detalles.', passed ? 'success' : 'error');
}

async function forzarSincronizacion() {
    console.log('⚡ Forzando sincronización...');
    if (!firebaseSync || !firebaseSync.initialized) {
        mostrarError('El sistema de sincronización no está inicializado.');
        return;
    }
    
    if (firebaseSync.syncInProgress) {
        mostrarStatus('Ya hay una sincronización en curso.', 'warning');
        return;
    }

    try {
        firebaseSync.syncInProgress = true;
        firebaseSync.actualizarUIEstado('syncing');

        // Solo forzamos la subida de datos locales a la nube (para evitar sobreescribir datos frescos de otros)
        await guardarDatos(); 
        
        firebaseSync.syncInProgress = false;
        firebaseSync.actualizarUIEstado('connected');
        mostrarStatus('Sincronización forzada completada', 'success');
        
        // Actualizar el panel
        actualizarPanelSync();
        
    } catch (error) {
        firebaseSync.syncInProgress = false;
        firebaseSync.actualizarUIEstado('error');
        mostrarError('Error al forzar sincronización: ' + error.message);
    }
}

async function forzarSincronizacionCompleta() {
    console.log('🔥 Forzando sincronización COMPLETA (Cloud -> Local -> Cloud)...');
    
    if (!firebaseSync || !firebaseSync.initialized) {
        mostrarError('El sistema de sincronización no está inicializado.');
        return;
    }
    
    if (firebaseSync.syncInProgress) {
        mostrarStatus('Ya hay una sincronización en curso.', 'warning');
        return;
    }

    if (!confirm('Esto forzará la descarga de datos de la nube y luego la subida. ¿Continuar?')) {
        return;
    }

    try {
        firebaseSync.syncInProgress = true;
        firebaseSync.actualizarUIEstado('syncing');

        // 1. Descargar (Cloud -> Local)
        await cargarDatos(); 
        
        // 2. Subir (Local -> Cloud)
        await guardarDatos();
        
        // 3. Re-inicializar UI
        actualizarHistorial();
        actualizarEstadisticas();
        actualizarInterfazPerfiles();
        actualizarHeader();

        firebaseSync.syncInProgress = false;
        firebaseSync.actualizarUIEstado('connected');
        mostrarStatus('Sincronización COMPLETA exitosa. Datos actualizados.', 'success');
        
        // Actualizar el panel
        actualizarPanelSync();
        
    } catch (error) {
        firebaseSync.syncInProgress = false;
        firebaseSync.actualizarUIEstado('error');
        mostrarError('Error al forzar sincronización completa: ' + error.message);
    }
}

function exportarHistorial() {
    console.log('📤 Exportando historial...');
    if (!historial || historial.length === 0) {
        mostrarStatus('No hay historial para exportar.', 'warning');
        return;
    }

    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'flex';
    }
}

function generarCSV() {
    const csvContent = [];
    
    // Cabecera
    const headers = [
        'ID Viaje', 'Timestamp', 'Perfil ID', 'Perfil Nombre', 'Accion', 'Tarifa', 'Minutos', 
        'Distancia', 'Costo Operacional', 'Ganancia Neta', 'Rentabilidad'
    ];
    csvContent.push(headers.join(','));

    // Datos
    historial.forEach(viaje => {
        const perfil = perfiles.find(p => p.id === viaje.perfilId) || { nombre: 'Desconocido' };
        
        const row = [
            `"${viaje.id}"`,
            `"${viaje.timestamp}"`,
            `"${viaje.perfilId}"`,
            `"${perfil.nombre}"`,
            `"${viaje.accion}"`,
            viaje.tarifa.toFixed(2),
            viaje.minutos.toFixed(2),
            viaje.distancia.toFixed(2),
            viaje.costoOperacional.toFixed(2),
            viaje.gananciaNeta.toFixed(2),
            `"${viaje.rentabilidad}"`
        ];
        csvContent.push(row.join(','));
    });

    const csvString = csvContent.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `UberCalc_Historial_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    mostrarStatus('CSV generado y descarga iniciada', 'success');
}

function generarPDF() {
    mostrarStatus('Función de PDF en desarrollo. Usa la opción CSV por ahora.', 'warning');
    // Implementación futura con librería como jsPDF
}


// =============================================
// LÓGICA DE INICIALIZACIÓN
// =============================================

function inicializarEventos() {
    console.log('🔗 Inicializando eventos DOM...');

    // Botones de pestañas
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            cambiarPestana(button.getAttribute('data-tab'));
        });
    });

    // Inputs de Cálculo para cálculo automático
    const inputs = [elementos.tarifaInput, elementos.minutosInput, elementos.distanciaInput];
    inputs.forEach(input => {
        if (input) {
            input.addEventListener('input', iniciarCalculoAutomatico);
        }
    });

    // Botones de acción de viaje
    if (elementos.aceptarViajeBtn) {
        elementos.aceptarViajeBtn.addEventListener('click', () => agregarHistorial('Aceptado'));
    }
    if (elementos.rechazarViajeBtn) {
        elementos.rechazarViajeBtn.addEventListener('click', () => agregarHistorial('Rechazado'));
    }
    if (elementos.aceptarViajeTabBtn) {
        elementos.aceptarViajeTabBtn.addEventListener('click', () => agregarHistorial('Aceptado'));
    }
    if (elementos.rechazarViajeTabBtn) {
        elementos.rechazarViajeTabBtn.addEventListener('click', () => agregarHistorial('Rechazado'));
    }
    
    // Botones de historial
    if (elementos.clearHistoryBtn) {
        elementos.clearHistoryBtn.addEventListener('click', limpiarHistorial);
    }
    if (elementos.exportarHistorialBtn) {
        elementos.exportarHistorialBtn.addEventListener('click', exportarHistorial);
    }

    // Botones de Perfil
    if (elementos.nuevoPerfilBtn) {
        elementos.nuevoPerfilBtn.addEventListener('click', () => mostrarConfigPerfil());
    }
    if (elementos.perfilForm) {
        elementos.perfilForm.addEventListener('submit', guardarPerfil);
    }
    if (elementos.volverPerfilesBtn) {
        elementos.volverPerfilesBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    }
    if (elementos.cancelarPerfilBtn) {
        elementos.cancelarPerfilBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    }
    if (elementos.cambiarPerfilBtn) {
        elementos.cambiarPerfilBtn.addEventListener('click', () => mostrarPantalla('perfil'));
    }

    // Exportar Modal
    const exportCSVBtn = document.getElementById('exportar-csv');
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', generarCSV);
    if (elementos.exportarPdfBtn) elementos.exportarPdfBtn.addEventListener('click', generarPDF);

    // Configuración de perfil: actualizar unidades al cambiar el selector
    document.getElementById('tipo-medida')?.addEventListener('change', actualizarUnidades);
    
    // Botones de Sync Panel
    const syncInfoBtn = document.getElementById('sync-info-btn');
    if (syncInfoBtn) syncInfoBtn.addEventListener('click', mostrarPanelSync);
    
    // Botones del panel de sincronización
    document.getElementById('sync-panel-close-btn')?.addEventListener('click', cerrarSyncPanel);
    document.getElementById('forzar-sincronizacion-btn')?.addEventListener('click', forzarSincronizacion);
    document.getElementById('forzar-sincronizacion-completa-btn')?.addEventListener('click', forzarSincronizacionCompleta);
    document.getElementById('cambiar-usuario-btn')?.addEventListener('click', cambiarUsuario);
    document.getElementById('user-code-connect-btn')?.addEventListener('click', setUserCode);
    document.getElementById('user-code-generate-btn')?.addEventListener('click', generateUserCode);
    
    // Cerrar modales al hacer clic fuera
    window.addEventListener('click', function(event) {
        // Asumiendo que el modal de código ya se maneja con show/hideUserCodeModal
        const userCodeModal = document.getElementById('user-code-modal');
        if (event.target === elementos.modalFondo) {
            cerrarModal();
        }
        if (event.target === elementos.exportModal) {
            cerrarExportModal();
        }
        if (event.target === elementos.syncPanel) {
            cerrarSyncPanel();
        }
        // Evitar que el modal de código se cierre al click fuera si está visible
        if (userCodeModal && event.target === userCodeModal && userCodeModal.style.display === 'flex') {
            // No hacer nada, se maneja con el botón 'Conectar' o 'Generar'
        }
    });

    console.log('✅ Eventos DOM inicializados');
}


async function inicializarAplicacion() {
    console.log('🚀 Inicializando aplicación...');

    // 1. Inicializar sistema de código
    const hasUserCode = await initializeUserCodeSystem();
    
    // 2. Inicializar Firebase Sync
    firebaseSync = new FirebaseSync();
    
    let firebaseReady = false;
    if (hasUserCode) {
        firebaseReady = await initializeFirebaseSyncWithRetry();
    }
    
    // 3. Cargar datos (local o Firebase)
    await cargarDatos();

    // 4. Establecer perfil actual si es la primera carga
    if (perfiles.length > 0 && !perfilActual) {
        const lastUsedId = localStorage.getItem('ubercalc_perfil_actual_id');
        perfilActual = perfiles.find(p => p.id === lastUsedId) || perfiles[0];
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
    }
    
    // 5. Inicializar interfaz
    inicializarEventos();
    actualizarUnidades();
    actualizarInterfazPerfiles();
    
    // 6. Decidir qué pantalla mostrar
    if (!hasUserCode) {
        // Ya está mostrando el modal de código
        console.log('💻 Esperando código de usuario...');
    } else if (perfiles.length === 0) {
        mostrarPantalla('perfil'); // Forzar a crear perfil
        mostrarStatus('Crea tu primer perfil para comenzar', 'info');
    } else {
        mostrarPantalla('main');
        cambiarPestana('calculo'); // Mostrar pestaña de cálculo por defecto
        if (perfilActual) {
            mostrarStatus(`Bienvenido, ${perfilActual.nombre}!`, 'info');
        }
    }
    
    // 7. Configurar listeners de Firebase (solo si está listo)
    if (firebaseReady) {
        console.log('👂 Configurando listener en tiempo real...');
        firebaseSync.unsubscribe = firebaseSync.listenForChanges(handleFirebaseChange);
        actualizarPanelSync();
    } else if (hasUserCode) {
        mostrarError('Error al conectar con Firebase. Intentando solo modo local.');
    }

    console.log('🎉 Aplicación inicializada.');
}

// Función auxiliar para reintentar la inicialización de Firebase
async function initializeFirebaseSyncWithRetry(retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        const success = await firebaseSync.initialize();
        if (success) return true;
        console.warn(`Intento ${i + 1}/${retries} fallido. Reintentando en ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    console.error('❌ Falló la inicialización de Firebase después de varios reintentos.');
    return false;
}

// Handler para cambios en tiempo real de Firebase
function handleFirebaseChange(change) {
    console.log(`☁️ Cambio detectado en Firebase: ${change.type}`);
    
    let shouldUpdateUI = false;

    if (change.type === 'profiles') {
        // Sincronizar perfiles locales con los de la nube
        perfiles = change.data;
        repararPerfilesCorruptos();
        actualizarInterfazPerfiles();
        actualizarHeader();
        shouldUpdateUI = true;
    } else if (change.type === 'trips') {
        // Sincronizar viajes locales con los de la nube
        historial = change.data;
        shouldUpdateUI = true;
    }

    if (shouldUpdateUI) {
        actualizarHistorial();
        actualizarEstadisticas();
        actualizarPanelSync();
        mostrarStatus('Datos actualizados desde la nube en tiempo real.', 'info');
        // También guardar en local para persistencia inmediata
        localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
        localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
    }
}


// =============================================
// PUNTO DE ENTRADA
// =============================================

// Iniciar la aplicación cuando el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', inicializarAplicacion);


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
        cerrarModal();
    }
    if (event.target === elementos.exportModal) {
        cerrarExportModal();
    }
    if (event.target === elementos.syncPanel) {
        cerrarSyncPanel();
    }
});
