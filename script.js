// =============================================
// UBER CALC - Calculadora Inteligente para Conductores
// Versión con Sistema de Código de Usuario para Multi-Dispositivo
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

// =============================================
// ELEMENTOS DOM - AQUÍ VAN LOS ELEMENTOS
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
// PERSISTENCIA DE DATOS (ACTUALIZADA PARA FIREBASE)
// =============================================

async function guardarDatos() {
    console.log('💾 Guardando datos en local storage...');
    
    // Guardar en LocalStorage (Caché y fallback)
    localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
    localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
    if (perfilActual) {
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
    }

    // Sincronizar con Firebase
    if (firebaseSync && firebaseSync.initialized === true) {
        console.log('☁️ Sincronizando datos con Firebase...');
        
        try {
            // 1. Sincronizar Perfiles
            await firebaseSync.saveProfiles(perfiles);
            console.log('✅ Perfiles guardados en Firebase');
            
            // 2. Sincronizar Historial
            await firebaseSync.saveHistory(historial);
            console.log('✅ Historial guardado en Firebase');
            
            // 3. Actualizar última sincronización
            firebaseSync.lastSyncTime = new Date().toISOString();
            
        } catch (error) {
            console.warn('⚠️ Error al sincronizar datos:', error);
        }

    } else {
        console.warn('⚠️ Firebase Sync no inicializado o no disponible. Solo se guarda en local.');
    }
}

/**
 * Carga los datos, dando prioridad a Firebase (Nube) si el usuario tiene un código asociado.
 * Solo usa LocalStorage como respaldo o si no hay código de usuario.
 */
async function cargarDatos() {
    console.log('🔄 Cargando datos (local y nube)...');
    let cloudPerfiles = null;
    let cloudHistorial = null;

    // 1. Intentar cargar desde Firebase (PRIORIDAD)
    if (window.firebaseSync && firebaseSync.initialized) {
        try {
            console.log('☁️ Intentando cargar perfiles desde Firebase...');
            cloudPerfiles = await firebaseSync.loadProfiles(); 
            
            if (cloudPerfiles && cloudPerfiles.length > 0) {
                console.log('✅ Perfiles cargados de Firebase:', cloudPerfiles.length);
                perfiles = cloudPerfiles;
            }

            // ✅ Cargar historial desde Firebase
            console.log('☁️ Intentando cargar historial desde Firebase...');
            cloudHistorial = await firebaseSync.loadHistory();
            
            if (cloudHistorial && cloudHistorial.length > 0) {
    // 🔁 Fusionar sin duplicar
    const combinados = [...historial, ...cloudHistorial];
    historial = combinados.filter(
        (v, i, self) =>
            i === self.findIndex((t) =>
                t.timestamp === v.timestamp && t.tarifa === v.tarifa && t.minutos === v.minutos
            )
    );
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
    
    // 3. REPARAR PERFILES CORRUPTOS - NUEVO PASO
    repararPerfilesCorruptos();
    
    console.log(`✅ Carga de datos finalizada. Perfiles: ${perfiles.length}, Historial: ${historial.length}, PerfilActual: ${perfilActual ? perfilActual.nombre : 'null'}`);
}

async function initializeUserCodeSystem() {
    console.log('🔐 Inicializando sistema de código de usuario...');
    
    // Verificar si ya hay un código guardado
    const savedCode = localStorage.getItem('ubercalc_user_code');
    
    if (savedCode) {
        userCodeSystem.userCode = savedCode;
        userCodeSystem.userId = 'user_' + savedCode;
        userCodeSystem.initialized = true;
        
        console.log('✅ Código de usuario cargado:', userCodeSystem.userCode);
        
        // IMPORTANTE: Ocultar el modal aunque haya código
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
    console.log('✅ Firebase Sync inicializado, cargando datos existentes...');
    await cargarDatos(); // carga desde Firebase si hay algo

    if (perfiles.length === 0) {
        mostrarPantalla('config-perfil'); // no hay perfiles, crea uno
        mostrarStatus('Crea tu primer perfil para comenzar', 'info');
    } else {
        mostrarPantalla('perfil');
    }
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

function debugUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    console.log('🔍 DEBUG Modal de código:');
    console.log(' - Elemento encontrado:', !!modal);
    if (modal) {
        console.log(' - display CSS:', modal.style.display);
        console.log(' - inline style:', modal.getAttribute('style'));
        console.log(' - computed display:', window.getComputedStyle(modal).display);
    }
    
    // Probar ocultar modal
    hideUserCodeModal();
    
    // Verificar después de ocultar
    setTimeout(() => {
        const modalAfter = document.getElementById('user-code-modal');
        console.log('🔍 DESPUÉS de hideUserCodeModal:');
        console.log(' - display CSS:', modalAfter.style.display);
        console.log(' - computed display:', window.getComputedStyle(modalAfter).display);
    }, 100);
}

// =============================================
// CLASE FIREBASE SYNC (REEMPLAZA GOOGLE SYNC)
// =============================================

class FirebaseSync {
    constructor() {
        this.initialized = false;
        this.userId = null;
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.initializing = false;
        this.db = null;
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
            console.log('📡 Inicializando Firebase Sync...');
            
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
            
            console.log('✅ Firebase Sync inicializado CORRECTAMENTE');
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
        // Usar el userId del sistema de código
        if (userCodeSystem.initialized && userCodeSystem.userId) {
            console.log('🔗 Usando userId del sistema de código:', userCodeSystem.userId);
            return userCodeSystem.userId;
        }
        
        // Fallback al sistema antiguo solo si es necesario
        let userId = localStorage.getItem('ubercalc_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('ubercalc_user_id', userId);
            console.log('🆕 Nuevo User ID generado (fallback):', userId);
        }
        return userId;
    }

    // Métodos para perfiles
    async saveProfiles(profiles) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede guardar');
            return false;
        }

        try {
            console.log('💾 Guardando perfiles en Firebase...', profiles.length);
            
            const userDocRef = this.db.collection('users').doc(this.userId);
            await userDocRef.set({
                profiles: profiles,
                lastSync: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.lastSyncTime = new Date().toISOString();
            console.log('✅ Perfiles guardados en Firebase correctamente');
            this.actualizarUIEstado('syncing');
            
            setTimeout(() => {
                this.actualizarUIEstado('connected');
            }, 2000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando en Firebase:', error);
            this.actualizarUIEstado('error');
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede cargar');
            return null;
        }

        try {
            console.log('📥 Cargando perfiles desde Firebase...');
            
            const userDocRef = this.db.collection('users').doc(this.userId);
            const doc = await userDocRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                this.lastSyncTime = data.lastSync?.toDate().toISOString() || new Date().toISOString();
                console.log('✅ Perfiles cargados desde Firebase:', data.profiles?.length || 0);
                this.actualizarUIEstado('connected');
                return data.profiles || [];
            } else {
                console.log('📭 No se encontraron perfiles en Firebase para este usuario');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando desde Firebase:', error);
            this.actualizarUIEstado('error');
            return null;
        }
    }

    // Métodos para historial
    async saveHistory(history) {
        if (!perfilActual || !perfilActual.id) {
    console.warn("⚠️ No hay perfil actual definido, no se puede guardar historial.");
    return false;
}

         try {
const historyRef = this.db
  .collection('users')
  .doc(this.userId)
  .collection('histories')
  .doc(perfilActual.id);

await historyRef.set({
    history: history,
    perfilNombre: perfilActual.nombre,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
}, { merge: true });
            
            this.lastSyncTime = new Date().toISOString();
            console.log('✅ Historial guardado en Firebase correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando historial en Firebase:', error);
            return false;
        }
    }

    async loadHistory() {
    if (!this.initialized) {
        console.warn('❌ Firebase Sync no inicializado, no se puede cargar historial');
        return [];
    }

    try {
        if (!perfilActual || !perfilActual.id) {
            console.warn("⚠️ No hay perfil actual definido, no se puede cargar historial.");
            return [];
        }

        console.log(`📥 Cargando historial desde Firebase para el perfil: ${perfilActual.nombre}`);

        const historyRef = this.db
            .collection('users')
            .doc(this.userId)
            .collection('histories')
            .doc(perfilActual.id);

        const doc = await historyRef.get();

        if (doc.exists) {
            const data = doc.data();
            console.log(`✅ Historial cargado (${(data.history || []).length} viajes)`);
            return data.history || [];
        } else {
            console.log(`📭 Sin historial previo para el perfil: ${perfilActual.nombre}`);
            return [];
        }
    } catch (error) {
        console.error('❌ Error cargando historial desde Firebase:', error);
        return [];
    }
}

            
    // Sincronización completa
    async syncProfiles(profiles) {
        if (!this.initialized) return { success: false, message: 'Sync no inicializado.' };

        this.syncInProgress = true;
        this.actualizarUIEstado('syncing');

        try {
            // Guardar perfiles en Firebase
            await this.saveProfiles(profiles);
            
            // Cargar perfiles actualizados (en caso de conflictos)
            const cloudProfiles = await this.loadProfiles();
            
            this.actualizarUIEstado('connected');
            console.log('✅ Sincronización completada');
                
            return {
                success: true,
                mergedProfiles: cloudProfiles || profiles,
                message: 'Sincronización exitosa'
            };

        } catch (error) {
            console.error('❌ Error en syncProfiles:', error);
            this.actualizarUIEstado('error');
            return { success: false, message: error.message };
        } finally {
            this.syncInProgress = false;
        }
    }

    async getSyncStatus() {
    if (!this.initialized) return 'not_configured';

    try {
        const userDocRef = this.db.collection('users').doc(this.userId);
        const doc = await userDocRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            return {
                status: 'connected',
                lastSync: data.lastSync?.toDate?.()?.toISOString() || data.lastSync || this.lastSyncTime,
                profilesCount: data.profiles?.length || 0,
                historyCount: data.history?.length || 0
            };
        } else {
            return {
                status: 'no_data',
                lastSync: null,
                profilesCount: 0,
                historyCount: 0
            };
        }
    } catch (error) {
        console.error('❌ Error obteniendo estado de sync:', error);
        return {
            status: 'error',
            lastSync: null,
            profilesCount: 0,
            historyCount: 0
        };
    }
}

    // Escuchar cambios en tiempo real
 listenForChanges(callback) {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede escuchar cambios');
            return null;
        }

        try {
            const userDocRef = this.db.collection('users').doc(this.userId);
            console.log('👂 Escuchando cambios en tiempo real para:', this.userId);
            
            return userDocRef.onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    console.log('🔄 Cambios detectados en Firebase:', {
                        perfiles: data.profiles?.length || 0,
                        historial: data.history?.length || 0
                    });
                    
                    // Ejecutar callback con los nuevos datos
                    callback(data);
                }
            }, (error) => {
                console.error('❌ Error escuchando cambios:', error);
            });
            
        } catch (error) {
            console.error('❌ Error configurando listener:', error);
            return null;
        }
    }

    // Sincronizar datos desde Firebase (para usar cuando se detecten cambios)
    async syncFromFirebase() {
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado');
            return false;
        }

        try {
            console.log('🔄 Sincronizando datos desde Firebase...');
            
            // Cargar perfiles
            const cloudProfiles = await this.loadProfiles();
            if (cloudProfiles && cloudProfiles.length > 0) {
                console.log('✅ Perfiles sincronizados desde Firebase:', cloudProfiles.length);
                perfiles = cloudProfiles;
            }
            
            // Cargar historial
            const cloudHistory = await this.loadHistory();
            if (cloudHistory && cloudHistory.length > 0) {
                console.log('✅ Historial sincronizado desde Firebase:', cloudHistory.length);
                historial = cloudHistory;
            }
            
            // Actualizar perfil actual si es necesario
            if (perfiles.length > 0 && !perfilActual) {
                perfilActual = perfiles[0];
                localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
            }
            
            // Guardar localmente
            guardarDatos();
            
            // Actualizar interfaz
            actualizarInterfazPerfiles();
            actualizarHistorial();
            actualizarEstadisticas();
            
            console.log('✅ Sincronización desde Firebase completada');
            return true;
            
        } catch (error) {
            console.error('❌ Error en syncFromFirebase:', error);
            return false;
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
// FUNCIÓN DE REINTENTO PARA FIREBASE SYNC
// =============================================

/**
 * ✅ NUEVA FUNCIÓN: Inicializa Firebase Sync con reintentos automáticos
 */
async function initializeFirebaseSyncWithRetry(maxRetries = 3) {
    console.log('🔄 Inicializando Firebase Sync con reintentos...');
    firebaseSync = new FirebaseSync();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Intento ${attempt}/${maxRetries} de inicializar Firebase Sync...`);
            const success = await firebaseSync.initialize();
            
            if (success) {
                console.log('✅ Firebase Sync inicializado correctamente');
                return true;
            }
        } catch (error) {
            console.warn(`⚠️ Error en intento ${attempt}:`, error.message);
        }
        
        if (attempt < maxRetries) {
            console.log('⏳ Esperando 2 segundos antes de reintentar...');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    console.error('❌ No se pudo inicializar Firebase Sync después de', maxRetries, 'intentos');
    return false;
}

// --- Inicialización MEJORADA ---
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando UberCalc con Sistema de Código y Firebase...');
    inicializarApp();
    configurarEventListeners();
});

// Agregar event listener para Enter
document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('user-code-input');
    if (input) {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                setUserCode();
            }
        });
    }
});

async function inicializarApp() {
    console.log('📡 Inicializando UberCalc con Sistema de Código y Firebase...');
    
    try {
        // 1. PRIMERO: Inicializar sistema de código de usuario
        const userCodeInitialized = await initializeUserCodeSystem();
        
        if (!userCodeInitialized) {
            console.log('⏳ Esperando que el usuario ingrese código...');
            return; // Salir aquí si no hay código
        }
        
        // 2. LUEGO: Inicializar Firebase Sync con reintentos
        console.log('🔄 Inicializando Firebase Sync para el usuario...');
        const firebaseReady = await initializeFirebaseSyncWithRetry();
        
        if (firebaseReady) {
            console.log('✅ Firebase Sync inicializado, cargando datos...');
            await cargarDatos();
            
            // ✅ ESCUCHA EN TIEMPO REAL MEJORADA - CORREGIDO
            console.log('👂 Iniciando escucha en tiempo real...');
            
            // AÑADIR TRY-CATCH PARA LA ESCUCHA EN TIEMPO REAL
            try {
                firebaseSync.unsubscribe = firebaseSync.listenForChanges((data) => {
                    console.log('🔄 Datos actualizados desde la nube:', {
                        perfiles: data.profiles?.length || 0,
                        historial: data.history?.length || 0
                    });
                    
                    // Aplicar cambios solo si son diferentes
                    if (data.profiles && JSON.stringify(data.profiles) !== JSON.stringify(perfiles)) {
                        console.log('✅ Actualizando perfiles desde la nube');
                        perfiles = data.profiles;
                        
                        // Actualizar perfil actual
                        if (perfiles.length > 0) {
                            const currentProfileId = localStorage.getItem('ubercalc_perfil_actual_id');
                            perfilActual = perfiles.find(p => p.id === currentProfileId) || perfiles[0];
                            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
                        }
                    }
                    
                    if (data.history && JSON.stringify(data.history) !== JSON.stringify(historial)) {
                        console.log('✅ Actualizando historial desde la nube');
                        historial = data.history;
                    }
                    
                    // Guardar en localStorage
                    localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
                    localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
                    
                    // Actualizar interfaz
                    actualizarInterfazPerfiles();
                    actualizarHistorial();
                    actualizarEstadisticas();
                    
                    mostrarStatus('Datos actualizados', 'info');
                });
            } catch (error) {
                console.error('❌ Error iniciando escucha en tiempo real:', error);
            }
            // ✅ FIN DEL BLOQUE TRY-CATCH CORREGIDO
            
        } else {
            console.log('📱 Firebase Sync no disponible, usando almacenamiento local');
            await cargarDatos();
        }
        
        aplicarTemaGuardado();
        
        // 3. VERIFICAR que tenemos un perfil actual válido
       const perfilIdGuardado = localStorage.getItem('ubercalc_perfil_actual_id');
if (perfilIdGuardado && perfiles.some(p => p.id === perfilIdGuardado)) {
    perfilActual = perfiles.find(p => p.id === perfilIdGuardado);
} else if (perfiles.length > 0) {
    perfilActual = perfiles[0];
    localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
}
        
        actualizarInterfazPerfiles();
        
        // 4. DECIDIR qué pantalla mostrar - LÓGICA SIMPLIFICADA
        // SIEMPRE mostrar pantalla de perfiles si no hay perfiles
        if (!perfiles || perfiles.length === 0) {
    console.log('👤 Sin perfiles, mostrando pantalla de creación de perfil...');
    mostrarPantalla('config-perfil'); // 🔁 antes era 'perfil'
    mostrarStatus('👋 ¡Crea tu primer perfil para comenzar!', 'info');
    return; // evita que siga al main
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
        
        console.log('🎉 UberCalc con Sistema de Código y Firebase inicializado correctamente');
        
    } catch (error) {
        console.error('❌ Error crítico en inicialización:', error);
        // Mostrar pantalla de perfiles como fallback
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
    elementos.tarifaInput.addEventListener('input', manejarCalculoAutomatico);
    elementos.minutosInput.addEventListener('input', manejarCalculoAutomatico);
    elementos.distanciaInput.addEventListener('input', manejarCalculoAutomatico);
    
    // Botones de Acción
    elementos.aceptarViajeBtn.addEventListener('click', function() {
        console.log('✅ Botón aceptar viaje clickeado');
        procesarViaje(true);
    });
    
    elementos.rechazarViajeBtn.addEventListener('click', function() {
        console.log('❌ Botón rechazar viaje clickeado');
        procesarViaje(false);
    });
    
    elementos.aceptarViajeTabBtn.addEventListener('click', function() {
        console.log('✅ Botón aceptar viaje (tab) clickeado');
        procesarViaje(true);
    });
    
    elementos.rechazarViajeTabBtn.addEventListener('click', function() {
        console.log('❌ Botón rechazar viaje (tab) clickeado');
        procesarViaje(false);
    });
    
    // Historial
    elementos.clearHistoryBtn.addEventListener('click', limpiarHistorial);
    elementos.exportarHistorialBtn.addEventListener('click', mostrarModalExportacion);
    
    // Perfiles
   elementos.nuevoPerfilBtn.addEventListener('click', function() {
    console.log('➕ Creando nuevo perfil');
    mostrarConfigPerfil(); // Sin parámetros = nuevo perfil
});

elementos.volverPerfilesBtn.addEventListener('click', function() {
    console.log('⬅️ Volviendo a perfiles');
    mostrarPantalla('perfil');
});

elementos.cancelarPerfilBtn.addEventListener('click', function() {
    console.log('❌ Cancelando creación/edición de perfil');
    mostrarPantalla('perfil');
});

elementos.perfilForm.addEventListener('submit', guardarPerfil);
    
    // Tema
    elementos.themeToggle.addEventListener('click', alternarTema);
    
    // Exportación
    elementos.exportarPdfBtn.addEventListener('click', exportarPDF);
    
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
    
    console.log('✅ Event listeners configurados correctamente');
}

// --- Sistema de Pestañas ---
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

// --- Cálculo Automático ---
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

function procesarViaje(aceptado) {
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
    
    console.log('💾 Guardando viaje en historial:', {
        id: viaje.id,
        aceptado: viaje.aceptado,
        rentabilidad: viaje.rentabilidad,
        perfil: viaje.perfilNombre
    });
    
    // Agregar al historial
    historial.unshift(viaje);
    
    // Limitar historial a 100 elementos
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    // Mostrar resultado en modal
    mostrarResultadoModal(viaje);
    
    // ✅ GUARDAR DATOS Y SINCRONIZAR INMEDIATAMENTE
    guardarDatos().then(() => {
        console.log('✅ Datos guardados correctamente después del viaje');
        mostrarStatus(aceptado ? '¡Viaje aceptado y guardado!' : 'Viaje rechazado y guardado', 'success');
    }).catch(error => {
        console.error('❌ Error guardando datos:', error);
        mostrarStatus('Error al guardar el viaje', 'error');
    });
    
    // Actualizar interfaz
    actualizarEstadisticas();
    actualizarHistorial();
    guardarDatos();

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

function limpiarFormulario() {
    console.log('🧹 Limpiando formulario');
    
    elementos.tarifaInput.value = '';
    elementos.minutosInput.value = '';
    elementos.distanciaInput.value = '';
    
    elementos.resultadoRapido.classList.add('hidden');
    elementos.autoCalcIndicator.classList.add('hidden');
    
    calculoActual = null;
}

// --- Gestión de Perfiles ---
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

function guardarPerfil(event) {
    event.preventDefault();
    console.log('💾 Guardando perfil...');
    
    const formData = new FormData(elementos.perfilForm);
    const perfilId = formData.get('perfil-id') || 'perfil_' + Date.now();
    
    // OBTENER VALORES CORRECTAMENTE - CORREGIDO
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
    
    // Si es el primer perfil o no hay perfil actual, establecer como actual
    if (!perfilActual || perfiles.length === 1) {
        perfilActual = perfilData;
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        console.log('✅ Perfil establecido como actual:', perfilActual.nombre);
    }
    
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

function eliminarPerfil(perfilId) {
    console.log('🗑️ Eliminando perfil:', perfilId);
    
    if (perfiles.length <= 1) {
        mostrarStatus('No puedes eliminar el único perfil', 'error');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar este perfil?')) {
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

// --- Historial y Estadísticas ---
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

function limpiarHistorial() {
    console.log('🗑️ Limpiando historial');
    
    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        historial = [];
        guardarDatos();
        actualizarHistorial();
        actualizarEstadisticas();
        mostrarStatus('Historial limpiado', 'success');
    }
}

// --- Exportación ---
function mostrarModalExportacion() {
    console.log('📤 Mostrando modal de exportación');
    elementos.exportModal.style.display = 'block';
}

function cerrarModalExportacion() {
    elementos.exportModal.style.display = 'none';
}

function exportarPDF() {
    console.log('📄 Exportando a PDF');
    
    if (historial.length === 0) {
        mostrarStatus('No hay datos para exportar', 'error');
        return;
    }
    
    mostrarStatus('Exportando PDF...', 'info');
    
    // Implementación básica de exportación
    const viajesAceptados = historial.filter(v => v.aceptado === true);
    const totalGanancia = viajesAceptados.reduce((sum, v) => sum + v.tarifa, 0);
    
    const contenido = `
        REPORTE UBERCALC
        ================
        
        Perfil: ${perfilActual?.nombre || 'N/A'}
        Fecha: ${new Date().toLocaleDateString()}
        
        ESTADÍSTICAS:
        - Total viajes: ${historial.length}
        - Viajes aceptados: ${viajesAceptados.length}
        - Ganancia total: ${totalGanancia.toFixed(2)} ${perfilActual?.moneda || '$'}
        
        HISTORIAL:
        ${historial.map((v, i) => `
        ${i + 1}. ${v.descripcion} | ${v.tarifa.toFixed(2)} ${perfilActual?.moneda || '$'} | ${v.minutos} min | ${v.aceptado ? 'Aceptado' : 'Rechazado'}
        `).join('')}
    `;
    
    // Crear y descargar archivo
    const blob = new Blob([contenido], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ubercalc-reporte-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    cerrarModalExportacion();
    mostrarStatus('Reporte exportado', 'success');
}

// --- Sistema de Tema ---
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

// --- Navegación entre Pantallas ---
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
            // SOLUCIÓN: Verificar que perfilActual existe antes de intentar usarlo
            if (perfilActual) {
                const perfilNombreElement = document.getElementById('perfil-actual-nombre');
                if (perfilNombreElement) {
                    perfilNombreElement.textContent = perfilActual.nombre;
                }
            }
            break;
    }
}

// --- Sistema de Unidades ---
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

// --- Sistema de Notificaciones ---
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

// --- Sincronización ---
async function actualizarPanelSync() {
    console.log('🔄 Actualizando panel de sincronización');
    
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
                                    deviceInfo.type === 'tablet' ? '📟' : '💻';
        }
        
        // Obtener estado de sincronización
        const syncStatus = await firebaseSync.getSyncStatus();
        console.log('📊 Estado de sync para panel:', syncStatus);
        
        // Actualizar estado de Firebase
        const firebaseStatus = document.getElementById('firebase-status');
        const lastSyncTime = document.getElementById('last-sync-time');
        const cloudProfilesCount = document.getElementById('cloud-profiles-count');
        const cloudHistoryCount = document.getElementById('cloud-history-count');
        
        if (firebaseSync.initialized) {
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Conectado';
                firebaseStatus.style.color = 'var(--success-green)';
            }
            
            if (lastSyncTime) {
                if (syncStatus.lastSync) {
                    const lastSyncDate = new Date(syncStatus.lastSync);
                    lastSyncTime.textContent = lastSyncDate.toLocaleTimeString();
                } else if (firebaseSync.lastSyncTime) {
                    const lastSyncDate = new Date(firebaseSync.lastSyncTime);
                    lastSyncTime.textContent = lastSyncDate.toLocaleTimeString();
                } else {
                    lastSyncTime.textContent = 'Nunca';
                }
            }
            
            if (cloudProfilesCount) {
                cloudProfilesCount.textContent = syncStatus.profilesCount || '0';
            }
            
            if (cloudHistoryCount) {
                cloudHistoryCount.textContent = syncStatus.historyCount || '0';
            }
            
            // Actualizar badge del panel
            const syncPanelStatus = document.getElementById('sync-panel-status');
            if (syncPanelStatus) {
                syncPanelStatus.innerHTML = '<span class="sync-icon">✅</span><span>Conectado</span>';
                syncPanelStatus.style.background = '#d4edda';
                syncPanelStatus.style.color = '#155724';
            }
            
        } else {
            actualizarPanelSyncUI('error');
        }
        
    } catch (error) {
        console.error('❌ Error actualizando panel sync:', error);
        actualizarPanelSyncUI('error');
    }
}

function actualizarPanelSyncUI(estado) {
    const firebaseStatus = document.getElementById('firebase-status');
    const lastSyncTime = document.getElementById('last-sync-time');
    const cloudProfilesCount = document.getElementById('cloud-profiles-count');
    const cloudHistoryCount = document.getElementById('cloud-history-count');
    const syncPanelStatus = document.getElementById('sync-panel-status');
    
    switch(estado) {
        case 'connected':
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Conectado';
                firebaseStatus.style.color = 'var(--success-green)';
            }
            if (syncPanelStatus) {
                syncPanelStatus.innerHTML = '<span class="sync-icon">✅</span><span>Conectado</span>';
                syncPanelStatus.style.background = '#d4edda';
                syncPanelStatus.style.color = '#155724';
            }
            break;
            
        case 'error':
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Error';
                firebaseStatus.style.color = 'var(--error-red)';
            }
            if (lastSyncTime) lastSyncTime.textContent = '--';
            if (cloudProfilesCount) cloudProfilesCount.textContent = '--';
            if (cloudHistoryCount) cloudHistoryCount.textContent = '--';
            if (syncPanelStatus) {
                syncPanelStatus.innerHTML = '<span class="sync-icon">❌</span><span>Error</span>';
                syncPanelStatus.style.background = '#f8d7da';
                syncPanelStatus.style.color = '#721c24';
            }
            break;
            
        default: // disconnected
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Desconectado';
                firebaseStatus.style.color = 'var(--error-red)';
            }
            if (lastSyncTime) lastSyncTime.textContent = '--';
            if (cloudProfilesCount) cloudProfilesCount.textContent = '--';
            if (cloudHistoryCount) cloudHistoryCount.textContent = '--';
            if (syncPanelStatus) {
                syncPanelStatus.innerHTML = '<span class="sync-icon">🌐</span><span>Conectando...</span>';
                syncPanelStatus.style.background = '#e2e3e5';
                syncPanelStatus.style.color = '#383d41';
            }
    }
}

// --- Utilidades Adicionales ---
function formatearMoneda(monto, moneda = 'USD') {
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: moneda
    }).format(monto);
}

function formatearTiempo(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    
    if (horas > 0) {
        return `${horas}h ${mins}m`;
    }
    return `${mins}m`;
}

// Cerrar modales al hacer clic fuera
window.addEventListener('click', function(event) {
    if (event.target === elementos.modalFondo) {
        ocultarModales();
    }
    if (event.target === elementos.exportModal) {
        cerrarModalExportacion();
    }
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
window.debugUserCodeModal = debugUserCodeModal;
window.cambiarUsuario = cambiarUsuario;

// Funciones de perfil
window.guardarPerfil = guardarPerfil;

// Funciones básicas
window.cambiarPestana = cambiarPestana;

// =============================================
// FUNCIONES DE SINCRONIZACIÓN (AÑADIR ESTAS)
// =============================================

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
    
    const syncResult = await firebaseSync.syncProfiles(perfiles);

    if (syncResult && syncResult.success) {
        const newProfiles = syncResult.mergedProfiles || perfiles;
        perfiles = Array.isArray(newProfiles) ? newProfiles : perfiles;

        guardarDatos();
        actualizarInterfazPerfiles();
        mostrarStatus('✅ Sincronización completada', 'success');
        actualizarPanelSync();
    } else {
        mostrarError('❌ Error en la sincronización');
    }
}

function mostrarInfoSync() {
    alert(`🌐 SINCRONIZACIÓN CON FIREBASE

✅ Cómo funciona:
1. Tus perfiles se guardan automáticamente en Firebase
2. Todos tus dispositivos acceden a los mismos perfiles
3. Los cambios se sincronizan automáticamente
4. Tus datos están seguros en tu base de datos de Firebase

📱 Dispositivos conectados: Todos los que usen tu mismo código

💡 Características:
• Sincronización en tiempo real
• Resolución automática de conflictos
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

        console.log('3. Probando obtener historial...');
        mostrarStatus('3. Probando obtener historial...', 'info');
        
        const historialCloud = await firebaseSync.loadHistory();
        console.log('✅ Obtención de historial OK:', historialCloud?.length || 0);

        console.log('4. Probando guardar perfiles...');
        mostrarStatus('4. Probando guardar perfiles...', 'info');
        
        let saveProfilesResult = false;
        if (perfilesCloud && perfilesCloud.length > 0) {
            saveProfilesResult = await firebaseSync.saveProfiles(perfilesCloud);
        } else {
            saveProfilesResult = await firebaseSync.saveProfiles([]);
        }
        console.log('✅ Guardado de perfiles OK:', saveProfilesResult);

        console.log('5. Probando guardar historial...');
        mostrarStatus('5. Probando guardar historial...', 'info');
        
        let saveHistoryResult = false;
        if (historialCloud && historialCloud.length > 0) {
            saveHistoryResult = await firebaseSync.saveHistory(historialCloud);
        } else {
            saveHistoryResult = await firebaseSync.saveHistory([]);
        }
        console.log('✅ Guardado de historial OK:', saveHistoryResult);

        console.log('6. Probando sincronización completa...');
        mostrarStatus('6. Probando sincronización completa...', 'info');
        
        const syncResult = await firebaseSync.syncProfiles(perfiles || []);
        const syncSuccess = syncResult && syncResult.success;
        console.log('✅ Sincronización OK:', syncSuccess ? 'Éxito' : 'Falló');

        // Mostrar resumen
        const resumen = `
🎉 DIAGNÓSTICO COMPLETADO - RESULTADOS:

✅ Conexión: ${testResult ? 'OK' : 'FALLÓ'}
✅ Perfiles en nube: ${perfilesCloud?.length || 0}
✅ Historial en nube: ${historialCloud?.length || 0}
✅ Guardado perfiles: ${saveProfilesResult ? 'OK' : 'FALLÓ'}
✅ Guardado historial: ${saveHistoryResult ? 'OK' : 'FALLÓ'}
✅ Sincronización: ${syncSuccess ? 'OK' : 'FALLÓ'}

📊 Datos locales:
• Perfiles: ${perfiles.length}
• Historial: ${historial.length}
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

async function forzarSincronizacionCompleta() {
    if (!firebaseSync || !firebaseSync.initialized) {
        console.warn('❌ Firebase Sync no disponible para sincronización completa');
        return false;
    }
    
    try {
        console.log('🔄 Forzando sincronización completa...');
        
        // 1. Subir datos locales a Firebase
        await firebaseSync.saveProfiles(perfiles);
        await firebaseSync.saveHistory(historial);
        console.log('✅ Datos locales subidos a Firebase');
        
        // 2. Descargar datos más recientes de Firebase
        const cloudProfiles = await firebaseSync.loadProfiles();
        const cloudHistory = await firebaseSync.loadHistory();
        
        // 3. Resolver conflictos (usar los datos más recientes)
        if (cloudProfiles && cloudProfiles.length > 0) {
            perfiles = cloudProfiles;
            console.log('✅ Perfiles sincronizados:', perfiles.length);
        }
        
        if (cloudHistory && cloudHistory.length > 0) {
            historial = cloudHistory;
            console.log('✅ Historial sincronizado:', historial.length);
        }
        
        // 4. Actualizar interfaz
        actualizarInterfazPerfiles();
        actualizarHistorial();
        actualizarEstadisticas();
        
        // 5. Guardar localmente
        guardarDatos();
        
        console.log('✅ Sincronización completa exitosa');
        mostrarStatus('Sincronización completa exitosa', 'success');
        return true;
        
    } catch (error) {
        console.error('❌ Error en sincronización completa:', error);
        mostrarStatus('Error en sincronización', 'error');
        return false;
    }
}

// =============================================
// FUNCIÓN DE CONTROL DE SESIÓN
// =============================================

function cambiarUsuario() {
    console.log('🔄 Iniciando cambio de usuario...');
    
    if (confirm('¿Estás seguro de que quieres cambiar de usuario? Podrás volver a este usuario con el mismo código.')) {
        
        // 1. Cerrar todos los modales abiertos primero
        cerrarModal();
        cerrarExportModal();
        cerrarSyncPanel();
        
        // 2. ✅ CORREGIDO: NO borrar datos de Firebase, solo limpiar localStorage
        localStorage.removeItem('ubercalc_user_code');
        localStorage.removeItem('ubercalc_user_id');
        // NO borrar perfiles, historial ni perfil_actual_id
        
        // 3. Resetear el estado del sistema de código
        userCodeSystem.userCode = null;
        userCodeSystem.userId = null;
        userCodeSystem.initialized = false;
        
        // 4. Reiniciar Firebase Sync (pero NO borrar datos)
        if (firebaseSync) {
            // Detener la escucha en tiempo real primero
            if (firebaseSync.unsubscribe) {
                firebaseSync.unsubscribe();
            }
            firebaseSync.initialized = false;
            firebaseSync.userId = null;
            firebaseSync = null;
        }
        
        // 5. ✅ CORREGIDO: NO limpiar datos en memoria, mantenerlos
        // perfiles = []; ❌ NO hacer esto
        // historial = []; ❌ NO hacer esto
        // perfilActual = null; ❌ NO hacer esto
        
        calculoActual = null;
        
        // 6. Limpiar formularios
        limpiarFormulario();
        
        // 7. Ocultar banners
        const banner = document.getElementById('user-code-banner');
        const bannerMain = document.getElementById('user-code-banner-main');
        if (banner) banner.style.display = 'none';
        if (bannerMain) bannerMain.style.display = 'none';
        
        // 8. MOSTRAR MODAL DE CÓDIGO automáticamente
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
// INICIALIZACIÓN FINAL
// =============================================

console.log('🎉 UberCalc con Sistema de Código y Firebase cargado correctamente');


















