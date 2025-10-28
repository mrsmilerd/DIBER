// =============================================
// UBER CALC - Versión Híbrida
// Interfaz de 3.0 + Sincronización de 3.1
// =============================================

// --- Variables Globales ---
let perfiles = [];
let perfilActual = null;
let historial = [];
let calculoActual = null;
let timeoutCalculo = null;
let firebaseSync;

// --- Sistema de Código de Usuario (DE 3.1) ---
let userCodeSystem = {
    userId: null,
    userCode: null,
    initialized: false
};

// --- Configuración Firebase (DE 3.1) ---
const firebaseConfig = {
  apiKey: "AIzaSyCf5j5Pu-go6ipUw2EnTO2OnKgvYLzkonY",
  authDomain: "diber-32875.firebaseapp.com",
  projectId: "diber-32875",
  storageBucket: "diber-32875.firebasestorage.app",
  messagingSenderId: "260349079723",
  appId: "1:260349079723:web:babe1cc51e8bb067ba87ee"
};

// --- Elementos DOM (DE 3.0) ---
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
    
    // Sincronización (NUEVO de 3.1)
    syncPanel: document.getElementById('sync-panel')
};

// =============================================
// FUNCIONES DE SINCRONIZACIÓN (DE 3.1)
// =============================================

// Clase FirebaseSync (DE 3.1)
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
            return userCodeSystem.userId;
        }
        
        // Si no hay sistema de código, usar un ID por defecto
        const defaultId = 'default_user_' + Math.random().toString(36).substr(2, 9);
        console.warn('⚠️ Usando ID temporal:', defaultId);
        return defaultId;
    }

    actualizarUIEstado(estado) {
        const syncIcon = document.getElementById('sync-icon');
        const syncText = document.getElementById('sync-text');
        
        switch(estado) {
            case 'connected':
                syncIcon.textContent = '✅';
                syncText.textContent = 'Conectado a Firebase';
                break;
            case 'syncing':
                syncIcon.textContent = '🔄';
                syncText.textContent = 'Sincronizando...';
                break;
            case 'error':
                syncIcon.textContent = '❌';
                syncText.textContent = 'Error de conexión';
                break;
            default:
                syncIcon.textContent = '🌐';
                syncText.textContent = 'Conectando...';
        }
    }

    async sincronizarPerfiles() {
        if (!this.initialized) {
            console.warn('⚠️ Firebase Sync no inicializado, intentando inicializar...');
            const initialized = await this.initialize();
            if (!initialized) {
                console.error('❌ No se pudo inicializar Firebase Sync');
                return false;
            }
        }

        if (this.syncInProgress) {
            console.log('⏳ Sincronización ya en progreso...');
            return false;
        }

        this.syncInProgress = true;
        this.actualizarUIEstado('syncing');

        try {
            console.log('🔄 Iniciando sincronización de perfiles...');
            
            // 1. Obtener perfiles locales
            const perfilesLocales = obtenerPerfiles();
            
            // 2. Preparar datos para subir
            const perfilesData = perfilesLocales.map(perfil => ({
                ...perfil,
                lastModified: firebase.firestore.FieldValue.serverTimestamp()
            }));
            
            // 3. Subir a Firebase
            await this.db.collection('users').doc(this.userId).set({
                perfiles: perfilesData,
                lastSync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            this.lastSyncTime = new Date();
            this.syncInProgress = false;
            this.actualizarUIEstado('connected');
            
            console.log('✅ Perfiles sincronizados correctamente');
            return true;
            
        } catch (error) {
            this.syncInProgress = false;
            this.actualizarUIEstado('error');
            console.error('❌ Error sincronizando perfiles:', error);
            return false;
        }
    }

    async sincronizarHistorial() {
        if (!this.initialized) {
            console.warn('⚠️ Firebase Sync no inicializado para historial');
            return false;
        }

        try {
            console.log('🔄 Sincronizando historial...');
            
            // 1. Obtener historial local
            const historialLocal = obtenerHistorial();
            
            // 2. Preparar datos
            const historialData = historialLocal.map(item => ({
                ...item,
                timestamp: item.timestamp || new Date().toISOString()
            }));
            
            // 3. Subir a Firebase
            await this.db.collection('users').doc(this.userId).set({
                historial: historialData,
                lastHistorySync: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            console.log('✅ Historial sincronizado correctamente');
            return true;
            
        } catch (error) {
            console.error('❌ Error sincronizando historial:', error);
            return false;
        }
    }

    async sincronizarCompleta() {
        console.log('🚀 Iniciando sincronización completa...');
        
        const perfilesSync = await this.sincronizarPerfiles();
        const historialSync = await this.sincronizarHistorial();
        
        if (perfilesSync && historialSync) {
            console.log('🎉 Sincronización completa EXITOSA');
            mostrarMensaje('✅ Sincronización completa exitosa', 'success');
            return true;
        } else {
            console.error('❌ Sincronización completa falló');
            mostrarMensaje('❌ Error en sincronización', 'error');
            return false;
        }
    }

    async descargarDatos() {
        if (!this.initialized) {
            console.warn('⚠️ Firebase Sync no inicializado para descarga');
            return false;
        }

        try {
            console.log('📥 Descargando datos desde Firebase...');
            
            const doc = await this.db.collection('users').doc(this.userId).get();
            
            if (doc.exists) {
                const data = doc.data();
                
                // 1. Descargar perfiles
                if (data.perfiles && Array.isArray(data.perfiles)) {
                    console.log('📥 Descargando perfiles:', data.perfiles.length);
                    guardarPerfiles(data.perfiles);
                    perfiles = data.perfiles;
                }
                
                // 2. Descargar historial
                if (data.historial && Array.isArray(data.historial)) {
                    console.log('📥 Descargando historial:', data.historial.length);
                    guardarHistorial(data.historial);
                    historial = data.historial;
                }
                
                this.lastSyncTime = new Date();
                console.log('✅ Datos descargados correctamente');
                return true;
            } else {
                console.log('📭 No hay datos en Firebase para este usuario');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Error descargando datos:', error);
            return false;
        }
    }

    async iniciarEscuchaEnTiempoReal() {
        if (!this.initialized) {
            console.warn('⚠️ No se puede iniciar escucha - Firebase no inicializado');
            return;
        }

        try {
            console.log('👂 Iniciando escucha en tiempo real...');
            
            this.unsubscribe = this.db.collection('users').doc(this.userId)
                .onSnapshot((doc) => {
                    if (doc.exists) {
                        console.log('📡 Cambio detectado en Firebase');
                        this.procesarCambiosRemotos(doc.data());
                    }
                }, (error) => {
                    console.error('❌ Error en escucha en tiempo real:', error);
                });
                
        } catch (error) {
            console.error('❌ Error iniciando escucha en tiempo real:', error);
        }
    }

    procesarCambiosRemotos(data) {
        console.log('🔄 Procesando cambios remotos...');
        
        // Aquí puedes implementar la lógica para procesar cambios
        // desde otros dispositivos
        if (data.perfiles) {
            console.log('📥 Perfiles actualizados desde la nube');
            // Implementar lógica de fusión inteligente
        }
    }

    detenerEscucha() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log('🔇 Escucha en tiempo real detenida');
        }
    }
}

// =============================================
// SISTEMA DE CÓDIGO DE USUARIO (DE 3.1)
// =============================================

function initializeUserCodeSystem() {
    console.log('🔑 Inicializando sistema de código de usuario...');
    
    // Intentar cargar código existente
    const savedCode = localStorage.getItem('ubercalc_user_code');
    const savedUserId = localStorage.getItem('ubercalc_user_id');
    
    if (savedCode && savedUserId) {
        userCodeSystem.userCode = savedCode;
        userCodeSystem.userId = savedUserId;
        userCodeSystem.initialized = true;
        
        console.log('✅ Código de usuario cargado:', savedCode);
        updateUserCodeUI();
        
        // Inicializar Firebase con el código existente
        setTimeout(() => {
            firebaseSync = new FirebaseSync();
            firebaseSync.initialize().then(() => {
                firebaseSync.iniciarEscuchaEnTiempoReal();
                firebaseSync.descargarDatos().then(() => {
                    // Recargar UI con datos sincronizados
                    cargarPerfiles();
                    cargarHistorial();
                    actualizarEstadisticas();
                });
            });
        }, 1000);
        
        return;
    }
    
    // Si no hay código guardado, mostrar el modal
    console.log('📭 No se encontró código de usuario, mostrando modal...');
    setTimeout(() => {
        showUserCodeModal();
    }, 500);
}

function generateUserCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    const codeInput = document.getElementById('user-code-input');
    codeInput.value = result;
    codeInput.focus();
    
    console.log('✨ Código generado:', result);
}

function setUserCode() {
    const codeInput = document.getElementById('user-code-input');
    const userCode = codeInput.value.trim().toUpperCase();
    
    if (!userCode) {
        mostrarMensajeModal('❌ Por favor, escribe o genera un código', 'error');
        return;
    }
    
    if (userCode.length < 3) {
        mostrarMensajeModal('❌ El código debe tener al menos 3 caracteres', 'error');
        return;
    }
    
    // Generar ID único basado en el código
    const userId = 'user_' + userCode + '_' + Date.now();
    
    // Guardar en sistema
    userCodeSystem.userCode = userCode;
    userCodeSystem.userId = userId;
    userCodeSystem.initialized = true;
    
    // Guardar en localStorage
    localStorage.setItem('ubercalc_user_code', userCode);
    localStorage.setItem('ubercalc_user_id', userId);
    
    console.log('✅ Código de usuario establecido:', userCode, 'ID:', userId);
    
    // Actualizar UI
    updateUserCodeUI();
    
    // Cerrar modal
    hideUserCodeModal();
    
    // Inicializar Firebase
    firebaseSync = new FirebaseSync();
    firebaseSync.initialize().then(() => {
        firebaseSync.iniciarEscuchaEnTiempoReal();
        firebaseSync.sincronizarCompleta();
    });
    
    mostrarMensaje('✅ Código configurado correctamente', 'success');
}

function showUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    modal.style.display = 'flex';
    
    const codeInput = document.getElementById('user-code-input');
    if (userCodeSystem.userCode) {
        codeInput.value = userCodeSystem.userCode;
    }
    codeInput.focus();
}

function hideUserCodeModal() {
    const modal = document.getElementById('user-code-modal');
    modal.style.display = 'none';
}

function updateUserCodeUI() {
    if (!userCodeSystem.initialized) return;
    
    const banners = document.querySelectorAll('#user-code-banner, #user-code-banner-main');
    const displays = document.querySelectorAll('#user-code-display, #user-code-display-main');
    
    banners.forEach(banner => {
        banner.style.display = 'flex';
    });
    
    displays.forEach(display => {
        display.textContent = `Código: ${userCodeSystem.userCode}`;
    });
}

function mostrarMensajeModal(mensaje, tipo = 'info') {
    const statusDiv = document.getElementById('code-status');
    statusDiv.textContent = mensaje;
    statusDiv.style.display = 'block';
    statusDiv.style.background = tipo === 'error' ? '#f8d7da' : 
                                tipo === 'success' ? '#d1edff' : '#fff3cd';
    statusDiv.style.color = tipo === 'error' ? '#721c24' : 
                           tipo === 'success' ? '#155724' : '#856404';
    statusDiv.style.border = tipo === 'error' ? '1px solid #f5c6cb' : 
                            tipo === 'success' ? '1px solid #b8daff' : '1px solid #ffeaa7';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 5000);
}

// =============================================
// FUNCIONES DE SINCRONIZACIÓN UI (DE 3.1)
// =============================================

function mostrarPanelSync() {
    const panel = document.getElementById('sync-panel');
    panel.style.display = 'flex';
    
    // Actualizar información del panel
    actualizarPanelSync();
}

function cerrarSyncPanel() {
    const panel = document.getElementById('sync-panel');
    panel.style.display = 'none';
}

function actualizarPanelSync() {
    if (!firebaseSync) return;
    
    // Actualizar estado de Firebase
    const firebaseStatus = document.getElementById('firebase-status');
    firebaseStatus.textContent = firebaseSync.initialized ? '✅ Conectado' : '❌ Desconectado';
    firebaseStatus.style.color = firebaseSync.initialized ? '#28a745' : '#dc3545';
    
    // Actualizar última sincronización
    const lastSyncTime = document.getElementById('last-sync-time');
    if (firebaseSync.lastSyncTime) {
        lastSyncTime.textContent = firebaseSync.lastSyncTime.toLocaleTimeString();
    } else {
        lastSyncTime.textContent = '--';
    }
    
    // Actualizar contadores
    const cloudProfilesCount = document.getElementById('cloud-profiles-count');
    const cloudHistoryCount = document.getElementById('cloud-history-count');
    cloudProfilesCount.textContent = perfiles.length;
    cloudHistoryCount.textContent = historial.length;
    
    // Actualizar estado del dispositivo actual
    const currentDeviceName = document.getElementById('current-device-name');
    const currentDeviceId = document.getElementById('current-device-id');
    
    currentDeviceName.textContent = getDeviceName();
    currentDeviceId.textContent = `ID: ${userCodeSystem.userId || 'No configurado'}`;
}

function getDeviceName() {
    const ua = navigator.userAgent;
    if (/Mobile|Android|iPhone|iPad/i.test(ua)) {
        return '📱 Dispositivo Móvil';
    } else if (/Tablet|iPad/i.test(ua)) {
        return '📟 Tablet';
    } else {
        return '💻 Computadora';
    }
}

function forzarSincronizacion() {
    if (!firebaseSync) {
        mostrarMensaje('❌ Firebase no está inicializado', 'error');
        return;
    }
    
    mostrarMensaje('🔄 Iniciando sincronización...', 'info');
    firebaseSync.sincronizarCompleta().then(exito => {
        if (exito) {
            mostrarMensaje('✅ Sincronización completada', 'success');
            actualizarPanelSync();
        }
    });
}

function forzarSincronizacionCompleta() {
    if (!firebaseSync) {
        mostrarMensaje('❌ Firebase no está inicializado', 'error');
        return;
    }
    
    mostrarMensaje('🔄 Iniciando sincronización completa...', 'info');
    
    Promise.all([
        firebaseSync.sincronizarPerfiles(),
        firebaseSync.sincronizarHistorial(),
        firebaseSync.descargarDatos()
    ]).then(([perfilesSync, historialSync, datosSync]) => {
        if (perfilesSync && historialSync) {
            mostrarMensaje('✅ Sincronización completa exitosa', 'success');
            // Recargar datos locales
            cargarPerfiles();
            cargarHistorial();
            actualizarEstadisticas();
            actualizarPanelSync();
        }
    });
}

function diagnosticarSync() {
    console.log('🔧 Ejecutando diagnóstico de sincronización...');
    
    const diagnosticos = [];
    
    // 1. Verificar sistema de código de usuario
    if (userCodeSystem.initialized) {
        diagnosticos.push('✅ Sistema de código de usuario: OK');
        diagnosticos.push(`   Código: ${userCodeSystem.userCode}`);
        diagnosticos.push(`   User ID: ${userCodeSystem.userId}`);
    } else {
        diagnosticos.push('❌ Sistema de código de usuario: NO INICIALIZADO');
    }
    
    // 2. Verificar Firebase Sync
    if (firebaseSync) {
        diagnosticos.push(`✅ Firebase Sync: ${firebaseSync.initialized ? 'INICIALIZADO' : 'NO INICIALIZADO'}`);
        diagnosticos.push(`   Sincronizando: ${firebaseSync.syncInProgress ? 'SI' : 'NO'}`);
    } else {
        diagnosticos.push('❌ Firebase Sync: NO INSTANCIADO');
    }
    
    // 3. Verificar datos locales
    diagnosticos.push(`📊 Perfiles locales: ${perfiles.length}`);
    diagnosticos.push(`📊 Historial local: ${historial.length}`);
    
    // 4. Verificar Firebase
    if (typeof firebase !== 'undefined') {
        diagnosticos.push('✅ Firebase SDK: CARGADO');
    } else {
        diagnosticos.push('❌ Firebase SDK: NO CARGADO');
    }
    
    // Mostrar diagnóstico
    const mensaje = diagnosticos.join('\n');
    console.log('📋 Diagnóstico completo:\n' + mensaje);
    alert('🔧 Diagnóstico de Sincronización:\n\n' + mensaje);
}

function cambiarUsuario() {
    if (confirm('¿Estás seguro de que quieres cambiar de usuario? Esto reiniciará la aplicación.')) {
        // Limpiar datos locales
        localStorage.removeItem('ubercalc_user_code');
        localStorage.removeItem('ubercalc_user_id');
        
        // Recargar aplicación
        location.reload();
    }
}

function mostrarInfoSync() {
    const info = `
🌐 **Sincronización Multi-Dispositivo**

**¿Cómo funciona?**
1. Usa el MISMO código en todos tus dispositivos
2. Los perfiles se sincronizan automáticamente
3. El historial se comparte entre dispositivos
4. Funciona en tiempo real con Firebase

**Características:**
✅ Sincronización automática
✅ Trabaja sin conexión
✅ Datos seguros en la nube
✅ Compatible con PC, móvil y tablet

**Tips:**
• Elige un código fácil de recordar
• Usa el mismo código en todos lados
• La sincronización es automática
    `;
    
    alert(info.replace(/\*\*(.*?)\*\*/g, '$1'));
}

// =============================================
// FUNCIONES PRINCIPALES (DE 3.0)
// =============================================

// Inicialización de la aplicación
function inicializarApp() {
    console.log('🚀 Inicializando UberCalc Hybrid...');
    
    // 1. Inicializar sistema de código de usuario (DE 3.1)
    initializeUserCodeSystem();
    
    // 2. Cargar datos locales
    cargarPerfiles();
    cargarHistorial();
    
    // 3. Configurar event listeners
    configurarEventListeners();
    
    // 4. Inicializar tema
    inicializarTema();
    
    // 5. Mostrar pantalla de perfiles si no hay perfil actual
    if (perfiles.length === 0) {
        mostrarPantalla('perfil-screen');
    } else if (!perfilActual) {
        mostrarPantalla('perfil-screen');
    } else {
        mostrarPantalla('main-screen');
        actualizarUnidades();
        actualizarEstadisticas();
    }
    
    console.log('✅ UberCalc Hybrid inicializado correctamente');
}

// Configuración de event listeners
function configurarEventListeners() {
    // Sistema de pestañas
    elementos.tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            cambiarPestaña(tabId);
        });
    });
    
    // Inputs de cálculo con cálculo automático
    elementos.tarifaInput.addEventListener('input', iniciarCalculoAutomatico);
    elementos.minutosInput.addEventListener('input', iniciarCalculoAutomatico);
    elementos.distanciaInput.addEventListener('input', iniciarCalculoAutomatico);
    
    // Botones de acción
    elementos.aceptarViajeBtn.addEventListener('click', aceptarViaje);
    elementos.rechazarViajeBtn.addEventListener('click', rechazarViaje);
    elementos.aceptarViajeTabBtn.addEventListener('click', mostrarModalResultados);
    elementos.rechazarViajeTabBtn.addEventListener('click', rechazarViaje);
    
    // Gestión de perfiles
    elementos.nuevoPerfilBtn.addEventListener('click', () => {
        nuevoPerfil();
        mostrarPantalla('config-perfil-screen');
    });
    
    elementos.volverPerfilesBtn.addEventListener('click', () => {
        mostrarPantalla('perfil-screen');
    });
    
    elementos.cancelarPerfilBtn.addEventListener('click', () => {
        mostrarPantalla('perfil-screen');
    });
    
    elementos.cambiarPerfilBtn.addEventListener('click', () => {
        mostrarPantalla('perfil-screen');
    });
    
    elementos.perfilForm.addEventListener('submit', guardarPerfil);
    
    // Historial
    elementos.clearHistoryBtn.addEventListener('click', limpiarHistorial);
    elementos.exportarHistorialBtn.addEventListener('click', () => {
        elementos.exportModal.style.display = 'flex';
    });
    
    elementos.exportarPdfBtn.addEventListener('click', exportarHistorialPdf);
    
    // Tema
    elementos.themeToggle.addEventListener('click', alternarTema);
    
    // Modales
    window.addEventListener('click', (event) => {
        if (event.target === elementos.modalFondo) {
            cerrarModal();
        }
        if (event.target === elementos.exportModal) {
            cerrarExportModal();
        }
        if (event.target === elementos.syncPanel) {
            cerrarSyncPanel();
        }
        if (event.target === document.getElementById('user-code-modal')) {
            hideUserCodeModal();
        }
    });
}

// Funciones de gestión de pantallas
function mostrarPantalla(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

function cambiarPestaña(tabId) {
    // Actualizar botones de pestaña
    elementos.tabButtons.forEach(button => {
        button.classList.toggle('active', button.getAttribute('data-tab') === tabId);
    });
    
    // Actualizar contenido de pestaña
    elementos.tabContents.forEach(content => {
        content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
    
    // Si es la pestaña de resumen, actualizar estadísticas
    if (tabId === 'resumen') {
        actualizarEstadisticas();
    }
}

// Funciones de cálculo (mantenidas de 3.0)
function calcularRentabilidad(tarifa, minutos, distancia) {
    if (!perfilActual) {
        mostrarMensaje('❌ Primero selecciona un perfil', 'error');
        return null;
    }
    
    const costoCombustible = (distancia / perfilActual.rendimiento) * perfilActual.precioCombustible;
    const gananciaNeta = tarifa - costoCombustible;
    
    const tarifaPorMinuto = tarifa / minutos;
    const tarifaPorKm = tarifa / distancia;
    
    // Determinar tipo de viaje
    let tipoViaje = 'no-rentable';
    let emoji = '❌';
    let texto = 'NO RENTABLE';
    
    if (tarifaPorMinuto >= perfilActual.umbralMinutoRentable && 
        tarifaPorKm >= perfilActual.umbralKmRentable) {
        tipoViaje = 'rentable';
        emoji = '✅';
        texto = 'RENTABLE';
    } else if (tarifaPorMinuto >= perfilActual.umbralMinutoOportunidad && 
               tarifaPorKm >= perfilActual.umbralKmOportunidad) {
        tipoViaje = 'oportunidad';
        emoji = '⚠️';
        texto = 'OPORTUNIDAD';
    }
    
    return {
        tarifa,
        minutos,
        distancia,
        costoCombustible,
        gananciaNeta,
        tarifaPorMinuto,
        tarifaPorKm,
        tipoViaje,
        emoji,
        texto,
        timestamp: new Date().toISOString()
    };
}

function iniciarCalculoAutomatico() {
    // Limpiar timeout anterior
    if (timeoutCalculo) {
        clearTimeout(timeoutCalculo);
    }
    
    // Mostrar indicador de cálculo automático
    elementos.autoCalcIndicator.classList.remove('hidden');
    
    // Configurar nuevo timeout
    timeoutCalculo = setTimeout(() => {
        realizarCalculoAutomatico();
    }, 500);
}

function realizarCalculoAutomatico() {
    const tarifa = parseFloat(elementos.tarifaInput.value);
    const minutos = parseInt(elementos.minutosInput.value);
    const distancia = parseFloat(elementos.distanciaInput.value);
    
    // Validar inputs
    if (!tarifa || !minutos || !distancia || 
        tarifa <= 0 || minutos <= 0 || distancia <= 0) {
        elementos.resultadoRapido.classList.add('hidden');
        elementos.autoCalcIndicator.classList.add('hidden');
        return;
    }
    
    // Realizar cálculo
    calculoActual = calcularRentabilidad(tarifa, minutos, distancia);
    
    if (calculoActual) {
        // Actualizar resultado rápido
        elementos.resultadoEmoji.textContent = calculoActual.emoji;
        elementos.resultadoTexto.textContent = calculoActual.texto;
        elementos.metricaMinuto.textContent = `${calculoActual.tarifaPorMinuto.toFixed(2)} ${perfilActual.moneda}/min`;
        elementos.metricaKm.textContent = `${calculoActual.tarifaPorKm.toFixed(2)} ${perfilActual.moneda}/km`;
        
        // Actualizar clases CSS según tipo de viaje
        elementos.resultadoBadge.className = 'resultado-badge';
        elementos.resultadoBadge.classList.add(calculoActual.tipoViaje);
        
        // Mostrar resultado
        elementos.resultadoRapido.classList.remove('hidden');
        elementos.autoCalcIndicator.classList.add('hidden');
    }
}

function mostrarModalResultados() {
    if (!calculoActual) {
        mostrarMensaje('❌ Primero ingresa los datos del viaje', 'error');
        return;
    }
    
    // Actualizar modal con resultados
    elementos.modalEmoji.textContent = calculoActual.emoji;
    elementos.modalTexto.textContent = calculoActual.texto;
    
    // Actualizar clases CSS
    elementos.modalBadge.className = 'result-badge';
    elementos.modalBadge.classList.add(calculoActual.tipoViaje);
    
    // Generar contenido de resultados
    elementos.modalResultadosDoble.innerHTML = generarContenidoResultados(calculoActual);
    
    // Mostrar modal
    elementos.modalFondo.style.display = 'flex';
}

function generarContenidoResultados(calculo) {
    return `
        <div class="resultado-columna">
            <div class="resultado-item destacado">
                <span class="resultado-label">💰 Ganancia Neta:</span>
                <span class="resultado-valor">${calculo.gananciaNeta.toFixed(2)} ${perfilActual.moneda}</span>
            </div>
            <div class="resultado-item">
                <span class="resultado-label">⛽ Costo Combustible:</span>
                <span class="resultado-valor">${calculo.costoCombustible.toFixed(2)} ${perfilActual.moneda}</span>
            </div>
            <div class="resultado-item">
                <span class="resultado-label">⏱️ Por Minuto:</span>
                <span class="resultado-valor">${calculo.tarifaPorMinuto.toFixed(2)} ${perfilActual.moneda}/min</span>
            </div>
        </div>
        <div class="resultado-columna">
            <div class="resultado-item">
                <span class="resultado-label">🎯 Umbral Rentable:</span>
                <span class="resultado-valor">${perfilActual.umbralMinutoRentable} ${perfilActual.moneda}/min</span>
            </div>
            <div class="resultado-item">
                <span class="resultado-label">🛣️ Por Kilómetro:</span>
                <span class="resultado-valor">${calculo.tarifaPorKm.toFixed(2)} ${perfilActual.moneda}/km</span>
            </div>
            <div class="resultado-item">
                <span class="resultado-label">🎯 Umbral Rentable:</span>
                <span class="resultado-valor">${perfilActual.umbralKmRentable} ${perfilActual.moneda}/km</span>
            </div>
        </div>
    `;
}

function aceptarViaje() {
    if (!calculoActual) return;
    
    // Agregar al historial
    calculoActual.accion = 'aceptado';
    historial.unshift(calculoActual);
    guardarHistorial(historial);
    
    // Sincronizar historial si Firebase está disponible
    if (firebaseSync && firebaseSync.initialized) {
        firebaseSync.sincronizarHistorial();
    }
    
    // Actualizar UI
    actualizarEstadisticas();
    actualizarHistorialUI();
    
    // Cerrar modal y limpiar formulario
    cerrarModal();
    limpiarFormulario();
    
    mostrarMensaje('✅ Viaje aceptado y guardado en historial', 'success');
}

function rechazarViaje() {
    if (!calculoActual) return;
    
    // Agregar al historial como rechazado
    calculoActual.accion = 'rechazado';
    historial.unshift(calculoActual);
    guardarHistorial(historial);
    
    // Sincronizar historial si Firebase está disponible
    if (firebaseSync && firebaseSync.initialized) {
        firebaseSync.sincronizarHistorial();
    }
    
    // Actualizar UI
    actualizarEstadisticas();
    actualizarHistorialUI();
    
    // Cerrar modal y limpiar formulario
    cerrarModal();
    limpiarFormulario();
    
    mostrarMensaje('❌ Viaje rechazado y guardado en historial', 'info');
}

function cerrarModal() {
    elementos.modalFondo.style.display = 'none';
}

function cerrarExportModal() {
    elementos.exportModal.style.display = 'none';
}

function limpiarFormulario() {
    elementos.tarifaInput.value = '';
    elementos.minutosInput.value = '';
    elementos.distanciaInput.value = '';
    elementos.resultadoRapido.classList.add('hidden');
    calculoActual = null;
}

// Funciones de gestión de perfiles (mantenidas de 3.0)
function cargarPerfiles() {
    const perfilesGuardados = localStorage.getItem('ubercalc_perfiles');
    if (perfilesGuardados) {
        perfiles = JSON.parse(perfilesGuardados);
        actualizarListaPerfiles();
    }
}

function guardarPerfiles(perfilesArray = perfiles) {
    localStorage.setItem('ubercalc_perfiles', JSON.stringify(perfilesArray));
    
    // Sincronizar con Firebase si está disponible
    if (firebaseSync && firebaseSync.initialized) {
        firebaseSync.sincronizarPerfiles();
    }
}

function actualizarListaPerfiles() {
    elementos.perfilesLista.innerHTML = '';
    
    perfiles.forEach((perfil, index) => {
        const perfilElement = document.createElement('div');
        perfilElement.className = `perfil-item ${perfilActual && perfilActual.id === perfil.id ? 'active' : ''}`;
        perfilElement.innerHTML = `
            <div class="perfil-info">
                <span class="perfil-nombre">${perfil.nombre}</span>
                <span class="perfil-detalles">${perfil.rendimiento} ${perfil.tipoMedida === 'km' ? 'Km/Gl' : 'Mi/Gl'} • ${perfil.moneda}</span>
            </div>
            <div class="perfil-acciones">
                <button class="perfil-btn seleccionar" data-index="${index}" title="Seleccionar perfil">
                    <span class="button-icon">✅</span>
                </button>
                <button class="perfil-btn editar" data-index="${index}" title="Editar perfil">
                    <span class="button-icon">✏️</span>
                </button>
                <button class="perfil-btn eliminar" data-index="${index}" title="Eliminar perfil">
                    <span class="button-icon">🗑️</span>
                </button>
            </div>
        `;
        
        elementos.perfilesLista.appendChild(perfilElement);
    });
    
    // Configurar event listeners para los botones de perfil
    document.querySelectorAll('.perfil-btn.seleccionar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            seleccionarPerfil(index);
        });
    });
    
    document.querySelectorAll('.perfil-btn.editar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            editarPerfil(index);
        });
    });
    
    document.querySelectorAll('.perfil-btn.eliminar').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = parseInt(e.currentTarget.getAttribute('data-index'));
            eliminarPerfil(index);
        });
    });
}

function seleccionarPerfil(index) {
    perfilActual = perfiles[index];
    mostrarPantalla('main-screen');
    actualizarUnidades();
    actualizarEstadisticas();
    mostrarMensaje(`✅ Perfil "${perfilActual.nombre}" seleccionado`, 'success');
}

function nuevoPerfil() {
    // Limpiar formulario
    elementos.perfilForm.reset();
    document.getElementById('perfil-id').value = '';
    
    // Establecer valores por defecto
    document.getElementById('tipo-medida').value = 'km';
    document.getElementById('tipo-combustible').value = 'glp';
    document.getElementById('rendimiento').value = '22.0';
    document.getElementById('precio-combustible').value = '137.20';
    document.getElementById('moneda').value = 'DOP';
    document.getElementById('umbral-minuto-rentable').value = '6.00';
    document.getElementById('umbral-km-rentable').value = '25.00';
    document.getElementById('umbral-minuto-oportunidad').value = '5.00';
    document.getElementById('umbral-km-oportunidad').value = '23.00';
    
    actualizarUnidadesFormulario();
}

function editarPerfil(index) {
    const perfil = perfiles[index];
    
    // Llenar formulario con datos del perfil
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
    
    actualizarUnidadesFormulario();
    mostrarPantalla('config-perfil-screen');
}

function guardarPerfil(e) {
    e.preventDefault();
    
    const perfilId = document.getElementById('perfil-id').value;
    const nombre = document.getElementById('nombre-perfil').value.trim();
    
    if (!nombre) {
        mostrarMensaje('❌ El nombre del perfil es obligatorio', 'error');
        return;
    }
    
    const perfilData = {
        id: perfilId || 'perfil_' + Date.now(),
        nombre: nombre,
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
        costoMantenimiento: parseFloat(document.getElementById('costo-mantenimiento').value) || 0
    };
    
    if (perfilId) {
        // Editar perfil existente
        const index = perfiles.findIndex(p => p.id === perfilId);
        if (index !== -1) {
            perfiles[index] = perfilData;
            if (perfilActual && perfilActual.id === perfilId) {
                perfilActual = perfilData;
            }
        }
    } else {
        // Nuevo perfil
        perfiles.push(perfilData);
    }
    
    guardarPerfiles();
    actualizarListaPerfiles();
    mostrarPantalla('perfil-screen');
    
    mostrarMensaje(`✅ Perfil "${nombre}" guardado correctamente`, 'success');
}

function eliminarPerfil(index) {
    const perfil = perfiles[index];
    
    if (!confirm(`¿Estás seguro de que quieres eliminar el perfil "${perfil.nombre}"?`)) {
        return;
    }
    
    // Si el perfil actual es el que se está eliminando, limpiar perfil actual
    if (perfilActual && perfilActual.id === perfil.id) {
        perfilActual = null;
    }
    
    perfiles.splice(index, 1);
    guardarPerfiles();
    actualizarListaPerfiles();
    
    mostrarMensaje(`🗑️ Perfil "${perfil.nombre}" eliminado`, 'info');
}

function actualizarUnidades() {
    if (!perfilActual) return;
    
    // Actualizar unidades en la pantalla principal
    const distanciaUnit = document.getElementById('distancia-unit');
    const rendimientoUnit = document.getElementById('rendimiento-unit');
    const precioCombustibleUnit = document.getElementById('precio-combustible-unit');
    const umbralKmUnit = document.getElementById('umbral-km-unit');
    const umbralKmOportunidadUnit = document.getElementById('umbral-km-oportunidad-unit');
    const monedaTarifa = document.getElementById('moneda-tarifa');
    
    if (perfilActual.tipoMedida === 'km') {
        distanciaUnit.textContent = 'Km';
        rendimientoUnit.textContent = 'Km/Gl';
        umbralKmUnit.textContent = `${perfilActual.moneda}/Km`;
        umbralKmOportunidadUnit.textContent = `${perfilActual.moneda}/Km`;
    } else {
        distanciaUnit.textContent = 'Mi';
        rendimientoUnit.textContent = 'Mi/Gl';
        umbralKmUnit.textContent = `${perfilActual.moneda}/Mi`;
        umbralKmOportunidadUnit.textContent = `${perfilActual.moneda}/Mi`;
    }
    
    precioCombustibleUnit.textContent = `${perfilActual.moneda}/Gl`;
    monedaTarifa.textContent = perfilActual.moneda;
    
    // Actualizar unidades de costos mensuales
    document.querySelectorAll('.costo-mensual').forEach(element => {
        element.textContent = perfilActual.moneda;
    });
    
    // Actualizar unidades de umbrales por minuto
    document.querySelectorAll('.umbral-minuto').forEach(element => {
        element.textContent = `${perfilActual.moneda}/min`;
    });
}

function actualizarUnidadesFormulario() {
    const tipoMedida = document.getElementById('tipo-medida').value;
    const moneda = document.getElementById('moneda').value;
    
    const rendimientoUnit = document.getElementById('rendimiento-unit');
    const precioCombustibleUnit = document.getElementById('precio-combustible-unit');
    const umbralKmUnit = document.getElementById('umbral-km-unit');
    const umbralKmOportunidadUnit = document.getElementById('umbral-km-oportunidad-unit');
    
    if (tipoMedida === 'km') {
        rendimientoUnit.textContent = 'Km/Gl';
        umbralKmUnit.textContent = `${moneda}/Km`;
        umbralKmOportunidadUnit.textContent = `${moneda}/Km`;
    } else {
        rendimientoUnit.textContent = 'Mi/Gl';
        umbralKmUnit.textContent = `${moneda}/Mi`;
        umbralKmOportunidadUnit.textContent = `${moneda}/Mi`;
    }
    
    precioCombustibleUnit.textContent = `${moneda}/Gl`;
    
    // Actualizar unidades de costos mensuales
    document.querySelectorAll('.costo-mensual').forEach(element => {
        element.textContent = moneda;
    });
    
    // Actualizar unidades de umbrales por minuto
    document.querySelectorAll('.umbral-minuto').forEach(element => {
        element.textContent = `${moneda}/min`;
    });
}

// Event listeners para actualizar unidades en tiempo real en el formulario
document.getElementById('tipo-medida').addEventListener('change', actualizarUnidadesFormulario);
document.getElementById('moneda').addEventListener('change', actualizarUnidadesFormulario);

// Funciones de historial (mantenidas de 3.0)
function cargarHistorial() {
    const historialGuardado = localStorage.getItem('ubercalc_historial');
    if (historialGuardado) {
        historial = JSON.parse(historialGuardado);
        actualizarHistorialUI();
    }
}

function guardarHistorial(historialArray = historial) {
    localStorage.setItem('ubercalc_historial', JSON.stringify(historialArray));
}

function actualizarHistorialUI() {
    elementos.historyList.innerHTML = '';
    
    if (historial.length === 0) {
        elementos.historyList.innerHTML = `
            <div class="history-empty">
                <span class="empty-icon">📋</span>
                <p>No hay cálculos en el historial</p>
                <p class="small-info">Los viajes aceptados o rechazados aparecerán aquí</p>
            </div>
        `;
        return;
    }
    
    historial.forEach((item, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = `history-item ${item.tipoViaje}`;
        historyItem.innerHTML = `
            <div class="history-header">
                <span class="history-emoji">${item.emoji}</span>
                <span class="history-type">${item.texto}</span>
                <span class="history-action ${item.accion}">${item.accion === 'aceptado' ? '✅ Aceptado' : '❌ Rechazado'}</span>
            </div>
            <div class="history-details">
                <div class="history-detail">
                    <span class="detail-label">💰 Ganancia:</span>
                    <span class="detail-value">${item.tarifa} ${perfilActual?.moneda || 'DOP'}</span>
                </div>
                <div class="history-detail">
                    <span class="detail-label">⏱️ Tiempo:</span>
                    <span class="detail-value">${item.minutos} min</span>
                </div>
                <div class="history-detail">
                    <span class="detail-label">🛣️ Distancia:</span>
                    <span class="detail-value">${item.distancia} ${perfilActual?.tipoMedida === 'km' ? 'Km' : 'Mi'}</span>
                </div>
                <div class="history-detail">
                    <span class="detail-label">📅 Fecha:</span>
                    <span class="detail-value">${new Date(item.timestamp).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        elementos.historyList.appendChild(historyItem);
    });
}

function limpiarHistorial() {
    if (!confirm('¿Estás seguro de que quieres limpiar todo el historial? Esta acción no se puede deshacer.')) {
        return;
    }
    
    historial = [];
    guardarHistorial();
    actualizarHistorialUI();
    actualizarEstadisticas();
    
    // Sincronizar con Firebase si está disponible
    if (firebaseSync && firebaseSync.initialized) {
        firebaseSync.sincronizarHistorial();
    }
    
    mostrarMensaje('🗑️ Historial limpiado correctamente', 'info');
}

function actualizarEstadisticas() {
    if (!perfilActual) return;
    
    const hoy = new Date().toDateString();
    const viajesHoy = historial.filter(item => 
        new Date(item.timestamp).toDateString() === hoy && 
        item.accion === 'aceptado'
    );
    
    // Estadísticas básicas
    const totalViajes = viajesHoy.length;
    const totalGanancia = viajesHoy.reduce((sum, item) => sum + item.tarifa, 0);
    const totalTiempo = viajesHoy.reduce((sum, item) => sum + item.minutos, 0);
    const totalRentables = viajesHoy.filter(item => item.tipoViaje === 'rentable').length;
    
    // Rendimiento
    const gananciaPorHora = totalTiempo > 0 ? (totalGanancia / totalTiempo) * 60 : 0;
    const viajePromedio = totalViajes > 0 ? totalGanancia / totalViajes : 0;
    
    // Actualizar UI
    elementos.statsViajes.textContent = totalViajes;
    elementos.statsGanancia.textContent = `RD$${totalGanancia.toFixed(0)}`;
    elementos.statsTiempo.textContent = `${totalTiempo}min`;
    elementos.statsRentables.textContent = totalRentables;
    elementos.statsGananciaHora.textContent = `RD$${gananciaPorHora.toFixed(0)}`;
    elementos.statsViajePromedio.textContent = `RD$${viajePromedio.toFixed(0)}`;
}

function exportarHistorialPdf() {
    if (historial.length === 0) {
        mostrarMensaje('❌ No hay datos en el historial para exportar', 'error');
        return;
    }
    
    // Crear contenido HTML para el PDF
    let contenido = `
        <html>
        <head>
            <title>Reporte UberCalc - ${new Date().toLocaleDateString()}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .header { text-align: center; margin-bottom: 30px; }
                .stats { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px; }
                .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                .table th { background-color: #007cba; color: white; }
                .rentable { background-color: #d4edda; }
                .oportunidad { background-color: #fff3cd; }
                .no-rentable { background-color: #f8d7da; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Reporte UberCalc</h1>
                <p>Generado el ${new Date().toLocaleDateString()}</p>
            </div>
    `;
    
    // Agregar estadísticas
    const hoy = new Date().toDateString();
    const viajesHoy = historial.filter(item => 
        new Date(item.timestamp).toDateString() === hoy && 
        item.accion === 'aceptado'
    );
    
    const totalGanancia = viajesHoy.reduce((sum, item) => sum + item.tarifa, 0);
    const totalTiempo = viajesHoy.reduce((sum, item) => sum + item.minutos, 0);
    const gananciaPorHora = totalTiempo > 0 ? (totalGanancia / totalTiempo) * 60 : 0;
    
    contenido += `
        <div class="stats">
            <h3>📈 Estadísticas del Día</h3>
            <p><strong>Total Viajes:</strong> ${viajesHoy.length}</p>
            <p><strong>Ganancia Total:</strong> RD$${totalGanancia.toFixed(2)}</p>
            <p><strong>Tiempo Total:</strong> ${totalTiempo} minutos</p>
            <p><strong>Ganancia por Hora:</strong> RD$${gananciaPorHora.toFixed(2)}</p>
        </div>
    `;
    
    // Agregar tabla de historial
    contenido += `
        <h3>📋 Historial Completo</h3>
        <table class="table">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Ganancia</th>
                    <th>Tiempo</th>
                    <th>Distancia</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    historial.forEach(item => {
        const fecha = new Date(item.timestamp).toLocaleDateString();
        contenido += `
            <tr class="${item.tipoViaje}">
                <td>${fecha}</td>
                <td>${item.emoji} ${item.texto}</td>
                <td>RD$${item.tarifa}</td>
                <td>${item.minutos} min</td>
                <td>${item.distancia} ${perfilActual?.tipoMedida === 'km' ? 'Km' : 'Mi'}</td>
                <td>${item.accion === 'aceptado' ? '✅ Aceptado' : '❌ Rechazado'}</td>
            </tr>
        `;
    });
    
    contenido += `
            </tbody>
        </table>
        </body>
        </html>
    `;
    
    // Crear ventana para imprimir
    const ventana = window.open('', '_blank');
    ventana.document.write(contenido);
    ventana.document.close();
    
    // Esperar a que cargue el contenido y luego imprimir
    ventana.onload = function() {
        ventana.print();
    };
    
    cerrarExportModal();
    mostrarMensaje('📄 Generando reporte PDF...', 'info');
}

// Funciones de tema (mantenidas de 3.0)
function inicializarTema() {
    const temaGuardado = localStorage.getItem('ubercalc_tema');
    if (temaGuardado) {
        document.body.classList.toggle('dark-mode', temaGuardado === 'dark');
        actualizarIconoTema();
    }
}

function alternarTema() {
    document.body.classList.toggle('dark-mode');
    const temaActual = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
    localStorage.setItem('ubercalc_tema', temaActual);
    actualizarIconoTema();
}

function actualizarIconoTema() {
    const temaIcon = elementos.themeToggle.querySelector('.theme-icon');
    if (document.body.classList.contains('dark-mode')) {
        temaIcon.textContent = '☀️';
        elementos.themeToggle.setAttribute('title', 'Cambiar a modo claro');
    } else {
        temaIcon.textContent = '🌙';
        elementos.themeToggle.setAttribute('title', 'Cambiar a modo oscuro');
    }
}

// Función de utilidad para mostrar mensajes
function mostrarMensaje(mensaje, tipo = 'info') {
    // Implementación simplificada - puedes expandir esto según necesites
    console.log(`${tipo}: ${mensaje}`);
    
    // Mostrar alerta simple por ahora
    if (tipo === 'error') {
        alert('❌ ' + mensaje);
    } else if (tipo === 'success') {
        alert('✅ ' + mensaje);
    } else {
        alert('ℹ️ ' + mensaje);
    }
}

// Inicializar la aplicación cuando se carga la página
document.addEventListener('DOMContentLoaded', inicializarApp);
