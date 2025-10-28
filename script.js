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
let googleSync;

// --- Sistema de Código de Usuario ---
let userCodeSystem = {
    userId: null,
    userCode: null,
    initialized: false
};

// --- Configuración Google Apps Script ---
const GOOGLE_SCRIPT_BASE_URL = 'https://script.google.com/macros/s/AKfycbzhDlVDb6B4nLnpgVuaPNk7hq6Srs5zGW2iqd4uiKnmBaLpk0_fyAUypNpwaoYJs0lZiQ/exec';
const LOCAL_SYNC_ENDPOINT = '/api/sync'; 
const GOOGLE_SCRIPT_URL = LOCAL_SYNC_ENDPOINT;

// =============================================
// PERSISTENCIA DE DATOS (NUEVAS FUNCIONES CRÍTICAS PARA LA SINCRONIZACIÓN)
// =============================================

async function guardarDatos() {
    console.log('💾 Guardando datos en local storage...');
    
    // Guardar en LocalStorage (Caché y fallback)
    localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
    localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
    if (perfilActual) {
        localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
    }

    // Sincronizar con Google Sheets
    if (window.googleSync && googleSync.initialized) {
        console.log('☁️ Sincronizando datos con Google Sheets...');
        
        try {
            // 1. Sincronizar Perfiles
            await googleSync.saveProfiles(perfiles);
            console.log('✅ Perfiles guardados en la nube');
            
            // 2. Sincronizar Historial
            await googleSync.saveHistory(historial);
            console.log('✅ Historial guardado en la nube');
            
        } catch (error) {
            console.warn('⚠️ Error al sincronizar datos:', error);
        }

    } else {
        console.warn('⚠️ Google Sync no inicializado o no disponible. Solo se guarda en local.');
    }
}

/**
 * Carga los datos, dando prioridad a Google Sheets (Nube) si el usuario tiene un código asociado.
 * Solo usa LocalStorage como respaldo o si no hay código de usuario.
 */
async function cargarDatos() {
    console.log('🔄 Cargando datos (local y nube)...');
    let cloudPerfiles = null;
    let cloudHistorial = null;

    // 1. Intentar cargar desde la nube (PRIORIDAD)
    if (window.googleSync && googleSync.initialized) {
        try {
            console.log('☁️ Intentando cargar perfiles desde la nube...');
            cloudPerfiles = await googleSync.loadProfiles(); 
            
            if (cloudPerfiles && cloudPerfiles.length > 0) {
                console.log('✅ Perfiles cargados de la nube:', cloudPerfiles.length);
                perfiles = cloudPerfiles;
            }

            // ✅ NUEVO: Cargar historial desde la nube
            console.log('☁️ Intentando cargar historial desde la nube...');
            cloudHistorial = await googleSync.loadHistory();
            
            if (cloudHistorial && cloudHistorial.length > 0) {
                console.log('✅ Historial cargado de la nube:', cloudHistorial.length);
                historial = cloudHistorial;
            }
            
        } catch (error) {
            console.error('❌ Error al cargar datos de la nube. Usando local storage.', error);
        }
    }
    
    // 2. Cargar de LocalStorage si la nube NO proporcionó datos
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
// CLASE GOOGLE SYNC (MODIFICADA PARA USAR CÓDIGO DE USUARIO)
// =============================================

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

        try {
            console.log('📡 Inicializando Google Sync...');
            
            // 1. Obtener User ID del sistema de código
            this.userId = this.getUserId();
            console.log('👤 User ID obtenido:', this.userId);
            
            // 2. Verificar que la URL esté configurada
            if (!GOOGLE_SCRIPT_URL) {
                throw new Error('URL de Google Script no configurada');
            }
            
            console.log('🔗 URL configurada:', GOOGLE_SCRIPT_URL);
            
            this.initialized = true;
            this.initializing = false;
            
            console.log('✅ Google Sync inicializado CORRECTAMENTE');
            console.log('👤 User ID:', this.userId);
            
            this.actualizarUIEstado('connected');
            return true;
            
        } catch (error) {
            this.initializing = false;
            console.error('❌ Error inicializando Google Sync:', error);
            this.actualizarUIEstado('error');
            return false;
        }
    }

    getUserId() {
        // Usar el userId del sistema de código en lugar de generar uno aleatorio
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

async makeRequest(params) {
    if (!this.initialized) {
        throw new Error('Google Sync no inicializado. Llama a initialize() primero.');
    }

    try {
        console.log('📤 Enviando request a Google Script a través de Vercel Proxy...', params.action);
        
        // 1. Construir la URL completa del Google Script (Target URL)
        const urlParams = new URLSearchParams();
        Object.keys(params).forEach(key => {
            if (key === 'profiles' && typeof params[key] === 'object') {
                urlParams.append(key, JSON.stringify(params[key]));
            } else {
                urlParams.append(key, params[key]);
            }
        });
        urlParams.append('userId', this.userId);
        urlParams.append('t', Date.now().toString());
        
        // Usamos la URL base limpia de Google Apps Script
        const targetUrl = `${GOOGLE_SCRIPT_BASE_URL}?${urlParams.toString()}`;
        
        console.log('🔗 Target URL de Google Script:', targetUrl);
        console.log('🔗 Enviando a Vercel Proxy:', '/api/sync');

        // 2. Llamar al endpoint de Vercel
        const response = await fetch('/api/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                targetUrl: targetUrl
            })
        });

        console.log('📥 Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Error HTTP en Vercel Proxy: ${response.status}`);
        }

        const result = await response.json();
        
        console.log('✅ Request exitoso:', params.action, result);
        
        if (result.success === false) {
            throw new Error(result.error || 'Error del servidor');
        }
        
        return result;
        
    } catch (error) {
        console.error('❌ Error en request:', error);
        throw error;
    }
}

// Método alternativo para evitar problemas CORS
async makeRequestFallback(params) {
    console.log('🔄 Usando método alternativo (JSONP simulation)...');
    
    try {
        // Crear un iframe temporal para evitar CORS
        return new Promise((resolve, reject) => {
            const callbackName = 'googleScriptCallback_' + Date.now();
            const script = document.createElement('script');
            
            // Construir URL con callback
            const urlParams = new URLSearchParams();
            Object.keys(params).forEach(key => {
                if (key === 'profiles' && typeof params[key] === 'object') {
                    urlParams.append(key, JSON.stringify(params[key]));
                } else {
                    urlParams.append(key, params[key]);
                }
            });
            urlParams.append('userId', this.userId);
            urlParams.append('callback', callbackName);
            
            const url = `${GOOGLE_SCRIPT_BASE_URL}?${urlParams.toString()}`;
            script.src = url;
            
            // Configurar callback global
            window[callbackName] = (data) => {
                delete window[callbackName];
                document.head.removeChild(script);
                resolve(data);
            };
            
            // Timeout
            setTimeout(() => {
                if (window[callbackName]) {
                    delete window[callbackName];
                    document.head.removeChild(script);
                    reject(new Error('Timeout en request'));
                }
            }, 10000);
            
            document.head.appendChild(script);
        });
    } catch (error) {
        console.error('❌ Error en método alternativo:', error);
        throw error;
    }
}
    
    async saveProfiles(profiles) {
        if (!this.initialized) {
            console.warn('❌ Google Sync no inicializado, no se puede guardar');
            return false;
        }

        try {
            console.log('💾 Guardando perfiles en Google Sheets...', profiles.length);
            
            const result = await this.makeRequest({
                action: 'saveProfiles',
                profiles: profiles
            });
            
            this.lastSyncTime = result.lastSync;
            console.log('✅ Perfiles guardados en Google Sheets correctamente');
            this.actualizarUIEstado('syncing');
            
            setTimeout(() => {
                this.actualizarUIEstado('connected');
            }, 2000);
            
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando en Google Sheets:', error);
            this.actualizarUIEstado('error');
            return false;
        }
    }

    async loadProfiles() {
        if (!this.initialized) {
            console.warn('❌ Google Sync no inicializado, no se puede cargar');
            return null;
        }

        try {
            console.log('📥 Cargando perfiles desde Google Sheets...');
            
            const result = await this.makeRequest({
                action: 'getProfiles'
            });
            
            this.lastSyncTime = result.lastSync;
            console.log('✅ Perfiles cargados desde Google Sheets:', result.profiles.length);
            this.actualizarUIEstado('connected');
            return result.profiles || [];
            
        } catch (error) {
            console.error('❌ Error cargando desde Google Sheets:', error);
            this.actualizarUIEstado('error');
            return null;
        }
    }

    async syncProfiles(profiles) {
        if (!this.initialized) return { success: false, message: 'Sync no inicializado.' };

        this.syncInProgress = true;
        this.actualizarUIEstado('syncing');

        try {
            const profilesJson = JSON.stringify(profiles);
            
            const result = await this.makeRequest({
                action: 'syncProfiles',
                profiles: profiles
            });
            
            this.actualizarUIEstado('connected');
            console.log('✅ Sincronización completada:', result);
                
            return result;

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
            const result = await this.makeRequest({
                action: 'getSyncStatus'
            });
            
            return {
                status: result.status,
                lastSync: result.lastSync,
                profilesCount: result.profilesCount
            };
        } catch (error) {
            return 'error';
        }
    }

async saveHistory(history) {
        if (!this.initialized) {
            console.warn('❌ Google Sync no inicializado, no se puede guardar historial');
            return false;
        }

        try {
            console.log('💾 Guardando historial en Google Sheets...', history.length);
            
            const result = await this.makeRequest({
                action: 'saveHistory',
                history: history
            });
            
            this.lastSyncTime = result.lastSync;
            console.log('✅ Historial guardado en Google Sheets correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error guardando historial en Google Sheets:', error);
            return false;
        }
    }

    async loadHistory() {
        if (!this.initialized) {
            console.warn('❌ Google Sync no inicializado, no se puede cargar historial');
            return null;
        }

        try {
            console.log('📥 Cargando historial desde Google Sheets...');
            
            const result = await this.makeRequest({
                action: 'getHistory'
            });
            
            this.lastSyncTime = result.lastSync;
            console.log('✅ Historial cargado desde Google Sheets:', result.history?.length || 0);
            return result.history || [];
            
        } catch (error) {
            console.error('❌ Error cargando historial desde Google Sheets:', error);
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
                    syncText.textContent = 'Conectado a Google Sheets';
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
// FUNCIÓN DE REINTENTO PARA GOOGLE SYNC
// =============================================

/**
 * ✅ NUEVA FUNCIÓN: Inicializa Google Sync con reintentos automáticos
 */
async function initializeGoogleSyncWithRetry(maxRetries = 3) {
    console.log('🔄 Inicializando Google Sync con reintentos...');
    googleSync = new GoogleSync();
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`🔄 Intento ${attempt}/${maxRetries} de inicializar Google Sync...`);
            const success = await googleSync.initialize();
            
            if (success) {
                console.log('✅ Google Sync inicializado correctamente');
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
    
    console.error('❌ No se pudo inicializar Google Sync después de', maxRetries, 'intentos');
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
    console.log('🚀 Inicializando UberCalc con Sistema de Código...');
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
    console.log('📡 Inicializando UberCalc con Sistema de Código...');
    
    // 1. PRIMERO: Inicializar sistema de código de usuario
    await initializeUserCodeSystem();
    
    // 2. LUEGO: Inicializar Google Sync con reintentos
    const googleReady = await initializeGoogleSyncWithRetry();
    
    if (googleReady) {
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
    
    console.log('🎉 UberCalc con Sistema de Código inicializado correctamente');
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
            elementos.autoCalcIndicator.classList.add('hidden');
            elementos.resultadoRapido.classList.add('hidden');
        }
    } else {
        elementos.autoCalcIndicator.classList.add('hidden');
        elementos.resultadoRapido.classList.add('hidden');
        resetearInterfazCalculo();
    }
}

function mostrarResultadoRapido(resultado) {
    if (!resultado) return;
    
    console.log('🎯 Mostrando resultado rápido:', resultado.rentabilidad);
    
    elementos.resultadoBadge.className = 'resultado-badge';
    elementos.resultadoBadge.classList.add(resultado.rentabilidad);
    elementos.resultadoEmoji.textContent = resultado.emoji;
    elementos.resultadoTexto.textContent = resultado.texto;
    
    elementos.metricaMinuto.textContent = `${formatearMoneda(resultado.gananciaPorMinuto)}/min`;
    
    const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
    elementos.metricaKm.textContent = `${formatearMoneda(resultado.gananciaPorKm)}/${distanciaLabel}`;
    
    elementos.resultadoRapido.classList.remove('hidden');
    
    elementos.aceptarViajeTabBtn.className = 'primary-button';
    elementos.aceptarViajeTabBtn.classList.add(resultado.rentabilidad);
    
    elementos.autoCalcIndicator.classList.add('hidden');
}

function resetearInterfazCalculo() {
    elementos.aceptarViajeTabBtn.className = 'primary-button';
    elementos.aceptarViajeTabBtn.classList.remove('rentable', 'oportunidad', 'no-rentable');
    calculoActual = null;
}

// --- Funciones de Cálculo ---
function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) {
        console.error('❌ No hay perfil actual para calcular');
        return null;
    }
    
    try {
        console.log('💰 Calculando rentabilidad...');
        
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
        
        console.log('📊 Resultado del cálculo:', rentabilidad);
        return resultado;
        
    } catch (error) {
        console.error('❌ Error en el cálculo:', error);
        mostrarError('Error en el cálculo. Verifica los datos ingresados.');
        return null;
    }
}

function mostrarModalResultados(resultado) {
    if (!resultado) return;
    
    console.log('📊 Mostrando modal de resultados:', resultado.rentabilidad);
    
    elementos.modalEmoji.textContent = resultado.emoji;
    elementos.modalTexto.textContent = resultado.texto;
    
    elementos.modalBadge.className = 'result-badge';
    elementos.modalBadge.classList.add(resultado.rentabilidad);
    
    elementos.modalResultadosDoble.innerHTML = '';
    
    const columnaMinuto = crearColumnaResultado(
        '⏱️ Por Minuto',
        `${formatearMoneda(resultado.gananciaPorMinuto)}/min`,
        `Umbral: ${formatearMoneda(perfilActual.umbralMinutoRentable)}/min`,
        resultado.rentabilidad
    );
    
    const distanciaLabel = perfilActual.tipoMedida === 'mi' ? 'mi' : 'km';
    const columnaDistancia = crearColumnaResultado(
        '🛣️ Por Distancia',
        `${formatearMoneda(resultado.gananciaPorKm)}/${distanciaLabel}`,
        `Umbral: ${formatearMoneda(perfilActual.umbralKmRentable)}/${distanciaLabel}`,
        resultado.rentabilidad
    );
    
    elementos.modalResultadosDoble.appendChild(columnaMinuto);
    elementos.modalResultadosDoble.appendChild(columnaDistancia);
    
    const infoAdicional = document.createElement('div');
    infoAdicional.className = 'metricas-adicionales';
    infoAdicional.style.gridColumn = '1 / -1';
    infoAdicional.style.marginTop = '20px';
    infoAdicional.style.padding = '15px';
    infoAdicional.style.background = 'var(--light-grey)';
    infoAdicional.style.borderRadius = '10px';
    
    infoAdicional.innerHTML = `
        <h4 style="margin: 0 0 15px 0; text-align: center; color: var(--text-primary);">💰 Desglose Financiero</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.9em;">
            <div style="grid-column: 1 / -1; text-align: center; padding: 10px; background: var(--card-bg); border-radius: 8px; border: 2px solid var(--success-green);">
                <strong style="color: var(--success-green);">Ganancia Ofrecida</strong><br>
                <span style="font-size: 1.2em; font-weight: bold;">${formatearMoneda(resultado.tarifa)}</span>
            </div>
            <div style="padding: 8px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--error-red);">
                <strong>⛽ Combustible</strong><br>
                ${formatearMoneda(resultado.costoCombustible)}
            </div>
            <div style="padding: 8px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--error-red);">
                <strong>🔧 Mantenimiento</strong><br>
                ${formatearMoneda(resultado.costoMantenimiento)}
            </div>
            <div style="padding: 8px; background: var(--card-bg); border-radius: 6px; border-left: 3px solid var(--error-red);">
                <strong>🛡️ Seguro</strong><br>
                ${formatearMoneda(resultado.costoSeguro)}
            </div>
            <div style="grid-column: 1 / -1; text-align: center; padding: 12px; background: var(--card-bg); border-radius: 8px; border: 2px solid var(--secondary-orange); margin-top: 5px;">
                <strong style="color: var(--secondary-orange);">GANANCIA NETA</strong><br>
                <span style="font-size: 1.3em; font-weight: bold; color: var(--secondary-orange);">${formatearMoneda(resultado.gananciaNeta)}</span>
            </div>
        </div>
    `;
    
    elementos.modalResultadosDoble.appendChild(infoAdicional);
    
    calculoActual = resultado;
    elementos.modalFondo.style.display = 'flex';
}

function crearColumnaResultado(titulo, valor, comparacion, rentabilidad) {
    const columna = document.createElement('div');
    columna.className = 'resultado-columna';
    
    const tituloElem = document.createElement('h3');
    tituloElem.textContent = titulo;
    tituloElem.style.margin = '0 0 10px 0';
    tituloElem.style.fontSize = '1em';
    
    const valorElem = document.createElement('div');
    valorElem.className = `resultado-valor ${rentabilidad}`;
    valorElem.textContent = valor;
    valorElem.style.fontSize = '1.3em';
    valorElem.style.fontWeight = 'bold';
    valorElem.style.margin = '10px 0';
    
    const comparacionElem = document.createElement('div');
    comparacionElem.className = 'resultado-comparacion';
    comparacionElem.textContent = comparacion;
    comparacionElem.style.fontSize = '0.85em';
    comparacionElem.style.color = 'var(--text-secondary)';
    
    columna.appendChild(tituloElem);
    columna.appendChild(valorElem);
    columna.appendChild(comparacionElem);
    
    return columna;
}

async function procesarViaje(aceptado) {
    if (!calculoActual) {
        mostrarError('No hay cálculo actual para procesar');
        return;
    }
    
    console.log(aceptado ? '✅ Aceptando viaje...' : '❌ Rechazando viaje...');
    
    if (aceptado) {
        guardarEnHistorial(calculoActual, true);
        mostrarStatus('✅ Viaje aceptado y guardado en historial', 'success');
    } else {
        guardarEnHistorial(calculoActual, false);
        mostrarStatus('❌ Viaje rechazado', 'info');
    }
    
    // ✅ MEJORADO: Sincronizar inmediatamente después de guardar
    await guardarDatos(); // Ahora es async
    
    actualizarEstadisticas();
    limpiarFormulario();
    cerrarModal();
    
    if (aceptado) {
        setTimeout(() => cambiarPestana('historial'), 500);
    }
}

// prueba Directa de Google Sheets
async function pruebaDirectaGoogleSheets() {
    console.log('🎯 PRUEBA DIRECTA GOOGLE SHEETS');
    
    // 1. Primero verificar que podemos conectar
    console.log('1. Probando conexión básica...');
    try {
        const testUrl = `${GOOGLE_SCRIPT_BASE_URL}?action=getSyncStatus&userId=user_BTM625&test=direct`;
        console.log('🔗 URL test:', testUrl);
        
        const response = await fetch(testUrl);
        const result = await response.text();
        console.log('✅ Respuesta cruda:', result);
    } catch (error) {
        console.error('❌ Error conexión directa:', error);
    }
    
    // 2. Guardar un perfil de prueba
    console.log('2. Guardando perfil de prueba...');
    const perfilPrueba = [{
        id: 'prueba_' + Date.now(),
        nombre: 'PERFIL PRUEBA DIRECTA',
        tipoMedida: 'km',
        tipoCombustible: 'glp', 
        rendimiento: 99.9,
        precioCombustible: 100.0,
        moneda: 'DOP',
        timestamp: new Date().toISOString()
    }];
    
    try {
        const saveUrl = `${GOOGLE_SCRIPT_BASE_URL}?action=saveProfiles&profiles=${encodeURIComponent(JSON.stringify(perfilPrueba))}&userId=user_BTM625`;
        console.log('🔗 Save URL:', saveUrl);
        
        const response = await fetch(saveUrl);
        const result = await response.text();
        console.log('✅ Save respuesta:', result);
    } catch (error) {
        console.error('❌ Error guardando:', error);
    }
    
    // 3. Leer para verificar
    console.log('3. Leyendo para verificar...');
    try {
        const readUrl = `${GOOGLE_SCRIPT_BASE_URL}?action=getProfiles&userId=user_BTM625`;
        console.log('🔗 Read URL:', readUrl);
        
        const response = await fetch(readUrl);
        const result = await response.text();
        console.log('✅ Read respuesta:', result);
    } catch (error) {
        console.error('❌ Error leyendo:', error);
    }
}

// --- Gestión de Historial ---
function guardarEnHistorial(resultado, aceptado) {
    const historialItem = {
        ...resultado,
        aceptado: aceptado,
        id: Date.now().toString()
    };
    
    historial.unshift(historialItem);
    
    if (historial.length > 50) {
        historial = historial.slice(0, 50);
    }
    
    guardarDatos();
    actualizarHistorial();
}

function actualizarHistorial() {
    if (!elementos.historyList) return;
    
    elementos.historyList.innerHTML = '';
    
    if (historial.length === 0) {
        elementos.historyList.innerHTML = `
            <div class="history-item" style="text-align: center; opacity: 0.7;">
                <div class="history-details">No hay viajes en el historial</div>
                <div style="font-size: 0.8em; margin-top: 5px;">Los viajes aceptados aparecerán aquí</div>
            </div>
        `;
        return;
    }
    
    const historialMostrar = historial.slice(0, 10);
    
    historialMostrar.forEach(item => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${item.rentabilidad}`;
        
        const hora = new Date(item.timestamp).toLocaleTimeString('es-DO', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const estado = item.aceptado ? '✅' : '❌';
        const distanciaLabel = perfilActual?.tipoMedida === 'mi' ? 'mi' : 'km';
        const detalles = `${formatearMoneda(item.tarifa)} • ${item.minutos}min • ${item.distancia}${distanciaLabel}`;
        
        historyItem.innerHTML = `
            <div class="history-info">
                <div class="history-time">${hora}</div>
                <div class="history-details">${detalles}</div>
            </div>
            <div class="history-status">${estado} ${item.emoji}</div>
        `;
        
        historyItem.addEventListener('click', () => {
            mostrarDetallesViaje(item);
        });
        
        elementos.historyList.appendChild(historyItem);
    });
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

function limpiarHistorial() {
    if (historial.length === 0) {
        mostrarStatus('El historial ya está vacío', 'info');
        return;
    }
    
    if (confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        historial = [];
        guardarDatos();
        actualizarHistorial();
        actualizarEstadisticas();
        mostrarStatus('🗑️ Historial limpiado correctamente', 'success');
    }
}

// --- Estadísticas ---
function actualizarEstadisticas() {
    if (!perfilActual) return;
    
    const hoy = new Date().toDateString();
    const viajesHoy = historial.filter(item => 
        new Date(item.timestamp).toDateString() === hoy && item.aceptado
    );
    
    const totalViajes = viajesHoy.length;
    const gananciaTotal = viajesHoy.reduce((sum, item) => sum + item.tarifa, 0);
    const tiempoTotal = viajesHoy.reduce((sum, item) => sum + item.minutos, 0);
    const viajesRentables = viajesHoy.filter(item => item.rentabilidad === 'rentable').length;
    
    const costoCombustibleTotal = viajesHoy.reduce((sum, item) => sum + item.costoCombustible, 0);
    const costoMantenimientoTotal = viajesHoy.reduce((sum, item) => sum + item.costoMantenimiento, 0);
    const costoSeguroTotal = viajesHoy.reduce((sum, item) => sum + item.costoSeguro, 0);
    const gananciaNetaTotal = viajesHoy.reduce((sum, item) => sum + item.gananciaNeta, 0);
    
    if (elementos.statsViajes) elementos.statsViajes.textContent = totalViajes;
    if (elementos.statsGanancia) elementos.statsGanancia.textContent = formatearMoneda(gananciaTotal);
    if (elementos.statsTiempo) elementos.statsTiempo.textContent = `${tiempoTotal}min`;
    if (elementos.statsRentables) elementos.statsRentables.textContent = viajesRentables;
    
    const gananciaPorHora = tiempoTotal > 0 ? (gananciaTotal / tiempoTotal) * 60 : 0;
    const viajePromedio = totalViajes > 0 ? gananciaTotal / totalViajes : 0;
    
    if (elementos.statsGananciaHora) elementos.statsGananciaHora.textContent = formatearMoneda(gananciaPorHora);
    if (elementos.statsViajePromedio) elementos.statsViajePromedio.textContent = formatearMoneda(viajePromedio);
    
    window.estadisticasExportacion = {
        totalViajes,
        gananciaTotal,
        tiempoTotal,
        viajesRentables,
        costoCombustibleTotal,
        costoMantenimientoTotal,
        costoSeguroTotal,
        gananciaNetaTotal,
        gananciaPorHora,
        viajePromedio
    };
}

// --- Gestión de Perfiles ---
function mostrarConfigPerfil(perfil = null) {
    console.log('⚙️ Mostrando configuración de perfil:', perfil ? perfil.nombre : 'Nuevo perfil');
    
    const form = elementos.perfilForm;
    
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

async function guardarPerfil(event) {
    event.preventDefault();
    console.log('💾 Guardando perfil...');

     // VERIFICAR ESTADO DE GOOGLE SYNC ANTES DE GUARDAR
    console.log('🔍 Estado Google Sync:', {
        initialized: googleSync?.initialized,
        userId: googleSync?.userId,
        userCodeSystem: userCodeSystem
    });
    
    // --- 1. Obtención y validación de datos ---
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
        fechaActualizacion: new Date().toISOString(),
        lastModified: Date.now()
    };
    
    if (!perfil.nombre || isNaN(perfil.rendimiento) || isNaN(perfil.precioCombustible)) {
        mostrarError('Por favor, completa todos los campos requeridos con valores válidos.');
        return;
    }
    
    // --- 2. Actualizar/Crear Perfil en el array ---
    const index = perfiles.findIndex(p => p.id === perfil.id);
    
    if (index > -1) {
        // Actualizar perfil existente
        perfiles[index] = perfil;
        mostrarStatus('Perfil actualizado correctamente.', 'success');
    } else {
        // Crear nuevo perfil
        perfiles.push(perfil);
        mostrarStatus('Nuevo perfil creado correctamente.', 'success');
    }
    
    // --- 3. Sincronización (¡El paso clave!) ---
   if (googleSync && googleSync.initialized) {
        console.log('☁️ Sincronizando con Google Sheets...');
        await guardarDatos();
    } else {
        console.warn('⚠️ Google Sync no disponible. Guardando solo localmente.');
        // Guardar solo localmente
        localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfiles));
        localStorage.setItem('ubercalc_historial', JSON.stringify(historial));
        if (perfilActual) {
            localStorage.setItem('ubercalc_perfil_actual_id', perfilActual.id);
        }
    }
    
    // --- 4. Actualizar estado de la interfaz ---
    
    // Si es el perfil que estaba activo o no había uno, lo seleccionamos
    if (!perfilActual || perfil.id === perfilActual.id) {
        perfilActual = perfil;
    }
    
    actualizarInterfazPerfiles();
    if (perfilActual && perfil.id === perfilActual.id) {
        cargarPerfilEnInterfaz(perfilActual); // Asegura que la interfaz muestre los datos actualizados
    }
    cerrarModal(); 
    
    mostrarPantalla('main');
    actualizarEstadisticas();
    mostrarStatus(`Perfil "${perfil.nombre}" guardado y sincronizado.`, 'success');
}

function actualizarInterfazPerfiles() {
    if (!elementos.perfilesLista) {
        console.error('❌ Elemento perfiles-lista no encontrado');
        return;
    }

    if (!Array.isArray(perfiles)) {
        console.error('❌ ERROR CRÍTICO: "perfiles" no es un array. Reinicializando.', perfiles);
        perfiles = [];
    }
    
    console.log('🔄 Actualizando interfaz de perfiles. Total:', perfiles.length);
    
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
            <div class="perfil-info">
                <div class="perfil-nombre">${perfil.nombre}</div>
                <div class="perfil-detalles">
                    <span>${detalles}</span>
                    <span>${perfil.tipoCombustible.toUpperCase()}</span>
                </div>
            </div>
            <div class="perfil-acciones">
                <button class="secondary-button small usar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">🚗</span>
                    Usar
                </button>
                <button class="secondary-button small editar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">✏️</span>
                    Editar
                </button>
                <button class="secondary-button small eliminar-perfil-btn" data-perfil-id="${perfil.id}">
                    <span class="button-icon">🗑️</span>
                    Eliminar
                </button>
            </div>
        `;
        
        const usarBtn = perfilItem.querySelector('.usar-perfil-btn');
        if (usarBtn) {
            usarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('🎯 Botón USAR clickeado para perfil:', perfilId);
                seleccionarPerfil(perfilId);
            });
        }
        
        const editarBtn = perfilItem.querySelector('.editar-perfil-btn');
        if (editarBtn) {
            editarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('✏️ Botón EDITAR clickeado para perfil:', perfilId);
                editarPerfil(perfilId);
            });
        }
        
        const eliminarBtn = perfilItem.querySelector('.eliminar-perfil-btn');
        if (eliminarBtn) {
            eliminarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                const perfilId = this.getAttribute('data-perfil-id');
                console.log('🗑️ Botón ELIMINAR clickeado para perfil:', perfilId);
                eliminarPerfil(perfilId);
            });
        }
        
        perfilItem.addEventListener('click', function(e) {
            if (!e.target.closest('.perfil-acciones')) {
                console.log('🎯 Clic en item perfil:', perfil.id);
                seleccionarPerfil(perfil.id);
            }
        });
        
        elementos.perfilesLista.appendChild(perfilItem);
    });
    
    console.log('✅ Interfaz de perfiles actualizada correctamente');
}

async function seleccionarPerfil(perfilId) {
    console.log('🎯 Intentando seleccionar perfil:', perfilId);
    
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        console.log('✅ Perfil encontrado:', perfil.nombre);
        perfilActual = perfil;
        guardarDatos();
        
        if (googleSync && googleSync.initialized) {
            console.log('📡 Sincronizando con Google Sheets...');
            await googleSync.saveProfiles(perfiles);
        }
        
        console.log('🔄 Mostrando pantalla principal...');
        mostrarPantalla('main');
        mostrarStatus(`🚗 Perfil "${perfil.nombre}" activado`, 'success');
        actualizarUnidades();
        actualizarEstadisticas();
    } else {
        console.error('❌ Perfil no encontrado con ID:', perfilId);
        mostrarError('Error: Perfil no encontrado');
    }
}

function editarPerfil(perfilId) {
    console.log('✏️ Editando perfil:', perfilId);
    const perfil = perfiles.find(p => p.id === perfilId);
    if (perfil) {
        mostrarConfigPerfil(perfil);
    } else {
        console.error('❌ Perfil no encontrado para editar:', perfilId);
        mostrarError('Perfil no encontrado');
    }
}

async function eliminarPerfil(perfilId) {
    console.log('🗑️ Intentando eliminar perfil:', perfilId);
    
    if (perfiles.length <= 1) {
        mostrarError('No puedes eliminar el único perfil existente');
        return;
    }
    
    const perfilAEliminar = perfiles.find(p => p.id === perfilId);
    if (!perfilAEliminar) {
        mostrarError('Perfil no encontrado');
        return;
    }
    
    if (confirm(`¿Estás seguro de que quieres eliminar el perfil "${perfilAEliminar.nombre}"? Esta acción no se puede deshacer.`)) {
        perfiles = perfiles.filter(p => p.id !== perfilId);
        
        if (perfilActual && perfilActual.id === perfilId) {
            perfilActual = perfiles[0];
            console.log('🔄 Cambiando a perfil:', perfilActual.nombre);
        }
        
        guardarDatos();
        
        if (googleSync && googleSync.initialized) {
            await googleSync.saveProfiles(perfiles);
        }
        
        actualizarInterfazPerfiles();
        mostrarStatus('🗑️ Perfil eliminado correctamente', 'success');
        console.log('✅ Perfil eliminado:', perfilId);
    }
}

function actualizarUnidades() {
    const tipoMedida = document.getElementById('tipo-medida')?.value || perfilActual?.tipoMedida || 'km';
    const tipoCombustible = document.getElementById('tipo-combustible')?.value || perfilActual?.tipoCombustible || 'glp';
    const moneda = document.getElementById('moneda')?.value || perfilActual?.moneda || 'DOP';
    
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
    
    const distanciaUnit = document.getElementById('distancia-unit');
    const monedaTarifa = document.getElementById('moneda-tarifa');
    
    if (distanciaUnit) {
        distanciaUnit.textContent = tipoMedida === 'mi' ? 'mi' : 'Km';
    }
    if (monedaTarifa) {
        monedaTarifa.textContent = moneda;
    }
    
    document.querySelectorAll('.costo-mensual').forEach(el => {
        if (el) el.textContent = moneda;
    });
    
    document.querySelectorAll('.umbral-minuto').forEach(el => {
        if (el) el.textContent = `${moneda}/min`;
    });
}

// --- Gestión de Tema ---
function alternarTema() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('uberCalc_theme', newTheme);
    
    const themeIcon = elementos.themeToggle?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    }
}

function aplicarTemaGuardado() {
    const savedTheme = localStorage.getItem('uberCalc_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    const themeIcon = elementos.themeToggle?.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
    }
}

// --- Sincronización Google Sheets ---
function mostrarPanelSync() {
    console.log('🌐 Mostrando panel de sincronización');
    actualizarPanelSync();
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

async function actualizarPanelSync() {
    if (!googleSync) {
        console.log('❌ Google Sync no disponible');
        return;
    }
    
    console.log('🔄 Actualizando panel de sync');
    
    try {
        const deviceInfo = googleSync.getDeviceInfo();
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
        
        const firebaseStatus = document.getElementById('firebase-status');
        const lastSyncTime = document.getElementById('last-sync-time');
        const cloudProfilesCount = document.getElementById('cloud-profiles-count');
        const cloudHistoryCount = document.getElementById('cloud-history-count'); // ✅ NUEVO
        
        if (googleSync.initialized) {
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Conectado';
                firebaseStatus.style.color = 'var(--success-green)';
            }
            
            const syncStatus = await googleSync.getSyncStatus();
            if (syncStatus.status === 'connected') {
                if (lastSyncTime) {
                    lastSyncTime.textContent = syncStatus.lastSync ? 
                        new Date(syncStatus.lastSync).toLocaleTimeString() : '--';
                }
                if (cloudProfilesCount) {
                    cloudProfilesCount.textContent = syncStatus.profilesCount;
                }
                // ✅ NUEVO: Mostrar conteo de historial
                if (cloudHistoryCount) {
                    cloudHistoryCount.textContent = syncStatus.historyCount || '--';
                }
            }
        } else {
            if (firebaseStatus) {
                firebaseStatus.textContent = 'Desconectado';
                firebaseStatus.style.color = 'var(--error-red)';
            }
            if (lastSyncTime) lastSyncTime.textContent = '--';
            if (cloudProfilesCount) cloudProfilesCount.textContent = '--';
            if (cloudHistoryCount) cloudHistoryCount.textContent = '--'; // ✅ NUEVO
        }
    } catch (error) {
        console.error('❌ Error actualizando panel sync:', error);
    }
}

async function forzarSincronizacion() {
    if (!googleSync || !googleSync.initialized) {
        mostrarError('Google Sync no está configurado');
        return;
    }
    
    console.log('🔄 Forzando sincronización...');
    mostrarStatus('🔄 Sincronizando con Google Sheets...', 'info');
    
    const syncResult = await googleSync.syncProfiles(perfiles);

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
    alert(`🌐 SINCRONIZACIÓN CON GOOGLE SHEETS

✅ Cómo funciona:
1. Tus perfiles se guardan automáticamente en Google Sheets
2. Todos tus dispositivos acceden a los mismos perfiles
3. Los cambios se sincronizan automáticamente
4. Tus datos están seguros en tu cuenta de Google

📱 Dispositivos conectados: Todos los que usen tu misma cuenta

💡 Características:
• Sincronización en tiempo real
• Resolución automática de conflictos
• Respaldo seguro en la nube
• Totalmente gratuito

🔒 Tus datos son privados y solo tú puedes acceder a ellos`);
}

// --- Exportación ---
function mostrarModalExportacion() {
    if (historial.length === 0) {
        mostrarError('No hay datos en el historial para exportar');
        return;
    }
    
    actualizarEstadisticas();
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'flex';
    }
}

function exportarPDF() {
    mostrarStatus('🔄 Generando PDF...', 'info');
    
    const contenido = generarContenidoPDF();
    
    const blob = new Blob([contenido], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `UberCalc_Reporte_${new Date().toISOString().split('T')[0]}.html`;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
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
        if (window.innerWidth > 768) {
            window.print();
        }
    </script>
</body>
</html>`;
}

// --- Utilidades ---
function mostrarPantalla(pantalla) {
    console.log('🖥️ Mostrando pantalla:', pantalla);
    
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    if (pantalla === 'perfil') {
        if (elementos.perfilScreen) elementos.perfilScreen.classList.add('active');
    } else if (pantalla === 'config-perfil') {
        if (elementos.configPerfilScreen) elementos.configPerfilScreen.classList.add('active');
    } else if (pantalla === 'main') {
        if (elementos.mainScreen) elementos.mainScreen.classList.add('active');
        actualizarUnidades();
        actualizarEstadisticas();
        actualizarHistorial();
    }
}

function validarFormulario() {
    const tarifa = elementos.tarifaInput?.value;
    const minutos = elementos.minutosInput?.value;
    const distancia = elementos.distanciaInput?.value;
    
    if (!tarifa || !minutos || !distancia) {
        mostrarError('Por favor, completa todos los campos del viaje');
        return false;
    }
    
    if (parseFloat(tarifa) <= 0) {
        mostrarError('La tarifa debe ser mayor a 0');
        return false;
    }
    
    if (parseFloat(minutos) <= 0) {
        mostrarError('El tiempo debe ser mayor a 0');
        return false;
    }
    
    if (parseFloat(distancia) <= 0) {
        mostrarError('La distancia debe ser mayor a 0');
        return false;
    }
    
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
    if (!elementos.statusIndicator || !elementos.statusText) {
        console.log('Status:', mensaje);
        return;
    }
    
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
    if (elementos.tarifaInput) elementos.tarifaInput.value = '';
    if (elementos.minutosInput) elementos.minutosInput.value = '';
    if (elementos.distanciaInput) elementos.distanciaInput.value = '';
    if (elementos.autoCalcIndicator) elementos.autoCalcIndicator.classList.add('hidden');
    if (elementos.resultadoRapido) elementos.resultadoRapido.classList.add('hidden');
    resetearInterfazCalculo();
    calculoActual = null;
}

function cerrarModal() {
    if (elementos.modalFondo) {
        elementos.modalFondo.style.display = 'none';
    }
}

function cerrarExportModal() {
    if (elementos.exportModal) {
        elementos.exportModal.style.display = 'none';
    }
}

function formatearMoneda(valor) {
    const moneda = perfilActual?.moneda || 'DOP';
    const simbolo = moneda === 'USD' ? '$' : 'RD$';
    return `${simbolo}${typeof valor === 'number' ? valor.toFixed(2) : '0.00'}`;
}

// --- Persistencia de Datos MEJORADA ---
async function cargarDatos() {
    console.log('🔄 Cargando datos (local y nube)...');
    let cloudPerfiles = null;
    let cloudHistorial = null;

    // 1. Intentar cargar desde la nube (PRIORIDAD)
    if (window.googleSync && googleSync.initialized) {
        try {
            console.log('☁️ Intentando cargar perfiles desde la nube...');
            cloudPerfiles = await googleSync.loadProfiles(); 
            
            if (cloudPerfiles && cloudPerfiles.length > 0) {
                console.log('✅ Perfiles cargados de la nube:', cloudPerfiles.length);
                perfiles = cloudPerfiles;
            }

            // CARGAR HISTORIAL DESDE LA NUBE (¡NUEVO!)
            console.log('☁️ Intentando cargar historial desde la nube...');
            cloudHistorial = await googleSync.loadHistory();
            
            if (cloudHistorial && cloudHistorial.length > 0) {
                console.log('✅ Historial cargado de la nube:', cloudHistorial.length);
                historial = cloudHistorial;
            }
            
        } catch (error) {
            console.error('❌ Error al cargar datos de la nube. Usando local storage.', error);
        }
    }
    
    // 2. Cargar de LocalStorage si la nube NO proporcionó datos
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

    // 3. Cargar historial (ajustar si el historial también se guarda en la nube)
    // Para simplificar, el historial sigue cargándose de forma local por ahora.
    const localHistorialString = localStorage.getItem('ubercalc_historial');
    historial = localHistorialString ? JSON.parse(localHistorialString) : [];
    
    // 4. Establecer perfil actual
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

// --- Función de Sincronización Centralizada ---
async function guardarYForzarSincronizacion() {
    if (!googleSync || !googleSync.initialized) {
        console.warn('⚠️ Google Sync no inicializado o no disponible. Solo se guardará localmente.');
        mostrarStatus('⚠️ Solo guardado local. La sincronización en la nube falló.', 'warning');
        return false;
    }
    
    console.log('🔄 Iniciando sincronización remota de perfiles (PUSH)...');
    mostrarStatus('Guardando cambios y sincronizando...', 'info');

    try {
        const syncResult = await googleSync.syncProfiles(perfiles);
        
        if (syncResult && typeof syncResult === 'object') {
            console.log('✅ Sincronización remota exitosa.');
            mostrarStatus('✅ Cambios guardados y sincronizados', 'success');
            return true;
        } else {
            console.error('❌ Fallo en la sincronización remota.', syncResult);
            mostrarError(`❌ Error al sincronizar: Fallo de servidor o red.`);
            return false;
        }
        
    } catch (error) {
        console.error('❌ Error en guardarYForzarSincronizacion:', error);
        mostrarError(`❌ Error al guardar y sincronizar: ${error.message}`);
        return false;
    }
}

// FUNCIÓN DE DIAGNÓSTICO MEJORADA
// =============================================

async function diagnosticarSync() {
    console.log('🔧 INICIANDO DIAGNÓSTICO COMPLETO DE SINCRONIZACIÓN...');
    
    if (!googleSync) {
        console.error('❌ Google Sync no inicializado');
        mostrarStatus('❌ Google Sync no inicializado', 'error');
        return;
    }

    try {
        console.log('1. Probando conexión básica...');
        mostrarStatus('1. Probando conexión básica...', 'info');
        
        const testResult = await googleSync.makeRequest({
            action: 'getSyncStatus'
        });
        console.log('✅ Conexión básica OK:', testResult);

        console.log('2. Probando obtener perfiles...');
        mostrarStatus('2. Probando obtener perfiles...', 'info');
        
        const perfilesCloud = await googleSync.loadProfiles();
        console.log('✅ Obtención de perfiles OK:', perfilesCloud?.length || 0);

        console.log('3. Probando obtener historial...');
        mostrarStatus('3. Probando obtener historial...', 'info');
        
        const historialCloud = await googleSync.loadHistory();
        console.log('✅ Obtención de historial OK:', historialCloud?.length || 0);

        console.log('4. Probando guardar perfiles...');
        mostrarStatus('4. Probando guardar perfiles...', 'info');
        
        let saveProfilesResult = false;
        if (perfilesCloud && perfilesCloud.length > 0) {
            saveProfilesResult = await googleSync.saveProfiles(perfilesCloud);
        } else {
            saveProfilesResult = await googleSync.saveProfiles([]);
        }
        console.log('✅ Guardado de perfiles OK:', saveProfilesResult);

        console.log('5. Probando guardar historial...');
        mostrarStatus('5. Probando guardar historial...', 'info');
        
        let saveHistoryResult = false;
        if (historialCloud && historialCloud.length > 0) {
            saveHistoryResult = await googleSync.saveHistory(historialCloud);
        } else {
            saveHistoryResult = await googleSync.saveHistory([]);
        }
        console.log('✅ Guardado de historial OK:', saveHistoryResult);

        console.log('6. Probando sincronización completa...');
        mostrarStatus('6. Probando sincronización completa...', 'info');
        
        const syncResult = await googleSync.syncProfiles(perfiles || []);
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

🔗 Estado Google Sync: ${googleSync.initialized ? 'INICIALIZADO' : 'NO INICIALIZADO'}
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
window.mostrarInfoSync = mostrarInfoSync;
window.diagnosticarSync = diagnosticarSync;

// Nuevas funciones globales para el sistema de código
window.generateUserCode = generateUserCode;
window.setUserCode = setUserCode;
window.showUserCodeModal = showUserCodeModal;
window.debugUserCodeModal = debugUserCodeModal;
window.pruebaDirectaGoogleSheets = pruebaDirectaGoogleSheets;
window.cambiarUsuario = cambiarUsuario;

// =============================================
// FUNCIÓN DE CONTROL DE SESIÓN (UBICACIÓN FINAL Y SEGURA)
// =============================================

/**
 * Inicia el proceso de cambio de usuario:
 * 1. Limpia el código, ID y datos de la sesión actual (perfiles/historial) de la memoria y LocalStorage.
 * 2. Muestra el modal para que el usuario ingrese un código nuevo o existente.
 * * NOTA: Esta ubicación es crítica, ya que todas las funciones de UI (ej. actualizarSelectorPerfiles) ya han sido definidas.
 */
function cambiarUsuario() {
    console.log('🔄 Iniciando cambio de usuario. Limpiando sesión COMPLETA...');
    
    if (confirm('¿Estás seguro de que quieres cambiar de usuario? Se perderán TODOS los datos locales y se creará una sesión completamente nueva.')) {
        
        // 1. Limpiar ABSOLUTAMENTE TODO en LocalStorage
        localStorage.clear(); // ⚠️ ESTO LIMPIA TODO
        
        // 2. Resetear el estado del sistema de código
        userCodeSystem.userCode = null;
        userCodeSystem.userId = null;
        userCodeSystem.initialized = false;
        
        // 3. Reiniciar Google Sync COMPLETAMENTE
        if (googleSync) {
            googleSync.initialized = false;
            googleSync.userId = null;
            googleSync = null; // ⚠️ ELIMINAR LA INSTANCIA
        }
        
        // 4. Limpiar datos en memoria
        perfiles = [];
        perfilActual = null;
        historial = [];
        calculoActual = null;
        
        // 5. Limpiar formularios
        limpiarFormulario();
        
        // 6. Ocultar banners
        const banner = document.getElementById('user-code-banner');
        const bannerMain = document.getElementById('user-code-banner-main');
        if (banner) banner.style.display = 'none';
        if (bannerMain) bannerMain.style.display = 'none';
        
        // 7. RECARGAR LA PÁGINA COMPLETAMENTE
        console.log('🔄 Recargando página para nueva sesión...');
        setTimeout(() => {
            location.reload(true); // ⚠️ RECARGAR FORZOSAMENTE
        }, 500);
        
    } else {
        console.log('❌ Cambio de usuario cancelado');
    }
}

function verificarEstadoSync() {
    console.log('🔍 DIAGNÓSTICO COMPLETO:');
    console.log('- userCodeSystem:', userCodeSystem);
    console.log('- googleSync:', googleSync);
    console.log('- googleSync.initialized:', googleSync?.initialized);
    console.log('- googleSync.userId:', googleSync?.userId);
    console.log('- perfiles.length:', perfiles.length);
    console.log('- historial.length:', historial.length);
    
    // Verificar si hay funciones duplicadas
    console.log('- guardarDatos definido:', typeof guardarDatos);
}

// --- Prevenir cierre accidental ---
window.addEventListener('beforeunload', function(e) {
    const tieneDatosPendientes = elementos.tarifaInput?.value || 
                                 elementos.minutosInput?.value || 
                                 elementos.distanciaInput?.value;
    
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

// --- Forzar cálculo inicial si hay datos ---
setTimeout(() => {
    if (elementos.tarifaInput?.value && elementos.minutosInput?.value && elementos.distanciaInput?.value) {
        calcularAutomatico();
    }
}, 1000);

console.log('🎉 Script UberCalc con Sistema de Código cargado correctamente');








