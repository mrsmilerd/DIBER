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
    if (window.firebaseSync && firebaseSync.initialized) {
        console.log('☁️ Sincronizando datos con Firebase...');
        
        try {
            // 1. Sincronizar Perfiles
            await firebaseSync.saveProfiles(perfiles);
            console.log('✅ Perfiles guardados en Firebase');
            
            // 2. Sincronizar Historial
            await firebaseSync.saveHistory(historial);
            console.log('✅ Historial guardado en Firebase');
            
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
                console.log('✅ Historial cargado de Firebase:', cloudHistorial.length);
                historial = cloudHistorial;
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
    
    // 3. Establecer perfil actual
    const lastProfileId = localStorage.getItem('ubercalc_perfil_actual_id');
    if (perfiles.length > 0) {
        perfilActual = perfiles.find(p => p.id === lastProfileId) || perfiles[0];
        if (perfilActual) {
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
    } else {
        perfilActual = null;
    }
    
    console.log(`✅ Carga de datos finalizada. Perfiles: ${perfiles.length}, Historial: ${historial.length}`);
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
    
    // Mostrar estado en el modal
    function showCodeStatus(message, type) {
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.textContent = message;
            statusDiv.style.background = type === 'error' ? '#f8d7da' : '#d4edda';
            statusDiv.style.color = type === 'error' ? '#721c24' : '#155724';
            statusDiv.style.border = type === 'error' ? '1px solid #f5c6cb' : '1px solid #c3e6cb';
        }
    }
    
    // VALIDACIÓN
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
    
    // ✅ CÓDIGO VÁLIDO
    showCodeStatus('✅ Código válido! Conectando...', 'success');
    input.style.borderColor = '#28a745';
    
    console.log('✅ Código válido, estableciendo...');
    
    userCodeSystem.userCode = code;
    userCodeSystem.userId = 'user_' + code;
    userCodeSystem.initialized = true;
    
    // Guardar en localStorage
    localStorage.setItem('ubercalc_user_code', code);
    
    console.log('✅ Código de usuario establecido:', code);
    console.log('✅ UserID:', userCodeSystem.userId);
    
    // Ocultar modal después de éxito
    setTimeout(() => {
        hideUserCodeModal();
        showUserCodeBanner();
        
        // Recargar la aplicación
        setTimeout(() => {
            console.log('🔄 Recargando aplicación con nuevo código...');
            mostrarStatus(`¡Conectado con código: ${code}! Sincronizando...`, 'success');
            location.reload();
        }, 1000);
        
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
        if (!this.initialized) {
            console.warn('❌ Firebase Sync no inicializado, no se puede guardar historial');
            return false;
        }

        try {
            console.log('💾 Guardando historial en Firebase...', history.length);
            
            const userDocRef = this.db.collection('users').doc(this.userId);
            await userDocRef.set({
                history: history,
                lastSync: firebase.firestore.FieldValue.serverTimestamp(),
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
            return null;
        }

        try {
            console.log('📥 Cargando historial desde Firebase...');
            
            const userDocRef = this.db.collection('users').doc(this.userId);
            const doc = await userDocRef.get();
            
            if (doc.exists) {
                const data = doc.data();
                this.lastSyncTime = data.lastSync?.toDate().toISOString() || new Date().toISOString();
                console.log('✅ Historial cargado desde Firebase:', data.history?.length || 0);
                return data.history || [];
            } else {
                console.log('📭 No se encontró historial en Firebase para este usuario');
                return [];
            }
            
        } catch (error) {
            console.error('❌ Error cargando historial desde Firebase:', error);
            return null;
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
                    lastSync: data.lastSync?.toDate().toISOString() || this.lastSyncTime,
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
            return 'error';
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
            return userDocRef.onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    console.log('🔄 Cambios detectados en Firebase');
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
    
    // 1. PRIMERO: Inicializar sistema de código de usuario
    await initializeUserCodeSystem();
    
    // 2. LUEGO: Inicializar Firebase Sync con reintentos
    const firebaseReady = await initializeFirebaseSyncWithRetry();
    
    if (firebaseReady) {
        await cargarDatos();
    } else {
        console.log('📱 Usando almacenamiento local');
        await cargarDatos();
    }
    
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
    
    console.log('🎉 UberCalc con Sistema de Código y Firebase inicializado correctamente');
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
        mostrarConfigPerfil();
    });
    
    elementos.volverPerfilesBtn.addEventListener('click', function() {
        console.log('⬅️ Volviendo a perfiles');
        mostrarPantalla('perfil');
    });
    
    elementos.cancelarPerfilBtn.addEventListener('click', function() {
        console.log('❌ Cancelando creación/edición de perfil');
        mostrarPantalla('perfil');
    });
    
    elementos.cambiarPerfilBtn.addEventListener('click', function() {
        console.log('👤 Cambiando perfil');
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
    
    console.log(aceptado ? '✅ Aceptando viaje' : '❌ Rechazando viaje');
    
    // Actualizar cálculo actual
    calculoActual.aceptado = aceptado;
    calculoActual.timestamp = new Date().toISOString();
    
    // Agregar al historial
    historial.unshift({...calculoActual});
    
    // Limitar historial a 100 elementos
    if (historial.length > 100) {
        historial = historial.slice(0, 100);
    }
    
    // Mostrar resultado en modal
    mostrarResultadoModal(calculoActual);
    
    // Guardar datos
    guardarDatos();
    
    // Actualizar interfaz
    actualizarEstadisticas();
    
    // Limpiar formulario
    limpiarFormulario();
    
    // Mostrar confirmación
    mostrarStatus(aceptado ? '¡Viaje aceptado!' : 'Viaje rechazado', 'success');
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
        const perfilElement = document.createElement('div');
        perfilElement.className = `perfil-item ${perfil.id === perfilActual?.id ? 'active' : ''}`;
        perfilElement.innerHTML = `
            <div class="perfil-info">
                <h3>${perfil.nombre}</h3>
                <p>${perfil.vehiculo || 'Sin vehículo'} • ${perfil.tipoCombustible || 'N/A'}</p>
                <p class="small">Costo operacional: ${perfil.moneda || '$'}${perfil.costoOperacional || 0}/hora</p>
            </div>
            <div class="perfil-actions">
                <button class="btn-icon" onclick="editarPerfil('${perfil.id}')">✏️</button>
                <button class="btn-icon" onclick="seleccionarPerfil('${perfil.id}')">${perfil.id === perfilActual?.id ? '✅' : '👉'}</button>
                ${perfiles.length > 1 ? `<button class="btn-icon btn-danger" onclick="eliminarPerfil('${perfil.id}')">🗑️</button>` : ''}
            </div>
        `;
        elementos.perfilesLista.appendChild(perfilElement);
    });
}

function mostrarConfigPerfil(perfilExistente = null) {
    console.log('⚙️ Mostrando configuración de perfil');
    
    elementos.perfilForm.reset();
    
    if (perfilExistente) {
        // Modo edición
        document.getElementById('perfil-id').value = perfilExistente.id;
        document.getElementById('perfil-nombre').value = perfilExistente.nombre;
        document.getElementById('perfil-vehiculo').value = perfilExistente.vehiculo || '';
        document.getElementById('tipo-combustible').value = perfilExistente.tipoCombustible || 'gasolina';
        document.getElementById('costo-operacional').value = perfilExistente.costoOperacional || '';
        document.getElementById('tipo-medida').value = perfilExistente.tipoMedida || 'km';
        document.getElementById('moneda').value = perfilExistente.moneda || 'USD';
        
        document.querySelector('#config-perfil-screen h2').textContent = 'Editar Perfil';
        document.querySelector('#perfil-form button[type="submit"]').textContent = 'Actualizar Perfil';
    } else {
        // Modo creación
        document.getElementById('perfil-id').value = '';
        document.querySelector('#config-perfil-screen h2').textContent = 'Nuevo Perfil';
        document.querySelector('#perfil-form button[type="submit"]').textContent = 'Crear Perfil';
    }
    
    mostrarPantalla('config-perfil');
}

function guardarPerfil(event) {
    event.preventDefault();
    console.log('💾 Guardando perfil...');
    
    const formData = new FormData(elementos.perfilForm);
    const perfilId = formData.get('perfil-id') || 'perfil_' + Date.now();
    const nombre = formData.get('perfil-nombre');
    const vehiculo = formData.get('perfil-vehiculo');
    const tipoCombustible = formData.get('tipo-combustible');
    const costoOperacional = parseFloat(formData.get('costo-operacional')) || 0;
    const tipoMedida = formData.get('tipo-medida');
    const moneda = formData.get('moneda');
    
    const perfilData = {
        id: perfilId,
        nombre,
        vehiculo,
        tipoCombustible,
        costoOperacional,
        tipoMedida,
        moneda,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
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
    }
    
    guardarDatos();
    actualizarInterfazPerfiles();
    mostrarPantalla('perfil');
    
    mostrarStatus('Perfil guardado correctamente', 'success');
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
    if (elementos.perfilScreen) elementos.perfilScreen.classList.add('hidden');
    if (elementos.configPerfilScreen) elementos.configPerfilScreen.classList.add('hidden');
    if (elementos.mainScreen) elementos.mainScreen.classList.add('hidden');
    
    // Mostrar pantalla seleccionada
    switch(pantalla) {
        case 'perfil':
            if (elementos.perfilScreen) elementos.perfilScreen.classList.remove('hidden');
            actualizarInterfazPerfiles();
            break;
        case 'config-perfil':
            if (elementos.configPerfilScreen) elementos.configPerfilScreen.classList.remove('hidden');
            break;
        case 'main':
            if (elementos.mainScreen) elementos.mainScreen.classList.remove('hidden');
            if (perfilActual) {
                document.getElementById('perfil-actual-nombre').textContent = perfilActual.nombre;
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
function actualizarPanelSync() {
    console.log('🔄 Actualizando panel de sincronización');
    
    if (!firebaseSync || !firebaseSync.initialized) {
        console.log('📱 Firebase Sync no disponible');
        return;
    }
    
    // Actualizar información de sincronización
    firebaseSync.getSyncStatus().then(status => {
        console.log('📊 Estado de sync:', status);
        
        const syncInfo = document.getElementById('sync-info');
        if (syncInfo) {
            if (status === 'connected' || (typeof status === 'object' && status.status === 'connected')) {
                syncInfo.innerHTML = `
                    <span id="sync-icon">✅</span>
                    <span id="sync-text">Conectado a Firebase</span>
                `;
                syncInfo.className = 'sync-info connected';
            } else {
                syncInfo.innerHTML = `
                    <span id="sync-icon">❌</span>
                    <span id="sync-text">Sin conexión</span>
                `;
                syncInfo.className = 'sync-info error';
            }
        }
    }).catch(error => {
        console.error('❌ Error obteniendo estado de sync:', error);
    });
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

console.log('🎉 UberCalc con Sistema de Código y Firebase cargado correctamente');
